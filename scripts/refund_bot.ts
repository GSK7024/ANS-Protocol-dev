import bs58 from 'bs58';

// --- CONFIGURATION ---
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Keys (Expects JSON array format in .env e.g. [123, 44, ...])
// const DEV_WALLET_KEY ... (unused/redundant variables removed for clarity in this block context)

// ---------------------

async function main() {
    console.log("🤖 ANS Refund Bot Starting...");

    if (!SUPABASE_KEY || !SUPABASE_URL) {
        console.error("❌ Missing Supabase Config");
        process.exit(1);
    }

    const connection = new Connection(RPC_URL, 'confirmed');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Get Pending Refunds
    const { data: refunds, error } = await supabase
        .from('failed_transactions')
        .select('*')
        .in('refund_status', ['pending', 'processing']); // Also retry stuck processing?

    if (error) {
        console.error("❌ DB Error:", error);
        return;
    }

    if (!refunds || refunds.length === 0) {
        console.log("✅ No pending refunds found.");
        return;
    }

    console.log(`Found ${refunds.length} pending refunds.`);

    // 2. Load Wallets (Support JSON Array OR Base58)
    let devKeypair: Keypair | null = null;
    let vaultKeypair: Keypair | null = null;

    const parseKey = (keyStr: string | undefined): Keypair | null => {
        if (!keyStr) return null;
        try {
            return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keyStr)));
        } catch (e) {
            try {
                return Keypair.fromSecretKey(bs58.decode(keyStr));
            } catch (e2) {
                console.warn("⚠️ warning: Key found but invalid format (not JSON or Base58)");
                return null;
            }
        }
    };

    if (process.env.DEV_PRIVATE_KEY) {
        devKeypair = parseKey(process.env.DEV_PRIVATE_KEY);
    }
    // Fallback or explicit Vault key
    const vaultKeyStr = process.env.VAULT_PRIVATE_KEY || process.env.NEXT_PUBLIC_VAULT_WALLET_KEY; // check naming
    if (process.env.VAULT_PRIVATE_KEY) {
        vaultKeypair = parseKey(process.env.VAULT_PRIVATE_KEY);
    }

    if (!devKeypair && !vaultKeypair) {
        console.error("❌ No valid private keys loaded. Cannot process refunds.");
        return;
    }

    // 3. Process Each
    for (const record of refunds) {
        console.log(`\nProcessing Refund for Tx: ${record.signature.slice(0, 8)}...`);
        console.log(`Target: ${record.wallet_address}, Amount: ${record.amount} ${record.currency}`);

        if (record.currency !== 'SOL') {
            console.log("⏭️ Skipping non-SOL refund (USDC/ANS logic not implemented in bot yet)");
            continue;
        }

        try {
            // Calculate Refund Splits (assuming 50/50 model from logic)
            // Or just refund total if we control both wallets?
            // Safer: Refund what we can. 
            // In verification logic, it checked for 50/50.
            const totalLamports = BigInt(Math.floor(record.amount * LAMPORTS_PER_SOL));
            const halfShare = totalLamports / 2n;

            let tx = new Transaction();
            let signers: Keypair[] = [];

            // Add Dev Wallet Refund
            if (devKeypair) {
                console.log("Adding Dev Wallet Refund Instruction...");
                tx.add(
                    SystemProgram.transfer({
                        fromPubkey: devKeypair.publicKey,
                        toPubkey: new PublicKey(record.wallet_address),
                        lamports: Number(halfShare) // careful with precision
                    })
                );
                signers.push(devKeypair);
            }

            // Add Vault Wallet Refund
            if (vaultKeypair) {
                console.log("Adding Vault Wallet Refund Instruction...");
                tx.add(
                    SystemProgram.transfer({
                        fromPubkey: vaultKeypair.publicKey,
                        toPubkey: new PublicKey(record.wallet_address),
                        lamports: Number(halfShare)
                    })
                );
                signers.push(vaultKeypair);
            }

            if (signers.length === 0) {
                console.log("No signers available for this refund.");
                continue;
            }

            // A. Mark as processing (Lock it)
            const { error: lockError } = await supabase
                .from('failed_transactions')
                .update({ refund_status: 'processing' })
                .eq('signature', record.signature);

            if (lockError) {
                console.error("Failed to lock record, skipping:", lockError);
                continue;
            }

            // B. Send Money
            const signature = await sendAndConfirmTransaction(connection, tx, signers);
            console.log(`✅ Refund Successful! Tx: ${signature}`);

            // C. Finalize
            await supabase
                .from('failed_transactions')
                .update({
                    refund_status: 'refunded',
                    // refund_tx: signature // (If we added this column, which we should, but simple text update is okay for now)
                })
                .eq('signature', record.signature);

        } catch (err) {
            console.error(`❌ Refund Failed for ${record.signature}:`, err);
        }
    }
}

main();

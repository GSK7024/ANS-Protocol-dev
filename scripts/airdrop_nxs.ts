
import {
    getOrCreateAssociatedTokenAccount,
    createTransferInstruction,
    TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import {
    Connection,
    Keypair,
    PublicKey,
    clusterApiUrl,
    Transaction,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// CONFIGURATION
const MINT_ADDRESS = new PublicKey("AArq7Yoeq39C9cBbp9F4Fv7ERw225V6jnENgZ2Wx42R6"); // NXS Mint
const DECIMALS = 9;

async function main() {
    const args = process.argv.slice(2);
    const recipientAddr = args[0];
    const amountNXS = parseFloat(args[1]);

    if (!recipientAddr || !amountNXS) {
        console.log("❌ Usage: npx tsx scripts/airdrop_nxs.ts <WALLET_ADDRESS> <AMOUNT>");
        return;
    }

    console.log(`🎁 Airdropping ${amountNXS} NXS to ${recipientAddr}...`);

    // 1. Setup Connection
    const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed');

    // 2. Load Admin Wallet (The Vault)
    const privateKey = process.env.VAULT_PRIVATE_KEY;
    if (!privateKey) throw new Error("VAULT_PRIVATE_KEY missing in .env.local");
    const adminWallet = Keypair.fromSecretKey(bs58.decode(privateKey));

    // 3. Get Token Accounts
    const recipient = new PublicKey(recipientAddr);

    // Admin's Account (Source)
    const sourceAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        adminWallet,
        MINT_ADDRESS,
        adminWallet.publicKey
    );

    // User's Account (Destination)
    // Note: We pay for the creation of their account if it doesn't exist (Customer Service!)
    const destinationAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        adminWallet,
        MINT_ADDRESS,
        recipient
    );

    // 4. Transfer
    const amountRaw = BigInt(amountNXS * Math.pow(10, DECIMALS));

    const tx = new Transaction().add(
        createTransferInstruction(
            sourceAccount.address,
            destinationAccount.address,
            adminWallet.publicKey,
            amountRaw,
            [],
            TOKEN_PROGRAM_ID
        )
    );

    console.log("📝 Signing transaction...");
    const signature = await sendAndConfirmTransaction(connection, tx, [adminWallet]);

    console.log(`✅ SENT!`);
    console.log(`Tx: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

main().catch(console.error);

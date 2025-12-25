import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
    isValidDomainName,
    RESTRICTED_NAMES,
    CROWN_JEWELS,
    getDomainPrice
} from '@/utils/genesis_constants';
import { initializeAgentMetrics } from '@/lib/reputation';
import { runSecurityChecks, rateLimitHeaders } from '@/lib/securityMiddleware';
import { validateWallet, validateAgentName } from '@/lib/validation';
import { logDomainRegister, logAudit } from '@/lib/auditLogger';
import { getSOLPrice, solToUSD } from '@/lib/priceOracle';

// Initialize Solana Connection
// Use env var or default to devnet.
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC);

const TREASURY_WALLET = process.env.NEXT_PUBLIC_DEV_WALLET!;

export async function POST(req: NextRequest) {
    // 🔒 Security: Rate limit (write operation - 10/min per IP)
    const secResult = await runSecurityChecks(req, 'write');
    if (!secResult.ok) return secResult.response;
    const { context } = secResult;

    try {
        const body = await req.json();
        const { signature, domain, wallet, tier, amount, currency = 'SOL' } = body;

        // 🔒 Validate wallet format
        if (wallet) {
            const walletValidation = validateWallet(wallet);
            if (!walletValidation.valid) {
                return NextResponse.json(
                    { error: walletValidation.error },
                    { status: 400, headers: rateLimitHeaders(context) }
                );
            }
        }

        if (!signature || !domain || !wallet) {
            return NextResponse.json(
                { error: 'Missing fields' },
                { status: 400, headers: rateLimitHeaders(context) }
            );
        }

        // --- SECURITY CHECK 1: GLOBAL NAME VALIDATION (Run before ANY processing) ---
        // 1. Verify format (Regex)
        const validation = isValidDomainName(domain);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error || 'Invalid domain format' }, { status: 400 });
        }

        // 2. Identify the "core name" for checking restrictions
        // If it's "user.john", we want to check if "john" is restricted? 
        // Or do we just check "user.john" against the set? 
        // RESTRICTED_NAMES usually contains "admin", "google". 
        // "user.google" should be blocked? 
        // Option A: Check the full string. "user.google" != "google" (Safe?)
        // Option B: Check simply if the string *contains* a restricted word? Too aggressive ("ass" in "class").
        // Option C: If it's a subdomain, check the *suffix*.

        let nameToCheck = domain;
        if (domain.startsWith('user.')) {
            const parts = domain.split('.');
            if (parts.length > 1) {
                nameToCheck = parts[1]; // Check "google" from "user.google"
            }
        }

        // 3. Verify Restricted/Reserved (skip on devnet)
        const network = body.network || 'mainnet';
        const domainPrefix = body.domainPrefix || 'agent://';

        if (network === 'mainnet' && (RESTRICTED_NAMES.has(nameToCheck) || domain.includes('gov'))) {
            return NextResponse.json({ error: 'Domain is reserved/restricted' }, { status: 400 });
        }

        // =========================================
        // 🆓 DEVNET FREE TIER - All domains free!
        // =========================================
        if (tier === 'devnet-free' && network === 'devnet') {
            // 🚨 CRITICAL SECURITY: Only allow devnet-free if SERVER is on devnet RPC
            // This prevents scammers from claiming devnet mode while server is on mainnet
            const serverRPC = process.env.SOLANA_RPC_URL || '';
            const isServerOnDevnet = serverRPC.includes('devnet');

            if (!isServerOnDevnet) {
                console.warn(`🚨 SECURITY ALERT: Devnet-free rejected. Server is on MAINNET. Client tried to bypass with devnet claim.`);
                return NextResponse.json({
                    error: 'Devnet mode is disabled. Server is running on mainnet. Real SOL payment required.',
                    code: 'DEVNET_DISABLED'
                }, { status: 403 });
            }

            // 🔒 SECURITY: Validate network parameter
            if (network !== 'devnet' && network !== 'mainnet') {
                return NextResponse.json({ error: 'Invalid network parameter' }, { status: 400 });
            }

            console.log(`🆓 Processing DEVNET FREE domain: ${domainPrefix}${domain} for ${wallet}`);

            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

            if (!serviceRoleKey) {
                return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
            }

            const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            // 🔒 SECURITY FIX #1: Devnet wallet limit (max 10 free domains)
            const { data: existingDevnetDomains, count } = await adminSupabase
                .from('domains')
                .select('id', { count: 'exact' })
                .eq('owner_wallet', wallet)
                .eq('network', 'devnet');

            const devnetDomainCount = count || 0;
            const DEVNET_MAX_FREE = 10;

            if (devnetDomainCount >= DEVNET_MAX_FREE) {
                console.log(`⚠️ SECURITY: Wallet ${wallet} hit devnet limit (${devnetDomainCount}/${DEVNET_MAX_FREE})`);
                return NextResponse.json({
                    error: `Devnet limit reached. You already have ${devnetDomainCount} free devnet domains (max ${DEVNET_MAX_FREE}).`,
                    limit: DEVNET_MAX_FREE,
                    current: devnetDomainCount
                }, { status: 429 });
            }

            // Store with dev.agent:// prefix to distinguish from mainnet
            const fullDomainName = `dev.agent://${domain}`;

            // Check if already taken on devnet
            const { data: existingDomain } = await adminSupabase
                .from('domains')
                .select('id')
                .eq('name', fullDomainName)
                .single();

            if (existingDomain) {
                return NextResponse.json({ error: 'Domain already taken on Devnet' }, { status: 409 });
            }

            // Register the free devnet domain
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year from now

            const { data, error } = await adminSupabase
                .from('domains')
                .insert({
                    name: fullDomainName,
                    owner_wallet: wallet,
                    status: 'active',
                    price_paid: 0,
                    is_genesis: false,
                    is_user_domain: false,
                    network: 'devnet',
                    created_at: new Date().toISOString(),
                    expires_at: expiresAt.toISOString()
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return NextResponse.json({ error: 'Domain already taken' }, { status: 409 });
                }
                throw error;
            }

            // Initialize SRT metrics for this devnet agent
            try {
                await initializeAgentMetrics(fullDomainName, wallet);
            } catch (e) {
                console.warn('Failed to init devnet metrics:', e);
            }

            console.log(`✅ Devnet domain registered: ${fullDomainName}`);
            return NextResponse.json({
                success: true,
                domain: data,
                network: 'devnet',
                message: `${fullDomainName} is yours! (Devnet - No real value)`
            });
        }

        // Handle FREE user.* domain registration (no payment required) - MAINNET ONLY
        if (currency === 'FREE' && domain.startsWith('user.') && network === 'mainnet') {
            console.log(`🆓 Processing FREE user domain: ${domain} for ${wallet}`);

            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

            if (!serviceRoleKey) {
                return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
            }

            const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            // Check wallet limit (max 2 free user domains)
            const { data: existingDomains } = await adminSupabase
                .from('domains')
                .select('id')
                .eq('owner_wallet', wallet)
                .like('name', 'user.%');

            if (existingDomains && existingDomains.length >= 2) {
                return NextResponse.json({ error: 'You already have 2 free user domains. Upgrade to premium.' }, { status: 400 });
            }

            // 🔒 SECURITY FIX #2: Check if domain already exists BEFORE insert
            const { data: domainExists } = await adminSupabase
                .from('domains')
                .select('id, owner_wallet')
                .eq('name', domain)
                .single();

            if (domainExists) {
                return NextResponse.json({
                    error: 'Domain already taken',
                    owner: domainExists.owner_wallet === wallet ? 'you' : 'another user'
                }, { status: 409 });
            }

            // 🔒 SECURITY FIX #2: Use INSERT not UPSERT to prevent domain theft
            const expiresAtMainnet = new Date();
            expiresAtMainnet.setFullYear(expiresAtMainnet.getFullYear() + 1); // 1 year from now

            const { data, error } = await adminSupabase
                .from('domains')
                .insert({
                    name: domain,
                    owner_wallet: wallet,
                    status: 'active',
                    price_paid: 0,
                    is_genesis: false,
                    is_user_domain: true, // Flag for free user domain
                    network: 'mainnet',
                    created_at: new Date().toISOString(),
                    expires_at: expiresAtMainnet.toISOString()
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return NextResponse.json({ error: 'Domain already taken' }, { status: 409 });
                }
                throw error;
            }

            console.log(`✅ Free domain registered: ${domain}`);
            return NextResponse.json({ success: true, domain: data });
        }

        // For paid domains, require amount
        if (amount === undefined || amount === null) {
            return NextResponse.json({ error: 'Missing amount for paid domain' }, { status: 400 });
        }

        // Verify Crown Jewels (Auction logic separate)
        if (CROWN_JEWELS.has(domain) && tier !== 'crown') {
            return NextResponse.json({ error: 'Crown Jewels must be won in auction' }, { status: 400 });
        }


        // --- SECURITY CHECK 2: PRICE ENFORCEMENT ---
        // Don't trust the client's 'amount' blindly.
        const { price: requiredPrice } = getDomainPrice(domain);
        // Special case: ANS discount is 40% (0.6 multiplier). USDC/SOL are full price.
        // We allow a small float delta (0.01).

        let minRequired = requiredPrice;
        if (currency === 'ANS') {
            // 1 ANS = 0.05 SOL fixed rate in code? Or market? 
            // Frontend: ansAmount = (currentPrice * 0.6) / 0.05
            // So effective SOL value required is currentPrice * 0.6
            minRequired = requiredPrice * 0.6;
        }

        // If the `amount` passed (which is checked against on-chain tx) is LESS than required...
        // Note: `amount` passed in body is typically the SOL value. 
        // Logic: if currency is SOL, amount is SOL. If USDC, amount is SOL equivalent? 
        // Frontend sends: verify-payment body { amount: currentPrice } -> which is in SOL.
        // So we compare 'amount' vs 'minRequired'.
        if (amount < minRequired * 0.99) { // 1% tolerance for floating point
            return NextResponse.json({
                error: `Insufficient payment. Domain requires ${minRequired} SOL, paid ${amount}.`
            }, { status: 400 });
        }


        // --- SECURITY CHECK 3: REPLAY ATTACK (DB Check) ---
        // Check if this signature was already used in EITHER success or failure tables.
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        const adminSupabase = createClient(supabaseUrl, serviceRoleKey!, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Check domains table
        const { data: domainCheck } = await adminSupabase
            .from('domains')
            .select('id')
            .eq('payment_signature', signature)
            .single();

        if (domainCheck) {
            return NextResponse.json({ error: 'Transaction signature already used (Domain Registered).' }, { status: 409 });
        }

        // Check failed_transactions table (Prevents double refund logging)
        const { data: refundCheck } = await adminSupabase
            .from('failed_transactions')
            .select('signature')
            .eq('signature', signature)
            .single();

        if (refundCheck) {
            return NextResponse.json({ error: 'Transaction signature already processed for refund.' }, { status: 409 });
        }


        // 1. Fetch Transaction from Chain
        const tx = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        });

        if (!tx) {
            return NextResponse.json({ error: 'Transaction not found or not confirmed yet' }, { status: 404 });
        }

        // 🚨 CRITICAL SECURITY: MAINNET ENFORCEMENT
        // Mainnet slots are currently in the billions (as of 2024/2025)
        // Devnet slots are much lower and reset frequently
        // We require slot > 200,000,000 to ensure this is a mainnet transaction
        const MAINNET_MIN_SLOT = 200_000_000; // ~200 million, mainnet is far beyond this
        const txSlot = tx.slot;

        if (txSlot < MAINNET_MIN_SLOT) {
            console.warn(`🚨 SECURITY ALERT: Devnet transaction rejected! Slot: ${txSlot}`);
            return NextResponse.json({
                error: 'Invalid transaction: This appears to be a devnet/testnet transaction. Mainnet payments required.',
                details: `Transaction slot ${txSlot} is below mainnet minimum ${MAINNET_MIN_SLOT}`
            }, { status: 400 });
        }

        console.log(`✅ Mainnet verification passed. Slot: ${txSlot}`);

        let verified = false;

        if (currency === 'USDC') {
            // USDC MINT CHECK
            const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
            // Check amount of USDC units.
            // Frontend sends `amount` as SOL value.
            // We need to know expected USDC. 
            // The Frontend Logic: usdcPrice = currentPrice * SOL_USD_RATE 
            // We need to replicate that or trust the `amount` * SOL_USD_RATE?
            // Safer: Re-calculate.
            const SOL_USD_RATE = 120; // CONSTANT MUST MATCH FRONTEND
            const expectedUsdc = amount * SOL_USD_RATE;
            const expectedAmountUnits = expectedUsdc * 1_000_000;

            // Identify the Treasury in token balances
            // We need to look at tx.meta.postTokenBalances
            // Find an entry where 'owner' === TREASURY_WALLET AND 'mint' === USDC_MINT

            const postToken = tx.meta?.postTokenBalances?.find(
                b => b.owner === TREASURY_WALLET && b.mint === USDC_MINT
            );

            const preToken = tx.meta?.preTokenBalances?.find(
                b => b.owner === TREASURY_WALLET && b.mint === USDC_MINT
            );

            // Calculate diff
            const preAmount = preToken?.uiTokenAmount?.amount ? Number(preToken.uiTokenAmount.amount) : 0;
            const postAmount = postToken?.uiTokenAmount?.amount ? Number(postToken.uiTokenAmount.amount) : 0;
            const received = postAmount - preAmount;

            if (received >= expectedAmountUnits * 0.99) {
                verified = true;
            } else {
                return NextResponse.json({
                    error: `Insufficient USDC. Expected ${expectedUsdc} USDC, received ${received / 1_000_000}`
                }, { status: 400 });
            }

        } else if (currency === 'ANS') {
            // ANS LOGIC
            // Frontend Logic: ansAmount = (currentPrice * 0.6) / 0.05
            const ANS_MINT = "AArq7Yoeq39C9cBbp9F4Fv7ERw225V6jnENgZ2Wx42R6";
            const ANS_PRICE_IN_SOL = 0.05;
            // amount passed is SOL value.
            // We need ANS tokens.
            const expectedAnsTokens = amount / ANS_PRICE_IN_SOL; // (SOL / 0.05)
            const expectedAnsUnits = expectedAnsTokens * 1_000_000_000; // 9 decimals

            const postToken = tx.meta?.postTokenBalances?.find(
                b => b.owner === TREASURY_WALLET && b.mint === ANS_MINT
            );
            const preToken = tx.meta?.preTokenBalances?.find(
                b => b.owner === TREASURY_WALLET && b.mint === ANS_MINT
            );

            const preAmount = preToken?.uiTokenAmount?.amount ? Number(preToken.uiTokenAmount.amount) : 0;
            const postAmount = postToken?.uiTokenAmount?.amount ? Number(postToken.uiTokenAmount.amount) : 0;
            const received = postAmount - preAmount;

            if (received >= expectedAnsUnits * 0.99) {
                verified = true;
            } else {
                return NextResponse.json({
                    error: `Insufficient ANS. Expected ${expectedAnsTokens} ANS, received ${received / 1_000_000_000}`
                }, { status: 400 });
            }

        } else {
            // SOL LOGIC - 50/50 SPLIT VERIFICATION
            const DEV_WALLET = process.env.NEXT_PUBLIC_DEV_WALLET!;
            const VAULT_WALLET = process.env.NEXT_PUBLIC_VAULT_WALLET!;

            if (!DEV_WALLET || !VAULT_WALLET) {
                return NextResponse.json({ error: 'Server configuration error: Missing verify wallets' }, { status: 500 });
            }

            // Find indices
            const devIndex = tx.transaction.message.accountKeys.findIndex(k => k.pubkey.toString() === DEV_WALLET);
            const vaultIndex = tx.transaction.message.accountKeys.findIndex(k => k.pubkey.toString() === VAULT_WALLET);

            if (devIndex === -1 && vaultIndex === -1) {
                return NextResponse.json({ error: 'Neither Dev nor Vault wallets found in transaction' }, { status: 400 });
            }

            // Calculate expected split (50% each)
            const totalExpectedLamports = amount * LAMPORTS_PER_SOL;
            const halfShare = totalExpectedLamports / 2;

            // Check Dev Share
            let devReceived = 0;
            if (devIndex !== -1) {
                const pre = tx.meta?.preBalances[devIndex] || 0;
                const post = tx.meta?.postBalances[devIndex] || 0;
                devReceived = post - pre;
            }

            // Check Vault Share
            let vaultReceived = 0;
            if (vaultIndex !== -1) {
                const pre = tx.meta?.preBalances[vaultIndex] || 0;
                const post = tx.meta?.postBalances[vaultIndex] || 0;
                vaultReceived = post - pre;
            }

            // Verification Logic
            // We allow a small tolerance (txn fees etc) but broadly expect ~50% each.
            // SPECIAL CASE: If the Sender IS the Dev Wallet or Vault Wallet, their "received" balance will be 0 or negative.
            // In that case, we permit it (Self-Transfer).

            let isDevPaid = devReceived >= halfShare * 0.95; // 5% tolerance downward
            let isVaultPaid = vaultReceived >= halfShare * 0.95;

            // Sender is Dev Wallet? Then Dev Share is "paid" by retention.
            if (wallet === DEV_WALLET) {
                console.log("Dev Wallet is Sender. Auto-verifying Dev Share.");
                isDevPaid = true;
            }
            // Sender is Vault Wallet?
            if (wallet === VAULT_WALLET) {
                console.log("Vault Wallet is Sender. Auto-verifying Vault Share.");
                isVaultPaid = true;
            }

            if (!isDevPaid || !isVaultPaid) {
                return NextResponse.json({
                    error: `Payment verification failed. Dev Received: ${devReceived / LAMPORTS_PER_SOL} SOL. Vault Received: ${vaultReceived / LAMPORTS_PER_SOL} SOL. Expected ~${halfShare / LAMPORTS_PER_SOL} SOL each.`
                }, { status: 400 });
            }

            verified = true;
        }

        // 4. Verify Sender (Optional but good) - Ensure 'wallet' was a signer
        const senderIndex = tx.transaction.message.accountKeys.findIndex(
            k => k.pubkey.toString() === wallet
        );
        if (senderIndex !== -1) {
            if (!tx.transaction.message.accountKeys[senderIndex].signer) {
                return NextResponse.json({ error: 'Claimed wallet was not a signer on the transaction' }, { status: 400 });
            }
        } else {
            console.warn(`Claimed wallet ${wallet} not found in transaction keys. Someone paying on behalf? Allowed.`);
        }

        console.log("✅ Payment Verified On-Chain.");

        // 5. Insert into Database (Use Service Role to bypass RLS)
        // ALREADY INITIALIZED adminSupabase above
        const expiresAtPaid = new Date();
        expiresAtPaid.setFullYear(expiresAtPaid.getFullYear() + 1); // 1 year from now

        const { data, error } = await adminSupabase
            .from('domains')
            .upsert({
                name: domain,
                owner_wallet: wallet,
                status: tier === 'crown' ? 'auction' : 'reserved',
                price_paid: amount,
                is_genesis: true,
                network: 'mainnet', // Separate from devnet domains
                payment_signature: signature, // RECORD SIGNATURE
                created_at: new Date().toISOString(),
                expires_at: expiresAtPaid.toISOString()
            }, { onConflict: 'name' })
            .select()
            .single();

        if (error) {
            console.error('DB Error:', error);

            // --- SCAM PROTECTION: LOG VALID PAYMENTS THAT FAILED DELIVERY ---
            // If we are here, the payment was VERIFIED on-chain, but the domain failed to mint.
            // This user deserves a refund. Log it securely.
            await adminSupabase.from('failed_transactions').insert({
                signature: signature,
                wallet_address: wallet,
                domain_attempted: domain,
                amount: amount,
                currency: currency,
                error_reason: error.message || error.code || 'DB Insert Failed'
            });
            console.warn(`[REFUND ALERT] Transaction ${signature} logged for refund.`);

            if (error.code === '23505') {
                // Race Condition: Domain taken by someone else just now
                return NextResponse.json({ error: 'Domain already taken (Race Condition). Transaction logged for refund.' }, { status: 409 });
            }
            throw error;
        }

        console.log(`[SUCCESS] Domain ${domain} assigned to ${wallet}`);

        // 📊 SRT: Initialize reputation metrics for newly registered agent
        await initializeAgentMetrics(domain, 0);

        return NextResponse.json({
            success: true,
            domain: data
        });

    } catch (error: any) {
        console.error('Verify API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

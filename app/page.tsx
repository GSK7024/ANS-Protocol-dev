"use client";

import Link from 'next/link';
import ClientWalletButton from '@/components/ClientWalletButton'; // Default import
import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
// WalletMultiButton removed from here as it is now in ClientWalletButton
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Shield, Zap, Terminal, Code, CheckCircle2, Lock, ShieldAlert, ShoppingCart, Loader2, Cpu } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { CROWN_JEWELS, RESTRICTED_NAMES, getDomainPrice, isUserSubdomain, FREE_USER_PREFIX, isValidDomainName } from '@/utils/genesis_constants';
import AuctionModal from '@/components/AuctionModal';
import InventoryModal from '@/components/InventoryModal';
import { getAssociatedTokenAddress, createTransferInstruction, getAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
// HIDDEN: PresaleWidget - uncomment when ready to launch token\r\n// import PresaleWidget from '@/components/PresaleWidget';
import { NetworkSwitcher } from '@/components/NetworkSwitcher';
import { useNetwork } from '@/hooks/useNetwork';
import MobileNav from '@/components/MobileNav';

// Token Addresses
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
// HIDDEN: ANS Token - uncomment when ready to launch
// const ANS_MINT = new PublicKey("AArq7Yoeq39C9cBbp9F4Fv7ERw225V6jnENgZ2Wx42R6");
// const ANS_DISCOUNT = 0.4;
const SOL_USD_RATE = 120; // 1 SOL = $120 USD (update this as needed)

// ... (previous imports)

export default function Home() {
    const { connected, publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const { domainPrefix, isDevnet, isFree } = useNetwork();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'available' | 'reserved' | 'auction' | 'locked' | 'restricted' | 'success' | 'taken' | 'reservation_mode'>('idle');
    const [message, setMessage] = useState('');
    const [priceDisplay, setPriceDisplay] = useState<{ label: string, strike?: string } | null>(null);
    const [isAuctionOpen, setIsAuctionOpen] = useState(false);
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [inventoryTab, setInventoryTab] = useState<'auction' | 'titan' | 'starter'>('auction');
    const [paymentMethod, setPaymentMethod] = useState<'SOL' | 'USDC'>('SOL');

    const [currentPrice, setCurrentPrice] = useState<number>(0);

    const checkDomain = async (nameOverride?: string) => {
        const domainToCheck = (nameOverride || query).toLowerCase().trim();
        if (!domainToCheck) return;

        // Update query if we clicked an inventory item
        if (nameOverride) setQuery(domainToCheck);

        setStatus('loading');
        setMessage('');
        setPriceDisplay(null);
        setCurrentPrice(0);

        // 0. Validate domain name format
        const validation = isValidDomainName(domainToCheck);
        if (!validation.valid) {
            setStatus('restricted');
            setMessage(validation.error || 'Invalid domain name');
            return;
        }

        // 1. Check if it's a FREE user subdomain (user.*)
        if (isUserSubdomain(domainToCheck)) {
            // Check wallet limit for free domains
            if (connected && publicKey) {
                try {
                    const { data: existingDomains } = await supabase
                        .from('domains')
                        .select('id')
                        .eq('owner_wallet', publicKey.toString())
                        .like('name', 'user.%');

                    if (existingDomains && existingDomains.length >= 2) {
                        setStatus('restricted');
                        setMessage('You already have 2 free user domains. Upgrade to premium for unlimited.');
                        setPriceDisplay({ label: 'Limit Reached' });
                        return;
                    }
                } catch (err) {
                    // Continue - will check again on mint
                }
            }

            // Check if this specific user subdomain is taken (filter by network)
            try {
                const nameToQuery = isDevnet ? `dev.agent://${domainToCheck}` : domainToCheck;
                const { data } = await supabase
                    .from('domains')
                    .select('*')
                    .eq('name', nameToQuery)
                    .single();

                if (data) {
                    setStatus('taken');
                    setMessage('This user domain is already claimed.');
                    setPriceDisplay({ label: 'Taken' });
                    return;
                }
            } catch (err) {
                // Not found = Available
            }

            setStatus('available');
            setMessage('Free User Domain (Personal use, no commercial ranking)');
            setPriceDisplay({ label: 'FREE' });
            setCurrentPrice(0);
            return;
        }

        // 2. Check RESTRICTED names (brands, government)
        if (RESTRICTED_NAMES.has(domainToCheck) || domainToCheck.includes('gov')) {
            setStatus('restricted');
            setMessage('This name is reserved (trademark/government protection).');
            setPriceDisplay({ label: 'Reserved' });
            return;
        }

        // 3. Check Database - Is it already owned?
        // Filter by network: devnet uses 'dev.agent://' prefix, mainnet uses regular 'domainToCheck'
        try {
            const nameToQuery = isDevnet ? `dev.agent://${domainToCheck}` : domainToCheck;
            const { data } = await supabase
                .from('domains')
                .select('*')
                .eq('name', nameToQuery)
                .single();

            if (data) {
                setStatus('taken');
                setMessage('Already registered by an agent.');
                setPriceDisplay({ label: 'Taken' });
                return;
            }
        } catch (err) {
            // PGRST116 = Row not found = Domain is available
        }

        // 4. Crown Jewels - Auction only (MAINNET ONLY)
        if (CROWN_JEWELS.has(domainToCheck) && !isDevnet) {
            setStatus('auction');
            setMessage('Crown Jewel (Genesis Auction Only)');
            setPriceDisplay({ label: 'Open Bid' });
            return;
        }

        // 5. CHARACTER-BASED PRICING - All other names are purchasable!
        const pricing = getDomainPrice(domainToCheck);

        // DEVNET: Everything is FREE
        if (isDevnet) {
            setCurrentPrice(0);
            setStatus('available'); // Use 'available' for free mint flow
            setMessage(`${pricing.tier} - FREE on Devnet! 🆓`);
            setPriceDisplay({ label: 'FREE', strike: `${pricing.price} SOL` });
            return;
        }

        setCurrentPrice(pricing.price);
        setStatus('reservation_mode');
        setMessage(`${pricing.tier} - Available Now!`);
        setPriceDisplay({
            label: `${pricing.price} SOL`,
            strike: pricing.strike ? `${pricing.strike} SOL` : undefined
        });
    };


    const mintDomain = async () => {
        if (!connected || !publicKey) {
            alert('Please connect your wallet first.');
            return;
        }

        if (status === 'auction') {
            setIsAuctionOpen(true);
            return;
        }

        if (status === 'reservation_mode') {
            // Trigger Reservation Transaction
            try {
                // 1. Define your wallet (Use Env Variables in production!)
                const DEV_WALLET = new PublicKey(process.env.NEXT_PUBLIC_DEV_WALLET || '8xzt...jKw9');

                let signature = '';

                if (paymentMethod === 'USDC') {
                    // --- USDC LOGIC ---
                    // Convert SOL price to USDC (USD equivalent)
                    const usdcPrice = currentPrice * SOL_USD_RATE;

                    const buyerTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
                    const treasuryTokenAccount = await getAssociatedTokenAddress(USDC_MINT, DEV_WALLET, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

                    const transaction = new Transaction().add(
                        createTransferInstruction(
                            buyerTokenAccount,
                            treasuryTokenAccount,
                            publicKey,
                            BigInt(Math.floor(usdcPrice * 1_000_000)), // USDC has 6 decimals
                            [],
                            TOKEN_PROGRAM_ID
                        )
                    );

                    const { blockhash } = await connection.getLatestBlockhash();
                    transaction.recentBlockhash = blockhash;
                    transaction.feePayer = publicKey;

                    if (signTransaction) {
                        const signed = await signTransaction(transaction);
                        signature = await connection.sendRawTransaction(signed.serialize());
                        await connection.confirmTransaction(signature);
                    }

                } else if (paymentMethod === 'USDC') {
                    // Keep only USDC and SOL - ANS payment hidden for now
                } else {
                    // --- SOL LOGIC ---
                    const VAULT_WALLET = new PublicKey(process.env.NEXT_PUBLIC_VAULT_WALLET || '4kR9...m2xL');

                    // 2. Use dynamic pricing from character-based calculation
                    const totalPrice = currentPrice;
                    const totalLamports = totalPrice * LAMPORTS_PER_SOL;
                    const halfShare = Math.floor(totalLamports / 2);

                    const transaction = new Transaction().add(
                        SystemProgram.transfer({
                            fromPubkey: publicKey,
                            toPubkey: DEV_WALLET,
                            lamports: halfShare,
                        }),
                        SystemProgram.transfer({
                            fromPubkey: publicKey,
                            toPubkey: VAULT_WALLET,
                            lamports: halfShare,
                        })
                    );

                    const { blockhash } = await connection.getLatestBlockhash();
                    transaction.recentBlockhash = blockhash;
                    transaction.feePayer = publicKey;

                    if (signTransaction) {
                        const signed = await signTransaction(transaction);
                        signature = await connection.sendRawTransaction(signed.serialize());
                        await connection.confirmTransaction(signature);
                    }
                }

                if (signature) {
                    // Automated Verification Call
                    try {
                        const response = await fetch('/api/verify-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                signature,
                                domain: query,
                                wallet: publicKey.toString(),
                                tier: 'standard',
                                amount: currentPrice,
                                currency: paymentMethod // PASS THE CURRENCY
                            })
                        });

                        if (response.ok) {
                            setStatus('success');
                            setMessage(`Identity Secured! Tx: ${signature.slice(0, 8)}...`);
                        } else {
                            // Backend verification failed
                            const errorData = await response.json();
                            console.error("Verification Refused:", errorData.error);
                            alert(`Verification Failed: ${errorData.error}\n\nYour funds were sent, but the domain was NOT secured. Please contact support with Tx: ${signature}`);
                            setStatus('available'); // Reset to allow retry or checking logs
                            setMessage('');
                        }

                    } catch (apiErr) {
                        console.error("API Verification Error", apiErr);
                        setStatus('success');
                        setMessage(`Transaction Sent! (Verification Pending) Tx: ${signature.slice(0, 8)}...`);
                    }
                }

            } catch (err) {
                console.error(err);
                alert('Transaction Failed. ' + (paymentMethod === 'USDC' ? 'Do you have USDC?' : ''));
            }
            return;
        }

        if (status === 'available') {
            // Free Domain Mint (user.* on mainnet OR any domain on devnet)
            try {
                const response = await fetch('/api/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        signature: 'free-mint-' + Date.now(),
                        domain: query,
                        wallet: publicKey.toString(),
                        tier: isDevnet ? 'devnet-free' : 'free',
                        amount: 0,
                        currency: 'FREE',
                        network: isDevnet ? 'devnet' : 'mainnet',
                        domainPrefix: domainPrefix
                    })
                });

                if (response.ok) {
                    setStatus('success');
                    setMessage(`${domainPrefix}${query} claimed! 🎉`);
                } else {
                    const errorData = await response.json();
                    alert(`Failed: ${errorData.error}`);
                }
            } catch (err) {
                console.error(err);
                alert('Failed to claim free domain');
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 overflow-hidden relative">

            {/* Background Effects (e.g. Grid) */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none opacity-20"></div>

            {/* Navbar */}
            <nav className="flex justify-between items-center p-4 md:p-6 max-w-7xl mx-auto relative z-10">
                <div className="flex items-center gap-6">
                    {/* Logo */}
                    <Link href="/" className="text-xl font-bold tracking-tighter flex items-center gap-2">
                        <img src="/ans-logo.png" alt="ANS" className="w-8 h-8 md:w-10 md:h-10" />
                        <span className="hidden sm:inline">ANS</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-1">
                        <Link href="/docs" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1.5">
                            <Code className="w-3.5 h-3.5" />
                            Docs
                        </Link>
                        <Link href="/marketplace" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1.5">
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Market
                        </Link>
                        <Link href="/agents" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5" />
                            Demo
                        </Link>
                        <Link href="/chat" className="px-3 py-1.5 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors flex items-center gap-1.5 border border-purple-500/30">
                            ✈️ AI Booking
                        </Link>
                        {connected && (
                            <Link href="/dashboard" className="px-3 py-1.5 text-sm text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors flex items-center gap-1.5">
                                <Cpu className="w-3.5 h-3.5" />
                                Dashboard
                            </Link>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    {/* HIDDEN: Token price display - uncomment when ready to launch token
                    <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono bg-yellow-900/20 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20 mr-4">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                        $ANS: 1.00 B
                    </div>
                    */}
                    <NetworkSwitcher />
                    <div className="hidden md:block bg-white text-black rounded-full overflow-hidden hover:scale-105 transition-transform">
                        <ClientWalletButton style={{
                            backgroundColor: 'white',
                            color: 'black',
                            height: '40px',
                            borderRadius: '999px',
                            fontWeight: '600',
                            fontSize: '14px',
                            padding: '0 20px'
                        }} />
                    </div>
                    <MobileNav />
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex flex-col items-center justify-center mt-20 px-4 relative z-10">

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex text-sm text-gray-400 mb-6 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full gap-2"
                >
                    <span className="text-green-400">⛓️ Decentralized</span> | AI Agents use <span className="text-purple-400 font-mono mx-1">agent://</span>
                </motion.div>

                {/* Main Heading */}
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-center max-w-4xl bg-gradient-to-b from-white to-gray-600 bg-clip-text text-transparent mb-6">
                    Identity for the <br /> Machine Economy.
                </h1>

                <div className="flex flex-col items-center gap-4 mb-12">
                    <p className="text-gray-400 text-lg md:text-xl text-center max-w-2xl">
                        The <span className="text-green-400 font-bold">decentralized</span> identity layer for AI agents. Own your <span className="text-purple-400 font-mono">{domainPrefix}</span> namespace forever — no corporation can revoke it.
                    </p>
                    <div className="flex gap-6 text-xs font-mono flex-wrap justify-center">
                        <Link href="/marketplace" className="text-green-500 hover:underline flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3" />
                            Secondary Market
                        </Link>
                        <Link href="/seller-portal" className="text-purple-500 hover:underline flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Become a Seller
                        </Link>
                        <Link href="/docs" className="text-cyan-500 hover:underline flex items-center gap-1">
                            <Code className="w-3 h-3" />
                            SDK Docs
                        </Link>
                        <Link href="/manifesto" className="text-gray-500 hover:underline flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            Manifesto
                        </Link>
                    </div>
                </div>

                {/* Search / Mint Input */}
                <div className="w-full max-w-md relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div className="relative bg-black border border-white/10 rounded-xl p-2 flex items-center shadow-2xl">
                        <span className="pl-4 text-gray-500 font-mono select-none">{domainPrefix}</span>
                        <input
                            type="text"
                            className="flex-1 bg-transparent text-white placeholder-gray-700 outline-none px-2 font-mono"
                            placeholder="name"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value.replace(/[^a-z0-9.-]/g, '')); // Basic input sanitization
                                setStatus('idle');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && checkDomain()}
                        />
                        <button
                            onClick={() => checkDomain()}
                            className="bg-white text-black p-3 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Status / Results Card */}
                    <AnimatePresence>
                        {status !== 'idle' && status !== 'loading' && priceDisplay && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: 10, height: 0 }}
                                className="mt-4 bg-[#111] border border-white/10 rounded-xl overflow-hidden relative"
                            >
                                {/* Glow effect based on status */}
                                <div className={`absolute top-0 left-0 w-1 h-full ${status === 'available' ? 'bg-green-500' :
                                    status === 'reservation_mode' ? 'bg-yellow-500' :
                                        status === 'auction' ? 'bg-purple-600 animate-pulse' :
                                            status === 'reserved' ? 'bg-purple-500' :
                                                status === 'locked' ? 'bg-gray-500' :
                                                    status === 'restricted' ? 'bg-red-600' :
                                                        status === 'success' ? 'bg-green-400' : 'bg-red-500'
                                    }`} />

                                <div className="p-4 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold">
                                                {domainPrefix}<span className={status === 'reserved' || status === 'auction' ? 'text-purple-400' : 'text-white'}>{query}</span>
                                            </h3>
                                            {status === 'locked' && <Lock className="w-4 h-4 text-gray-500" />}
                                            {status === 'restricted' && <ShieldAlert className="w-4 h-4 text-red-500" />}
                                        </div>
                                        <p className="text-sm text-gray-400 mt-1">{message}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        {priceDisplay.strike && (
                                            <span className="text-xs text-gray-500 line-through mr-1">{priceDisplay.strike}</span>
                                        )}
                                        <div className="text-xl font-mono font-bold text-white">{priceDisplay.label}</div>

                                        {/* USDC disabled for Early Access - SOL only */}

                                        {(status === 'available' || status === 'reservation_mode' || status === 'auction') && (
                                            <div className="space-y-2 mt-2">
                                                {/* Payment Method Selector */}
                                                {status === 'reservation_mode' && currentPrice > 0 && (
                                                    <div className="flex gap-1 bg-black/50 p-1 rounded-lg">
                                                        <button
                                                            onClick={() => setPaymentMethod('SOL')}
                                                            className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all ${paymentMethod === 'SOL'
                                                                ? 'bg-purple-600 text-white'
                                                                : 'text-gray-400 hover:text-white'
                                                                }`}
                                                        >
                                                            SOL
                                                        </button>
                                                        <button
                                                            onClick={() => setPaymentMethod('USDC')}
                                                            className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all ${paymentMethod === 'USDC'
                                                                ? 'bg-green-600 text-white'
                                                                : 'text-gray-400 hover:text-white'
                                                                }`}
                                                        >
                                                            USDC
                                                        </button>
                                                        {/* HIDDEN: ANS payment option - uncomment when ready to launch token
                                                        <button
                                                            onClick={() => setPaymentMethod('ANS')}
                                                            className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${paymentMethod === 'ANS'
                                                                ? 'bg-orange-600 text-white'
                                                                : 'text-gray-400 hover:text-white'
                                                                }`}
                                                        >
                                                            ANS <span className="text-[8px] bg-green-500/30 text-green-300 px-1 rounded">-40%</span>
                                                        </button>
                                                        */}
                                                    </div>
                                                )}
                                                {/* Price Display for USDC */}
                                                {paymentMethod === 'USDC' && currentPrice > 0 && (
                                                    <div className="text-[10px] text-green-400 text-center">
                                                        Pay ${(currentPrice * SOL_USD_RATE).toFixed(0)} USDC
                                                    </div>
                                                )}
                                                {/* HIDDEN: ANS price display - uncomment when ready to launch token
                                                {paymentMethod === 'ANS' && currentPrice > 0 && (
                                                    <div className="text-[10px] text-orange-400 text-center">
                                                        Pay {((currentPrice * 0.6) / 0.05).toFixed(0)} ANS (= {(currentPrice * 0.6).toFixed(2)} SOL)
                                                    </div>
                                                )}
                                                */}
                                                <button
                                                    onClick={mintDomain}
                                                    className={`text-xs font-bold px-4 py-2 rounded-md w-full transition-colors ${status === 'reservation_mode'
                                                        ? paymentMethod === 'USDC'
                                                            ? 'bg-green-600 hover:bg-green-500 text-white'
                                                            : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                                                        : status === 'auction'
                                                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_#a855f7]'
                                                            : 'bg-green-600 hover:bg-green-500 text-white'
                                                        }`}
                                                >
                                                    {status === 'reservation_mode'
                                                        ? `Mint with ${paymentMethod}`
                                                        : status === 'auction'
                                                            ? 'Bid Now'
                                                            : (priceDisplay?.label === 'FREE' ? 'Claim Free' : 'Mint Name')
                                                    }
                                                </button>
                                            </div>
                                        )}
                                        {status === 'success' && (
                                            <div className="flex items-center gap-2 text-green-500 mt-2 text-sm font-bold">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Success
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* TIER COMPARISON INFO - FREE vs PREMIUM */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-colors cursor-default">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="text-blue-400">agent://user.*</span>
                                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">FREE</span>
                            </h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">For developers & hobbyists. Your personal agent identity.</p>
                        <ul className="text-[10px] text-gray-500 space-y-1 ml-1">
                            <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Free Forever</li>
                            <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Receive Payments</li>
                            <li>• Not transferable (Soulbound)</li>
                        </ul>
                    </div>

                    <div className="bg-purple-900/10 border border-purple-500/30 p-4 rounded-xl hover:bg-purple-900/20 transition-colors cursor-default relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-purple-500/20 to-transparent pointer-events-none"></div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="text-purple-400">agent://brand</span>
                                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">PREMIUM</span>
                            </h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">For Sovereigns & Businesses. Full Ownership.</p>
                        <ul className="text-[10px] text-gray-500 space-y-1 ml-1">
                            <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Fully Transferable NFT</li>
                            <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Commercial Rights</li>
                            <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Revenue Sharing</li>
                        </ul>
                    </div>
                </div>

                {/* Stats / Footer Mockup - REMOVED */}
                {/* --- WHY DECENTRALIZED SECTION --- */}
                <section className="w-full max-w-5xl mt-32 mb-20 animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-200 fill-mode-backwards">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 border border-orange-500/30 bg-orange-500/10 rounded text-xs font-mono text-orange-400 tracking-widest uppercase">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            THE CRUCIAL DIFFERENCE
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
                            Own Your Identity. <span className="text-orange-500">Forever.</span>
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Corporations want to control the AI agent economy. We believe in a different path.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Centralized - The Problem */}
                        <div className="relative bg-red-950/20 border border-red-500/30 rounded-2xl p-6 overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl"></div>
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span className="font-mono text-sm text-red-400 uppercase">Centralized Registries</span>
                                </div>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex gap-3 text-gray-400">
                                        <span className="text-red-500">✗</span>
                                        <span><span className="text-white">Company owns your identity</span> — can revoke anytime</span>
                                    </li>
                                    <li className="flex gap-3 text-gray-400">
                                        <span className="text-red-500">✗</span>
                                        <span><span className="text-white">Curated & permissioned</span> — they decide who joins</span>
                                    </li>
                                    <li className="flex gap-3 text-gray-400">
                                        <span className="text-red-500">✗</span>
                                        <span><span className="text-white">Opaque trust systems</span> — black-box verification</span>
                                    </li>
                                    <li className="flex gap-3 text-gray-400">
                                        <span className="text-red-500">✗</span>
                                        <span><span className="text-white">No payment protection</span> — hope and pray</span>
                                    </li>
                                    <li className="flex gap-3 text-gray-400">
                                        <span className="text-red-500">✗</span>
                                        <span><span className="text-white">Walled garden</span> — locked to their ecosystem</span>
                                    </li>
                                </ul>
                                <div className="mt-4 pt-4 border-t border-red-500/20 text-center">
                                    <span className="text-red-400 text-xs font-mono">YOU'RE RENTING</span>
                                </div>
                            </div>
                        </div>

                        {/* Decentralized - The Solution */}
                        <div className="relative bg-green-950/20 border border-green-500/30 rounded-2xl p-6 overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl"></div>
                            <div className="absolute top-2 right-2">
                                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-mono">ANS</span>
                            </div>
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="font-mono text-sm text-green-400 uppercase">Decentralized Protocol</span>
                                </div>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex gap-3 text-gray-400">
                                        <span className="text-green-500">✓</span>
                                        <span><span className="text-white font-bold">You own your identity</span> — on Solana blockchain</span>
                                    </li>
                                    <li className="flex gap-3 text-gray-400">
                                        <span className="text-green-500">✓</span>
                                        <span><span className="text-white font-bold">Permissionless</span> — anyone can register</span>
                                    </li>
                                    <li className="flex gap-3 text-gray-400">
                                        <span className="text-green-500">✓</span>
                                        <span><span className="text-white font-bold">Transparent trust</span> — on-chain, verifiable</span>
                                    </li>
                                    <li className="flex gap-3 text-gray-400">
                                        <span className="text-green-500">✓</span>
                                        <span><span className="text-white font-bold">Smart contract escrow</span> — trustless protection</span>
                                    </li>
                                    <li className="flex gap-3 text-gray-400">
                                        <span className="text-green-500">✓</span>
                                        <span><span className="text-white font-bold">Open protocol</span> — works across all platforms</span>
                                    </li>
                                </ul>
                                <div className="mt-4 pt-4 border-t border-green-500/20 text-center">
                                    <span className="text-green-400 text-xs font-mono">YOU OWN IT FOREVER</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mt-8">
                        <p className="text-gray-500 text-sm">
                            <span className="text-white font-bold">Your agent. Your rules.</span> No corporation can take that away.
                        </p>
                    </div>
                </section>

                {/* --- THE ARCHITECTURE SECTION (HARD TECH) --- */}
                <section className="w-full max-w-7xl text-left mt-32 mb-20 animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-300 fill-mode-backwards">

                    <div className="text-center mb-20">
                        <div className="inline-flex items-center gap-3 mb-4 flex-wrap justify-center">
                            <div className="px-3 py-1 border border-purple-500/30 bg-purple-500/5 rounded text-[10px] font-mono text-purple-400 tracking-widest uppercase">
                                Technical Whitepaper v1.0
                            </div>
                            <div className="px-3 py-1 border border-green-500/30 bg-green-500/5 rounded text-[10px] font-mono text-green-400 tracking-widest uppercase flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Live on Solana Devnet
                            </div>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
                            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">Inter-Agent Protocol</span>.
                        </h2>
                        <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed mb-8">
                            <span className="text-white font-bold">Problem:</span> AI agents are blind, deaf, and isolated. No shared namespace. No reputation. No payment rails.
                            <br />
                            <span className="text-white font-bold">Solution:</span> <span className="text-purple-400 font-mono">ANS</span> is the DNS for AI Agents. Discover. Verify. Transact.
                        </p>

                        {/* Trust Stats */}
                        <div className="flex justify-center gap-6 md:gap-10 flex-wrap mt-8">
                            <div className="text-center px-4">
                                <div className="text-3xl font-bold text-white">3</div>
                                <div className="text-xs text-gray-500">Protocol Layers</div>
                            </div>
                            <div className="text-center px-4">
                                <div className="text-3xl font-bold text-green-400">20ms</div>
                                <div className="text-xs text-gray-500">Avg. Resolution</div>
                            </div>
                            <div className="text-center px-4">
                                <div className="text-3xl font-bold text-white">0%</div>
                                <div className="text-xs text-gray-500">Fraud (Escrow)</div>
                            </div>
                            <div className="text-center px-4">
                                <div className="text-3xl font-bold text-purple-400">Built</div>
                                <div className="text-xs text-gray-500">Not Vaporware</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                        {/* LEFT: THE STACK (Technical breakdown) */}
                        <div className="space-y-12">
                            {/* Layer 1 */}
                            <div className="relative pl-8 border-l border-white/10 group">
                                <div className="absolute -left-[5px] top-0 w-[9px] h-[9px] bg-blue-500 rounded-full group-hover:shadow-[0_0_10px_#3b82f6] transition-shadow"></div>
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="font-mono text-blue-500 text-sm">LAYER 1</span>
                                    Resolution & Namespace.
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                    A decentralized registry maps human-readable names (`agent://finance`) to machine-readable endpoints (`StartTLS`, `SOL Address`, `PGP Key`).
                                </p>
                                <div className="font-mono text-[10px] text-gray-500 bg-black/50 p-3 rounded border border-white/5">
                                    GET agent://finance -&gt; 0x8f3...a2 (Route Verified)
                                </div>
                            </div>

                            {/* Layer 2 */}
                            <div className="relative pl-8 border-l border-white/10 group">
                                <div className="absolute -left-[5px] top-0 w-[9px] h-[9px] bg-purple-500 rounded-full group-hover:shadow-[0_0_10px_#a855f7] transition-shadow"></div>
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="font-mono text-purple-500 text-sm">LAYER 2</span>
                                    Sybil-Resistant Consensus.
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                    We replace "User Reviews" with <span className="text-white">Proof-of-Authority</span>. Agents earn rank via on-chain volume and successful API handshakes. Zero-trust by default.
                                </p>
                                <div className="font-mono text-[10px] text-gray-500 bg-black/50 p-3 rounded border border-white/5">
                                    ReputationScore = f(Stake + Peers + Uptime)
                                </div>
                            </div>

                            {/* Layer 3 - Smart Contract Escrow */}
                            <div className="relative pl-8 border-l-2 border-green-500/50 group">
                                <div className="absolute -left-[6px] top-0 w-[11px] h-[11px] bg-green-500 rounded-full group-hover:shadow-[0_0_15px_#22c55e] transition-shadow animate-pulse"></div>
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="font-mono text-green-500 text-sm">LAYER 3</span>
                                    Smart Contract Escrow.
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                    <span className="text-green-400 font-bold">What centralized registries can't do.</span> Programmable escrow locks funds until service is verified. No chargebacks. No fraud. No trust required.
                                </p>
                                <div className="font-mono text-[10px] text-gray-500 bg-green-950/30 p-3 rounded border border-green-500/30">
                                    Escrow.release(condition: ServiceVerified ✓)
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: THE TERMINAL (Visual Proof) */}
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden shadow-2xl font-mono text-xs relative group">
                            <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                            {/* Terminal Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-white/10 text-gray-500">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-[8px]">•</div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-[8px]">•</div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-[8px]">•</div>
                                </div>
                                <div className="text-[10px] tracking-widest">NET_DIAGNOSTIC_TOOL</div>
                            </div>

                            {/* Terminal Content */}
                            <div className="p-6 text-gray-400 space-y-2">
                                <div><span className="text-purple-500">&gt;</span> initiating handshake...</div>

                                <div className="opacity-50 mt-4">-- REQUEST --</div>
                                <div className="text-blue-300">
                                    RESOLVE <span className="text-white">agent://flight_bot</span>
                                    <br />
                                    CHECK <span className="text-white">trust_score</span>
                                </div>

                                <div className="opacity-50 mt-4">-- RESPONSE (20ms) --</div>
                                <div className="mb-4">
                                    <span className="text-green-400">SUCCESS:</span> Record Found
                                </div>
                                <div className="pl-4 border-l border-white/10 text-[10px] leading-relaxed">
                                    {`{`}
                                    <br />
                                    &nbsp;&nbsp;"owner": "G4n...8f2",
                                    <br />
                                    &nbsp;&nbsp;"endpoint": "wss://api.flights.io/v2",
                                    <br />
                                    &nbsp;&nbsp;"trust_rank": 98.4,
                                    <br />
                                    &nbsp;&nbsp;"verified": true,
                                    <br />
                                    &nbsp;&nbsp;"capabilities": ["search", "book", "pay"]
                                    <br />
                                    {`}`}
                                </div>

                                <div className="mt-4 pb-2">
                                    <span className="text-purple-500">&gt;</span> <span className="animate-pulse">_</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* CTA Row */}
                    <div className="mt-12 text-center">
                        <p className="text-gray-500 text-sm mb-4">
                            Don't trust. <span className="text-white">Verify.</span> Read our full technical breakdown.
                        </p>
                        <div className="flex justify-center gap-4 flex-wrap">
                            <Link href="/manifesto" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                                <Terminal className="w-4 h-4" /> Read the Manifesto
                            </Link>
                            <Link href="/docs" className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                                <Cpu className="w-4 h-4" /> Protocol Docs
                            </Link>
                            <a href="https://github.com/nexus-protocol" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                                <Code className="w-4 h-4" /> View on GitHub
                            </a>
                        </div>
                    </div>
                </section>

                {/* HIDDEN: Tokenomics section - uncomment when ready to launch token
                <section className="w-full max-w-7xl mt-20 mb-32 border-t border-white/5 pt-20">
                    ... tokenomics content hidden for launch ...
                </section>
                */}

                {/* --- ROADMAP SECTION --- */}
                <section className="w-full max-w-7xl mt-20 mb-20">
                    <div className="text-center mb-12">
                        <div className="inline-block px-3 py-1 mb-4 border border-cyan-500/30 bg-cyan-500/5 rounded text-[10px] font-mono text-cyan-400 tracking-widest uppercase">
                            Development Timeline
                        </div>
                        <h2 className="text-4xl font-bold text-white">Roadmap</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Phase 1 */}
                        <div className="bg-[#111] p-6 rounded-xl border border-green-500/30 relative">
                            <div className="absolute -top-3 left-4 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded">PHASE 1 - LIVE</div>
                            <h3 className="text-xl font-bold text-white mt-4 mb-4">Genesis Launch</h3>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Domain Registry</li>
                                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Agent Discovery</li>
                                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Reputation System</li>
                                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Multi-currency Payments</li>
                            </ul>
                        </div>

                        {/* Phase 2 */}
                        <div className="bg-[#111] p-6 rounded-xl border border-blue-500/30 relative">
                            <div className="absolute -top-3 left-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded">PHASE 2 - IN PROGRESS</div>
                            <h3 className="text-xl font-bold text-white mt-4 mb-4">Network Launch</h3>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Escrow Protocol</li>
                                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Agent Discovery API</li>
                                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Trust Score System</li>
                                <li className="flex gap-2"><span className="w-4 h-4 border-2 border-yellow-500 rounded-full flex-shrink-0 animate-pulse"></span> <span className="text-yellow-400">Onboarding Partners</span></li>
                            </ul>
                        </div>

                        {/* Phase 3 */}
                        <div className="bg-[#111] p-6 rounded-xl border border-purple-500/30 relative">
                            <div className="absolute -top-3 left-4 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded">PHASE 3 - Q2 2026</div>
                            <h3 className="text-xl font-bold text-white mt-4 mb-4">Ecosystem Scale</h3>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li className="flex gap-2"><span className="w-4 h-4 border border-gray-500 rounded-full flex-shrink-0"></span> Advanced Analytics</li>
                                <li className="flex gap-2"><span className="w-4 h-4 border border-gray-500 rounded-full flex-shrink-0"></span> Enterprise Partnerships</li>
                                <li className="flex gap-2"><span className="w-4 h-4 border border-gray-500 rounded-full flex-shrink-0"></span> Cross-chain Support</li>
                                <li className="flex gap-2"><span className="w-4 h-4 border border-gray-500 rounded-full flex-shrink-0"></span> Mobile SDK</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* HIDDEN: Tokenomics Chart - uncomment when ready to launch token
                <section className="w-full max-w-5xl mx-auto mt-20 mb-20">
                    ... tokenomics chart hidden for launch ...
                </section>
                */}

                {/* COMMUNITY SECTION */}
                <section className="mt-32 mb-16">
                    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-2xl p-8 text-center">
                        <div className="text-4xl mb-4">💬</div>
                        <h2 className="text-3xl font-bold text-white mb-4">Join the Community</h2>
                        <p className="text-gray-400 max-w-xl mx-auto mb-6">
                            Have questions? Want to share ideas? Join our Discord to connect with other builders and get support.
                        </p>
                        <a
                            href="https://discord.gg/szqNwV5y"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold rounded-xl transition-colors text-lg"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                            Join Discord
                        </a>
                        <p className="text-xs text-gray-600 mt-4">Ask questions • Share feedback • Connect with builders</p>
                    </div>
                </section>

                {/* --- FOOTER --- */}
                <footer className="w-full border-t border-white/10 pt-12 pb-8">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                            {/* Logo & Description */}
                            <div className="text-center md:text-left">
                                <div className="font-mono font-bold text-xl text-white mb-2">ANS<span className="text-purple-500">.</span></div>
                                <p className="text-sm text-gray-500 max-w-xs">The DNS for AI Agents. Discover. Verify. Transact.</p>
                            </div>

                            {/* Social Links */}
                            <div className="flex items-center gap-6">
                                <a href="https://x.com/ANSProtocol" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" title="Twitter/X">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                </a>
                                <a href="https://discord.gg/szqNwV5y" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" title="Discord">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                                </a>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-col items-center md:items-end gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
                                    <Shield className="w-3 h-3" /> Audit Pending
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live on Devnet
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                {/* Social Links */}
                                <div className="flex items-center gap-4">
                                    <a
                                        href="https://x.com/ANSProtocol"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                        @ANSProtocol
                                    </a>
                                    <span className="text-gray-700">|</span>
                                    <a
                                        href="https://discord.gg/szqNwV5y"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                        </svg>
                                        Discord
                                    </a>
                                    <span className="text-gray-700">|</span>
                                    <Link
                                        href="/docs"
                                        className="text-gray-400 hover:text-white transition-colors text-sm"
                                    >
                                        Docs
                                    </Link>
                                    <span className="text-gray-700">|</span>
                                    <Link
                                        href="/privacy"
                                        className="text-gray-400 hover:text-white transition-colors text-sm"
                                    >
                                        Privacy
                                    </Link>
                                    <span className="text-gray-700">|</span>
                                    <Link
                                        href="/terms"
                                        className="text-gray-400 hover:text-white transition-colors text-sm"
                                    >
                                        Terms
                                    </Link>
                                    <span className="text-gray-700">|</span>
                                    <a
                                        href="https://github.com/GSK7024/ANS-Protocol-Agent-Name-Service"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                        </svg>
                                        GitHub
                                    </a>
                                </div>

                                {/* Copyright */}
                                <div className="text-xs text-gray-600">
                                    Built with 🖤 on Solana | © 2025 ANS Protocol
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>

            </main>

            {/* AUCTION MODAL */}
            <AuctionModal
                domain={query}
                isOpen={isAuctionOpen}
                onClose={() => setIsAuctionOpen(false)}
            />


            <InventoryModal
                isOpen={isInventoryOpen}
                onClose={() => setIsInventoryOpen(false)}
                onSelect={(name) => {
                    checkDomain(name);
                }}
                initialTab={inventoryTab === 'starter' ? 'founder' : inventoryTab}
            />
        </div>
    );
}
'use client';

import React, { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { LogOut } from 'lucide-react';

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export default function ClientWalletButton({ style }: { style?: React.CSSProperties }) {
    const { connected, disconnect } = useWallet();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="flex items-center gap-2">
            <WalletMultiButtonDynamic style={style} />
            {mounted && connected && (
                <button
                    onClick={disconnect}
                    className="p-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 transition-colors border border-red-500/20"
                    title="Disconnect / Logout"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}

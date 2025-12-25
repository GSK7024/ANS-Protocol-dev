"use client";

import { useState, useEffect, useRef } from 'react';

// 🔧 Production deployment URLs
const MAINNET_URL = "https://ans-protocol.vercel.app";
const DEVNET_URL = "https://ans-devnet.vercel.app";

// Detect which deployment we're on based on hostname
function detectCurrentNetwork(): 'mainnet' | 'devnet' {
    if (typeof window === 'undefined') return 'mainnet';
    const hostname = window.location.hostname;
    if (hostname.includes('devnet')) {
        return 'devnet';
    }
    return 'mainnet';
}

export function NetworkSwitcher() {
    const [network, setNetwork] = useState<'mainnet' | 'devnet'>('mainnet');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setNetwork(detectCurrentNetwork());
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSwitch = (newNetwork: 'mainnet' | 'devnet') => {
        setIsOpen(false);
        if (newNetwork === network) return;

        if (newNetwork === 'devnet') {
            window.location.href = DEVNET_URL;
        } else {
            window.location.href = MAINNET_URL;
        }
    };

    return (
        <div className="relative" ref={dropdownRef} style={{ zIndex: 9999 }}>
            {/* Hint for mainnet users */}
            {network === 'mainnet' && !isOpen && (
                <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-[11px] text-purple-400 font-medium animate-pulse">
                    ✨ Try free on Devnet →
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                type="button"
                style={{ cursor: 'pointer' }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${network === 'mainnet'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                    }`}
            >
                <span className={`w-2 h-2 rounded-full ${network === 'mainnet' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></span>
                {network === 'mainnet' ? '🟢 Mainnet' : '🟡 Devnet'}
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
                    style={{ zIndex: 99999 }}
                >
                    {/* Mainnet Option */}
                    <div
                        onClick={() => handleSwitch('mainnet')}
                        style={{ cursor: 'pointer' }}
                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors ${network === 'mainnet' ? 'bg-green-500/10' : ''}`}
                    >
                        <span className="text-xl">🟢</span>
                        <div>
                            <div className="font-bold text-white text-sm">Mainnet</div>
                            <div className="text-xs text-gray-400">Real value • agent://name</div>
                        </div>
                        {network === 'mainnet' && <span className="ml-auto text-green-400">✓</span>}
                    </div>

                    <div className="border-t border-gray-700"></div>

                    {/* Devnet Option - Links to separate deployment */}
                    <div
                        onClick={() => handleSwitch('devnet')}
                        style={{ cursor: 'pointer' }}
                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors ${network === 'devnet' ? 'bg-yellow-500/10' : ''}`}
                    >
                        <span className="text-xl">🟡</span>
                        <div>
                            <div className="font-bold text-white text-sm">Devnet</div>
                            <div className="text-xs text-gray-400">Free testing • dev.agent://name</div>
                        </div>
                        {network === 'devnet' ? (
                            <span className="ml-auto text-yellow-400">✓</span>
                        ) : (
                            <span className="ml-auto text-xs text-gray-500">→ Opens devnet.ans.gg</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Banner shown when on Devnet
 */
export function DevnetBanner() {
    const [network, setNetwork] = useState<'mainnet' | 'devnet'>('mainnet');

    useEffect(() => {
        setNetwork(detectCurrentNetwork());
    }, []);

    if (network !== 'devnet') return null;

    return (
        <div className="bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-black text-center py-2 px-4 font-bold text-sm flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>DEVNET MODE - No Real Value</span>
            <span className="text-yellow-900">•</span>
            <span>Domains: dev.agent://name</span>
            <span className="text-yellow-900">•</span>
            <a
                href={MAINNET_URL}
                className="underline hover:no-underline"
            >
                Switch to Mainnet →
            </a>
        </div>
    );
}

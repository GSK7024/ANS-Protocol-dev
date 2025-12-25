'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, ShoppingCart, Code, MessageSquare, LayoutDashboard, FileText, Scroll } from 'lucide-react';
import ClientWalletButton from './ClientWalletButton';

const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/chat', label: 'AI Booking', icon: MessageSquare, highlight: true },
    { href: '/marketplace', label: 'Market', icon: ShoppingCart },
    { href: '/docs', label: 'Docs', icon: Code },
    { href: '/manifesto', label: 'Manifesto', icon: Scroll },
];

export default function MobileNav() {
    const { connected } = useWallet();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <Menu className="w-6 h-6 text-white" />
                )}
            </button>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        />

                        {/* Menu Panel */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed top-0 right-0 bottom-0 w-72 bg-[#0a0a0a] border-l border-white/10 z-50 md:hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <span className="font-bold text-white">Menu</span>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            {/* Wallet */}
                            <div className="p-4 border-b border-white/10">
                                <div className="bg-white text-black rounded-full overflow-hidden">
                                    <ClientWalletButton style={{
                                        backgroundColor: 'white',
                                        color: 'black',
                                        width: '100%',
                                        justifyContent: 'center',
                                    }} />
                                </div>
                            </div>

                            {/* Nav Items */}
                            <nav className="p-4 space-y-2">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={`
                                            flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                                            ${item.highlight
                                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }
                                        `}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                        {item.highlight && (
                                            <span className="ml-auto text-xs bg-purple-500/20 px-2 py-0.5 rounded-full">New</span>
                                        )}
                                    </Link>
                                ))}

                                {/* Dashboard - Only when connected */}
                                {connected && (
                                    <Link
                                        href="/dashboard"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-green-400 bg-green-500/10 border border-green-500/30 transition-colors"
                                    >
                                        <LayoutDashboard className="w-5 h-5" />
                                        <span className="font-medium">Dashboard</span>
                                    </Link>
                                )}
                            </nav>

                            {/* Footer */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 text-center">
                                <p className="text-xs text-gray-500">
                                    agent:// Protocol v1.0
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

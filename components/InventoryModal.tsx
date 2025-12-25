import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gavel, Star, Shield, Play } from 'lucide-react';
import { CROWN_JEWELS, TITAN_TIER, FOUNDER_TIER } from '@/utils/genesis_constants';

interface InventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (name: string) => void;
    initialTab?: 'auction' | 'titan' | 'founder';
}

export default function InventoryModal({ isOpen, onClose, onSelect, initialTab = 'auction' }: InventoryModalProps) {
    const [activeTab, setActiveTab] = useState<'auction' | 'titan' | 'founder'>(initialTab);

    if (!isOpen) return null;

    const handleNameClick = (name: string) => {
        onSelect(name);
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden relative shadow-2xl flex flex-col max-h-[80vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            Genesis Inventory
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-gray-400 font-mono">LIVE</span>
                        </h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/10">
                        <button
                            onClick={() => setActiveTab('auction')}
                            className={`flex-1 p-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'auction' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-gray-500 hover:text-white'}`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Gavel className="w-4 h-4" /> Crown Jewels
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('titan')}
                            className={`flex-1 p-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'titan' ? 'border-green-500 text-green-400 bg-green-500/5' : 'border-transparent text-gray-500 hover:text-white'}`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Star className="w-4 h-4" /> Titan Tier
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('founder')}
                            className={`flex-1 p-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'founder' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-500 hover:text-white'}`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Shield className="w-4 h-4" /> Founder Tier
                            </div>
                        </button>
                    </div>

                    {/* Content Grid */}
                    <div className="p-6 overflow-y-auto min-h-[300px]">

                        {/* AUCTION TAB */}
                        {activeTab === 'auction' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-4 text-center">
                                    <h3 className="text-purple-400 font-bold text-lg mb-1">The High Rollers</h3>
                                    <p className="text-gray-500 text-sm">Highest Bidder Wins. Verification Required.</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {Array.from(CROWN_JEWELS).map(name => (
                                        <button
                                            key={name}
                                            onClick={() => handleNameClick(name)}
                                            className="group bg-purple-900/10 border border-purple-500/20 hover:border-purple-500 hover:bg-purple-900/30 rounded-lg p-4 flex items-center justify-between transition-all"
                                        >
                                            <span className="font-mono text-purple-200 group-hover:text-white">agent://{name}</span>
                                            <Play className="w-3 h-3 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TITAN TAB */}
                        {activeTab === 'titan' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-4 text-center">
                                    <h3 className="text-green-400 font-bold text-lg mb-1">Titan Tier (2.5 SOL)</h3>
                                    <p className="text-gray-500 text-sm">Premium Short Names. Instant Buy.</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {Array.from(TITAN_TIER).map(name => (
                                        <button
                                            key={name}
                                            onClick={() => handleNameClick(name)}
                                            className="group bg-green-900/10 border border-green-500/20 hover:border-green-500 hover:bg-green-900/30 rounded-lg p-3 flex items-center justify-center transition-all"
                                        >
                                            <span className="font-mono text-green-200 group-hover:text-white">{name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* FOUNDER TAB */}
                        {activeTab === 'founder' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-4 text-center">
                                    <h3 className="text-blue-400 font-bold text-lg mb-1">Founder Tier (0.35 SOL)</h3>
                                    <p className="text-gray-500 text-sm">Professional Utilities. Instant Buy.</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {Array.from(FOUNDER_TIER).map(name => (
                                        <button
                                            key={name}
                                            onClick={() => handleNameClick(name)}
                                            className="group bg-blue-900/10 border border-blue-500/20 hover:border-blue-500 hover:bg-blue-900/30 rounded-lg p-3 flex items-center justify-center transition-all"
                                        >
                                            <span className="font-mono text-blue-200 group-hover:text-white">{name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

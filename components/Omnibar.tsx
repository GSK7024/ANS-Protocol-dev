import { useState, KeyboardEvent } from 'react';
import { Search, Globe, Zap, ArrowRight, Command } from 'lucide-react';

interface OmnibarProps {
    onNavigate: (query: string) => void;
    loading?: boolean;
}

export default function Omnibar({ onNavigate, loading }: OmnibarProps) {
    const [input, setInput] = useState('');

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && input.trim()) {
            onNavigate(input.trim());
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto relative group z-50">
            {/* Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl opacity-20 group-hover:opacity-40 transition-opacity blur"></div>

            <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl p-4 shadow-2xl">
                {/* Protocol Icon */}
                <div className="mr-4 flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-purple-400">
                    {input.startsWith('agent://') ? <Globe className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                </div>

                {/* Input Field */}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type 'agent://name' or 'skill:booking'..."
                    className="flex-1 bg-transparent text-lg font-mono text-white placeholder-gray-600 focus:outline-none"
                    spellCheck={false}
                    autoFocus
                />

                {/* Status/Action */}
                <div className="ml-4 flex items-center gap-2">
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <button
                            onClick={() => input.trim() && onNavigate(input.trim())}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Helper Hints */}
            <div className="absolute top-full left-0 mt-2 pl-4 text-xs text-gray-600 font-mono flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="flex items-center gap-1"><Command className="w-3 h-3" /> Navigation</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Execution</span>
            </div>
        </div>
    );
}

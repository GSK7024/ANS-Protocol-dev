"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, Lock, Plus, Trash2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

// In a real app, this should be a user-signed signature or derived key.
// For the "Paper Tiger" MVP, we use a constant to demonstrate the encryption flow.
// WARNING: This is less secure than a signature-derived key but good for demo.
const APP_SECRET_KEY = "AGENT_PROTOCOL_MASTER_KEY_V1";

interface Secret {
    id: string;
    key_name: string;
    created_at: string;
    encrypted_value: string;
}

export default function Vault({ profileId }: { profileId: string }) {
    const [secrets, setSecrets] = useState<Secret[]>([]);
    const [loading, setLoading] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newValue, setNewValue] = useState('');
    const [adding, setAdding] = useState(false);

    // State to toggle showing the decrypted values locally
    const [showValues, setShowValues] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (profileId) fetchSecrets();
    }, [profileId]);

    const fetchSecrets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('secrets')
            .select('*')
            .eq('owner_id', profileId)
            .order('created_at', { ascending: false });

        if (data) setSecrets(data);
        setLoading(false);
    };

    const addSecret = async () => {
        if (!newKeyName || !newValue) return;
        setAdding(true);

        try {
            // 1. Client-Side Encryption
            const encrypted = AES.encrypt(newValue, APP_SECRET_KEY).toString();

            // 2. Save to DB
            const { error } = await supabase.from('secrets').insert({
                owner_id: profileId,
                key_name: newKeyName.toUpperCase(), // Standardize format
                encrypted_value: encrypted
            });

            if (error) throw error;

            setNewKeyName('');
            setNewValue('');
            fetchSecrets(); // Refresh list

        } catch (err) {
            console.error("Failed to add secret:", err);
            alert("Failed to save secret.");
        } finally {
            setAdding(false);
        }
    };

    const deleteSecret = async (id: string) => {
        if (!confirm("Are you sure you want to delete this key?")) return;

        const { error } = await supabase.from('secrets').delete().eq('id', id);
        if (!error) {
            setSecrets(prev => prev.filter(s => s.id !== id));
        }
    };

    const toggleShow = (id: string, encryptedValue: string) => {
        // If currently showing, hide it
        if (showValues[id]) {
            setShowValues(prev => ({ ...prev, [id]: false }));
            return;
        }

        // To show, we must decrypt
        try {
            // Check if we can decrypt
            const bytes = AES.decrypt(encryptedValue, APP_SECRET_KEY);
            const decrypted = bytes.toString(Utf8);

            if (!decrypted) throw new Error("Decryption failed");

            // We don't store the decrypted value in state for safety, 
            // we just toggle the "Show" flag. 
            // Wait, to display it we DO need it. 
            // Let's store the decrypted string in the state instead of boolean.
            setShowValues(prev => ({ ...prev, [id]: decrypted }));

        } catch (e) {
            alert("Could not decrypt. Key might have changed.");
        }
    };

    // Helper to render value (hidden or decrypted)
    const renderValue = (id: string, encrypted: string) => {
        const val = showValues[id];
        if (typeof val === 'string') return <span className="text-green-400 font-mono">{val}</span>;

        // Return truncated encrypted string
        return <span className="text-gray-600 font-mono text-xs max-w-[200px] truncate block" title={encrypted}>{encrypted.substring(0, 20)}...</span>;
    };

    return (
        <div className="bg-[#111] border border-white/10 rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <ShieldCheck className="w-32 h-32 text-purple-600" />
            </div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-purple-900/20 rounded-lg">
                    <Lock className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">The Vault</h2>
                    <p className="text-sm text-gray-500">Securely store API keys. Encrypted client-side.</p>
                </div>
            </div>

            {/* Add New Secret Form */}
            <div className="grid md:grid-cols-12 gap-4 mb-8 bg-white/5 p-4 rounded-lg border border-white/5">
                <div className="md:col-span-4">
                    <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Key Name</label>
                    <input
                        type="text"
                        placeholder="OPENAI_API_KEY"
                        value={newKeyName}
                        onChange={e => setNewKeyName(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white font-mono placeholder:text-gray-700 focus:border-purple-500 outline-none"
                    />
                </div>
                <div className="md:col-span-6">
                    <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Value</label>
                    <input
                        type="password"
                        placeholder="sk-..."
                        value={newValue}
                        onChange={e => setNewValue(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white font-mono placeholder:text-gray-700 focus:border-purple-500 outline-none"
                    />
                </div>
                <div className="md:col-span-2 flex items-end">
                    <button
                        onClick={addSecret}
                        disabled={!newKeyName || !newValue || adding}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Key
                    </button>
                </div>
            </div>

            {/* Secrets List */}
            <div className="space-y-2 relative z-10">
                {loading ? (
                    <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500" /></div>
                ) : secrets.length === 0 ? (
                    <div className="text-center text-gray-600 italic py-4">No secrets stored in the Vault.</div>
                ) : (
                    secrets.map(secret => (
                        <div key={secret.id} className="flex items-center justify-between bg-black/40 border border-white/5 p-3 rounded-lg hover:border-purple-500/30 transition-colors group">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-2 h-2 rounded-full bg-purple-500/50"></div>
                                <span className="font-mono font-bold text-gray-300 text-sm">{secret.key_name}</span>
                                <div className="flex-1">
                                    {renderValue(secret.id, secret.encrypted_value)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleShow(secret.id, secret.encrypted_value)}
                                    className="p-2 hover:bg-white/10 rounded-md text-gray-500 hover:text-white transition-colors"
                                    title="Decrypt & View"
                                >
                                    {typeof showValues[secret.id] === 'string' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => deleteSecret(secret.id)}
                                    className="p-2 hover:bg-red-900/30 rounded-md text-gray-500 hover:text-red-400 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}


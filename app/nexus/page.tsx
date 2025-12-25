"use client";

import { useState } from 'react';
import Omnibar from '@/components/Omnibar';
import AgentView from '@/components/AgentView';
import { AgentManifest } from '@/utils/schema';
import { Network } from 'lucide-react';

export default function NexusPage() {
    const [manifest, setManifest] = useState<AgentManifest | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentAddress, setCurrentAddress] = useState('');

    const handleNavigate = async (query: string) => {
        setLoading(true);
        setError(null);
        setManifest(null);
        setCurrentAddress(query);

        try {
            let targetUrl = query;

            // 1. Resolve agent:// handle
            if (query.startsWith('agent://')) {
                const name = query.replace('agent://', '');
                const resolveRes = await fetch(`/api/resolve?name=${name}`);

                if (!resolveRes.ok) {
                    throw new Error(`Could not resolve identity: ${name}`);
                }

                const resolveData = await resolveRes.json();
                if (!resolveData.resolution?.endpoint) {
                    throw new Error(`Agent ${name} has no endpoint configured.`);
                }

                targetUrl = resolveData.resolution.endpoint;
            }

            // 2. Fetch Manifest (acting as the "Browser Engine")
            const verifyRes = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl })
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
                throw new Error(verifyData.error || "Failed to load agent manifest");
            }

            // 3. Render
            // We construct the full manifest object from the verify response + defaults if needed
            // The verify endpoint returns { valid, skills, category, identity }
            // But we need the full AgentManifest for the view. 
            // In a real browser, we'd fetch the raw JSON.
            // For now, let's look at what /api/verify returns.
            // It returns a subset. We should probbaly fetch the raw JSON directly in the client 
            // OR update /api/verify to return the full payload.
            // Let's assume for this MVP we fetch the raw JSON ourselves via a proxy or 
            // just rely on what we have. 
            // Actually, /api/verify is already a proxy. Let's update it to return the full data?
            // Or just mock the rest for now to be safe.

            // Re-constructing a "full" manifest for the UI 
            const fullManifest: AgentManifest = {
                identity: verifyData.identity || query,
                version: "1.0.0", // Placeholder if not returned
                description: "Agent running on the Agent Protocol network.", // Placeholder
                category: verifyData.category || 'Other',
                tags: [],
                skills: verifyData.skills.map((s: string) => ({ name: s, pricing: { amount: 0, currency: 'FREE' } })),
                ...verifyData.data // If we update the API to return 'data' field
            };

            setManifest(fullManifest);

        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 flex flex-col items-center">

            {/* Browser Chrome (Header) */}
            <div className={`w-full transition-all duration-500 ${manifest ? 'py-4 border-b border-white/5 bg-[#0a0a0a]' : 'flex-1 flex flex-col justify-center'}`}>

                {!manifest && (
                    <div className="text-center mb-12 animate-in fade-in zoom-in duration-700">
                        <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-2xl mx-auto mb-6 shadow-[0_0_50px_rgba(124,58,237,0.5)] flex items-center justify-center">
                            <Network className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-5xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                            ANS
                        </h1>
                        <p className="text-gray-400 font-mono text-sm uppercase tracking-[0.2em]">The Agent Protocol Browser</p>
                    </div>
                )}

                <Omnibar onNavigate={handleNavigate} loading={loading} />
            </div>

            {/* Viewport (Content) */}
            <div className="w-full flex-1 bg-[#050505] p-6">
                {error && (
                    <div className="max-w-2xl mx-auto mt-12 p-6 border border-red-500/20 bg-red-500/5 rounded-xl text-center">
                        <h3 className="text-red-400 font-bold mb-2">Connection Failed</h3>
                        <p className="text-gray-400 font-mono text-sm">{error}</p>
                    </div>
                )}

                {manifest && (
                    <AgentView manifest={manifest} address={currentAddress} verified={true} />
                )}
            </div>
        </div>
    );
}

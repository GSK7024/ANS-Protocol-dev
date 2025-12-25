import { AgentManifest } from '@/utils/schema';
import { ShieldCheck, Cpu, Clock, DollarSign, ExternalLink, Code2 } from 'lucide-react';

interface AgentViewProps {
    manifest: AgentManifest;
    address: string;
    verified: boolean;
}

export default function AgentView({ manifest, address, verified }: AgentViewProps) {
    return (
        <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Card */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                    {verified && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3" /> VERIFIED PROTOCOL
                        </div>
                    )}
                </div>

                <div className="flex items-start gap-6">
                    {/* Identity Icon */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-3xl font-bold shadow-[0_0_30px_rgba(147,51,234,0.3)]">
                        {manifest.identity.split('//')[1]?.[0]?.toUpperCase() || 'A'}
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 font-mono tracking-tight">{manifest.identity}</h1>
                        <p className="text-gray-400 max-w-xl leading-relaxed">{manifest.description}</p>

                        <div className="flex gap-4 mt-6 text-sm text-gray-500 font-mono">
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> v{manifest.version}</span>
                            <span className="flex items-center gap-1"><Cpu className="w-4 h-4" /> {manifest.category}</span>
                            <span className="px-2 py-0.5 bg-white/5 rounded text-gray-400">#{manifest.tags.join(' #')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Capabilities Grid */}
            <h2 className="text-xl font-bold text-gray-400 mb-4 px-2 flex items-center gap-2">
                <Code2 className="w-5 h-5" /> Available Capabilities
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {manifest.skills.map((skill, idx) => {
                    // Check if it's a full skill object or just a string
                    const isObj = typeof skill !== 'string';
                    const name = isObj ? skill.name : skill;
                    const desc = isObj ? skill.description : null;
                    const price = isObj ? skill.pricing : { amount: 0, currency: 'FREE' };

                    return (
                        <div key={idx} className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 hover:border-purple-500/50 hover:bg-[#151515] transition-all group cursor-pointer">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-mono text-purple-400 font-bold text-lg group-hover:text-purple-300">
                                    {name}
                                </h3>
                                <div className="flex items-center gap-1 text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
                                    <DollarSign className="w-3 h-3" />
                                    {price?.amount === 0 ? 'FREE' : `${price?.amount} ${price?.currency}`}
                                </div>
                            </div>

                            {desc && <p className="text-sm text-gray-400 mb-3">{desc}</p>}

                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-xs bg-white text-black px-3 py-1.5 rounded font-bold hover:bg-gray-200 flex items-center gap-1">
                                    <Cpu className="w-3 h-3" />
                                    Execute
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

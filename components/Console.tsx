import { useState, useEffect, useRef } from 'react';
import { Skill } from '@/utils/schema';
import { Terminal, Play, X, Loader2, Save } from 'lucide-react';

interface ConsoleProps {
    skill: Skill;
    agentName: string;
    onClose: () => void;
}

interface Log {
    timestamp: string;
    type: 'info' | 'success' | 'error' | 'output';
    message: string;
}

export default function Console({ skill, agentName, onClose }: ConsoleProps) {
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [logs, setLogs] = useState<Log[]>([]);
    const [status, setStatus] = useState<'idle' | 'running' | 'completed'>('idle');
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (type: Log['type'], message: string) => {
        setLogs(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            type,
            message
        }]);
    };

    const executeSkill = async () => {
        setStatus('running');
        setLogs([]); // Clear previous logs
        addLog('info', `Initializing execution context for ${skill.name}...`);
        addLog('info', `Target Agent: ${agentName}`);

        // Simulate Network Latency
        await new Promise(r => setTimeout(r, 800));

        // Validate Inputs
        if (skill.inputs) {
            const missing = Object.keys(skill.inputs).filter(key => !inputs[key]);
            if (missing.length > 0) {
                addLog('error', `Missing required inputs: ${missing.join(', ')}`);
                setStatus('idle');
                return;
            }
        }

        addLog('info', `Constructing payload: ${JSON.stringify(inputs)}`);

        // Simulate Execution (In a real scenario, this would POST to the agent's endpoint)
        await new Promise(r => setTimeout(r, 1500));

        // Mock Logic based on skill name
        let response = {};
        if (skill.name === 'find_fastest_route') {
            response = {
                route_id: `rt_${Math.random().toString(36).substring(7)}`,
                eta_seconds: 4200,
                price: "0.05 SOL",
                provider: "HyperLoop Global"
            };
        } else if (skill.name === 'book_hyperloop') {
            response = {
                booking_ref: `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                status: "CONFIRMED",
                seat: "12A"
            };
        } else {
            response = { status: "executed", output: "Simulation successful" };
        }

        addLog('output', JSON.stringify(response, null, 2));
        addLog('success', `Execution completed in 2.3s`);
        setStatus('completed');
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#111]">
                    <div className="flex items-center gap-2 font-mono">
                        <Terminal className="w-4 h-4 text-purple-400" />
                        <span className="text-gray-400">root@nexus:~/</span>
                        <span className="text-white font-bold">{skill.name}</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Input Panel */}
                    <div className="w-1/3 border-r border-white/10 p-6 bg-[#0f0f0f] overflow-y-auto">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Save className="w-3 h-3" /> Input Parameters
                        </h3>

                        {skill.inputs ? (
                            <div className="space-y-4">
                                {Object.entries(skill.inputs).map(([key, type]) => (
                                    <div key={key}>
                                        <label className="block text-xs text-purple-300 font-mono mb-1.5">{key} <span className="text-gray-600">({type})</span></label>
                                        <input
                                            type="text"
                                            value={inputs[key] || ''}
                                            onChange={(e) => setInputs(prev => ({ ...prev, [key]: e.target.value }))}
                                            disabled={status === 'running'}
                                            className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white font-mono focus:border-purple-500/50 focus:outline-none transition-colors"
                                            placeholder={`Enter ${key}...`}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600 italic">No parameters required.</p>
                        )}

                        <button
                            onClick={executeSkill}
                            disabled={status === 'running'}
                            className="w-full mt-8 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 disabled:text-gray-400 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                            {status === 'running' ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Executing...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" /> Run Skill
                                </>
                            )}
                        </button>
                    </div>

                    {/* Output Terminal */}
                    <div className="flex-1 bg-black p-6 font-mono text-sm overflow-y-auto">
                        {logs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-2">
                                <Terminal className="w-8 h-8 opacity-20" />
                                <p>Ready to execute.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {logs.map((log, idx) => (
                                    <div key={idx} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <span className="text-gray-600 shrink-0 select-none">[{log.timestamp}]</span>
                                        <div className="break-all whitespace-pre-wrap">
                                            {log.type === 'info' && <span className="text-blue-400">ℹ {log.message}</span>}
                                            {log.type === 'error' && <span className="text-red-400">✖ {log.message}</span>}
                                            {log.type === 'success' && <span className="text-green-400">✔ {log.message}</span>}
                                            {log.type === 'output' && (
                                                <div className="mt-1 p-3 bg-white/5 border border-white/10 rounded text-green-300 overflow-x-auto">
                                                    {log.message}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

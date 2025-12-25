import Link from 'next/link';
import { Wrench, ArrowLeft, Twitter, MessageCircle } from 'lucide-react';

/**
 * Maintenance Page
 * 
 * Displayed when MAINTENANCE_MODE=true in environment.
 * Use this during deployments or scheduled maintenance.
 */

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
            <div className="text-center max-w-lg">
                {/* Icon */}
                <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Wrench className="w-12 h-12 text-yellow-500" />
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                    Under Maintenance
                </h1>

                {/* Description */}
                <p className="text-gray-400 text-lg mb-8">
                    We're performing scheduled maintenance to improve ANS Protocol.
                    We'll be back shortly!
                </p>

                {/* Estimated Time */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8">
                    <div className="text-sm text-gray-500 mb-1">Estimated downtime</div>
                    <div className="text-2xl font-mono text-yellow-400">~30 minutes</div>
                </div>

                {/* Status Links */}
                <div className="flex gap-4 justify-center mb-8">
                    <a
                        href="https://twitter.com/ansprotocol"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Twitter className="w-4 h-4" />
                        Status Updates
                    </a>
                    <a
                        href="https://discord.gg/ansprotocol"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <MessageCircle className="w-4 h-4" />
                        Discord
                    </a>
                </div>

                {/* Footer */}
                <p className="text-sm text-gray-600">
                    Questions? Email us at{' '}
                    <a href="mailto:support@ans.dev" className="text-purple-400 hover:underline">
                        support@ans.dev
                    </a>
                </p>
            </div>
        </div>
    );
}

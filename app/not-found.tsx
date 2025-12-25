'use client';

import Link from 'next/link';
import { Search, Home, ArrowLeft } from 'lucide-react';

/**
 * Custom 404 Page
 * 
 * Displayed when a page is not found.
 */

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
            <div className="text-center max-w-lg">
                {/* 404 Number */}
                <div className="text-[150px] font-bold leading-none text-white/10 select-none">
                    404
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold tracking-tight mb-4 -mt-8">
                    Agent Not Found
                </h1>

                {/* Description */}
                <p className="text-gray-400 mb-8">
                    The page you're looking for doesn't exist or the agent has gone offline.
                </p>

                {/* Search Box */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8">
                    <p className="text-sm text-gray-500 mb-3">Looking for an agent?</p>
                    <form action="/" method="GET" className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                name="q"
                                placeholder="Search agent://..."
                                className="w-full bg-black border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-purple-500"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* Navigation Links */}
                <div className="flex gap-4 justify-center">
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Home
                    </Link>
                    <Link
                        href="/marketplace"
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Search className="w-4 h-4" />
                        Browse Agents
                    </Link>
                </div>

                {/* Back Link */}
                <button
                    onClick={() => window.history.back()}
                    className="mt-8 text-sm text-gray-500 hover:text-white flex items-center gap-1 mx-auto transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" />
                    Go Back
                </button>
            </div>
        </div>
    );
}

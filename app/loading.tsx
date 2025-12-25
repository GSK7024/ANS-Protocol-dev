import { Loader2 } from 'lucide-react';

/**
 * Loading Component
 * 
 * Displayed during route transitions and data fetching.
 * Next.js automatically uses this for Suspense boundaries.
 */

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <div className="text-center">
                {/* Spinner */}
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />

                {/* Text */}
                <p className="text-gray-400 animate-pulse">Loading...</p>
            </div>
        </div>
    );
}

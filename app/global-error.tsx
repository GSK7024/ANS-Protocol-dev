'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

/**
 * Global Error Page
 * 
 * Displayed when an unhandled error occurs.
 * This is a client component to handle client-side errors.
 */

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Global error:', error);

        // TODO: Send to Sentry, LogRocket, etc.
        // Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="en">
            <body className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
                <div className="text-center max-w-lg">
                    {/* Icon */}
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold tracking-tight mb-4">
                        Something Went Wrong
                    </h1>

                    {/* Description */}
                    <p className="text-gray-400 mb-6">
                        An unexpected error occurred. Our team has been notified.
                    </p>

                    {/* Error Details (Development Only) */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4 mb-6 text-left">
                            <div className="flex items-center gap-2 mb-2">
                                <Bug className="w-4 h-4 text-red-400" />
                                <span className="text-sm font-medium text-red-400">Error Details</span>
                            </div>
                            <pre className="text-xs text-red-300 overflow-auto max-h-32">
                                {error.message}
                            </pre>
                            {error.digest && (
                                <div className="text-xs text-gray-500 mt-2">
                                    Digest: {error.digest}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={reset}
                            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                        <Link
                            href="/"
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors"
                        >
                            <Home className="w-4 h-4" />
                            Go Home
                        </Link>
                    </div>

                    {/* Support Link */}
                    <p className="mt-8 text-sm text-gray-600">
                        Need help?{' '}
                        <a
                            href="mailto:support@ans.dev"
                            className="text-purple-400 hover:underline"
                        >
                            Contact Support
                        </a>
                    </p>
                </div>
            </body>
        </html>
    );
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware
 * 
 * Runs before every request. Used for:
 * - Maintenance mode redirects
 * - Rate limiting headers
 * - Security headers
 */

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // 1. MAINTENANCE MODE
    // Set MAINTENANCE_MODE=true in .env to enable
    const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    const isMaintenancePage = request.nextUrl.pathname === '/maintenance';
    const isApiHealth = request.nextUrl.pathname === '/api/health';
    const isStaticAsset = request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/static') ||
        request.nextUrl.pathname.includes('.');

    if (maintenanceMode && !isMaintenancePage && !isApiHealth && !isStaticAsset) {
        return NextResponse.redirect(new URL('/maintenance', request.url));
    }

    // 2. SECURITY HEADERS
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // 3. CORS for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

        // Handle preflight
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, { status: 204, headers: response.headers });
        }
    }

    return response;
}

// Configure which paths middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (favicon)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

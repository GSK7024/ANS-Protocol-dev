import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Health Check Endpoint
 * 
 * Used for monitoring and uptime checks.
 * Returns status of all critical services.
 * 
 * GET /api/health
 */

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    services: {
        database: 'up' | 'down';
        cache?: 'up' | 'down';
    };
    latency: {
        database: number;
    };
}

export async function GET() {
    const startTime = Date.now();
    const health: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        services: {
            database: 'down',
        },
        latency: {
            database: 0,
        },
    };

    // Check Supabase connection
    try {
        const dbStart = Date.now();
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Simple query to test connection
        const { error } = await supabase
            .from('domains')
            .select('id')
            .limit(1);

        health.latency.database = Date.now() - dbStart;

        if (error) {
            health.services.database = 'down';
            health.status = 'degraded';
        } else {
            health.services.database = 'up';
        }
    } catch (err) {
        health.services.database = 'down';
        health.status = 'unhealthy';
    }

    // Determine overall status
    const allServicesUp = Object.values(health.services).every(s => s === 'up');
    if (!allServicesUp) {
        health.status = health.services.database === 'down' ? 'unhealthy' : 'degraded';
    }

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 :
        health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, {
        status: statusCode,
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        }
    });
}

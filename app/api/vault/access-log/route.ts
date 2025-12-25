/**
 * Vault Access Log API
 * 
 * GET - User can see who accessed their vault data
 * Shows audit trail for transparency
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVaultAccessLog } from '@/utils/vault_access';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const agent_name = searchParams.get('agent');

    if (!agent_name) {
        return NextResponse.json(
            { error: 'Missing agent parameter' },
            { status: 400 }
        );
    }

    try {
        const logs = await getVaultAccessLog(agent_name);

        return NextResponse.json({
            agent: `agent://${agent_name}`,
            total_accesses: logs.length,
            access_log: logs.map(log => ({
                accessed_by: `agent://${log.accessor_agent}`,
                fields: log.fields_accessed,
                purpose: log.purpose,
                escrow_id: log.escrow_id,
                when: log.accessed_at
            }))
        });

    } catch (err) {
        console.error('Access log error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch access log' },
            { status: 500 }
        );
    }
}

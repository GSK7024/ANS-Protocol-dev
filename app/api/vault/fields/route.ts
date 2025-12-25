/**
 * Agent Vault - List Available Field Types
 * 
 * GET - Returns all standard field types that can be stored
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: NextRequest) {
    try {
        const { data: fields, error } = await supabase
            .from('vault_field_types')
            .select('*')
            .order('category');

        if (error) {
            return NextResponse.json(
                { error: 'Failed to fetch field types' },
                { status: 500 }
            );
        }

        // Group by category
        const categories: Record<string, any[]> = {};

        for (const field of fields || []) {
            if (!categories[field.category]) {
                categories[field.category] = [];
            }
            categories[field.category].push({
                field_name: field.field_name,
                display_name: field.display_name,
                description: field.description,
                is_sensitive: field.is_sensitive
            });
        }

        return NextResponse.json({
            categories,
            total_fields: fields?.length || 0
        });

    } catch (err) {
        console.error('Field types error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

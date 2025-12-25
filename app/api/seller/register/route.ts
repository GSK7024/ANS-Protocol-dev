import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Minimum requirements for seller registration
const MIN_STAKE_AMOUNT = 5; // 5 SOL minimum stake

/**
 * Seller Registration API
 * 
 * Allows agents to register as sellers with their API endpoints.
 * The seller must already own the domain in ANS.
 * 
 * POST /api/seller/register
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            domain,           // ANS domain name (must already own)
            seller_wallet,    // Wallet address for payments
            quote_url,        // API endpoint for price quotes
            book_url,         // API endpoint for booking
            supported_routes, // Array of routes like ["DEL-BOM", "BOM-GOA"]
            required_fields,  // Fields needed from buyer vault
            optional_fields,  // Optional fields
            display_name,     // Human-readable name
            description,      // Seller description
            category,         // Service category (flights, hotels, etc.)
            stake_amount      // SOL to stake for trust
        } = body;

        // Validation
        if (!domain || !seller_wallet) {
            return NextResponse.json({
                error: 'Missing required fields: domain, seller_wallet'
            }, { status: 400 });
        }

        if (!quote_url) {
            return NextResponse.json({
                error: 'quote_url is required - this is where we fetch prices'
            }, { status: 400 });
        }

        if (stake_amount && stake_amount < MIN_STAKE_AMOUNT) {
            return NextResponse.json({
                error: `Minimum stake is ${MIN_STAKE_AMOUNT} SOL for vault data access`
            }, { status: 400 });
        }

        // Check if domain exists and is owned by this wallet
        const { data: existingDomain, error: lookupError } = await supabase
            .from('domains')
            .select('id, name, owner_wallet, status')
            .eq('name', domain.toLowerCase())
            .single();

        // If domain doesn't exist, create it (for demo purposes)
        // In production, domain must be pre-registered
        if (!existingDomain) {
            console.log(`📝 [SELLER] Creating new domain: ${domain}`);

            const { data: newDomain, error: createError } = await supabase
                .from('domains')
                .insert({
                    name: domain.toLowerCase(),
                    status: 'active',
                    owner_wallet: seller_wallet,
                    domain_type: 'agent',
                    trust_score: 0.3, // Start with low trust
                    stake_amount: stake_amount || 0,
                    is_verified: false,
                    seller_config: {
                        quote_url,
                        book_url,
                        supported_routes: supported_routes || [],
                        required_fields: required_fields || ['full_name'],
                        optional_fields: optional_fields || [],
                        display_name: display_name || domain,
                        description: description || '',
                        category: category || 'general'
                    }
                })
                .select()
                .single();

            if (createError) {
                console.error('Domain creation error:', createError);
                return NextResponse.json({
                    error: 'Failed to create domain: ' + createError.message
                }, { status: 500 });
            }

            // Create seller requirements entry
            await supabase
                .from('seller_requirements')
                .upsert({
                    seller_agent: domain.toLowerCase(),
                    required_fields: required_fields || ['full_name'],
                    optional_fields: optional_fields || [],
                    consent_message: `${display_name || domain} needs your details for this service.`
                });

            return NextResponse.json({
                success: true,
                message: 'Seller registered successfully',
                seller: {
                    domain: `agent://${domain.toLowerCase()}`,
                    wallet: seller_wallet,
                    trust_score: 0.3,
                    trust_tier: 'initiate',
                    can_receive_vault_data: stake_amount >= MIN_STAKE_AMOUNT,
                    config: newDomain.seller_config
                },
                next_steps: [
                    'Stake more SOL to increase trust and access vault data',
                    'Complete verification for ✓ badge',
                    'Your quote_url will be called when buyers search'
                ]
            });
        }

        // Domain exists - update seller config
        console.log(`📝 [SELLER] Updating existing domain: ${domain}`);

        const sellerConfig = {
            quote_url,
            book_url,
            supported_routes: supported_routes || [],
            required_fields: required_fields || ['full_name'],
            optional_fields: optional_fields || [],
            display_name: display_name || existingDomain.name,
            description: description || '',
            category: category || 'general'
        };

        const { data: updated, error: updateError } = await supabase
            .from('domains')
            .update({
                seller_config: sellerConfig,
                owner_wallet: seller_wallet,
                stake_amount: stake_amount || existingDomain.stake_amount || 0
            })
            .eq('name', domain.toLowerCase())
            .select()
            .single();

        if (updateError) {
            console.error('Seller update error:', updateError);
            return NextResponse.json({
                error: 'Failed to update seller config: ' + updateError.message
            }, { status: 500 });
        }

        // Update seller requirements
        await supabase
            .from('seller_requirements')
            .upsert({
                seller_agent: domain.toLowerCase(),
                required_fields: required_fields || ['full_name'],
                optional_fields: optional_fields || [],
                consent_message: `${display_name || domain} needs your details for this service.`
            });

        const trustScore = updated.trust_score || 0;
        const effectiveStake = stake_amount || updated.stake_amount || 0;

        return NextResponse.json({
            success: true,
            message: 'Seller configuration updated',
            seller: {
                domain: `agent://${domain.toLowerCase()}`,
                wallet: seller_wallet,
                trust_score: trustScore,
                trust_tier: trustScore >= 0.8 ? 'master' : trustScore >= 0.5 ? 'adept' : 'initiate',
                can_receive_vault_data: trustScore >= 0.5 && effectiveStake >= MIN_STAKE_AMOUNT,
                config: sellerConfig
            }
        });

    } catch (err: any) {
        console.error('Seller registration error:', err);
        return NextResponse.json({
            error: 'Registration failed: ' + err.message
        }, { status: 500 });
    }
}

/**
 * GET /api/seller/register?domain=xxx
 * 
 * Check if a domain is registered as a seller
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');

    if (!domain) {
        return NextResponse.json({
            error: 'domain parameter required'
        }, { status: 400 });
    }

    const cleanDomain = domain.replace('agent://', '').toLowerCase();

    const { data: seller, error } = await supabase
        .from('domains')
        .select('name, owner_wallet, seller_config, trust_score, is_verified, is_flagged, stake_amount')
        .eq('name', cleanDomain)
        .not('seller_config', 'is', null)
        .single();

    if (error || !seller) {
        return NextResponse.json({
            registered: false,
            domain: cleanDomain
        });
    }

    const trustScore = seller.trust_score || 0;

    return NextResponse.json({
        registered: true,
        seller: {
            domain: `agent://${cleanDomain}`,
            display_name: seller.seller_config?.display_name || cleanDomain,
            wallet: seller.owner_wallet,
            trust_score: trustScore,
            trust_tier: trustScore >= 0.8 ? 'master' : trustScore >= 0.5 ? 'adept' : 'initiate',
            is_verified: seller.is_verified,
            is_flagged: seller.is_flagged,
            can_receive_vault_data: trustScore >= 0.5 && (seller.stake_amount || 0) >= MIN_STAKE_AMOUNT,
            config: {
                quote_url: seller.seller_config?.quote_url,
                supported_routes: seller.seller_config?.supported_routes,
                required_fields: seller.seller_config?.required_fields,
                category: seller.seller_config?.category
            }
        }
    });
}

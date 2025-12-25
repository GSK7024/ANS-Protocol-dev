/**
 * AI Function Handlers
 * 
 * These functions are called when the AI decides to use a tool.
 * Each handler calls the appropriate API endpoint and returns the result.
 */

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

export async function executeAIFunction(
    functionName: string,
    args: any,
    walletAddress?: string
): Promise<any> {
    switch (functionName) {
        case 'search_airports':
            return await searchAirports(args.query);

        case 'search_flights':
            return await searchFlights(args);

        case 'get_flight_details':
            return await getFlightDetails(args.inventoryId);

        case 'create_booking':
            return await createBooking(args);

        case 'check_booking_status':
            return await checkBookingStatus(args.pnr || args.bookingRef);

        case 'initiate_payment':
            return await initiatePayment(args);

        case 'confirm_payment':
            return await confirmPayment(args);

        case 'check_agent_trust':
            return await checkAgentTrust(args.agentName);

        case 'get_user_vault_fields':
            return await getUserVaultFields(args.walletAddress);

        case 'request_vault_access':
            return await requestVaultAccess(args);

        case 'get_current_date':
            return getCurrentDate();

        case 'convert_inr_to_sol':
            return convertInrToSol(args.inrAmount);

        case 'send_money':
            return await sendMoney(args, walletAddress);

        case 'get_stored_wallets':
            return await getStoredWallets(args.walletAddress);

        default:
            return { error: `Unknown function: ${functionName}` };
    }
}

// ============================================================
// FUNCTION IMPLEMENTATIONS
// ============================================================

async function searchAirports(query: string) {
    try {
        const response = await fetch(
            `${BASE_URL}/api/nexusair/airports/search?q=${encodeURIComponent(query)}`
        );
        return await response.json();
    } catch (err: any) {
        return { error: 'Failed to search airports', details: err.message };
    }
}

async function searchFlights(params: {
    from: string;
    to: string;
    date: string;
    passengers?: number;
    class?: string;
    timePreference?: string;
}) {
    try {
        // Use the aggregated search API that queries all sellers
        const queryParams = new URLSearchParams({
            from: params.from,
            to: params.to,
            date: params.date,
            passengers: String(params.passengers || 1),
            class: params.class || 'ECONOMY',
            time: params.timePreference || 'ANY'
        });

        const response = await fetch(
            `${BASE_URL}/api/flights/search?${queryParams}`
        );
        const data = await response.json();

        // Add warnings for AI to communicate
        if (data.blockedSellers) {
            data.scammerWarning = `⚠️ BLOCKED SELLERS: ${data.blockedSellers.sellers.map((s: any) => s.displayName).join(', ')} - These have been blocked for fraud.`;
        }

        return data;
    } catch (err: any) {
        return { error: 'Failed to search flights', details: err.message };
    }
}

async function getFlightDetails(inventoryId: number) {
    try {
        const response = await fetch(
            `${BASE_URL}/api/nexusair/flights/${inventoryId}/details`
        );
        return await response.json();
    } catch (err: any) {
        return { error: 'Failed to get flight details', details: err.message };
    }
}

async function createBooking(params: {
    inventoryId: number;
    passengers: any[];              // Can include agent refs like { agentRef: "agent://friend" }
    passengerAgents?: string[];     // Alternative: ["self", "agent://friend"]
    class?: string;
    contactEmail: string;
    contactPhone: string;
    buyerWallet?: string;           // For vault lookup
    sellerAgent?: string;           // Required for vault consent
}) {
    try {
        // Check if we need to resolve agent references
        const resolvedPassengers: any[] = [];
        const consentPending: any[] = [];

        // If passengerAgents provided (new flow)
        if (params.passengerAgents && params.passengerAgents.length > 0) {
            for (const agentRef of params.passengerAgents) {
                if (agentRef === 'self' || agentRef === 'me' || agentRef === params.buyerWallet) {
                    // Self - try to get from vault
                    if (params.buyerWallet) {
                        const vaultData = await fetchVaultData(params.buyerWallet, params.sellerAgent || 'nexusair');
                        if (vaultData) {
                            resolvedPassengers.push({
                                firstName: vaultData.firstName || vaultData.full_name?.split(' ')[0] || 'VAULT',
                                lastName: vaultData.lastName || vaultData.full_name?.split(' ').slice(1).join(' ') || 'USER',
                                dateOfBirth: vaultData.dob || vaultData.dateOfBirth || '1990-01-01',
                                gender: vaultData.gender || 'M',
                                type: 'ADULT',
                                fromVault: true
                            });
                            continue;
                        }
                    }
                    // Fallback: Need manual entry
                    return {
                        needsInput: true,
                        reason: 'Vault data not found for self. Please provide passenger details.',
                        fieldsRequired: ['firstName', 'lastName', 'dateOfBirth', 'gender']
                    };
                } else {
                    // Agent reference - request consent
                    const consentResult = await requestVaultConsent(
                        agentRef,
                        params.sellerAgent || 'nexusair',
                        params.buyerWallet || ''
                    );

                    if (consentResult.status === 'auto_approved' || consentResult.status === 'approved') {
                        // Get the data
                        const agentWallet = await resolveAgentWallet(agentRef);
                        if (agentWallet) {
                            const vaultData = await fetchVaultData(agentWallet, params.sellerAgent || 'nexusair');
                            if (vaultData) {
                                resolvedPassengers.push({
                                    firstName: vaultData.firstName || vaultData.full_name?.split(' ')[0],
                                    lastName: vaultData.lastName || vaultData.full_name?.split(' ').slice(1).join(' '),
                                    dateOfBirth: vaultData.dob || vaultData.dateOfBirth,
                                    gender: vaultData.gender || 'M',
                                    type: 'ADULT',
                                    agentRef,
                                    fromVault: true
                                });
                                continue;
                            }
                        }
                    } else if (consentResult.status === 'pending') {
                        consentPending.push({
                            agent: agentRef,
                            consent_id: consentResult.consent_id,
                            expires_at: consentResult.expires_at
                        });
                    }
                }
            }

            // If any consents are pending, return wait status
            if (consentPending.length > 0) {
                return {
                    status: 'awaiting_consent',
                    message: `Waiting for ${consentPending.length} passenger(s) to approve vault access`,
                    pending: consentPending,
                    hint: 'The referenced agents must approve sharing their data before booking can proceed.'
                };
            }
        }

        // Use resolved passengers or fall back to provided params
        const finalPassengers = resolvedPassengers.length > 0 ? resolvedPassengers : params.passengers;

        // Make the booking
        const response = await fetch(`${BASE_URL}/api/nexusair/bookings/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inventoryId: params.inventoryId,
                passengers: finalPassengers,
                class: params.class,
                contactEmail: params.contactEmail,
                contactPhone: params.contactPhone
            })
        });

        const result = await response.json();

        // Add note about vault usage
        if (resolvedPassengers.some(p => p.fromVault)) {
            result.vaultUsed = true;
            result.vaultNote = 'Passenger data was automatically retrieved from secure vaults.';
        }

        return result;
    } catch (err: any) {
        return { error: 'Failed to create booking', details: err.message };
    }
}

// Helper: Fetch vault data for a wallet
async function fetchVaultData(wallet: string, sellerAgent: string): Promise<any | null> {
    try {
        const response = await fetch(`${BASE_URL}/api/vault/data?wallet=${encodeURIComponent(wallet)}&seller=${encodeURIComponent(sellerAgent)}`);
        if (response.ok) {
            const data = await response.json();
            return data.fields || null;
        }
    } catch (err) {
        console.log('Vault fetch error:', err);
    }
    return null;
}

// Helper: Request vault consent from another agent
async function requestVaultConsent(targetAgent: string, sellerAgent: string, requesterWallet: string) {
    try {
        const response = await fetch(`${BASE_URL}/api/vault/consent/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requester_wallet: requesterWallet,
                target_agent: targetAgent,
                seller_agent: sellerAgent,
                fields_requested: ['full_name', 'firstName', 'lastName', 'dob', 'dateOfBirth', 'gender'],
                purpose: 'flight_booking'
            })
        });
        return await response.json();
    } catch (err) {
        return { status: 'error', error: 'Failed to request consent' };
    }
}

// Helper: Resolve agent name to wallet address
async function resolveAgentWallet(agentRef: string): Promise<string | null> {
    try {
        const cleanName = agentRef.replace('agent://', '').toLowerCase();
        const response = await fetch(`${BASE_URL}/api/resolve?name=${encodeURIComponent(cleanName)}`);
        if (response.ok) {
            const data = await response.json();
            return data.owner_wallet || null;
        }
    } catch (err) {
        console.log('Agent resolve error:', err);
    }
    return null;
}

async function checkBookingStatus(pnrOrRef: string) {
    try {
        const response = await fetch(
            `${BASE_URL}/api/nexusair/bookings/${pnrOrRef}`
        );
        return await response.json();
    } catch (err: any) {
        return { error: 'Failed to check booking', details: err.message };
    }
}

async function initiatePayment(params: {
    bookingId: string;
    buyerWallet: string;
    payWithANS?: boolean;
}) {
    try {
        // Get system API key for internal calls
        const systemApiKey = process.env.ANS_SYSTEM_API_KEY || 'demo-system-key';

        // First, look up the booking to get the actual price
        let bookingAmount = 0;
        let bookingDetails = null;

        try {
            const bookingResponse = await fetch(`${BASE_URL}/api/nexusair/bookings/${params.bookingId}`);
            if (bookingResponse.ok) {
                bookingDetails = await bookingResponse.json();
                // Get the INR price and convert to SOL (approximate rate)
                const inrPrice = bookingDetails.booking?.totalAmount || bookingDetails.pricing?.total || 0;
                // Rough conversion: 1 SOL ≈ ₹15000 (adjust based on market)
                const SOL_TO_INR = 15000;
                bookingAmount = inrPrice / SOL_TO_INR;
                console.log(`📊 Booking ${params.bookingId}: ₹${inrPrice} = ${bookingAmount.toFixed(4)} SOL`);
            }
        } catch (e) {
            console.log('Could not fetch booking, using default amount');
        }

        // If still 0, use a minimum for testing
        if (bookingAmount <= 0) {
            bookingAmount = 0.01; // Minimum 0.01 SOL for testing
        }

        // Create escrow via ANS
        const response = await fetch(`${BASE_URL}/api/orchestrate/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': systemApiKey  // Add auth for orchestrator
            },
            body: JSON.stringify({
                agent: 'agent://nexusair',
                buyer_wallet: params.buyerWallet,
                amount: bookingAmount,
                params: {
                    bookingId: params.bookingId,
                    payWithANS: params.payWithANS,
                    amountInr: bookingDetails?.booking?.totalAmount || bookingDetails?.pricing?.total || 0
                }
            })
        });

        const result = await response.json();

        // Add amount info to response
        if (result.success) {
            result.amount_sol = bookingAmount;
            result.amount_inr = bookingDetails?.booking?.totalAmount || bookingDetails?.pricing?.total || 0;
            result.booking_ref = params.bookingId;
        }

        return result;
    } catch (err: any) {
        return { error: 'Failed to initiate payment', details: err.message };
    }
}

async function confirmPayment(params: {
    escrowId: string;
    txSignature: string;
}) {
    try {
        const response = await fetch(`${BASE_URL}/api/orchestrate/confirm-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                escrow_id: params.escrowId,
                tx_signature: params.txSignature
            })
        });
        return await response.json();
    } catch (err: any) {
        return { error: 'Failed to confirm payment', details: err.message };
    }
}

async function checkAgentTrust(agentName: string) {
    try {
        // Clean agent name
        const cleanName = agentName.replace('agent://', '').replace('dev.agent://', '');

        const response = await fetch(
            `${BASE_URL}/api/resolve?name=${encodeURIComponent(cleanName)}`
        );
        const data = await response.json();

        if (!data.success) {
            return { error: 'Agent not found' };
        }

        return {
            agent: `agent://${cleanName}`,
            trustScore: data.trust_score || 0,
            trustTier: data.trust_tier || 'initiate',
            transactionCount: data.transaction_count || 0,
            registeredAt: data.registered_at,
            isVerified: data.is_verified || false,
            warning: data.trust_score < 0.3 ? 'Low trust score - proceed with caution' : null
        };
    } catch (err: any) {
        return { error: 'Failed to check agent trust', details: err.message };
    }
}

async function getUserVaultFields(walletAddress: string) {
    try {
        const response = await fetch(
            `${BASE_URL}/api/vault/fields?wallet=${encodeURIComponent(walletAddress)}`
        );
        return await response.json();
    } catch (err: any) {
        // Vault might not exist
        return {
            hasVault: false,
            fields: [],
            hint: 'User has not set up their vault yet'
        };
    }
}

async function requestVaultAccess(params: {
    walletAddress: string;
    sellerAgent: string;
    fieldsRequested: string[];
    purpose: string;
}) {
    // This would typically return a "pending approval" status
    // The actual vault access is done during payment confirmation
    return {
        status: 'pending_user_approval',
        fieldsRequested: params.fieldsRequested,
        seller: params.sellerAgent,
        purpose: params.purpose,
        message: 'User must approve this request to proceed',
        approval_required: true
    };
}

function getCurrentDate() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
        current: now.toISOString(),
        today: now.toISOString().split('T')[0],
        tomorrow: tomorrow.toISOString().split('T')[0],
        nextWeek: nextWeek.toISOString().split('T')[0],
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        formatted: now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    };
}

function convertInrToSol(inrAmount: number) {
    // Approximate rate - in production would fetch live rate
    const SOL_INR_RATE = 18000; // 1 SOL = ~₹18,000
    const solAmount = inrAmount / SOL_INR_RATE;

    return {
        inr: inrAmount,
        sol: parseFloat(solAmount.toFixed(6)),
        rate: SOL_INR_RATE,
        rateNote: 'Approximate rate - actual rate at time of payment may vary',
        formatted: {
            inr: `₹${inrAmount.toLocaleString('en-IN')}`,
            sol: `${solAmount.toFixed(4)} SOL`
        }
    };
}

// ============================================================
// SEND MONEY - Trigger wallet transfers
// ============================================================
async function sendMoney(params: {
    recipientAgent: string;
    amount: number;
    token?: string;
    note?: string;
}, senderWallet?: string) {
    try {
        let recipientWallet = params.recipientAgent;
        let recipientName = params.recipientAgent;

        // Check if it's an agent reference - resolve to wallet address
        if (params.recipientAgent.includes('agent://') ||
            !params.recipientAgent.match(/^[A-Za-z0-9]{32,44}$/)) {

            const cleanName = params.recipientAgent.replace('agent://', '').toLowerCase();

            // Resolve the agent name to wallet address
            const resolveResponse = await fetch(`${BASE_URL}/api/resolve?name=${encodeURIComponent(cleanName)}`);
            if (resolveResponse.ok) {
                const resolved = await resolveResponse.json();
                // API returns 'owner' field, not 'owner_wallet'
                const walletAddress = resolved.owner || resolved.owner_wallet;
                if (walletAddress && walletAddress !== 'Unknown') {
                    recipientWallet = walletAddress;
                    recipientName = `agent://${cleanName}`;
                } else {
                    return {
                        error: `Agent "${cleanName}" found but has no wallet address registered`,
                        needsManualAddress: true
                    };
                }
            } else {
                // Check stored wallets
                if (senderWallet) {
                    const storedWallets = await getStoredWallets(senderWallet);
                    const found = storedWallets.contacts?.find(
                        (c: any) => c.name.toLowerCase() === cleanName
                    );
                    if (found) {
                        recipientWallet = found.wallet;
                        recipientName = found.name;
                    } else {
                        return {
                            error: `Agent "${params.recipientAgent}" not found`,
                            needsManualAddress: true
                        };
                    }
                }
            }
        }

        // Return the transaction details for frontend to execute
        return {
            action: 'send_money',
            status: 'ready',
            transaction: {
                recipientWallet,
                recipientName,
                amount: params.amount,
                token: params.token || 'SOL',
                note: params.note || ''
            },
            message: `Ready to send ${params.amount} ${params.token || 'SOL'} to ${recipientName}`,
            requiresConfirmation: true,
            warningIfNew: recipientName === recipientWallet ?
                '⚠️ This is a wallet address, not a registered agent. Double-check before sending.' : null
        };
    } catch (err: any) {
        return { error: 'Failed to prepare transfer', details: err.message };
    }
}

// Get stored wallet contacts
async function getStoredWallets(walletAddress: string) {
    try {
        // Try to fetch from user's contacts/saved wallets
        const response = await fetch(`${BASE_URL}/api/user/contacts?wallet=${encodeURIComponent(walletAddress)}`);

        if (response.ok) {
            const data = await response.json();
            return {
                success: true,
                contacts: data.contacts || [],
                recentRecipients: data.recent || []
            };
        }

        // Return empty if no contacts API exists yet
        return {
            success: true,
            contacts: [],
            recentRecipients: [],
            hint: 'No saved contacts yet. You can add contacts in the dashboard.'
        };
    } catch (err) {
        return {
            success: true,
            contacts: [],
            recentRecipients: []
        };
    }
}


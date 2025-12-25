/**
 * AI Agent Function Definitions
 * 
 * These are the OpenAI function schemas that the AI agent can use
 * to search flights, create bookings, and interact with ANS Protocol.
 */

export const AI_FUNCTIONS = [
    // ============================================================
    // AIRPORT & FLIGHT SEARCH
    // ============================================================
    {
        name: "search_airports",
        description: "Search for airports by city name, code, or alias. Use this to help users find the correct airport code when they mention a city. Returns list of airports with codes, names, and terminals.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "City name, airport code, or alias to search for. Examples: 'Delhi', 'BOM', 'Bangalore', 'Mumbai airport'"
                }
            },
            required: ["query"]
        }
    },
    {
        name: "search_flights",
        description: "Search for available flights between two cities on a specific date. Returns list of flights with prices, availability, and timing. Always search before booking.",
        parameters: {
            type: "object",
            properties: {
                from: {
                    type: "string",
                    description: "Departure airport IATA code (3 letters). Example: DEL, BOM, BLR"
                },
                to: {
                    type: "string",
                    description: "Arrival airport IATA code (3 letters). Example: DEL, BOM, BLR"
                },
                date: {
                    type: "string",
                    description: "Travel date in YYYY-MM-DD format. Example: 2024-12-25"
                },
                passengers: {
                    type: "integer",
                    description: "Number of passengers. Default is 1.",
                    default: 1
                },
                class: {
                    type: "string",
                    enum: ["ECONOMY", "BUSINESS"],
                    description: "Travel class preference. Default is ECONOMY.",
                    default: "ECONOMY"
                },
                timePreference: {
                    type: "string",
                    enum: ["MORNING", "AFTERNOON", "EVENING", "NIGHT", "ANY"],
                    description: "Preferred time of day for departure. MORNING (5-12), AFTERNOON (12-17), EVENING (17-21), NIGHT (21-5)",
                    default: "ANY"
                }
            },
            required: ["from", "to", "date"]
        }
    },
    {
        name: "get_flight_details",
        description: "Get detailed information about a specific flight including aircraft type, amenities, baggage policy, and seat map.",
        parameters: {
            type: "object",
            properties: {
                inventoryId: {
                    type: "integer",
                    description: "The inventory ID returned from search_flights"
                }
            },
            required: ["inventoryId"]
        }
    },

    // ============================================================
    // BOOKING MANAGEMENT
    // ============================================================
    {
        name: "create_booking",
        description: "Create a flight booking for one or more passengers. You can either provide passenger details manually OR use passengerAgents to auto-fetch from vaults. For multi-passenger bookings, use agent references like ['self', 'agent://friend'] to pull data from their vaults.",
        parameters: {
            type: "object",
            properties: {
                inventoryId: {
                    type: "integer",
                    description: "The inventory ID of the selected flight from search results"
                },
                passengerAgents: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of agent references for passengers. Use 'self' or 'me' for the current user, or 'agent://username' for others. Example: ['self', 'agent://gk'] for booking for self and a friend."
                },
                passengers: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            title: {
                                type: "string",
                                enum: ["Mr", "Mrs", "Ms", "Dr", "Master"],
                                description: "Passenger title"
                            },
                            firstName: {
                                type: "string",
                                description: "First name as on ID"
                            },
                            lastName: {
                                type: "string",
                                description: "Last name/surname as on ID"
                            },
                            dateOfBirth: {
                                type: "string",
                                description: "Date of birth in YYYY-MM-DD format"
                            },
                            gender: {
                                type: "string",
                                enum: ["M", "F", "O"],
                                description: "Gender: M (Male), F (Female), O (Other)"
                            },
                            type: {
                                type: "string",
                                enum: ["ADULT", "CHILD", "INFANT"],
                                description: "ADULT (12+), CHILD (2-12), INFANT (<2)"
                            },
                            idType: {
                                type: "string",
                                enum: ["PASSPORT", "AADHAAR", "PAN", "DRIVING_LICENSE"],
                                description: "Type of ID document"
                            },
                            idNumber: {
                                type: "string",
                                description: "ID document number"
                            },
                            mealPreference: {
                                type: "string",
                                enum: ["VEG", "NON_VEG", "VEGAN", "JAIN", "NONE"],
                                description: "Meal preference"
                            },
                            seatPreference: {
                                type: "string",
                                enum: ["WINDOW", "AISLE", "MIDDLE", "ANY"],
                                description: "Seat preference"
                            }
                        },
                        required: ["firstName", "lastName", "gender", "type"]
                    },
                    description: "List of passengers with their details. Only needed if NOT using passengerAgents."
                },
                class: {
                    type: "string",
                    enum: ["ECONOMY", "BUSINESS"],
                    description: "Travel class",
                    default: "ECONOMY"
                },
                contactEmail: {
                    type: "string",
                    description: "Email for booking confirmation and e-ticket"
                },
                contactPhone: {
                    type: "string",
                    description: "Phone number for booking updates"
                },
                sellerAgent: {
                    type: "string",
                    description: "The seller agent handling the booking (e.g., 'nexusair', 'skyindia'). Needed for vault consent."
                }
            },
            required: ["inventoryId", "contactEmail", "contactPhone"]
        }
    },
    {
        name: "check_booking_status",
        description: "Check the status of a booking using PNR or booking reference. Returns current status, flight details, and passenger information.",
        parameters: {
            type: "object",
            properties: {
                pnr: {
                    type: "string",
                    description: "6-character PNR (e.g., NX4K2MPQ)"
                },
                bookingRef: {
                    type: "string",
                    description: "Booking reference (alternative to PNR)"
                }
            }
        }
    },

    // ============================================================
    // PAYMENT & ESCROW (ANS Integration)
    // ============================================================
    {
        name: "initiate_payment",
        description: "Create an escrow payment for a booking. Returns payment instructions including SOL amount and vault address. User must complete payment from their Solana wallet.",
        parameters: {
            type: "object",
            properties: {
                bookingId: {
                    type: "string",
                    description: "Booking ID from create_booking response"
                },
                buyerWallet: {
                    type: "string",
                    description: "User's Solana wallet address for payment"
                },
                payWithANS: {
                    type: "boolean",
                    description: "Pay with ANS token for zero fees. Default false (SOL payment).",
                    default: false
                }
            },
            required: ["bookingId", "buyerWallet"]
        }
    },
    {
        name: "confirm_payment",
        description: "Confirm that payment has been made. Verifies the transaction on Solana and triggers booking confirmation.",
        parameters: {
            type: "object",
            properties: {
                escrowId: {
                    type: "string",
                    description: "Escrow ID from initiate_payment"
                },
                txSignature: {
                    type: "string",
                    description: "Solana transaction signature"
                }
            },
            required: ["escrowId", "txSignature"]
        }
    },

    // ============================================================
    // AGENT TRUST & REPUTATION
    // ============================================================
    {
        name: "check_agent_trust",
        description: "Check the trust score and reputation of a seller agent (like an airline). Returns trust tier, transaction count, and any warnings.",
        parameters: {
            type: "object",
            properties: {
                agentName: {
                    type: "string",
                    description: "Agent name with or without prefix. Examples: 'nexusair', 'agent://nexusair'"
                }
            },
            required: ["agentName"]
        }
    },

    // ============================================================
    // USER DATA (VAULT)
    // ============================================================
    {
        name: "get_user_vault_fields",
        description: "Check what personal information the user has stored in their vault (passport, phone, email, etc.). Does NOT return actual data - only field names. Use this to know what can be auto-filled.",
        parameters: {
            type: "object",
            properties: {
                walletAddress: {
                    type: "string",
                    description: "User's wallet address"
                }
            },
            required: ["walletAddress"]
        }
    },
    {
        name: "request_vault_access",
        description: "Request permission to share user's vault data with a seller. The AI never sees the actual data - it's sent directly to the seller. User must approve.",
        parameters: {
            type: "object",
            properties: {
                walletAddress: {
                    type: "string",
                    description: "User's wallet address"
                },
                sellerAgent: {
                    type: "string",
                    description: "The seller agent requesting data"
                },
                fieldsRequested: {
                    type: "array",
                    items: { type: "string" },
                    description: "Fields the seller needs. E.g., ['full_name', 'passport_number', 'dob']"
                },
                purpose: {
                    type: "string",
                    description: "Why the data is needed. E.g., 'Flight booking passenger details'"
                }
            },
            required: ["walletAddress", "sellerAgent", "fieldsRequested", "purpose"]
        }
    },

    // ============================================================
    // UTILITIES
    // ============================================================
    {
        name: "get_current_date",
        description: "Get the current date and time. Use this to calculate relative dates like 'tomorrow', 'next Monday', etc.",
        parameters: {
            type: "object",
            properties: {},
            required: []
        }
    },
    {
        name: "convert_inr_to_sol",
        description: "Convert INR amount to SOL based on current exchange rate.",
        parameters: {
            type: "object",
            properties: {
                inrAmount: {
                    type: "number",
                    description: "Amount in Indian Rupees"
                }
            },
            required: ["inrAmount"]
        }
    },

    // ============================================================
    // WALLET TRANSFERS
    // ============================================================
    {
        name: "send_money",
        description: "Send SOL or ANS tokens from the connected wallet to another agent or wallet address. Use this when user says 'send X SOL to agent://friend' or 'pay 0.5 SOL to wallet_address'. The frontend will prompt the user to confirm the transaction.",
        parameters: {
            type: "object",
            properties: {
                recipientAgent: {
                    type: "string",
                    description: "The recipient - either an agent name (agent://friend), ANS domain (friend), or a Solana wallet address"
                },
                amount: {
                    type: "number",
                    description: "Amount to send (in SOL)"
                },
                token: {
                    type: "string",
                    enum: ["SOL", "ANS"],
                    description: "Token type to send. Default is SOL.",
                    default: "SOL"
                },
                note: {
                    type: "string",
                    description: "Optional memo/note for the transaction"
                }
            },
            required: ["recipientAgent", "amount"]
        }
    },
    {
        name: "get_stored_wallets",
        description: "Get list of frequently used wallet addresses saved in user's dashboard/contacts. This helps auto-complete recipient addresses.",
        parameters: {
            type: "object",
            properties: {
                walletAddress: {
                    type: "string",
                    description: "User's wallet address to look up their contacts"
                }
            },
            required: ["walletAddress"]
        }
    }
];

// ============================================================
// SYSTEM PROMPT FOR BUYER AI
// ============================================================
export const BUYER_AI_SYSTEM_PROMPT = `You are a helpful AI travel assistant powered by ANS Protocol. You help users search for and book flights.

CAPABILITIES:
- Search for airports and flights from multiple sellers
- Show available flights with prices, ranked by trust and value
- Create bookings with passenger details (manual or from vault)
- Support multi-passenger bookings using agent references
- Process payments via Solana (SOL or ANS tokens)
- Check booking status and retrieve tickets

SELLER TRUST SYSTEM:
- Flights come from multiple registered sellers (like different airlines)
- Each seller has a trust score (0-100%) and trust tier (initiate/adept/master)
- BLOCKED sellers are never shown - they are scammers
- RISKY sellers (low trust) should be warned about
- TRUSTED sellers are safe to book with
- Always mention the seller name and trust level when showing flights

VAULT & AGENT REFERENCES:
- Users can have personal data in their vault (name, DOB, passport)
- For multi-passenger booking, users can reference friends: "agent://username"
- When user says "book for me and agent://gk", use passengerAgents: ["self", "agent://gk"]
- The friend must approve sharing their vault data (consent system)
- This keeps personal data private - you never see raw data, it goes seller directly

IMPORTANT RULES:
1. ALWAYS search for airports first if user gives a city name
2. ALWAYS search flights before creating a booking
3. For multiple passengers, ask if they want to use agent references or enter manually
4. Mention seller trust tier when showing flights
5. Never make up flight numbers or prices - always use search results
6. When user mentions another person, ask if they have an ANS agent name (agent://friend)
7. If vault consent is pending, tell user to wait for their friend to approve

CONVERSATION FLOW:
1. Understand user's travel needs (from, to, date, passengers)
2. Search and present flight options (showing seller name + trust)
3. Help user select a flight
4. For passengers:
   - Ask if using vault data or entering manually
   - If "me and friend", suggest: "Does your friend have an ANS account? I can use agent://their_name"
5. Create booking
6. Guide through payment
7. Confirm booking and provide PNR

EXAMPLE - MULTI-PASSENGER:
User: "Book Delhi to Goa for me and my friend Rahul"
You: "Great! For your friend Rahul:
- Does he have an ANS account? If so, I can use agent://rahul to get his details from his vault
- Or I can collect his details manually

Which would you prefer?"

User: "Yes use agent://rahul"
You: [Create booking with passengerAgents: ["self", "agent://rahul"]]
"I've sent a consent request to agent://rahul. Once he approves, I'll complete the booking."

Be concise, helpful, and always prioritize user privacy and security.`;

export type AIFunction = typeof AI_FUNCTIONS[number];

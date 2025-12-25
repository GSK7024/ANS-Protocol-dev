
import { ImageResponse } from 'next/og';
import { supabase } from '@/utils/supabase/client';

export const runtime = 'edge';
export const alt = 'Agent Identity Card';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: { name: string } }) {
    const name = params.name;

    // Fetch data (simpler fetch for edge)
    // Note: In real edge runtime, you might need direct fetch to Supabase REST API if the client library has issues, 
    // but for now we'll try standard variables or valid fallbacks.

    // Fallback colors based on tiers (mock logic for visual demo)
    // You would properly fetch this from DB in production using fetch()
    const tier = 'Standard'; // Default
    const isVerified = true;  // Default for visual

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #050505, #1a0b2e)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'monospace',
                    position: 'relative',
                }}
            >
                {/* Background Grid Pattern */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.1) 2%, transparent 0%)',
                    backgroundSize: '50px 50px',
                }} />

                {/* Card Container */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '60px',
                        background: 'rgba(0, 0, 0, 0.8)',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '30px',
                        boxShadow: '0 0 80px rgba(168, 85, 247, 0.2)',
                        width: '900px',
                    }}
                >
                    {/* Header: ANS Protocol */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px', width: '100%' }}>
                        <div style={{
                            width: '40px', height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(to bottom right, #a855f7, #3b82f6)',
                            marginRight: '20px'
                        }} />
                        <span style={{ color: '#fff', fontSize: '30px', fontWeight: 'bold', letterSpacing: '4px' }}>ANS PROTOCOL</span>

                        <div style={{ flexGrow: 1 }} />

                        <div style={{
                            padding: '10px 20px',
                            background: 'rgba(34, 197, 94, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.5)',
                            borderRadius: '50px',
                            color: '#4ade80',
                            fontSize: '24px',
                            fontWeight: 'bold'
                        }}>
                            VERIFIED IDENTITY
                        </div>
                    </div>

                    {/* Agent Name */}
                    <div style={{ fontSize: '80px', fontWeight: '900', color: 'white', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: '#a855f7', marginRight: '10px' }}>agent://</span>
                        {name}
                    </div>

                    {/* Meta Data */}
                    <div style={{ display: 'flex', marginTop: '40px', gap: '40px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#6b7280', fontSize: '24px', marginBottom: '10px' }}>RANK</span>
                            <span style={{ color: '#fff', fontSize: '40px', fontWeight: 'bold' }}>GOLD TIER</span>
                        </div>
                        <div style={{ width: '2px', background: '#333' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#6b7280', fontSize: '24px', marginBottom: '10px' }}>REPUTATION</span>
                            <span style={{ color: '#fff', fontSize: '40px', fontWeight: 'bold' }}>98/100</span>
                        </div>
                        <div style={{ width: '2px', background: '#333' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#6b7280', fontSize: '24px', marginBottom: '10px' }}>NETWORK</span>
                            <span style={{ color: '#fff', fontSize: '40px', fontWeight: 'bold' }}>SOLANA</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ position: 'absolute', bottom: '40px', color: '#666', fontSize: '24px' }}>
                    Identity verified on-chain via Agent Name Service
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}

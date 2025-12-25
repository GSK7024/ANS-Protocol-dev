"use client";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-black text-white py-20 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
                <p className="text-gray-400 mb-8">Last updated: December 23, 2024</p>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
                    <p className="text-gray-300 mb-4">
                        ANS Protocol ("we", "our", or "us") is committed to protecting your privacy.
                        This Privacy Policy explains how we collect, use, and safeguard your information
                        when you use our decentralized agent naming service.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li><strong>Wallet Addresses:</strong> Your Solana wallet public address when you connect to register domains.</li>
                        <li><strong>Domain Registrations:</strong> The domain names you register and associated metadata.</li>
                        <li><strong>Transaction Data:</strong> On-chain transaction signatures for payment verification.</li>
                        <li><strong>Usage Data:</strong> Anonymous analytics about how you use our service.</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li>To process domain registrations and payments</li>
                        <li>To maintain and improve our services</li>
                        <li>To communicate with you about your domains</li>
                        <li>To prevent fraud and ensure security</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">4. Data Storage</h2>
                    <p className="text-gray-300 mb-4">
                        Your data is stored on:
                    </p>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li><strong>Solana Blockchain:</strong> Immutable, public record of domain ownership (planned)</li>
                        <li><strong>Supabase:</strong> Secure database for domain metadata and user preferences</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>
                    <p className="text-gray-300 mb-4">
                        You have the right to:
                    </p>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li>Access your personal data</li>
                        <li>Request deletion of off-chain data</li>
                        <li>Opt-out of marketing communications</li>
                    </ul>
                    <p className="text-gray-400 mt-4 text-sm">
                        Note: Blockchain data is immutable and cannot be deleted.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">6. Contact Us</h2>
                    <p className="text-gray-300">
                        For privacy questions, contact us on{" "}
                        <a href="https://discord.gg/szqNwV5y" className="text-purple-400 hover:underline">
                            Discord
                        </a>{" "}
                        or{" "}
                        <a href="https://x.com/ANSProtocol" className="text-purple-400 hover:underline">
                            Twitter/X
                        </a>
                    </p>
                </section>

                <div className="border-t border-gray-800 pt-8 mt-12">
                    <a href="/" className="text-purple-400 hover:underline">← Back to Home</a>
                </div>
            </div>
        </div>
    );
}

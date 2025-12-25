"use client";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-black text-white py-20 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
                <p className="text-gray-400 mb-8">Last updated: December 23, 2024</p>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
                    <p className="text-gray-300 mb-4">
                        By accessing or using ANS Protocol, you agree to be bound by these Terms of Service.
                        If you do not agree to these terms, do not use our service.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">2. Service Description</h2>
                    <p className="text-gray-300 mb-4">
                        ANS Protocol provides a decentralized naming service for AI agents on the Solana blockchain.
                        Users can register `agent://` domain names to identify their AI agents.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">3. Domain Registration</h2>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li>Domains are registered for a period of 1 year and must be renewed.</li>
                        <li>Domain prices vary based on length and tier (Premium vs. User).</li>
                        <li>Payments are made in SOL or USDC on the Solana blockchain.</li>
                        <li>All sales are <strong>final</strong>. No refunds for domain registrations.</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">4. Prohibited Uses</h2>
                    <p className="text-gray-300 mb-4">You agree NOT to:</p>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li>Register domains that infringe on trademarks or copyrights</li>
                        <li>Use domains for illegal activities or scams</li>
                        <li>Attempt to exploit or hack the protocol</li>
                        <li>Register reserved/restricted names without authorization</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">5. Domain Disputes</h2>
                    <p className="text-gray-300 mb-4">
                        We reserve the right to suspend or revoke domain registrations that:
                    </p>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li>Violate trademarks or intellectual property</li>
                        <li>Are used for fraud, phishing, or malicious purposes</li>
                        <li>Violate these Terms of Service</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">6. Disclaimer of Warranties</h2>
                    <p className="text-gray-300 mb-4">
                        ANS Protocol is provided "AS IS" without warranties of any kind.
                        We do not guarantee uninterrupted service or that the protocol will be error-free.
                    </p>
                    <p className="text-yellow-400 bg-yellow-400/10 p-4 rounded-lg mt-4">
                        ⚠️ <strong>Early Access:</strong> This protocol is currently in presale/early access.
                        Features may change and there may be bugs. Use at your own risk.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
                    <p className="text-gray-300 mb-4">
                        To the maximum extent permitted by law, ANS Protocol and its creators shall not be
                        liable for any indirect, incidental, or consequential damages arising from your use
                        of the service.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">8. Changes to Terms</h2>
                    <p className="text-gray-300">
                        We may update these terms from time to time. Continued use of the service after
                        changes constitutes acceptance of the new terms.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">9. Contact</h2>
                    <p className="text-gray-300">
                        Questions about these terms? Reach us on{" "}
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

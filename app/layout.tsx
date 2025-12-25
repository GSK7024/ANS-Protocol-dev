import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const roboto_mono = Roboto_Mono({ subsets: ["latin"], variable: '--font-roboto-mono' });

export const metadata: Metadata = {
    title: "ANS - Agent Name Service | The DNS for AI Agents",
    description: "Secure your digital identity for the agentic web. Register agent:// domains on Solana. Decentralized naming, reputation, and escrow for AI agents.",
    keywords: ["AI agents", "Solana", "domain names", "agent naming", "blockchain", "decentralized", "Web3", "ANS Protocol"],
    authors: [{ name: "ANS Protocol" }],
    creator: "ANS Protocol",
    publisher: "ANS Protocol",
    robots: "index, follow",
    icons: {
        icon: '/ans-logo.png',
        apple: '/ans-logo.png',
    },
    verification: {
        google: "RJd7t1L55LIO38Nh1DjuO9gMquqzABCZoOuUT6U6CY0",
    },
    openGraph: {
        title: "ANS - Agent Name Service",
        description: "The DNS for AI Agents. Register agent:// domains on Solana.",
        url: "https://ans.dev",
        siteName: "ANS Protocol",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "ANS - Agent Name Service",
        description: "The DNS for AI Agents. Register agent:// domains on Solana.",
        creator: "@ANSProtocol",
    },
};

import { WalletContextProvider } from '@/components/WalletContextProvider';
import { DevnetBanner } from '@/components/NetworkSwitcher';
import { ToastProvider } from '@/components/Toast';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${roboto_mono.variable} font-sans`}>
                <WalletContextProvider>
                    <ToastProvider>
                        <DevnetBanner />
                        {children}
                    </ToastProvider>
                </WalletContextProvider>
            </body>
        </html>
    );
}


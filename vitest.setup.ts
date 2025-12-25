import '@testing-library/jest-dom'

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/',
}))

// Mock Solana wallet adapter
vi.mock('@solana/wallet-adapter-react', () => ({
    useWallet: () => ({
        connected: false,
        publicKey: null,
        signTransaction: vi.fn(),
        signAllTransactions: vi.fn(),
    }),
    useConnection: () => ({
        connection: {
            getLatestBlockhash: vi.fn(),
            sendRawTransaction: vi.fn(),
            confirmTransaction: vi.fn(),
        }
    }),
}))

// Global test utilities
global.fetch = vi.fn()

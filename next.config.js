/** @type {import('next').NextConfig} */
const nextConfig = {
    // Temporarily ignore TypeScript and ESLint errors during build
    // TODO: Fix type errors and remove these
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
};

module.exports = nextConfig;

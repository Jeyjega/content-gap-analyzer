/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    devIndicators: {
        buildActivity: false,
    },
    // Prevent webpack from bundling these — let Node.js resolve them at runtime
    serverExternalPackages: ['apify-client', 'proxy-agent'],
    experimental: {
        outputFileTracingIncludes: {
            // Ensure apify-client and proxy-agent are included in the Vercel deployment bundle
            '/api/transcribe': ['./node_modules/apify-client/**/*', './node_modules/proxy-agent/**/*'],
        },
    },
};

module.exports = nextConfig;

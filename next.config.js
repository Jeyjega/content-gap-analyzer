/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    devIndicators: {
        buildActivity: false,
    },
    experimental: {
        serverExternalPackages: ['apify-client', 'proxy-agent'],
        outputFileTracingIncludes: {
            // Ensure apify-client and proxy-agent are included in the Vercel deployment bundle
            '/api/transcribe': ['./node_modules/apify-client/**/*', './node_modules/proxy-agent/**/*'],
        },
    },
};

module.exports = nextConfig;

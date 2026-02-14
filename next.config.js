/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    devIndicators: {
        buildActivity: false,
    },
    experimental: {
        outputFileTracingIncludes: {
            '/api/transcribe': ['./bin/**/*'],
        },
    },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    devIndicators: {
        buildActivity: false,
    },
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                child_process: false,
            };
        }
        return config;
    },
    experimental: {
        outputFileTracingIncludes: {
            '/api/transcribe': ['./bin/**/*'], // Retaining this just in case, though usually for Node runtime
        },
    },
};

module.exports = nextConfig;

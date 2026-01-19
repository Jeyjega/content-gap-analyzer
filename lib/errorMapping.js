/**
 * Centralized Entitlement Error Mapping
 * 
 * Maps backend error codes to UI behavior configuration.
 */

// Error Codes
export const ERROR_CODES = {
    TOTAL_LIMIT: "TOTAL_LIMIT",
    YOUTUBE_LIMIT: "YOUTUBE_LIMIT",
    BLOG_LOCKED: "BLOG_LOCKED",
    PAID_ONLY: "PAID_ONLY",
    UNKNOWN: "UNKNOWN"
};

/**
 * Get UX configuration for a specific error code
 * @param {string} code - The error code from the backend
 * @returns {object} UX configuration
 */
export function getEntitlementUX(code) {
    const defaults = {
        lockPlatforms: [],
        bannerMessage: null,
        showUpgradeCTA: false,
        highlightUpgrade: false,
        inlineMessage: null
    };

    switch (code) {
        case ERROR_CODES.TOTAL_LIMIT:
            return {
                ...defaults,
                bannerMessage: "You’ve used all 3 free analyses this month.",
                showUpgradeCTA: true,
                highlightUpgrade: true
            };

        case ERROR_CODES.YOUTUBE_LIMIT:
            return {
                ...defaults,
                lockPlatforms: ["youtube"],
                inlineMessage: "Free plan allows 1 YouTube script per month.",
                showUpgradeCTA: true
            };

        case ERROR_CODES.BLOG_LOCKED:
            return {
                ...defaults,
                lockPlatforms: ["blog"],
                inlineMessage: "Blog articles are available on Standard and Pro plans."
                // typically shown as tooltip or inline near the disabled card
            };

        case ERROR_CODES.PAID_ONLY:
            return {
                ...defaults,
                bannerMessage: "This feature is available on paid plans.",
                showUpgradeCTA: true
            };

        default:
            return defaults;
    }
}

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
    TRANSCRIPTION_DISABLED: "TRANSCRIPTION_DISABLED",
    YOUTUBE_BOT_BLOCK: "YOUTUBE_BOT_BLOCK",
    YOUTUBE_FETCH_ERROR: "YOUTUBE_FETCH_ERROR",
    VIDEO_TOO_LONG: "VIDEO_TOO_LONG",
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

        case ERROR_CODES.TRANSCRIPTION_DISABLED:
            return {
                ...defaults,
                bannerMessage: "Transcripts are disabled for this video. Please paste the transcript manually.",
                highlightUpgrade: false,
                lockPlatforms: ["youtube"]
            };

        case ERROR_CODES.YOUTUBE_BOT_BLOCK:
            return {
                ...defaults,
                bannerMessage: "YouTube temporarily blocked this request (bot protection). Please try again later or paste the transcript manually.",
                highlightUpgrade: false,
                lockPlatforms: ["youtube"]
            };

        case ERROR_CODES.YOUTUBE_FETCH_ERROR:
            return {
                ...defaults,
                bannerMessage: "Unable to retrieve data for this video. Please ensure the video is public and try again.",
                highlightUpgrade: false,
                lockPlatforms: ["youtube"]
            };

        case ERROR_CODES.VIDEO_TOO_LONG:
            return {
                ...defaults,
                bannerMessage: "This video exceeds the 25-minute limit. Please analyze a shorter video to ensure a complete, high-quality script.",
                highlightUpgrade: false,
                lockPlatforms: ["youtube"]
            };

        default:
            return defaults;
    }
}

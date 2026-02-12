import { supabaseAdmin } from "./supabaseServer";

/**
 * FREEMIUM LIMITS
 */
const LIMITS = {
    FREE: {
        TOTAL_MONTHLY: 3,
        SEATS: 1
    },
    STANDARD: {
        TOTAL_MONTHLY: 20,
        SEATS: 1
    },
    PRO: {
        TOTAL_MONTHLY: Infinity,
        SEATS: 3
    }
};

/**
 * Calculate the rolling reset date (30 days from now)
 */
function getRollingExpiry() {
    const now = new Date();
    // 30 days * 24h * 60m * 60s * 1000ms
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    return new Date(now.getTime() + thirtyDaysInMs).toISOString();
}

/**
 * Get user's current plan
 */
async function getUserPlan(userId) {
    const { data, error } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .maybeSingle();

    if (error || !data) return "free";

    return data.plan ? data.plan.toLowerCase() : "free";
}

/**
 * Get current usage (Rolling Window)
 */
async function getMonthlyUsage(userId) {
    const { data, error } = await supabaseAdmin
        .from("freemium_usage")
        .select("analyses_used, reset_at")
        .eq("user_id", userId)
        .maybeSingle();

    if (error || !data) {
        return { total: 0 };
    }

    const now = new Date();
    const resetAt = data.reset_at ? new Date(data.reset_at) : new Date(0);

    // If window expired (rolling logic), usage is 0
    if (now >= resetAt) {
        return { total: 0 };
    }

    return {
        total: data.analyses_used ?? 0
    };
}


/**
 * Increment freemium usage counters with Rolling Window logic
 */
export async function incrementUsage(
    userId,
    metric
) {
    try {
        const plan = await getUserPlan(userId);

        // PRO: No usage tracking required for Pro users
        if (plan === "pro") return;

        // Lazy initialization: Upsert directly avoids separate ensure step
        const { data } = await supabaseAdmin
            .from("freemium_usage")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        // Initialize defaults if row missing
        let analysesUsed = data?.analyses_used ?? 0;
        let resetAt = data?.reset_at ? new Date(data.reset_at) : null;
        const now = new Date();

        // RESET LOGIC (Rolling)
        // Initialize if new row OR window expired
        if (!resetAt || now >= resetAt) {
            analysesUsed = 0;
            const newExpiry = getRollingExpiry();
            resetAt = new Date(newExpiry);
            console.log(`Usage window reset for user ${userId}, new expiry: ${newExpiry}`);
        }

        if (metric === "analysis") analysesUsed += 1;

        const { error: upsertError } = await supabaseAdmin
            .from("freemium_usage")
            .upsert(
                {
                    user_id: userId,
                    analyses_used: analysesUsed,
                    reset_at: resetAt.toISOString()
                    // youtube_derivatives_used is deprecated
                },
                { onConflict: "user_id" }
            );

        if (upsertError) throw upsertError;

    } catch (err) {
        console.error("Failed to increment freemium usage:", err);
    }
}

/**
 * Check if user can generate derivative content
 */
export async function checkEntitlement(
    userId,
    targetPlatform // Kept for signature compatibility
) {
    try {
        const plan = await getUserPlan(userId);

        // Pro users bypass limits
        if (plan === "pro") {
            return { allowed: true };
        }

        const usage = await getMonthlyUsage(userId);
        const limitName = plan.toUpperCase();
        const limitCount = LIMITS[limitName]?.TOTAL_MONTHLY ?? LIMITS.FREE.TOTAL_MONTHLY;

        // Total analysis limit enforcement
        if (usage.total >= limitCount) {
            return {
                allowed: false,
                reason: "limit_reached",
                message: "You’ve reached your monthly analysis limit. Upgrade to continue.",
                error: "You’ve reached your monthly analysis limit. Upgrade to continue.",
                code: "TOTAL_LIMIT"
            };
        }

        return { allowed: true };

    } catch (err) {
        console.error("Entitlement check failed:", err);
        return {
            allowed: false,
            reason: "error",
            message: "Unable to verify usage. Please try again.",
            error: "Unable to verify usage. Please try again."
        };
    }
}
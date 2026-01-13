import { supabaseAdmin } from "./supabaseServer";

/**
 * FREEMIUM LIMITS
 */
const LIMITS = {
    FREE: {
        TOTAL_MONTHLY: 3,          // Total analyses per month
        YOUTUBE_MONTHLY: 1,        // YouTube derivatives per month
        BLOG_ALLOWED: false        // Blogs NOT allowed for free
    }
};

/**
 * Calculate the next reset date (1st of next month)
 */
function getNextResetDate() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
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
 * Ensure freemium_usage row exists (lazy init)
 */
export async function ensureFreemiumRecord(userId) {
    const { data, error } = await supabaseAdmin
        .from("freemium_usage")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;

    if (data) return;

    const { error: insertError } = await supabaseAdmin
        .from("freemium_usage")
        .insert({
            user_id: userId,
            analyses_used: 0,
            youtube_derivatives_used: 0,
            reset_at: getNextResetDate()
        });

    if (insertError) throw insertError;
}

/**
 * Get current monthly usage
 */
async function getMonthlyUsage(userId) {
    const { data, error } = await supabaseAdmin
        .from("freemium_usage")
        .select("analyses_used, youtube_derivatives_used, reset_at")
        .eq("user_id", userId)
        .maybeSingle();

    if (error || !data) {
        return { total: 0, youtube: 0 };
    }

    const now = new Date();
    const resetAt = data.reset_at ? new Date(data.reset_at) : new Date(0);

    if (now >= resetAt) {
        return { total: 0, youtube: 0 };
    }

    return {
        total: data.analyses_used ?? 0,
        youtube: data.youtube_derivatives_used ?? 0
    };
}

/**
 * Increment freemium usage counters
 */
export async function incrementUsage(
    userId,
    metric
) {
    try {
        const plan = await getUserPlan(userId);
        if (plan !== "free") return;

        await ensureFreemiumRecord(userId);

        const { data, error } = await supabaseAdmin
            .from("freemium_usage")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (error || !data) throw error;

        const now = new Date();
        let analysesUsed = data.analyses_used ?? 0;
        let youtubeUsed = data.youtube_derivatives_used ?? 0;
        let resetAt = data.reset_at ? new Date(data.reset_at) : null;

        if (!resetAt || now >= resetAt) {
            analysesUsed = 0;
            youtubeUsed = 0;
            resetAt = new Date(getNextResetDate());
        }

        if (metric === "analysis") analysesUsed += 1;
        if (metric === "youtube_derivative") youtubeUsed += 1;

        const { error: upsertError } = await supabaseAdmin
            .from("freemium_usage")
            .upsert(
                {
                    user_id: userId,
                    analyses_used: analysesUsed,
                    youtube_derivatives_used: youtubeUsed,
                    reset_at: resetAt.toISOString()
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
    targetPlatform
) {
    try {
        const plan = await getUserPlan(userId);

        // Paid users bypass limits
        if (plan !== "free") {
            return { allowed: true };
        }

        // Blog blocked for free
        if (targetPlatform === "blog" && !LIMITS.FREE.BLOG_ALLOWED) {
            return {
                allowed: false,
                error: "Blog derivatives are available on paid plans."
            };
        }

        await ensureFreemiumRecord(userId);
        const usage = await getMonthlyUsage(userId);

        // Total analysis limit
        if (usage.total >= LIMITS.FREE.TOTAL_MONTHLY) {
            return {
                allowed: false,
                error: "Free limit reached (3 analyses/month). Upgrade to continue."
            };
        }

        // YouTube limit
        if (
            targetPlatform === "youtube" &&
            usage.youtube >= LIMITS.FREE.YOUTUBE_MONTHLY
        ) {
            return {
                allowed: false,
                error: "Free limit reached (1 YouTube derivative/month)."
            };
        }

        return { allowed: true };

    } catch (err) {
        console.error("Entitlement check failed:", err);
        return {
            allowed: false,
            error: "Unable to verify usage. Please try again."
        };
    }
}
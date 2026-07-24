import { supabaseAdmin } from "./supabaseServer";

/**
 * Monthly credit allowances per plan
 */
export const PLAN_LIMITS = {
  FREE:     3,
  STANDARD: 30,
  PRO:      150,
};

/**
 * Normalize incoming subscription plan identifiers to standard tiers.
 * Maps 'standard_tier' -> 'STANDARD', 'pro_tier' -> 'PRO', etc.
 * Defaults to 'FREE' for safety/backward compatibility.
 */
function normalizePlan(planType) {
  if (!planType) return "FREE";
  const plan = planType.toLowerCase().trim();
  if (plan === "pro" || plan === "pro_tier" || plan === "pro-tier") {
    return "PRO";
  }
  if (plan === "standard" || plan === "standard_tier" || plan === "standard-tier") {
    return "STANDARD";
  }
  return "FREE";
}

/**
 * Get entitlements for a given plan type.
 */
export function getEntitlements(planType) {
  const normalized = normalizePlan(planType);
  
  return {
    creditLimit: PLAN_LIMITS[normalized],
    featureAccess: {
      priorityProcessing: normalized === "PRO",
      multiPlatformExport: normalized === "STANDARD" || normalized === "PRO",
      advancedScriptStyles: normalized === "PRO",
    },
  };
}

/**
 * Single source of truth for all feature checks.
 */
export function hasEntitlement(userPlan, featureName) {
  const entitlements = getEntitlements(userPlan);
  return !!entitlements.featureAccess[featureName];
}

/**
 * Calculate credit cost for a given word count and input type.
 * Rounded up to the nearest 0.5 credits.
 *
 *   text:    wordCount / 1000
 *   blog:    wordCount / 1000 × 1.2
 *   youtube: wordCount / 1000 × 1.5
 */
export function calculateCreditCost(wordCount, inputType = "text") {
  if (!wordCount || wordCount <= 0) return 0;
  let raw;
  if (inputType === "blog") {
    raw = (wordCount / 1000) * 1.2;
  } else if (inputType === "youtube") {
    raw = (wordCount / 1000) * 1.5;
  } else {
    raw = wordCount / 1000;
  }
  // Round up to nearest 0.5
  return Math.ceil(raw / 0.5) * 0.5;
}

/**
 * Rolling 30-day expiry from now
 */
function getRollingExpiry() {
  const now = new Date();
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Fetch the user's current plan from subscriptions table
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
 * Fetch current credit usage within the rolling window
 */
async function getCreditUsage(userId) {
  const { data, error } = await supabaseAdmin
    .from("freemium_usage")
    .select("analyses_used, reset_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { creditsUsed: 0, resetAt: null };
  }

  const now = new Date();
  const resetAt = data.reset_at ? new Date(data.reset_at) : new Date(0);

  // Rolling window expired — treat as fresh
  if (now >= resetAt) {
    return { creditsUsed: 0, resetAt: null };
  }

  return {
    creditsUsed: parseFloat(data.analyses_used) || 0,
    resetAt: data.reset_at,
  };
}

/**
 * Increment credit usage after a successful analysis.
 * creditAmount is the decimal credit cost (e.g. 3.5).
 */
export async function incrementUsage(userId, creditAmount = 1) {
  try {
    const { data } = await supabaseAdmin
      .from("freemium_usage")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    let creditsUsed = parseFloat(data?.analyses_used) || 0;
    let resetAt = data?.reset_at ? new Date(data.reset_at) : null;
    const now = new Date();

    // Reset if rolling window expired or not yet initialised
    if (!resetAt || now >= resetAt) {
      creditsUsed = 0;
      resetAt = new Date(getRollingExpiry());
      console.log(`Credit window reset for user ${userId}, new expiry: ${resetAt.toISOString()}`);
    }

    const newCreditsUsed = creditsUsed + creditAmount;

    const { error: upsertError } = await supabaseAdmin
      .from("freemium_usage")
      .upsert(
        {
          user_id: userId,
          analyses_used: newCreditsUsed,
          reset_at: resetAt.toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) throw upsertError;
  } catch (err) {
    console.error("Failed to increment credit usage:", err);
  }
}

/**
 * Check if user has sufficient credits for an analysis.
 *
 * Returns:
 *   { allowed, creditsUsed, creditsTotal, creditsRemaining, resetAt, error?, code? }
 */
export async function checkEntitlement(userId, creditCost = 1) {
  try {
    const plan = await getUserPlan(userId);
    const entitlements = getEntitlements(plan);
    const totalCredits = entitlements.creditLimit;

    const { creditsUsed, resetAt } = await getCreditUsage(userId);
    const creditsRemaining = Math.max(0, totalCredits - creditsUsed);
    const cost = creditCost || 1;

    if (creditsUsed + cost > totalCredits) {
      return {
        allowed: false,
        reason: "limit_reached",
        creditsUsed,
        creditsTotal: totalCredits,
        creditsRemaining,
        resetAt,
        message: `This analysis requires ${cost} credits. You have ${creditsRemaining.toFixed(1)} credits remaining.`,
        error: `This analysis requires ${cost} credits. You have ${creditsRemaining.toFixed(1)} credits remaining.`,
        code: "TOTAL_LIMIT",
      };
    }

    return {
      allowed: true,
      creditsUsed,
      creditsTotal: totalCredits,
      creditsRemaining,
      resetAt,
    };
  } catch (err) {
    console.error("Entitlement check failed:", err);
    return {
      allowed: false,
      reason: "error",
      message: "Unable to verify usage. Please try again.",
      error: "Unable to verify usage. Please try again.",
    };
  }
}
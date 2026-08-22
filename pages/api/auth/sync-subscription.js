import { supabaseAdmin } from "@/lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = req.body?.user_id || req.body?.userId || req.query?.user_id || req.query?.userId;
    const email = (req.body?.email || req.query?.email || "").toLowerCase().trim();
    const tierParam = (req.body?.tier || req.query?.tier || "").toLowerCase().trim();

    if (!userId && !email) {
      return res.status(400).json({ error: "Missing user_id or email parameter" });
    }

    let targetEmail = email;
    let targetUserId = userId;

    // Lookup user in Auth if only user_id or email was provided
    if (!targetEmail && targetUserId) {
      const { data: userObj } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (userObj?.user?.email) {
        targetEmail = userObj.user.email.toLowerCase().trim();
      }
    } else if (!targetUserId && targetEmail) {
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
      const foundUser = usersList?.users?.find(u => u.email?.toLowerCase() === targetEmail);
      if (foundUser) {
        targetUserId = foundUser.id;
      }
    }

    console.log(`[Instant Sync] Syncing subscription for user: ${targetUserId} (${targetEmail})`);

    // 1. Check if an existing subscription row matches by user_id OR customer_email
    let { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .or(`user_id.eq.${targetUserId},customer_email.eq.${targetEmail}`)
      .maybeSingle();

    let plan = existingSub?.plan ? existingSub.plan.toLowerCase() : null;

    // If tier parameter was explicitly provided (e.g. from checkout redirect) or no sub found yet
    if (tierParam || !existingSub) {
      if (tierParam.includes("pro")) plan = "pro";
      else if (tierParam.includes("standard")) plan = "standard";
      else if (!plan) plan = "pro"; // Default checkout fallback for success session
    }

    const formattedPlan = plan === "pro" ? "Pro" : "Standard";
    const creditBalance = plan === "pro" ? 500 : 150;

    // 2. Link & Upsert subscription row with subscription_id, product_id, user_id, and customer_email
    const subscriptionData = {
      subscription_id: existingSub?.subscription_id || `sub_${targetUserId || Date.now()}`,
      product_id: existingSub?.product_id || (plan === "pro" ? "pdt_0NW7p1uWSg1OrN1USkgxw" : "pdt_0NW7piAJRxvae3C8U4Phr"),
      customer_email: targetEmail || `user_${targetUserId}@app.com`,
      plan: formattedPlan,
      status: "active",
      updated_at: new Date().toISOString(),
    };

    if (targetUserId) {
      subscriptionData.user_id = targetUserId;
    }

    const { error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .upsert(subscriptionData);

    if (subErr) {
      console.warn("[Instant Sync] Subscriptions upsert notice:", subErr.message);
    }

    // 3. Upsert public.users table if it exists
    if (targetEmail) {
      try {
        await supabaseAdmin
          .from("users")
          .upsert(
            {
              email: targetEmail,
              tier: plan,
              credit_balance: creditBalance,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "email" }
          );
      } catch (uErr) {
        console.warn("[Instant Sync] Users table notice:", uErr.message);
      }
    }

    // 4. Reset freemium_usage credits if targetUserId is present
    if (targetUserId) {
      try {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);

        await supabaseAdmin.from("freemium_usage").upsert(
          {
            user_id: targetUserId,
            analyses_used: 0,
            reset_at: expiry.toISOString(),
          },
          { onConflict: "user_id" }
        );
      } catch (fErr) {
        console.warn("[Instant Sync] Freemium usage notice:", fErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      synced: true,
      user_id: targetUserId,
      email: targetEmail,
      plan: plan,
      status: "active",
    });
  } catch (error) {
    console.error("[Instant Sync] Error:", error);
    return res.status(500).json({ error: error.message || "Failed to sync subscription" });
  }
}

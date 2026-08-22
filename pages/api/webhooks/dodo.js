import { supabaseAdmin } from "@/lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Verbose Logging
  console.log("[Dodo Webhook Payload]:", JSON.stringify(req.body, null, 2));

  try {
    const payload = req.body || {};
    const data = payload.data || {};

    // 2. Extract Customer Email
    const rawEmail =
      data.customer?.email ||
      data.customer_email ||
      data.email ||
      payload.customer?.email ||
      payload.email ||
      "";

    const customerEmail = rawEmail ? rawEmail.toLowerCase().trim() : null;

    // 3. Extract Tier & Product ID
    const rawTier = (
      data.metadata?.tier ||
      payload.metadata?.tier ||
      data.tier ||
      payload.tier ||
      data.plan ||
      "pro"
    ).toLowerCase().trim();

    const tier = rawTier.includes("pro") ? "pro" : "standard";
    const formattedPlan = tier === "pro" ? "Pro" : "Standard";

    const productId =
      data.product_id ||
      payload.product_id ||
      (tier === "pro" ? "pdt_0NW7p1uWSg1OrN1USkgxw" : "pdt_0NW7piAJRxvae3C8U4Phr");

    const subscriptionId =
      data.subscription_id ||
      data.id ||
      payload.subscription_id ||
      payload.id ||
      `sub_${Date.now()}`;

    console.log(
      `[Dodo Webhook] Processing email: "${customerEmail}", tier: "${tier}", subId: "${subscriptionId}", productId: "${productId}"`
    );

    if (!customerEmail) {
      console.warn("[Dodo Webhook] Missing customerEmail");
      return res.status(400).json({
        success: false,
        error: "customer_email is required and cannot be NULL",
      });
    }

    // 4. Lookup Supabase Auth User ID matching customerEmail
    let userId = null;
    const { data: usersList, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("Supabase Error (listUsers):", listError);
      throw listError;
    }

    if (usersList?.users) {
      const foundUser = usersList.users.find(
        (u) => u.email?.toLowerCase() === customerEmail
      );
      if (foundUser) {
        userId = foundUser.id;
        console.log(`[Dodo Webhook] Found auth user_id: ${userId}`);
      }
    }

    // 5. Upsert into subscriptions table with subscription_id and product_id
    const subPayload = {
      subscription_id: subscriptionId,
      product_id: productId,
      customer_email: customerEmail,
      plan: formattedPlan,
      status: "active",
      updated_at: new Date().toISOString(),
    };

    if (userId) {
      subPayload.user_id = userId;
    }

    const { data: subData, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .upsert(subPayload);

    if (subError) {
      console.error("Supabase Error (subscriptions upsert):", subError);
      throw subError;
    }

    console.log(`[Dodo Webhook] Subscriptions upsert successful for ${customerEmail}`);

    // 6. Reset / Upsert freemium_usage credits if userId is available
    if (userId) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);

      const { data: usageData, error: usageError } = await supabaseAdmin
        .from("freemium_usage")
        .upsert(
          {
            user_id: userId,
            analyses_used: 0,
            reset_at: expiry.toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (usageError) {
        console.error("Supabase Error (freemium_usage upsert):", usageError);
        throw usageError;
      }

      console.log(`[Dodo Webhook] Credit reset successful for user ${userId}`);
    }

    // 7. Return Success
    return res.status(200).json({
      success: true,
      updated: customerEmail,
      plan: tier,
      subscription_id: subscriptionId,
      product_id: productId,
    });
  } catch (error) {
    console.error("Fatal Webhook Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
    });
  }
}
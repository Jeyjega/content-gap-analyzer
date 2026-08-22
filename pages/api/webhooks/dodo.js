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

    // 3. Product ID & Plan Mapping
    const productId =
      data.product_id ||
      payload.product_id ||
      "";

    const rawPlan = (
      data.metadata?.tier ||
      payload.metadata?.tier ||
      data.tier ||
      payload.tier ||
      data.plan ||
      data.product_name ||
      data.product?.name ||
      ""
    ).toLowerCase().trim();

    let plan = "Standard";
    let tier = "standard";

    if (
      rawPlan.includes("pro") ||
      productId === "pdt_0NW7p1uWSg1OrN1USkgxw"
    ) {
      plan = "Pro";
      tier = "pro";
    } else if (
      rawPlan.includes("creator") ||
      rawPlan.includes("standard") ||
      productId === "pdt_0NW7piAJRxvae3C8U4Phr"
    ) {
      plan = "Standard";
      tier = "standard";
    } else {
      plan = "Standard";
      tier = "standard";
    }

    const assignedProductId =
      productId ||
      (tier === "pro" ? "pdt_0NW7p1uWSg1OrN1USkgxw" : "pdt_0NW7piAJRxvae3C8U4Phr");

    const subscriptionId =
      data.subscription_id ||
      data.id ||
      payload.subscription_id ||
      payload.id ||
      `sub_${Date.now()}`;

    // 4. Extract Next Billing Date
    const nextBillingDate =
      data.next_billing_date ||
      data.expires_at ||
      data.next_billing_at ||
      payload.next_billing_date ||
      payload.expires_at ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log(
      `[Dodo Webhook] Processing email: "${customerEmail}", plan: "${plan}", subId: "${subscriptionId}", productId: "${assignedProductId}", nextBillingDate: "${nextBillingDate}"`
    );

    if (!customerEmail) {
      console.warn("[Dodo Webhook] Missing customerEmail");
      return res.status(400).json({
        success: false,
        error: "customer_email is required and cannot be NULL",
      });
    }

    // 5. Lookup Supabase Auth User ID matching customerEmail
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

    // 6. Upsert into subscriptions table with next_billing_date
    const subPayload = {
      subscription_id: subscriptionId,
      product_id: assignedProductId,
      customer_email: customerEmail,
      plan: plan,
      status: "active",
      next_billing_date: nextBillingDate,
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

    // 7. Reset / Upsert freemium_usage credits if userId is available
    if (userId) {
      const expiry = new Date(nextBillingDate);

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

    // 8. Return Success
    return res.status(200).json({
      success: true,
      updated: customerEmail,
      plan: plan,
      subscription_id: subscriptionId,
      product_id: assignedProductId,
      next_billing_date: nextBillingDate,
    });
  } catch (error) {
    console.error("Fatal Webhook Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
    });
  }
}
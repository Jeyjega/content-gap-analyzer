import { supabaseAdmin } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        console.log("🔔 DODO WEBHOOK RECEIVED");

        const { type, data } = req.body;
        console.log("Event Type:", type);

        if (type !== "subscription.active") {
            return res.status(200).json({ received: true });
        }

        const {
            subscription_id,
            product_id,
            status,
            customer: { email },
            next_billing_date,
        } = data;

        console.log(`Processing subscription for ${email}`);

        // ✅ 1. Find user via Auth Admin API
        const { data: users, error } =
            await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            console.error("Auth list error:", error);
            return res.status(200).json({ received: true });
        }

        const user = users.users.find(u => u.email === email);

        if (!user) {
            console.warn("❌ User not found:", email);
            return res.status(200).json({ received: true });
        }

        // ✅ 2. Map product → plan
        const PRODUCT_MAP = {
            "pdt_RUST4raxbl0Rfe4VQi1z": "Standard",
        };

        const plan = PRODUCT_MAP[product_id] || "Standard";

        // ✅ 3. Upsert subscription
        const { error: upsertError } = await supabaseAdmin
            .from("subscriptions")
            .upsert(
                {
                    user_id: user.id,
                    subscription_id,
                    product_id,
                    plan,
                    status,
                    customer_email: email,
                    next_billing_date,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "subscription_id" }
            );

        if (upsertError) {
            console.error("❌ Subscription upsert failed:", upsertError);
        } else {
            console.log("✅ Subscription synced for user:", user.id);
        }

        return res.status(200).json({ received: true });
    } catch (err) {
        console.error("❌ WEBHOOK ERROR:", err);
        return res.status(200).json({ received: true });
    }
}
export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract parameters from query or body
  const tier = (
    req.query.tier ||
    req.query.plan ||
    req.body?.tier ||
    req.body?.plan ||
    "pro"
  ).toLowerCase().trim();

  const userId =
    req.body?.userId ||
    req.query?.userId ||
    req.body?.user_id ||
    req.query?.user_id ||
    "";

  const email =
    req.body?.email ||
    req.query?.email ||
    req.body?.customer_email ||
    req.query?.customer_email ||
    "";

  const normalizedTier =
    tier === "pro" || tier === "pro_creator" ? "pro" : "standard";

  const PRODUCT_IDS = {
    standard: "pdt_0NW7piAJRxvae3C8U4Phr",
    creator: "pdt_0NW7piAJRxvae3C8U4Phr",
    pro: "pdt_0NW7p1uWSg1OrN1USkgxw",
    pro_creator: "pdt_0NW7p1uWSg1OrN1USkgxw",
  };

  const productId = PRODUCT_IDS[tier] || PRODUCT_IDS[normalizedTier];

  // 1. Session Creation Payload structure
  const host = req.headers.host ? (req.headers.host.includes('localhost') ? `http://${req.headers.host}` : `https://${req.headers.host}`) : 'https://gapgens.com';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || host;
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://gapgens.com'}/dashboard?session=success`;

  const sessionPayload = {
    product_id: productId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://gapgens.com'}/dashboard?session=success`,
    customer: {
      email: email || undefined,
    },
    metadata: {
      userId: userId || undefined,
      email: email || undefined,
      tier: normalizedTier,
    },
  };

  console.log("[Dodo Checkout Session Payload]:", JSON.stringify(sessionPayload, null, 2));

  // 2. If Dodo Payments SDK client is initialized or API call is configured
  const dodoApiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (dodoApiKey) {
    try {
      const response = await fetch("https://test.dodopayments.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${dodoApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionPayload),
      });

      const data = await response.json();
      if (response.ok && data.checkout_url) {
        return res.status(200).json({
          checkoutUrl: data.checkout_url,
          return_url: sessionPayload.return_url,
          metadata: sessionPayload.metadata,
        });
      }
    } catch (apiErr) {
      console.warn("Dodo Payments API session creation warning:", apiErr.message);
    }
  }

  // 3. Fallback: Construct parameterized hosted checkout URL
  const CHECKOUT_LINKS = {
    standard: "https://test.checkout.dodopayments.com/buy/pdt_0NW7piAJRxvae3C8U4Phr?quantity=1",
    creator: "https://test.checkout.dodopayments.com/buy/pdt_0NW7piAJRxvae3C8U4Phr?quantity=1",
    pro: "https://test.checkout.dodopayments.com/buy/pdt_0NW7p1uWSg1OrN1USkgxw?quantity=1",
    pro_creator: "https://test.checkout.dodopayments.com/buy/pdt_0NW7p1uWSg1OrN1USkgxw?quantity=1",
  };

  const rawCheckoutUrl = CHECKOUT_LINKS[tier] || CHECKOUT_LINKS[normalizedTier];

  try {
    const url = new URL(rawCheckoutUrl);
    url.searchParams.set("return_url", sessionPayload.return_url);
    url.searchParams.set("tier", normalizedTier);
    url.searchParams.set("metadata[tier]", normalizedTier);

    if (userId) {
      url.searchParams.set("userId", userId);
      url.searchParams.set("user_id", userId);
      url.searchParams.set("metadata[userId]", userId);
      url.searchParams.set("metadata[user_id]", userId);
    }

    if (email) {
      url.searchParams.set("email", email);
      url.searchParams.set("customer_email", email);
      url.searchParams.set("metadata[email]", email);
    }

    const checkoutUrl = url.toString();
    return res.status(200).json({
      checkoutUrl,
      return_url: sessionPayload.return_url,
      metadata: sessionPayload.metadata,
    });
  } catch (err) {
    console.error("Error constructing checkout session URL:", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}

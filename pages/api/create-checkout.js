export default function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { plan } = req.body;

    const CHECKOUT_LINKS = {
        standard: "https://test.checkout.dodopayments.com/buy/pdt_0NW7piAJRxvae3C8U4Phr?quantity=1",
        pro: "https://test.checkout.dodopayments.com/buy/pdt_0NW7p1uWSg1OrN1USkgxw?quantity=1"
    };

    const checkoutUrl = CHECKOUT_LINKS[plan];

    if (!checkoutUrl) {
        return res.status(400).json({ error: "Invalid plan selected" });
    }

    return res.status(200).json({ checkoutUrl });
}
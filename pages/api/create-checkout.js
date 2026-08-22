import createCheckoutSessionHandler from "./create-checkout-session";

export default function handler(req, res) {
  return createCheckoutSessionHandler(req, res);
}
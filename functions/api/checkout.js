// Cloudflare Pages Function: /api/checkout.
// PAYMENTS=gumroad -> GET returns { ready, provider: "gumroad", urls } and the page links straight to Gumroad.
// Otherwise Dodo Payments (core/checkout.mjs).
import { handleCheckout } from "../../core/checkout.mjs";

export const onRequest = ({ request, env }) => {
  if (env.PAYMENTS === "gumroad") {
    const urls = { monthly: env.GUMROAD_PRO_URL_MONTHLY || env.GUMROAD_PRO_URL, quarterly: env.GUMROAD_PRO_URL_QUARTERLY, yearly: env.GUMROAD_PRO_URL_YEARLY || env.GUMROAD_PRO_URL, topup: env.GUMROAD_TOPUP_URL };
    return new Response(JSON.stringify({ ready: !!(env.GUMROAD_PRO_PRODUCT_ID && urls.monthly), provider: "gumroad", urls }),
      { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
  return handleCheckout(request, env);
};

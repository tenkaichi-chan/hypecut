// Starts a Dodo Payments checkout for Hypecut Pro.
// GET  /api/checkout                          -> { ready, mode }       (is checkout switched on?)
// POST /api/checkout { plan: monthly|yearly } -> { url, mode }         (checkout session for the overlay)
// Env: DODO_ENV, DODO_API_KEY, DODO_PRODUCT_MONTHLY, DODO_PRODUCT_YEARLY.
import { dodo, dodoEnv } from "../lib/dodo.mjs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default async (req) => {
  const products = { monthly: process.env.DODO_PRODUCT_MONTHLY, yearly: process.env.DODO_PRODUCT_YEARLY };
  const ready = !!(process.env.DODO_API_KEY && products.monthly && products.yearly);
  if (req.method === "GET") return json({ ready, mode: dodoEnv() });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!ready) return json({ error: "Pro checkout isn't switched on yet." }, 503);

  let plan = "";
  try { plan = String((await req.json()).plan || ""); } catch { return json({ error: "Bad request." }, 400); }
  if (!products[plan]) return json({ error: "Pick monthly or yearly." }, 400);

  const origin = new URL(req.url).origin;
  try {
    const s = await dodo("/checkouts", { method: "POST", body: {
      product_cart: [{ product_id: products[plan], quantity: 1 }],
      return_url: origin + "/try",
      metadata: { app: "hypecut", plan },
    } });
    if (!s || !s.checkout_url) return json({ error: "Couldn't start checkout. Try again in a minute." }, 502);
    return json({ url: s.checkout_url, mode: dodoEnv() });
  } catch (e) {
    console.error("checkout error", e && e.message);
    return json({ error: "Couldn't start checkout. Try again in a minute." }, 502);
  }
};

export const config = { path: "/api/checkout" };

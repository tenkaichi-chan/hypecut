// Checks Hypecut Pro license keys with Lemon Squeezy's public License API.
// POST /api/license  { action: "activate", key }               -> { ok, instance, plan, status, expires }
// POST /api/license  { action: "validate", key, instance }     -> same shape
// POST /api/license  { action: "deactivate", key, instance }   -> { ok }
//
// Set these in Netlify (Project configuration -> Environment variables):
//   LS_STORE_ID     your Lemon Squeezy store ID (number)            -- required
//   LS_PRODUCT_IDS  comma-separated product IDs for Hypecut Pro     -- optional but recommended
// Keys from any other store or product are rejected.

const LS = "https://api.lemonsqueezy.com/v1/licenses/";
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);

  const storeId = Number(process.env.LS_STORE_ID || 0);
  const productIds = String(process.env.LS_PRODUCT_IDS || "").split(",").map((s) => Number(s.trim())).filter(Boolean);
  if (!storeId) return json({ ok: false, error: "Pro isn't switched on yet. Try again soon." }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Bad request." }, 400); }
  const action = ["activate", "validate", "deactivate"].includes(body.action) ? body.action : null;
  const key = String(body.key || "").trim();
  const instance = String(body.instance || "").trim();
  if (!action) return json({ ok: false, error: "Bad request." }, 400);
  if (!/^[A-Za-z0-9-]{8,100}$/.test(key)) return json({ ok: false, error: "That doesn't look like a license key. Copy it from your receipt email." }, 400);
  if (action !== "activate" && !/^[A-Za-z0-9-]{1,100}$/.test(instance)) return json({ ok: false, error: "Bad request." }, 400);

  const form = new URLSearchParams({ license_key: key });
  if (action === "activate") form.set("instance_name", "Hypecut browser");
  else form.set("instance_id", instance);

  let r, d;
  try {
    r = await fetch(LS + action, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    d = await r.json();
  } catch {
    return json({ ok: false, error: "Couldn't reach the license server. Try again in a minute." }, 502);
  }

  const meta = d && d.meta;
  if (meta && (meta.store_id !== storeId || (productIds.length && !productIds.includes(meta.product_id)))) {
    return json({ ok: false, error: "That key isn't for Hypecut Pro." }, 403);
  }

  if (action === "deactivate") return json({ ok: !!d.deactivated });

  const good = action === "activate" ? !!d.activated : !!d.valid;
  const lk = d.license_key || {};
  if (!good || lk.status === "expired" || lk.status === "disabled") {
    let error = d.error || "That key isn't active.";
    if (/not found/i.test(error)) error = "We couldn't find that key. Check it against your receipt email.";
    if (/activation limit/i.test(error)) error = "This key is already used on the maximum number of browsers. Remove it from another browser first.";
    if (lk.status === "expired") error = "This Pro subscription has ended. Renew it to unlock Pro again.";
    if (lk.status === "disabled") error = "This key has been turned off. Contact support if that's a mistake.";
    return json({ ok: false, error, status: lk.status || null }, 200);
  }

  return json({
    ok: true,
    instance: (d.instance && d.instance.id) || instance,
    plan: (meta && meta.variant_name) || "Pro",
    status: lk.status || "active",
    expires: lk.expires_at || null,
  });
};

export const config = { path: "/api/license" };

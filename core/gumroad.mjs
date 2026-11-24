// Hypecut Pro sold through Gumroad (membership with a license key per sale).
// Same actions as core/license.mjs so the tool needs no special casing:
// POST /api/license { action: "validate", key }            -> { ok, plan, quota, used, remaining, boosts, resets, ... }
// POST /api/license { action: "use", key, n }              -> same, after counting n clips (limit -> { ok:false, limit:true, topupUrl })
// POST /api/license { action: "topup", key, topup_key }    -> redeem a "+10 clips" purchase on this Pro key
// POST /api/license { action: "portal", key }              -> { ok, url } where the buyer manages/cancels the membership
// Env: GUMROAD_PRO_PRODUCT_ID, GUMROAD_TOPUP_PRODUCT_ID (product ids from Gumroad), GUMROAD_PRO_URL, GUMROAD_TOPUP_URL.
// Gumroad can't charge a saved card on its own, so top-ups are a one-click purchase plus pasting the top-up key.

// Clips per calendar month by billing period: $19.99/month -> 20, $39.99/3 months -> 40, $99.99/year -> unlimited.
// Usage is still counted for every plan (useful for spotting shared keys).
const QUOTA = { monthly: 20, quarterly: 40, yearly: Infinity };
const BOOST_CLIPS = 10, MAX_BOOSTS = 5;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const period = () => new Date().toISOString().slice(0, 7);
const nextReset = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString(); };
const cleanKey = (k) => String(k || "").trim().toUpperCase().replace(/\s+/g, "");
export const isGumroadKey = (k) => /^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(cleanKey(k));

async function verify(productId, key, increment = false) {
  const r = await fetch("https://api.gumroad.com/v2/licenses/verify", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ product_id: productId, license_key: key, increment_uses_count: String(increment) }),
  });
  const d = await r.json().catch(() => null);
  if (r.status === 404 || (d && d.success === false)) return null; // unknown key for this product
  if (!r.ok || !d) throw new Error("gumroad verify " + r.status);
  return d;
}
// Access while the membership hasn't ended. A cancelled membership keeps access until the paid period runs out
// (Gumroad sets subscription_ended_at then). A failed renewal keeps access while Gumroad retries.
function active(p) {
  if (!p || p.refunded || p.chargebacked || p.disputed) return false;
  if (p.subscription_ended_at) return false;
  return true;
}
const recurrence = (p) => { const r = String(p.recurrence || "").toLowerCase(); return r in QUOTA ? r : "monthly"; };
const PLAN_NAME = { monthly: "Pro monthly", quarterly: "Pro quarterly", yearly: "Pro yearly" };

export async function handleGumroadLicense(req, env, store) {
  if (req.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);
  if (!env.GUMROAD_PRO_PRODUCT_ID) return json({ ok: false, error: "Pro isn't switched on yet. Try again soon." }, 503);
  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Bad request." }, 400); }
  const key = cleanKey(body.key);
  if (!isGumroadKey(key)) return json({ ok: false, error: "That doesn't look like a Pro key. Copy it from your Gumroad receipt email." }, 400);

  try {
    const v = await verify(env.GUMROAD_PRO_PRODUCT_ID, key);
    if (!v) return json({ ok: false, error: "We couldn't find that key. Check it and try again." });
    const p = v.purchase || {};
    if (!active(p)) return json({ ok: false, status: "expired", error: "This Pro membership has ended. Renew it on Gumroad to unlock Pro again." });
    const plan = recurrence(p);
    const ukey = "gu_" + key + "_" + period(), bkey = "gb_" + key + "_" + period();
    let used = Number(await store.get(ukey)) || 0;
    let boosts = Number(await store.get(bkey)) || 0;
    const info = () => {
      const unlimited = QUOTA[plan] === Infinity;
      const quota = unlimited ? null : QUOTA[plan] + boosts * BOOST_CLIPS;
      return { plan: PLAN_NAME[plan], status: p.subscription_cancelled_at ? "cancelled" : "active",
        cancelsAtEnd: !!p.subscription_cancelled_at, quota, used, remaining: unlimited ? null : Math.max(0, quota - used), unlimited, boosts, boosted: false,
        boostClips: BOOST_CLIPS, boostPrice: "$4.99", maxBoosts: 0, manualBoosts: MAX_BOOSTS, topupUrl: unlimited ? null : (env.GUMROAD_TOPUP_URL || null), resets: nextReset() };
    };

    if (body.action === "validate") return json({ ok: true, ...info() });

    if (body.action === "use") {
      const n = Math.max(1, Math.min(8, parseInt(body.n, 10) || 1));
      const i = info();
      if (!i.unlimited && used + n > i.quota) {
        return json({ ok: false, limit: true, ...i,
          error: boosts >= MAX_BOOSTS
            ? `You've used all ${i.quota} clips this month, including the maximum ${MAX_BOOSTS} top-ups. Clips reset on ${nextReset().slice(0, 10)}.`
            : `You've used all ${i.quota} Pro clips this month. Get 10 more for $4.99 (one click on Gumroad), then paste the top-up key under "Add top-up". Or wait until ${nextReset().slice(0, 10)}.` });
      }
      used += n;
      await store.set(ukey, String(used));
      return json({ ok: true, ...info() });
    }

    if (body.action === "topup") {
      if (!env.GUMROAD_TOPUP_PRODUCT_ID) return json({ ok: false, error: "Top-ups aren't switched on yet." }, 503);
      const tkey = cleanKey(body.topup_key);
      if (!isGumroadKey(tkey)) return json({ ok: false, error: "That doesn't look like a top-up key. Copy it from the top-up receipt email." }, 400);
      if (await store.get("gt_" + tkey)) return json({ ok: false, error: "That top-up key was already used." });
      if (boosts >= MAX_BOOSTS) return json({ ok: false, error: `You've reached the maximum ${MAX_BOOSTS} top-ups this month.` });
      const t = await verify(env.GUMROAD_TOPUP_PRODUCT_ID, tkey, true); // counts a use on Gumroad's side too
      if (!t) return json({ ok: false, error: "We couldn't find that top-up key." });
      const tp = t.purchase || {};
      if (tp.refunded || tp.chargebacked || tp.disputed) return json({ ok: false, error: "That top-up was refunded." });
      if (t.uses > 1) return json({ ok: false, error: "That top-up key was already used." });
      await store.set("gt_" + tkey, key + " " + new Date().toISOString());
      boosts++;
      await store.set(bkey, String(boosts));
      return json({ ok: true, added: BOOST_CLIPS, ...info() });
    }

    if (body.action === "portal") {
      // Gumroad's own page for managing a membership (cancel, change card). The link is also in every receipt email.
      return json({ ok: true, url: p.subscription_id ? `https://app.gumroad.com/subscriptions/${p.subscription_id}/manage` : "https://app.gumroad.com/library" });
    }
    return json({ ok: false, error: "Bad request." }, 400);
  } catch (e) {
    console.error("gumroad license error", e && e.message);
    return json({ ok: false, error: "Couldn't check Pro right now. Try again in a minute." }, 502);
  }
}

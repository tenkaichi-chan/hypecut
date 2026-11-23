// Hypecut Pro keys, backed by Paddle subscriptions.
//
// POST /api/license { action: "claim",    txn }  -> { ok, key, plan, status }  after Paddle checkout
// POST /api/license { action: "validate", key }  -> { ok, plan, status, renews, quota, used, remaining, resets }
// POST /api/license { action: "use", key, n }    -> same, after counting n clips (refuses past the monthly allowance)
// POST /api/license { action: "portal",   key }  -> { ok, url }                Paddle customer portal
//
// A key maps to a Paddle customer + subscription (stored in Netlify Blobs; also written to the
// subscription's custom_data so you can find it in the Paddle dashboard).
// Pro is on while the subscription is active, trialing or past_due (Paddle retries payment).
// Env: PADDLE_ENV, PADDLE_API_KEY.
import { getStore } from "@netlify/blobs";
import { paddle } from "../lib/paddle.mjs";

const ON = new Set(["active", "trialing", "past_due"]);
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

function newKey() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid typos
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let s = "";
  bytes.forEach((b, i) => { s += abc[b % abc.length]; if (i % 4 === 3 && i < 15) s += "-"; });
  return "HC-" + s;
}
// Monthly clip allowance: monthly plan 20 clips/month, yearly plan 80 clips/month.
// Usage resets on the 1st of each month (UTC).
const QUOTA = { month: 20, year: 80 };
// Auto top-up when a subscriber runs out: +10 clips for $4.99 (env PADDLE_PRICE_BOOST), at most 5 per month.
const BOOST_CLIPS = 10, MAX_BOOSTS = 5;
const quotaFor = (sub) => QUOTA[(sub && sub.billing_cycle && sub.billing_cycle.interval) || "month"] || QUOTA.month;
const period = () => new Date().toISOString().slice(0, 7); // "YYYY-MM"
const nextReset = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString(); };
const cleanKey = (k) => String(k || "").trim().toUpperCase().replace(/\s+/g, "");
const planName = (sub) => {
  const iv = sub && sub.billing_cycle && sub.billing_cycle.interval;
  return iv === "year" ? "Pro yearly" : "Pro monthly";
};

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);
  if (!process.env.PADDLE_API_KEY) return json({ ok: false, error: "Pro isn't switched on yet. Try again soon." }, 503);
  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Bad request." }, 400); }
  const store = getStore({ name: "licenses", consistency: "strong" });

  try {
    // ---- after checkout: turn a paid transaction into a key (same key if called again) ----
    if (body.action === "claim") {
      const txn = String(body.txn || "");
      if (!/^txn_[a-z0-9]{10,40}$/.test(txn)) return json({ ok: false, error: "Bad request." }, 400);
      const existing = await store.get("t_" + txn);
      const t = await paddle("/transactions/" + txn);
      if (!["paid", "completed"].includes(t.status) || !t.subscription_id) {
        return json({ ok: false, pending: true, error: "Your payment is still being confirmed. This page will keep checking." });
      }
      const sub = await paddle("/subscriptions/" + t.subscription_id);
      if (existing) return json({ ok: true, key: existing, plan: planName(sub), status: sub.status });
      const key = newKey();
      await store.setJSON("k_" + key, { sub: sub.id, customer: t.customer_id, created: Date.now() });
      await store.set("t_" + txn, key);
      await paddle("/subscriptions/" + sub.id, { method: "PATCH", body: { custom_data: { ...(sub.custom_data || {}), hypecut_key: key } } }).catch(() => {});
      return json({ ok: true, key, plan: planName(sub), status: sub.status });
    }

    // ---- everything else needs a key ----
    const key = cleanKey(body.key);
    if (!/^HC-[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(key)) return json({ ok: false, error: "That doesn't look like a Hypecut key. It starts with HC-." }, 400);
    const rec = await store.get("k_" + key, { type: "json" });
    if (!rec) return json({ ok: false, error: "We couldn't find that key. Check it and try again." });

    if (body.action === "validate" || body.action === "use") {
      const sub = await paddle("/subscriptions/" + rec.sub);
      if (!ON.has(sub.status)) {
        return json({ ok: false, status: "expired", error: "This Pro subscription has ended. Renew it to unlock Pro again." });
      }
      const ukey = "u_" + key + "_" + period(), bkey = "b_" + key + "_" + period();
      let used = Number(await store.get(ukey)) || 0;
      let boosts = Number(await store.get(bkey)) || 0;
      let quota = quotaFor(sub) + boosts * BOOST_CLIPS;
      let boosted = false;
      if (body.action === "use") {
        const n = Math.max(1, Math.min(8, parseInt(body.n, 10) || 1));
        // out of clips: automatically add a top-up pack, charged now to the saved payment method,
        // so the subscriber's project isn't interrupted (capped per month to avoid surprise bills)
        while (used + n > quota && boosts < MAX_BOOSTS && process.env.PADDLE_PRICE_BOOST) {
          try {
            await paddle("/subscriptions/" + sub.id + "/charge", { method: "POST", body: {
              effective_from: "immediately",
              items: [{ price_id: process.env.PADDLE_PRICE_BOOST, quantity: 1 }],
            } });
          } catch (e) {
            console.error("top-up charge failed", e && e.message);
            break; // e.g. card declined: fall through to the limit message
          }
          boosts++; quota += BOOST_CLIPS; boosted = true;
          await store.set(bkey, String(boosts));
        }
        if (used + n > quota) {
          return json({ ok: false, limit: true, quota, used, remaining: Math.max(0, quota - used), boosts, resets: nextReset(),
            error: boosts >= MAX_BOOSTS
              ? "You've used all " + quota + " clips this month, including the maximum " + MAX_BOOSTS + " automatic top-ups. Clips reset on " + nextReset().slice(0, 10) + "."
              : "You've used all " + quota + " Pro clips for this month and we couldn't add more automatically (check your payment method in Manage subscription). Clips reset on " + nextReset().slice(0, 10) + "." });
        }
        used += n;
        await store.set(ukey, String(used));
      }
      return json({ ok: true, plan: planName(sub), status: sub.status, cancelsAtEnd: !!sub.scheduled_change, renews: sub.next_billed_at || null,
        quota, used, remaining: Math.max(0, quota - used), boosts, boosted, boostClips: BOOST_CLIPS, boostPrice: "$4.99", maxBoosts: MAX_BOOSTS, resets: nextReset() });
    }

    if (body.action === "portal") {
      const s = await paddle("/customers/" + rec.customer + "/portal-sessions", { method: "POST", body: { subscription_ids: [rec.sub] } });
      const url = s && s.urls && s.urls.general && s.urls.general.overview;
      return url ? json({ ok: true, url }) : json({ ok: false, error: "Couldn't open subscription settings." }, 502);
    }

    return json({ ok: false, error: "Bad request." }, 400);
  } catch (e) {
    if (e && e.status === 404) return json({ ok: false, error: "We couldn't find that payment or subscription." });
    console.error("license error", e && e.message);
    return json({ ok: false, error: "Couldn't check Pro right now. Try again in a minute." }, 502);
  }
};

export const config = { path: "/api/license" };

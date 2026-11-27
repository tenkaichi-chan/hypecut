// ReelMyGame Pro keys, backed by Dodo Payments subscriptions.
//
// POST /api/license { action: "claim",    subscription_id } -> { ok, key, plan, status }  after checkout
// POST /api/license { action: "validate", key }  -> { ok, plan, status, renews, quota, used, remaining, resets, ... }
// POST /api/license { action: "use", key, n }    -> same, after counting n clips (auto top-up when out)
// POST /api/license { action: "portal",   key }  -> { ok, url }   Dodo customer portal
//
// A key maps to a Dodo customer + subscription (the host key-value store; also written to the subscription's
// metadata so you can find it in the Dodo dashboard). Pro is on while the subscription is
// active or past_due/on_hold (Dodo retries payment), so customers aren't cut off by a failed renewal.
// Env: DODO_ENV, DODO_API_KEY, DODO_PRODUCT_MONTHLY, DODO_PRODUCT_YEARLY, DODO_PRODUCT_BOOST.
import { makeDodo } from "./dodo.mjs";

const ON = new Set(["active", "past_due", "on_hold"]);
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// Monthly clip allowance: monthly plan 20 clips/month, yearly plan unlimited. Resets on the 1st (UTC).
const QUOTA = { month: 20, year: Infinity };
// Auto top-up when a subscriber runs out: +10 clips for $4.99, charged to the saved payment method, max 5 a month.
const BOOST_CLIPS = 10, MAX_BOOSTS = 5; // price lives on the DODO_PRODUCT_BOOST product ($4.99)
const interval = (sub) => String((sub && sub.payment_frequency_interval) || "Month").toLowerCase();
const quotaFor = (sub) => QUOTA[interval(sub)] || QUOTA.month;
const planName = (sub) => (interval(sub) === "year" ? "Pro yearly" : "Pro monthly");
const period = () => new Date().toISOString().slice(0, 7); // "YYYY-MM"
const nextReset = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString(); };

function newKey() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid typos
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let s = "";
  bytes.forEach((b, i) => { s += abc[b % abc.length]; if (i % 4 === 3 && i < 15) s += "-"; });
  return "HC-" + s;
}
const cleanKey = (k) => String(k || "").trim().toUpperCase().replace(/\s+/g, "");

// store: { get(key[, {type:"json"}]), set(key, string), setJSON(key, obj) }  (Netlify Blobs or Cloudflare KV adapter)
export async function handleLicense(req, env, store) {
  const dodo = makeDodo(env);
  if (req.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);
  if (!env.DODO_API_KEY) return json({ ok: false, error: "Pro isn't switched on yet. Try again soon." }, 503);
  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Bad request." }, 400); }
  const ours = new Set([env.DODO_PRODUCT_MONTHLY, env.DODO_PRODUCT_YEARLY].filter(Boolean));

  try {
    // ---- after checkout: turn a paid subscription into a key (same key if called again) ----
    if (body.action === "claim") {
      const sid = String(body.subscription_id || "");
      if (!/^sub_[A-Za-z0-9]{6,60}$/.test(sid)) return json({ ok: false, error: "Bad request." }, 400);
      const sub = await dodo("/subscriptions/" + sid);
      if (ours.size && !ours.has(sub.product_id)) return json({ ok: false, error: "That subscription isn't for ReelMyGame Pro." });
      if (!ON.has(sub.status)) {
        return json({ ok: false, pending: sub.status === "pending", error: sub.status === "pending" ? "Your payment is still being confirmed. This page will keep checking." : "This subscription isn't active." });
      }
      const existing = await store.get("d_" + sid);
      if (existing) return json({ ok: true, key: existing, plan: planName(sub), status: sub.status });
      const key = newKey();
      await store.setJSON("k_" + key, { provider: "dodo", sub: sid, customer: sub.customer && sub.customer.customer_id, created: Date.now() });
      await store.set("d_" + sid, key);
      await dodo("/subscriptions/" + sid, { method: "PATCH", body: { metadata: { ...(sub.metadata || {}), reelmygame_key: key } } }).catch(() => {});
      return json({ ok: true, key, plan: planName(sub), status: sub.status });
    }

    // ---- everything else needs a key ----
    const key = cleanKey(body.key);
    if (!/^HC-[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(key)) return json({ ok: false, error: "That doesn't look like a ReelMyGame key. It starts with HC-." }, 400);
    const rec = await store.get("k_" + key, { type: "json" });
    if (!rec || rec.provider !== "dodo") return json({ ok: false, error: "We couldn't find that key. Check it and try again." });

    if (body.action === "validate" || body.action === "use") {
      const sub = await dodo("/subscriptions/" + rec.sub);
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
        // out of clips: automatically charge a top-up to the saved payment method so the project isn't interrupted
        while (used + n > quota && boosts < MAX_BOOSTS && env.DODO_PRODUCT_BOOST) {
          // charge the one-time "extra clips" product to the card saved on the subscription, with no checkout screen.
          // Clips unlock once Dodo accepts the charge (Indian card mandates can take a while to settle).
          try {
            if (!sub.payment_method_id) throw new Error("no saved payment method");
            const pay = await dodo("/checkouts", { method: "POST", body: {
              product_cart: [{ product_id: env.DODO_PRODUCT_BOOST, quantity: 1 }],
              customer: { customer_id: sub.customer && sub.customer.customer_id },
              payment_method_id: sub.payment_method_id,
              confirm: true,
              ...(sub.billing && sub.billing.country ? { billing_address: sub.billing } : {}),
              metadata: { app: "reelmygame", kind: "topup", clips: String(BOOST_CLIPS), subscription_id: rec.sub },
            } });
            if (!pay || !pay.payment_id) throw new Error("no payment created");
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
      const unlimited = quota === Infinity;
      return json({ ok: true, plan: planName(sub), status: sub.status, cancelsAtEnd: !!sub.cancel_at_next_billing_date, renews: sub.next_billing_date || null,
        quota: unlimited ? null : quota, used, remaining: unlimited ? null : Math.max(0, quota - used), unlimited, boosts, boosted, boostClips: BOOST_CLIPS, boostPrice: "$4.99", maxBoosts: MAX_BOOSTS, resets: nextReset() });
    }

    if (body.action === "portal") {
      const origin = new URL(req.url).origin;
      const s = await dodo("/customers/" + rec.customer + "/customer-portal/session?return_url=" + encodeURIComponent(origin + "/try"), { method: "POST" });
      return s && s.link ? json({ ok: true, url: s.link }) : json({ ok: false, error: "Couldn't open subscription settings." }, 502);
    }

    return json({ ok: false, error: "Bad request." }, 400);
  } catch (e) {
    if (e && e.status === 404) return json({ ok: false, error: "We couldn't find that payment or subscription." });
    console.error("license error", e && e.message);
    return json({ ok: false, error: "Couldn't check Pro right now. Try again in a minute." }, 502);
  }
}

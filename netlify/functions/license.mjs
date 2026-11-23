// Hypecut Pro keys, backed by Paddle subscriptions.
//
// POST /api/license { action: "claim",    txn }  -> { ok, key, plan, status }  after Paddle checkout
// POST /api/license { action: "validate", key }  -> { ok, plan, status, renews }
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

    if (body.action === "validate") {
      const sub = await paddle("/subscriptions/" + rec.sub);
      if (!ON.has(sub.status)) {
        return json({ ok: false, status: "expired", error: "This Pro subscription has ended. Renew it to unlock Pro again." });
      }
      return json({ ok: true, plan: planName(sub), status: sub.status, cancelsAtEnd: !!sub.scheduled_change, renews: sub.next_billed_at || null });
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

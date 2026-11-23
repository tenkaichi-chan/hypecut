// Customer-facing routes, all authenticated by the Pro key (HC-...). The key is the credential:
// the server resolves the Paddle customer from it. The client never supplies a customer id.
//
//   POST /api/paddle/portal  Authorization: Bearer HC-...   -> { url }  (or a 303 redirect for form posts)
//   POST /api/paddle/access  Authorization: Bearer HC-...   -> { access, status, scheduledChange }
//   POST /api/paddle/claim   { transaction_id }             -> { key, access }  (shown once after checkout)
import { makePaddle, json, cleanKey, KEY_RE } from "./sdk.mjs";
import { grantsAccess, getSubscriptionByKey } from "./access.mjs";
import { ensureCustomer, upsertSubscription, getSubscription, isMissing } from "./db.mjs";

function bearerKey(request) {
  const h = request.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  const key = cleanKey(m && m[1]);
  return KEY_RE.test(key) ? key : null;
}
async function authenticate(request, env) {
  if (!env.DB) return { error: json({ error: "Billing isn't configured." }, 500) };
  const key = bearerKey(request);
  if (!key) return { error: json({ error: "Sign in with your Pro key." }, 401) };
  const sub = await getSubscriptionByKey(env.DB, key);
  if (!sub) return { error: json({ error: "We couldn't find that Pro key." }, 401) };
  return { sub };
}

export async function handlePortal(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;
  const { sub } = auth;
  try {
    const paddle = makePaddle(env);
    const session = await paddle.customerPortalSessions.create(sub.customer_id, [sub.subscription_id]);
    const url = session.urls && session.urls.general && session.urls.general.overview;
    if (!url) return json({ error: "Couldn't open the billing portal." }, 502);
    const wantsJson = /application\/json/.test(request.headers.get("accept") || "");
    if (!wantsJson) return new Response(null, { status: 303, headers: { Location: url, "Cache-Control": "no-store" } });
    return json({ url });
  } catch (e) {
    console.error("portal error", e && e.message);
    return json({ error: "Couldn't open the billing portal. Try again in a minute." }, 502);
  }
}

export async function handleAccess(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;
  const { sub } = auth;
  return json({
    access: grantsAccess(sub), status: sub.status,
    scheduledChange: sub.scheduled_change_action ? { action: sub.scheduled_change_action, at: sub.scheduled_change_at } : null,
  });
}

// After checkout the buyer holds a transaction id. Confirm with Paddle (server-side) that it is a
// completed subscription payment, make sure the subscription is mirrored, and hand back its key.
export async function handleClaim(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!env.DB) return json({ error: "Billing isn't configured." }, 500);
  let body; try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const txn = String(body.transaction_id || "");
  if (!/^txn_[a-z0-9]{20,40}$/.test(txn)) return json({ error: "Bad request." }, 400);
  try {
    const paddle = makePaddle(env);
    const t = await paddle.transactions.get(txn);
    if (!["paid", "completed"].includes(t.status) || !t.subscriptionId || !t.customerId) {
      return json({ ok: false, pending: true, error: "Your payment is still being confirmed." });
    }
    let sub = await getSubscription(env.DB, t.subscriptionId);
    if (!sub) { // the webhook hasn't landed yet: mirror it now (same idempotent upsert)
      const s = await paddle.subscriptions.get(t.subscriptionId);
      await ensureCustomer(env.DB, paddle, t.customerId, null);
      await upsertSubscription(env.DB, s, null);
      sub = await getSubscription(env.DB, t.subscriptionId);
    }
    return json({ ok: true, key: sub.license_key, access: grantsAccess(sub), status: sub.status });
  } catch (e) {
    if (isMissing(e)) return json({ ok: false, error: "We couldn't find that payment." }); // unknown / malformed id
    console.error("claim error", e && e.message);
    return json({ error: "Couldn't confirm that payment. Try again in a minute." }, 502);
  }
}

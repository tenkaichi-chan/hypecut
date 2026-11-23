// D1 (SQLite) mirror of Paddle state. Every write is an idempotent upsert keyed on the Paddle ID,
// guarded by last_event_at so an older, late-arriving event never overwrites newer state.
import { newKey } from "./sdk.mjs";

const iso = (v) => (v ? new Date(v).toISOString() : null);
// Paddle's API says "this id can't be fetched" with type "request_error" and code not_found / bad_request.
// Anything else (5xx, rate limit, network) is transient: the caller rethrows so Paddle retries the delivery.
// Auth problems (authentication_failed, forbidden) and rate limits are deliberately NOT in this list:
// those are configuration/transient faults and must surface so the delivery is retried and someone notices.
const UNFETCHABLE = new Set(["not_found", "bad_request", "invalid_url", "invalid_field"]);
const isMissing = (e) => !!e && e.type === "request_error" && UNFETCHABLE.has(e.code);

export async function upsertCustomer(db, c, eventAt) {
  const at = iso(eventAt) || new Date().toISOString();
  await db.prepare(
    `INSERT INTO customers (customer_id, email, created_at, updated_at, last_event_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(customer_id) DO UPDATE SET
       email = excluded.email, updated_at = excluded.updated_at, last_event_at = excluded.last_event_at
     WHERE customers.last_event_at IS NULL OR customers.last_event_at <= excluded.last_event_at`
  ).bind(c.id, c.email, iso(c.createdAt) || at, iso(c.updatedAt) || at, at).run();
}

// A subscription row needs its customer first (foreign key). Events can arrive in any order,
// so make sure the customer exists: fetch it from Paddle; if Paddle doesn't know it, keep a
// placeholder row that the next customer.created/updated event fills in.
export async function ensureCustomer(db, paddle, customerId, eventAt) {
  const have = await db.prepare("SELECT customer_id FROM customers WHERE customer_id = ?").bind(customerId).first();
  if (have) return;
  try {
    const c = await paddle.customers.get(customerId);
    await upsertCustomer(db, { id: c.id, email: c.email, createdAt: c.createdAt, updatedAt: c.updatedAt }, eventAt);
  } catch (e) {
    if (!isMissing(e)) throw e; // a real failure: let Paddle retry the delivery
    await db.prepare("INSERT INTO customers (customer_id, email) VALUES (?1, '') ON CONFLICT(customer_id) DO NOTHING").bind(customerId).run();
  }
}

export async function upsertSubscription(db, s, eventAt) {
  const item = (s.items || [])[0] || {};
  const priceId = item.price && item.price.id;
  const productId = (item.price && item.price.productId) || (item.product && item.product.id);
  if (!priceId || !productId) throw new Error("subscription " + s.id + " has no price/product");
  const at = iso(eventAt) || new Date().toISOString();
  await db.prepare(
    `INSERT INTO subscriptions
       (subscription_id, customer_id, status, price_id, product_id, scheduled_change_action, scheduled_change_at,
        license_key, created_at, updated_at, last_event_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
     ON CONFLICT(subscription_id) DO UPDATE SET
       customer_id = excluded.customer_id, status = excluded.status, price_id = excluded.price_id,
       product_id = excluded.product_id, scheduled_change_action = excluded.scheduled_change_action,
       scheduled_change_at = excluded.scheduled_change_at, updated_at = excluded.updated_at,
       last_event_at = excluded.last_event_at
     WHERE subscriptions.last_event_at IS NULL OR subscriptions.last_event_at <= excluded.last_event_at`
  ).bind(
    s.id, s.customerId, s.status, priceId, productId,
    s.scheduledChange ? s.scheduledChange.action : null,
    s.scheduledChange ? iso(s.scheduledChange.effectiveAt) : null,
    newKey(), // only used on first insert: license_key is never overwritten by an update
    iso(s.createdAt) || at, iso(s.updatedAt) || at, at
  ).run();
}

export const getSubscription = (db, id) => db.prepare("SELECT * FROM subscriptions WHERE subscription_id = ?").bind(id).first();
export { isMissing };

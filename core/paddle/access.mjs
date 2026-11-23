// Does a mirrored subscription currently grant paid access?
//
//   active, trialing  -> yes
//   past_due          -> yes (grace: Paddle keeps retrying the card, so a failed renewal doesn't cut a customer off)
//   paused, canceled  -> no
//   anything else     -> no
//
// A scheduled_change (cancel/pause at period end) does NOT revoke access. The customer paid for the
// current period; access ends only when Paddle actually flips the status to canceled/paused.
const GRANTING = new Set(["active", "trialing", "past_due"]);

export function grantsAccess(sub) {
  return !!sub && GRANTING.has(String(sub.status || "").toLowerCase());
}

export async function getSubscriptionByKey(db, key) {
  return db.prepare("SELECT * FROM subscriptions WHERE license_key = ?").bind(key).first();
}

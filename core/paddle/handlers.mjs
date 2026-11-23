// One handler per Paddle event type. All are idempotent: safe to run twice, or out of order.
import { upsertCustomer, ensureCustomer, upsertSubscription, getSubscription, isMissing } from "./db.mjs";

async function onCustomer(ctx, event) {
  const c = event.data;
  await upsertCustomer(ctx.db, { id: c.id, email: c.email, createdAt: c.createdAt, updatedAt: c.updatedAt }, event.occurredAt);
}

async function onSubscription(ctx, event) {
  const s = event.data;
  await ensureCustomer(ctx.db, ctx.paddle, s.customerId, event.occurredAt);
  await upsertSubscription(ctx.db, s, event.occurredAt);
}

// A completed payment can arrive before subscription.created. Make sure both rows exist.
async function onTransactionCompleted(ctx, event) {
  const t = event.data;
  if (!t.subscriptionId || !t.customerId) return; // one-off payment: nothing to mirror
  await ensureCustomer(ctx.db, ctx.paddle, t.customerId, event.occurredAt);
  if (await getSubscription(ctx.db, t.subscriptionId)) return;
  try {
    const s = await ctx.paddle.subscriptions.get(t.subscriptionId);
    await upsertSubscription(ctx.db, s, event.occurredAt);
  } catch (e) {
    if (!isMissing(e)) throw e;
  }
}

export const HANDLERS = {
  "customer.created": onCustomer,
  "customer.updated": onCustomer,
  "subscription.created": onSubscription,
  "subscription.updated": onSubscription,
  "subscription.canceled": onSubscription,
  "transaction.completed": onTransactionCompleted,
};

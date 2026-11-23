// Sends a SIGNED Paddle-style webhook to a URL, to test the handler without Paddle.
// Signature scheme (same as Paddle): header  Paddle-Signature: ts=<unix>;h1=<hex HMAC-SHA256(secret, "<ts>:<rawBody>")>
//
// usage: node tools/paddle-webhook-test.mjs <url> <secret> <scenario> [--bad-signature] [--ts-old]
// scenarios: customer, subscription, subscription-canceled, subscription-old, transaction, unknown
import crypto from "node:crypto";

const [url, secret, scenario = "customer", ...flags] = process.argv.slice(2);
if (!url || !secret) { console.error("usage: node tools/paddle-webhook-test.mjs <url> <secret> <scenario> [--bad-signature]"); process.exit(1); }

const T0 = "2026-11-23T10:00:00.000000Z";
const customer = { id: "ctm_test0000000000000000000001", status: "active", custom_data: null, name: "Test Buyer", email: "test.buyer@example.com", marketing_consent: false, locale: "en", created_at: T0, updated_at: T0, import_meta: null };
const sub = (status, at, scheduled) => ({
  id: "sub_test0000000000000000000001", status, customer_id: customer.id, address_id: "add_test0000000000000000000001", business_id: null,
  currency_code: "USD", created_at: T0, updated_at: at, started_at: T0, first_billed_at: T0, next_billed_at: "2026-12-23T10:00:00Z",
  paused_at: null, canceled_at: status === "canceled" ? at : null, discount: null, collection_mode: "automatic", billing_details: null,
  current_billing_period: { starts_at: T0, ends_at: "2026-12-23T10:00:00Z" }, billing_cycle: { frequency: 1, interval: "month" },
  scheduled_change: scheduled || null, consent_requirements: [], custom_data: null, import_meta: null,
  items: [{ status: "active", quantity: 1, recurring: true, created_at: T0, updated_at: at, previously_billed_at: T0, next_billed_at: "2026-12-23T10:00:00Z", trial_dates: null,
    price: { id: "pri_test0000000000000000000001", product_id: "pro_test0000000000000000000001", description: "Pro monthly", type: "standard", name: "Pro monthly", billing_cycle: { frequency: 1, interval: "month" }, trial_period: null, tax_mode: "account_setting", unit_price: { amount: "1999", currency_code: "USD" }, unit_price_overrides: [], custom_data: null, quantity: { minimum: 1, maximum: 1 }, status: "active", created_at: T0, updated_at: T0, import_meta: null },
    product: { id: "pro_test0000000000000000000001", name: "Hypecut Pro", type: "standard", tax_category: "standard", description: null, image_url: null, custom_data: null, status: "active", import_meta: null, created_at: T0, updated_at: T0 } }],
});
const txn = { id: "txn_test0000000000000000000001", status: "completed", customer_id: customer.id, address_id: null, business_id: null, subscription_id: sub("active", T0).id, currency_code: "USD", origin: "web", collection_mode: "automatic", items: [], details: {}, payments: [], checkout: null, created_at: T0, updated_at: T0, billed_at: T0, custom_data: null, invoice_id: null, invoice_number: null, discount_id: null, payment_ids: [], revised_at: null };

const make = (eventType, occurred, data) => ({ event_id: "evt_" + crypto.randomBytes(13).toString("hex"), event_type: eventType, occurred_at: occurred, notification_id: "ntf_" + crypto.randomBytes(13).toString("hex"), data });
const scenarios = {
  customer: () => make("customer.created", T0, customer),
  subscription: () => make("subscription.created", "2026-11-23T10:00:01.000000Z", sub("active", "2026-11-23T10:00:01Z")),
  "subscription-canceled": () => make("subscription.canceled", "2026-11-23T12:00:00.000000Z", sub("canceled", "2026-11-23T12:00:00Z")),
  "subscription-scheduled": () => make("subscription.updated", "2026-11-23T11:00:00.000000Z", sub("active", "2026-11-23T11:00:00Z", { action: "cancel", effective_at: "2026-12-23T10:00:00Z", resume_at: null })),
  "subscription-old": () => make("subscription.updated", "2026-11-23T09:00:00.000000Z", sub("active", "2026-11-23T09:00:00Z")), // older than everything above
  transaction: () => make("transaction.completed", "2026-11-23T10:00:02.000000Z", txn),
  unknown: () => make("address.created", T0, { id: "add_x" }),
};
// Real sandbox data: the newest subscription in your sandbox account, its customer and its transaction.
// Needs PADDLE_API_KEY (sandbox) in the environment. Scenarios: real-customer, real-subscription, real-transaction.
async function real() {
  const api = async (p) => (await (await fetch("https://sandbox-api.paddle.com" + p, { headers: { Authorization: "Bearer " + process.env.PADDLE_API_KEY } })).json()).data;
  const s = (await api("/subscriptions?per_page=1&order_by=id[DESC]"))[0];
  const c = await api("/customers/" + s.customer_id);
  const t = (await api("/transactions?subscription_id=" + s.id + "&per_page=1&order_by=id[DESC]"))[0];
  const now = new Date().toISOString();
  return {
    "real-customer": make("customer.updated", now, c),
    "real-subscription": make("subscription.updated", now, s),
    "real-transaction": make("transaction.completed", now, t),
  };
}
let event;
if (scenario.startsWith("real-")) event = (await real())[scenario];
else if (scenarios[scenario]) event = scenarios[scenario]();
if (!event) { console.error("unknown scenario. choose:", [...Object.keys(scenarios), "real-customer", "real-subscription", "real-transaction"].join(", ")); process.exit(1); }

// --n=2 swaps the fake ids' last digit, so scenarios can be run against a fresh fake customer/subscription.
const nFlag = flags.find(f => f.startsWith("--n="));
let body = JSON.stringify(event);
if (nFlag) body = body.split("test0000000000000000000001").join("test000000000000000000000" + nFlag.slice(4));
// --cid=ctm_... uses a specific customer id (e.g. one in Paddle's sample-data format) instead of the fake one.
const cFlag = flags.find(f => f.startsWith("--cid="));
if (cFlag) body = body.split("ctm_test0000000000000000000001").join(cFlag.slice(6)).split("ctm_test000000000000000000000" + (nFlag ? nFlag.slice(4) : "")).join(cFlag.slice(6));
const ts = Math.floor(Date.now() / 1000);
let h1 = crypto.createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
if (flags.includes("--bad-signature")) h1 = h1.replace(/^./, c => (c === "a" ? "b" : "a"));
const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Paddle-Signature": `ts=${ts};h1=${h1}` }, body });
console.log(scenario + (flags.length ? " " + flags.join(" ") : "") + " ->", res.status, (await res.text()).slice(0, 120));

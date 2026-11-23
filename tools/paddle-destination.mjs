// Creates (or finds) the Paddle notification destination for the webhook and saves its SIGNING SECRET
// into the env file as PADDLE_WEBHOOK_SECRET. The secret is never printed.
// The destination is permanent infrastructure: this tool only ever creates or reads, it never deletes.
// usage: node tools/paddle-destination.mjs <env-file> <webhook-url>
import fs from "node:fs";

const [envFile, url] = process.argv.slice(2);
if (!envFile || !url) { console.error("usage: node tools/paddle-destination.mjs <env-file> <webhook-url>"); process.exit(1); }
const text = fs.readFileSync(envFile, "utf8");
const env = Object.fromEntries(text.split(/\r?\n/).filter(l => /^\w+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const base = env.PADDLE_ENV === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
const api = async (p, method = "GET", body) => {
  const r = await fetch(base + p, { method, headers: { Authorization: "Bearer " + env.PADDLE_API_KEY, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json(); if (!r.ok) throw new Error(method + " " + p + " -> " + r.status + " " + ((d.error && d.error.detail) || ""));
  return d.data;
};

const EVENTS = ["subscription.created", "subscription.updated", "subscription.canceled", "customer.created", "customer.updated", "transaction.completed"];
const existing = (await api("/notification-settings?per_page=200")).find(n => n.destination === url);
let n = existing;
if (!n) {
  n = await api("/notification-settings", "POST", {
    description: "Hypecut fulfillment webhook", destination: url, type: "url", active: true, api_version: 1,
    include_sensitive_fields: false, subscribed_events: EVENTS, traffic_source: "all",
  });
  console.log("created notification destination", n.id);
} else console.log("destination already exists", n.id);

if (!n.endpoint_secret_key) throw new Error("Paddle didn't return the signing secret for " + n.id);
let out = text;
const set = (k, v) => { out = new RegExp("^" + k + "=.*$", "m").test(out) ? out.replace(new RegExp("^" + k + "=.*$", "m"), k + "=" + v) : out.replace(/\s*$/, "") + "\n" + k + "=" + v + "\n"; };
set("PADDLE_WEBHOOK_SECRET", n.endpoint_secret_key);
set("PADDLE_NOTIFICATION_SETTING_ID", n.id);
fs.writeFileSync(envFile, out);
console.log("subscribed events:", (n.subscribed_events || []).map(e => e.name).join(", "));
console.log("signing secret saved to " + envFile + " (not printed)");

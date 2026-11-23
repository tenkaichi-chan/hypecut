// One-time setup: creates Hypecut Pro monthly ($19.99) and yearly ($99.99) subscription products
// in Dodo Payments and writes their IDs into the env file. Safe to re-run (reuses products by metadata).
// Usage: node tools/dodo-setup.mjs [.env.dodo]
import fs from "node:fs";

const ENV_FILE = process.argv[2] || ".env.dodo";
const envText = fs.readFileSync(ENV_FILE, "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter(l => /^\w+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
if (!env.DODO_API_KEY) { console.error("Put DODO_API_KEY in " + ENV_FILE + " first."); process.exit(1); }
const base = env.DODO_ENV === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";

async function api(path, method = "GET", body) {
  const r = await fetch(base + path, { method, headers: { Authorization: "Bearer " + env.DODO_API_KEY, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let d = {}; try { d = JSON.parse(t); } catch { d = { raw: t }; }
  if (!r.ok) throw new Error(method + " " + path + " -> " + r.status + " " + (d.message || d.code || t).toString().slice(0, 300));
  return d;
}

const list = await api("/products?page_size=100");
const items = list.items || [];
async function ensure(plan, name, cents, interval) {
  const found = items.find(p => p.metadata && p.metadata.hypecut_plan === plan);
  if (found) { console.log("using", name, found.product_id); return found.product_id; }
  const p = await api("/products", "POST", {
    name,
    description: "No watermark, more clips every month, 60-second clips and every caption style.",
    tax_category: "saas",
    metadata: { app: "hypecut", hypecut_plan: plan },
    price: {
      type: "recurring_price", currency: "USD", price: cents, discount: 0, purchasing_power_parity: false, tax_inclusive: false,
      payment_frequency_count: 1, payment_frequency_interval: interval,
      subscription_period_count: 10, subscription_period_interval: "Year",
    },
  });
  console.log("created", name, p.product_id);
  return p.product_id;
}
const monthly = await ensure("monthly", "Hypecut Pro (monthly)", 1999, "Month");
const yearly = await ensure("yearly", "Hypecut Pro (yearly)", 9999, "Year");
// one-time top-up product: charged automatically to a subscriber's saved card when they run out of clips
let boost = items.find(p => p.metadata && p.metadata.hypecut_plan === "boost");
if (boost) console.log("using extra clips", boost.product_id);
else {
  boost = await api("/products", "POST", {
    name: "Hypecut extra clips (+10)", description: "10 extra Pro clips for this month.", tax_category: "saas",
    metadata: { app: "hypecut", hypecut_plan: "boost" },
    price: { type: "one_time_price", currency: "USD", price: 499, discount: 0, purchasing_power_parity: false, tax_inclusive: false },
  });
  console.log("created extra clips", boost.product_id);
}

let out = envText;
const set = (k, v) => { out = new RegExp("^" + k + "=.*$", "m").test(out) ? out.replace(new RegExp("^" + k + "=.*$", "m"), k + "=" + v) : out.replace(/\s*$/, "") + "\n" + k + "=" + v + "\n"; };
set("DODO_PRODUCT_MONTHLY", monthly); set("DODO_PRODUCT_YEARLY", yearly); set("DODO_PRODUCT_BOOST", boost.product_id);
fs.writeFileSync(ENV_FILE, out);
console.log("saved product IDs to " + ENV_FILE);

// One-time setup: creates the "Hypecut Pro" product with $19.99/month and $99.99/year prices
// in Paddle, then writes the price IDs into .env. Safe to re-run: it reuses an existing product.
// Usage: fill PADDLE_ENV + PADDLE_API_KEY in .env, then:  node tools/paddle-setup.mjs [.env.sandbox]
import fs from "node:fs";

const ENV_FILE = process.argv[2] || ".env";
const envText = fs.readFileSync(ENV_FILE, "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter(l => /^\w+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
if (!env.PADDLE_API_KEY) { console.error("Put PADDLE_API_KEY in .env first."); process.exit(1); }
const base = env.PADDLE_ENV === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";

async function api(path, method = "GET", body) {
  const r = await fetch(base + path, { method, headers: { Authorization: "Bearer " + env.PADDLE_API_KEY, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(path + ": " + ((d.error && d.error.detail) || r.status));
  return d.data;
}

const products = await api("/products?status=active&per_page=200");
let product = products.find(p => p.custom_data && p.custom_data.app === "hypecut");
if (!product) {
  product = await api("/products", "POST", {
    name: "Hypecut Pro",
    description: "No watermark, up to 8 clips per video, 60-second clips, Neon and Clean caption styles.",
    tax_category: "standard",
    custom_data: { app: "hypecut" },
  });
  console.log("created product", product.id);
} else console.log("using product", product.id);

const prices = await api("/prices?status=active&per_page=200&product_id=" + product.id);
async function ensure(interval, amount, label) {
  const found = prices.find(p => p.billing_cycle && p.billing_cycle.interval === interval && p.unit_price.amount === amount);
  if (found) { console.log("using", label, found.id); return found.id; }
  const p = await api("/prices", "POST", {
    product_id: product.id,
    description: label,
    name: label,
    unit_price: { amount, currency_code: "USD" },
    billing_cycle: { interval, frequency: 1 },
    custom_data: { app: "hypecut" },
  });
  console.log("created", label, p.id);
  return p.id;
}
const monthly = await ensure("month", "1999", "Pro monthly");
const yearly = await ensure("year", "9999", "Pro yearly");

let out = envText;
const set = (k, v) => { out = new RegExp("^" + k + "=.*$", "m").test(out) ? out.replace(new RegExp("^" + k + "=.*$", "m"), k + "=" + v) : out + "\n" + k + "=" + v; };
set("PADDLE_PRICE_MONTHLY", monthly); set("PADDLE_PRICE_YEARLY", yearly);
fs.writeFileSync(ENV_FILE, out);
console.log("saved price IDs to " + ENV_FILE);

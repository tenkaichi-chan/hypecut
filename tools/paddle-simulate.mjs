// Asks Paddle to send a simulated event to your notification destination, and prints how the endpoint answered.
// Creates a Paddle "simulation" (a test artifact). This tool never deletes anything.
// usage: node tools/paddle-simulate.mjs <env-file> <event_type> [<event_type> ...]
import fs from "node:fs";

const [envFile, ...types] = process.argv.slice(2);
if (!envFile || !types.length) { console.error("usage: node tools/paddle-simulate.mjs <env-file> <event_type>..."); process.exit(1); }
const env = Object.fromEntries(fs.readFileSync(envFile, "utf8").split(/\r?\n/).filter(l => /^\w+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const base = env.PADDLE_ENV === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
const api = async (p, method = "GET", body) => {
  const r = await fetch(base + p, { method, headers: { Authorization: "Bearer " + env.PADDLE_API_KEY, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json(); if (!r.ok) throw new Error(method + " " + p + " -> " + r.status + " " + JSON.stringify(d.error || d).slice(0, 200));
  return d.data;
};

for (const type of types) {
  const sim = await api("/simulations", "POST", { notification_setting_id: env.PADDLE_NOTIFICATION_SETTING_ID, type, name: "Hypecut test: " + type });
  const run = await api(`/simulations/${sim.id}/runs`, "POST", {});
  await new Promise(r => setTimeout(r, 6000));
  const full = await api(`/simulations/${sim.id}/runs/${run.id}?include=events`);
  const evs = full.events || [];
  console.log(type.padEnd(24), "sim", sim.id, "| events sent:", evs.length);
  for (const e of evs) console.log("   ", String(e.type).padEnd(24), "status:", e.status, "| our endpoint answered:", e.response && (e.response.status_code || e.response.statusCode), e.response && e.response.body ? String(e.response.body).slice(0, 80) : "");
}

import { handleGumroadLicense } from "../core/gumroad.mjs";
const mk = (rec) => { globalThis.fetch = async () => new Response(JSON.stringify({ success: true, uses: 0, purchase: { recurrence: rec } }), { status: 200 }); };
const store = () => { const m = new Map(); return { get: async k => m.get(k) ?? null, set: async (k, v) => m.set(k, v) }; };
const env = { GUMROAD_PRO_PRODUCT_ID: "x", GUMROAD_TOPUP_PRODUCT_ID: "y", GUMROAD_TOPUP_URL: "https://t" };
const call = async (s, body) => (await handleGumroadLicense(new Request("https://h/api/license", { method: "POST", body: JSON.stringify({ key: "AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD", ...body }) }), env, s)).json();
for (const rec of ["yearly", "monthly", "quarterly"]) {
  mk(rec); const s = store();
  const v = await call(s, { action: "validate" });
  let ok = 0, last;
  for (let i = 0; i < 150; i++) { last = await call(s, { action: "use", n: 1 }); if (!last.ok) break; ok++; }
  console.log(rec, "validate:", JSON.stringify({ plan: v.plan, quota: v.quota, remaining: v.remaining, unlimited: v.unlimited, topupUrl: v.topupUrl }), "| clips allowed:", ok, last.ok ? "" : "| stop: " + last.error.slice(0, 50));
}

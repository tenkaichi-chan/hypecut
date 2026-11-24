// One-off: Pro yearly gets unlimited clips (monthly 20, quarterly 40 a month stay).
const fs = require("fs");
const R = (file, pairs) => {
  let s = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(file + ": not found: " + a.slice(0, 70));
    s = s.split(a).join(b);
  }
  fs.writeFileSync(file, s);
  console.log("ok", file);
};

R("D:/Hypecut/core/gumroad.mjs", [
  ["// Clips per calendar month by billing period: $19.99/month, $49.99/3 months, $159.99/year.\nconst QUOTA = { monthly: 20, quarterly: 40, yearly: 100 };",
   "// Clips per calendar month by billing period: $19.99/month -> 20, $49.99/3 months -> 40, $159.99/year -> unlimited.\n// Usage is still counted for every plan (useful for spotting shared keys).\nconst QUOTA = { monthly: 20, quarterly: 40, yearly: Infinity };"],
  ["      const quota = QUOTA[plan] + boosts * BOOST_CLIPS;\n",
   "      const unlimited = QUOTA[plan] === Infinity;\n      const quota = unlimited ? null : QUOTA[plan] + boosts * BOOST_CLIPS;\n"],
  ["quota, used, remaining: Math.max(0, quota - used), boosts, boosted: false,",
   "quota, used, remaining: unlimited ? null : Math.max(0, quota - used), unlimited, boosts, boosted: false,"],
  ["topupUrl: env.GUMROAD_TOPUP_URL || null, resets",
   "topupUrl: unlimited ? null : (env.GUMROAD_TOPUP_URL || null), resets"],
  ["      if (used + n > i.quota) {", "      if (!i.unlimited && used + n > i.quota) {"],
]);

R("D:/Hypecut/core/license.mjs", [
  ["monthly plan 20 clips/month, yearly plan 100 clips/month.", "monthly plan 20 clips/month, yearly plan unlimited."],
  ["const QUOTA = { month: 20, year: 100 };", "const QUOTA = { month: 20, year: Infinity };"],
  ["      return json({ ok: true, plan: planName(sub), status: sub.status, cancelsAtEnd: !!sub.cancel_at_next_billing_date, renews: sub.next_billing_date || null,\n        quota, used, remaining: Math.max(0, quota - used), boosts,",
   "      const unlimited = quota === Infinity;\n      return json({ ok: true, plan: planName(sub), status: sub.status, cancelsAtEnd: !!sub.cancel_at_next_billing_date, renews: sub.next_billing_date || null,\n        quota: unlimited ? null : quota, used, remaining: unlimited ? null : Math.max(0, quota - used), unlimited, boosts,"],
]);

R("D:/Hypecut/hypecut-site/try.html", [
  ["    if (d && typeof d.quota === \"number\") Object.assign(pro,",
   "    if (d && d.unlimited) Object.assign(pro, { unlimited: true, quota: null, remaining: null, plan: d.plan, resets: d.resets, maxBoosts: 0 });\n    if (d && typeof d.quota === \"number\") Object.assign(pro, { unlimited: false }), Object.assign(pro,"],
  ["      ? (pro.quota ? (pro.plan",
   "      ? (pro.unlimited ? (pro.plan || \"Pro\") + \" · unlimited clips · no watermark, 60-second clips and every caption style.\"\n       : pro.quota ? (pro.plan"],
  ["\"Pro: \" + (pro.quota ? pro.quota + \" clips a month\" : \"no watermark\")",
   "\"Pro: \" + (pro.unlimited ? \"unlimited clips\" : pro.quota ? pro.quota + \" clips a month\" : \"no watermark\")"],
  ["Pro gives you 20 clips a month ($19.99/month), 40 clips a month ($49.99 every 3 months) or 100 clips a month ($159.99/year)",
   "Pro gives you 20 clips a month ($19.99/month), 40 clips a month ($49.99 every 3 months) or unlimited clips ($159.99/year)"],
  ["or go Pro for 20–100 clips a month.", "or go Pro for more (yearly Pro is unlimited)."],
]);

R("D:/Hypecut/hypecut-site/index.html", [
  ["Pro adds 20 to 100 clips a month without the watermark.", "Pro adds more clips (unlimited on yearly) without the watermark."],
  ['<span class="deal-chip" id="proDeal">About 13¢ a clip</span>', '<span class="deal-chip" id="proDeal">No monthly cap</span>'],
  ['<li><span><b id="proClips">100 clips</b> a month</span></li>', '<li><span id="proClips"><b>Unlimited clips</b></span></li>'],
  ["quarterly is $49.99 every 3 months for 40 clips a month; yearly is $159.99 for 100 clips a month.",
   "quarterly is $49.99 every 3 months for 40 clips a month; yearly is $159.99 with unlimited clips."],
  [`clips: "20 clips", deal: "About $1 a clip"`, `clips: "<b>20 clips</b> a month", deal: "About $1 a clip"`],
  [`fine: "That's $16.66 a month, billed every 3 months. 2× the clips of monthly.", clips: "40 clips", deal: "About 42¢ a clip"`,
   `fine: "That's $16.66 a month, billed every 3 months. 2× the clips of monthly.", clips: "<b>40 clips</b> a month", deal: "About 42¢ a clip"`],
  [`fine: "That's $13.33 a month, billed yearly. 5× the clips of monthly.", clips: "100 clips", deal: "About 13¢ a clip"`,
   `fine: "That's $13.33 a month, billed yearly. Make as many clips as you want.", clips: "<b>Unlimited clips</b>", deal: "No monthly cap"`],
  [`document.getElementById("proClips").textContent = PLANS[b].clips;`, `document.getElementById("proClips").innerHTML = PLANS[b].clips;`],
]);

R("D:/Hypecut/hypecut-site/terms.html", [
  ["Pro monthly includes 20 clips per calendar month, Pro quarterly includes 40 clips per calendar month, and Pro yearly includes 100 clips per calendar month.",
   "Pro monthly includes 20 clips per calendar month, Pro quarterly includes 40 clips per calendar month, and Pro yearly has no monthly clip limit (the per-video limits below still apply, and we may suspend a key that is shared or resold)."],
]);

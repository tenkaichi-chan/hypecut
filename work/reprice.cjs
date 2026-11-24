// One-off: new Pro pricing. Monthly $19.99 / 20 clips, quarterly $49.99 / 40 clips a month, yearly $159.99 / 100 clips a month.
const fs = require("fs");
const R = (file, pairs) => {
  let s = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(file + ": not found: " + a.slice(0, 60));
    s = s.split(a).join(b);
  }
  fs.writeFileSync(file, s);
  console.log("ok", file);
};

R("D:/Hypecut/hypecut-site/index.html", [
  ["Pro adds 20 or 80 clips a month without the watermark.", "Pro adds 20 to 100 clips a month without the watermark."],
  ['<span class="amt" id="proAmt">$99.99</span>', '<span class="amt" id="proAmt">$159.99</span>'],
  ['<p class="fine" id="proFine">That\'s $8.33 a month, billed yearly.</p>', '<p class="fine" id="proFine">That\'s $13.33 a month, billed yearly.</p>'],
  ['<span class="deal-chip" id="proDeal">About 10¢ a clip</span>', '<span class="deal-chip" id="proDeal">About 13¢ a clip</span>'],
  ['<b id="proClips">80 clips</b>', '<b id="proClips">100 clips</b>'],
  ["Monthly is $19.99 for 20 clips a month; quarterly is $59.97 every 3 months (same clips, same rate as monthly); yearly is $99.99 for 80 clips a month.",
   "Monthly is $19.99 for 20 clips a month; quarterly is $49.99 every 3 months for 40 clips a month; yearly is $159.99 for 100 clips a month."],
  ["  // Quarterly is a real plan priced at the monthly rate (no saving); it makes monthly look flexible and yearly look like the deal.\n", ""],
  [`monthly: { amt: "$19.99", per: "/ month", fine: "Billed monthly. Cancel anytime.", clips: "20 clips", deal: "About $1 a clip", badge: "Most flexible", label: "monthly" },`,
   `monthly: { amt: "$19.99", per: "/ month", fine: "Billed monthly. Cancel anytime.", clips: "20 clips", deal: "About $1 a clip", badge: "Most flexible", label: "monthly" },`],
  [`quarterly: { amt: "$59.97", per: "/ 3 months", fine: "Billed every 3 months. Same price and clips as monthly.", clips: "20 clips", deal: "About $1 a clip", badge: "3-month plan", label: "quarterly" },`,
   `quarterly: { amt: "$49.99", per: "/ 3 months", fine: "That's $16.66 a month, billed every 3 months. 2× the clips of monthly.", clips: "40 clips", deal: "About 42¢ a clip", badge: "Save 17%", label: "quarterly" },`],
  [`yearly: { amt: "$99.99", per: "/ year", fine: "That's $8.33 a month, billed yearly. 4× the clips of monthly.", clips: "80 clips", deal: "About 10¢ a clip", badge: "Best value", label: "yearly" }`,
   `yearly: { amt: "$159.99", per: "/ year", fine: "That's $13.33 a month, billed yearly. 5× the clips of monthly.", clips: "100 clips", deal: "About 13¢ a clip", badge: "Best value · save 33%", label: "yearly" }`],
]);

R("D:/Hypecut/hypecut-site/terms.html", [
  ["<b>$59.97 every 3 months</b> or <b>$99.99 per year</b>", "<b>$49.99 every 3 months</b> or <b>$159.99 per year</b>"],
  ["Pro monthly and Pro quarterly include 20 clips per calendar month, and Pro yearly includes 80 clips per calendar month.",
   "Pro monthly includes 20 clips per calendar month, Pro quarterly includes 40 clips per calendar month, and Pro yearly includes 100 clips per calendar month."],
]);

R("D:/Hypecut/hypecut-site/try.html", [
  ["Pro gives you 20 clips a month ($19.99/month) or 80 clips a month ($99.99/year)",
   "Pro gives you 20 clips a month ($19.99/month), 40 clips a month ($49.99 every 3 months) or 100 clips a month ($159.99/year)"],
  ["or go Pro for 20–80 clips a month.", "or go Pro for 20–100 clips a month."],
]);

R("D:/Hypecut/core/gumroad.mjs", [
  ["// Clips per calendar month by billing period. Quarterly is a real plan at the monthly rate (same clips, no saving).\nconst QUOTA = { monthly: 20, quarterly: 20, yearly: 80 };",
   "// Clips per calendar month by billing period: $19.99/month, $49.99/3 months, $159.99/year.\nconst QUOTA = { monthly: 20, quarterly: 40, yearly: 100 };"],
]);

R("D:/Hypecut/core/license.mjs", [
  ["monthly plan 20 clips/month, yearly plan 80 clips/month.", "monthly plan 20 clips/month, yearly plan 100 clips/month."],
  ["const QUOTA = { month: 20, year: 80 };", "const QUOTA = { month: 20, year: 100 };"],
]);

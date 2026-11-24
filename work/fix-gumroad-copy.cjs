// One-off: make site copy match how payments work today (Gumroad, manual top-ups).
const fs = require("fs");
const edit = (file, pairs) => {
  let s = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.error("MISSING in " + file + ": " + a.slice(0, 70)); process.exit(1); }
    s = s.split(a).join(b);
  }
  fs.writeFileSync(file, s);
  console.log("ok", file);
};

edit("hypecut-site/index.html", [
  ['<li><span><b>Never stopped mid-project:</b> run out and we auto-add 10 clips for $4.99</span></li>',
   '<li><span><b>Need more?</b> Add 10 extra clips for $4.99 in one click</span></li>'],
  ['Secure checkout by Dodo Payments (cards, UPI and more). Taxes handled for you. Cancel anytime.',
   'Secure checkout on Gumroad. Taxes handled for you. Cancel anytime.'],
  ['Checkout is handled securely by Dodo Payments (cards, UPI and more, with taxes included), and you land back in the tool with Pro unlocked: no watermark, up to 8 clips per video, 60-second clips and extra caption styles. Your plan renews automatically, and if you run out of clips mid-project we automatically add 10 more for $4.99 (at most 5 times a month), so you\'re never stopped. You also get a Pro key to unlock other browsers. Cancel anytime with the "Manage subscription" button in the tool, and get a full refund within 14 days.',
   'Checkout is handled securely by Gumroad (taxes included). Your receipt has a license key: paste it in the tool under "I have a key" and Pro unlocks: no watermark, up to 8 clips per video, 60-second clips and extra caption styles. Log in to keep Pro on every device. Your plan renews automatically. If you run out of clips mid-project, add 10 more for $4.99 in one click (up to 5 times a month). Cancel anytime from your Gumroad receipt or the "Manage subscription" button in the tool, and get a full refund within 14 days.'],
]);

edit("hypecut-site/try.html", [
  ['Run out mid-project and we auto-add 10 more for $4.99.', 'Run out mid-project? Add 10 more for $4.99 in one click.'],
  ['" · auto top-up on, so you never get stopped mid-project."', '" · need more? Add 10 clips for $4.99."'],
]);

edit("hypecut-site/terms.html", [
  ['<li>Payments are processed by <b>Dodo Payments</b>, our Merchant of Record, which handles billing, sales tax and VAT. We never see your full card details.</li>',
   '<li>Payments are processed by <b>Gumroad</b>, which handles billing, sales tax and VAT. We never see your card details.</li>'],
  ['<li><b>Automatic top-ups:</b> so your projects aren\'t interrupted, if you run out of clips during a month we automatically add <b>10 extra clips for $4.99</b> (plus any applicable tax), charged straight away to the payment method on your subscription. This happens at most <b>5 times per calendar month</b> (50 extra clips, $24.95). Top-up clips expire at the end of that month. Each top-up shows as a separate charge on your receipts and in "Manage subscription".</li>',
   '<li><b>Top-ups:</b> if you run out of clips during a month, you can buy <b>10 extra clips for $4.99</b> (plus any applicable tax) and add them with the top-up key from your receipt. Up to <b>5 top-ups per calendar month</b>. Top-up clips expire at the end of that month, and each top-up key works once.</li>'],
  ['<li>After paying you return to the tool with Pro unlocked, and you get a Pro key (it starts with <b>HC-</b>). Keep it: pasting it into the tool unlocks Pro in other browsers or after clearing your browser data. Please don\'t share your key publicly.</li>',
   '<li>After paying you get a license key on your Gumroad receipt. Paste it into the tool to unlock Pro; it also unlocks Pro in other browsers or after clearing your browser data, and is saved to your Hypecut account if you\'re logged in. Please don\'t share your key publicly.</li>'],
  ['<li>You can <b>cancel anytime</b> with the "Manage subscription" button in the tool. Pro stays active until the end of the period you\'ve paid for.</li>',
   '<li>You can <b>cancel anytime</b> from your Gumroad receipt or the "Manage subscription" button in the tool. Pro stays active until the end of the period you\'ve paid for.</li>'],
]);

edit("hypecut-site/refunds.html", [
  ['<h2>Automatic top-ups</h2>', '<h2>Top-ups</h2>'],
  ['Top-ups (10 extra clips for $4.99, added automatically when you run out) can be refunded within <b>14 days</b> if you didn&#39;t use any of the extra clips. If a top-up happened by mistake, contact us and we&#39;ll sort it out.',
   'Top-ups (10 extra clips for $4.99) can be refunded within <b>14 days</b> if you didn&#39;t use any of the extra clips. If you bought one by mistake, contact us and we&#39;ll sort it out.'],
  ['You can cancel anytime with the <b>Manage subscription</b> button in the Hypecut tool.',
   'You can cancel anytime from your Gumroad receipt or the <b>Manage subscription</b> button in the Hypecut tool.'],
  ['Payments are processed by <b>Dodo Payments</b>, our Merchant of Record.', 'Payments are processed by <b>Gumroad</b>.'],
]);

let p = fs.readFileSync("hypecut-site/privacy.html", "utf8");
p = p.replace(/<p>Payments are processed by Dodo Payments, our Merchant of Record\.[^<]*<\/p>/,
  "<p>Payments are processed by Gumroad. Gumroad collects your payment and billing details under its own privacy policy; we never see your card details. We check your license key with Gumroad to confirm Pro is active, and keep a count of how many Pro clips you've made this month. The key is also stored in your browser (and on your account if you're logged in) so Pro stays unlocked.</p>");
if (!p.includes("Payments are processed by Gumroad")) { console.error("privacy MISSING"); process.exit(1); }
p = p.replace("Last updated: 24 November 2026", "Last updated: 24 November 2026");
fs.writeFileSync("hypecut-site/privacy.html", p); console.log("ok privacy");

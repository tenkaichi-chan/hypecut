// claude.ai can't load Paddle's checkout (blocked hosts), so the Pro button there
// links to the real pricing on the public site instead.
// usage: node tools/claude-page-pricing.cjs clutchcut.html
const fs = require("fs");
const f = process.argv[2];
let s = fs.readFileSync(f, "utf8");
const SITE = "https://hypecut-app.netlify.app/#pricing";
const btn = '<button class="btn magnetic" id="proBuy" type="button">Get Pro yearly <span class="arr">→</span></button>';
if (!s.includes(btn)) throw new Error("Pro button not found");
s = s.replace(btn, '<a class="btn magnetic" id="proBuy" href="' + SITE + '" target="_blank" rel="noopener">Get Pro yearly <span class="arr">→</span></a>');
const a = s.indexOf("  let paddleCfg = null"), b = s.indexOf("  bm.addEventListener(\"click\"");
if (a < 0 || b < 0) throw new Error("checkout block not found");
s = s.slice(0, a) + "  // (claude.ai version: checkout happens on the public site)\n\n" + s.slice(b);
s = s.replace('Secure checkout by Paddle (cards, PayPal and more). Taxes handled for you. Cancel anytime.', 'Opens secure checkout on hypecut-app.netlify.app (Paddle: cards, PayPal and more). Cancel anytime.');
fs.writeFileSync(f, s);
console.log("pricing adapted for claude.ai");

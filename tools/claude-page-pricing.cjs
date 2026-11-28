// claude.ai can't load the payment overlay (blocked hosts), so the Pro button there
// links to the real pricing on the public site instead.
// usage: node tools/claude-page-pricing.cjs clutchcut.html
const fs = require("fs");
const f = process.argv[2];
let s = fs.readFileSync(f, "utf8");
const SITE = "https://hypecut.pages.dev/#pricing";
const btn = '<button class="btn magnetic" id="proBuy" type="button">Get Pro yearly <span class="arr">→</span></button>';
if (!s.includes(btn)) throw new Error("Pro button not found");
s = s.replace(btn, '<a class="btn magnetic" id="proBuy" href="' + SITE + '" target="_blank" rel="noopener">Get Pro yearly <span class="arr">→</span></a>');
const a = s.indexOf("  // ---- Gumroad checkout"), b = s.indexOf("  bm.addEventListener(\"click\"");
if (a < 0 || b < 0) throw new Error("checkout block not found");
s = s.slice(0, a) + "  // (claude.ai version: checkout happens on the public site)\n\n" + s.slice(b);
// the tool's plan bar: Pro keys only work on the public site (its server checks them)
s = s.split('<a class="btn sm" href="/#pricing">Get Pro</a>').join('<a class="btn sm" href="' + SITE + '" target="_blank" rel="noopener">Get Pro</a>');
s = s.replace('<button class="btn sm ghost" id="haveKey" type="button" aria-expanded="false" aria-controls="keyForm">I have a key</button>',
  '<a class="btn sm ghost" href="https://hypecut.pages.dev/try" target="_blank" rel="noopener">Have Pro? Use it on hypecut.pages.dev</a><button id="haveKey" type="button" hidden></button>');
s = s.split('href="/#pricing"').join('href="' + SITE + '" target="_blank" rel="noopener"');
fs.writeFileSync(f, s);
console.log("pricing adapted for claude.ai");

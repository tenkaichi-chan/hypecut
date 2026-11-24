// Builds the site icons (favicon.ico, favicon.svg, PNGs, manifest) from the Hypecut chevron logo.
import sharp from "sharp";
import fs from "fs";
const OUT = "D:/Hypecut/hypecut-site/";
// Chevron = the .logo-mark clip-path polygon (0 0, 70% 0, 100% 50%, 70% 100%, 0 100%, 30% 50%) on a dark rounded square.
const box = { x: 124, y: 116, w: 280, h: 280 };
const P = (px, py) => `${(box.x + px * box.w).toFixed(1)},${(box.y + py * box.h).toFixed(1)}`;
const pts = [P(0, 0), P(.7, 0), P(1, .5), P(.7, 1), P(0, 1), P(.3, .5)].join(" ");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd23f"/><stop offset=".55" stop-color="#ff3d8b"/><stop offset="1" stop-color="#b14dff"/></linearGradient></defs>
<rect width="512" height="512" rx="112" fill="#0b0918"/>
<polygon points="${pts}" fill="url(#g)"/>
</svg>`;
fs.writeFileSync(OUT + "favicon.svg", svg);
const png = (size) => sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer();
for (const [name, size] of [["favicon-48.png", 48], ["favicon-96.png", 96], ["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  fs.writeFileSync(OUT + name, await png(size));
}
// favicon.ico with PNG entries (16, 32, 48)
const imgs = await Promise.all([16, 32, 48].map(png));
const head = Buffer.alloc(6 + 16 * imgs.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
let off = head.length;
imgs.forEach((b, i) => {
  const s = [16, 32, 48][i], o = 6 + 16 * i;
  head.writeUInt8(s, o); head.writeUInt8(s, o + 1); head.writeUInt8(0, o + 2); head.writeUInt8(0, o + 3);
  head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(b.length, o + 8); head.writeUInt32LE(off, o + 12);
  off += b.length;
});
fs.writeFileSync(OUT + "favicon.ico", Buffer.concat([head, ...imgs]));
fs.writeFileSync(OUT + "site.webmanifest", JSON.stringify({
  name: "Hypecut", short_name: "Hypecut", description: "Turn gameplay recordings into captioned vertical clips for YouTube Shorts and TikTok.",
  start_url: "/", display: "standalone", background_color: "#0b0918", theme_color: "#0b0918",
  icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
}, null, 2));
console.log("icons written");

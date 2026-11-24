// One-off: real icon files + site name on every page, structured data on the homepage.
const fs = require("fs");
const DIR = "D:/Hypecut/hypecut-site/";
const ICONS = `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="application-name" content="Hypecut">
<meta name="apple-mobile-web-app-title" content="Hypecut">`;
const iconRe = /<link rel="icon" href="data:image\/svg\+xml[^"]*">/;
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith(".html"))) {
  let s = fs.readFileSync(DIR + f, "utf8");
  if (!iconRe.test(s)) { console.log("skip (no data icon)", f); continue; }
  s = s.replace(iconRe, ICONS);
  if (!s.includes('og:site_name')) s = s.replace(/(<title>[^<]*<\/title>)/, '$1\n<meta property="og:site_name" content="Hypecut">');
  if (f === "index.html") {
    s = s.replace('<title>Hypecut: gameplay to Shorts &amp; TikToks</title>', '<title>Hypecut: turn gameplay into YouTube Shorts &amp; TikToks</title>');
    s = s.replace('content="Upload a gameplay recording. Hypecut finds the best moments and gives you captioned vertical clips for YouTube Shorts and TikTok. Try it free."',
      'content="Drop in a gameplay recording. Hypecut finds the best moments and gives you captioned vertical clips for YouTube Shorts and TikTok, right in your browser. Try it free."');
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", "@id": "https://hypecut.pages.dev/#website", "name": "Hypecut", "url": "https://hypecut.pages.dev/", "publisher": { "@id": "https://hypecut.pages.dev/#org" } },
        { "@type": "Organization", "@id": "https://hypecut.pages.dev/#org", "name": "Hypecut", "url": "https://hypecut.pages.dev/",
          "logo": { "@type": "ImageObject", "url": "https://hypecut.pages.dev/icon-512.png", "width": 512, "height": 512 } },
        { "@type": "WebApplication", "name": "Hypecut", "url": "https://hypecut.pages.dev/try", "applicationCategory": "MultimediaApplication", "operatingSystem": "Any (runs in the browser)",
          "description": "Turns gameplay recordings into captioned vertical clips for YouTube Shorts and TikTok. Runs in your browser; your video is never uploaded.",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" } }
      ]
    };
    s = s.replace('<link rel="canonical" href="https://hypecut.pages.dev/">', '<link rel="canonical" href="https://hypecut.pages.dev/">\n<script type="application/ld+json">' + JSON.stringify(ld) + '</script>');
  }
  fs.writeFileSync(DIR + f, s);
  console.log("ok", f);
}

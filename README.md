# Hypecut

Turns Roblox gameplay recordings into vertical, captioned clips for YouTube Shorts and TikTok.

- **Live site:** https://hypecut.pages.dev
- **Free tool:** https://hypecut.pages.dev/try
- **Netlify project:** https://app.netlify.com/projects/hypecut-app
- **claude.ai page (private):** https://claude.ai/artifact/AnrNaoHpYrQvsSN4yvPoum

## What's in this folder

| Path | What it is |
|---|---|
| `hypecut-site/index.html` | Landing page: hero, how it works, old way vs Hypecut, demo, pricing, FAQ |
| `hypecut-site/try.html` | The free clip tool. Runs entirely in the visitor's browser: nothing is uploaded |
| `hypecut-site/404.html` | "You fell off the map" page |
| `hypecut-site/og.png` | Share image shown in Discord, Twitter and iMessage link previews |
| `hypecut-site/terms.html`, `privacy.html` | Terms, refund policy (14 days) and privacy policy |
| `hypecut-site/_headers`, `robots.txt`, `sitemap.xml` | Security headers and search-engine files |
| `netlify/functions/checkout.mjs` | `/api/checkout`: creates a Dodo checkout session |
| `netlify/functions/license.mjs` | `/api/license`: Pro keys, monthly clip counting, auto top-ups, Dodo customer portal |
| `netlify/lib/dodo.mjs` | Small helper for calling the Dodo Payments API |
| `clutchcut.html` | Source of the claude.ai version of the page (tool, no speech subtitles, Pro button links to the public site) |
| `tools/serve.cjs` | Local preview server |
| `tools/dodo-setup.mjs` | One-time: creates the Pro monthly/yearly and extra-clips products in Dodo and writes their IDs to the env file |
| `tools/claude-page-*.cjs` | Rebuild `clutchcut.html` from the public site (see below) |
| `.env` | Your private keys. **Never commit or share it.** Git ignores it |

## Everyday tasks

Preview locally (then open http://localhost:5178):

```powershell
npm run dev
```

Publish changes to the live site:

```powershell
npm run deploy
```

First time on a new computer: run `npm install`, then `npx netlify login` (click **Authorize** in the browser), then `npx netlify link --id 108c5e2f-cfc3-4bbd-b572-a9c6daf9e78b`.

## Where things live

- **Colours:** every colour is a variable at the top of the `<style>` block in each page (`--bg`, `--hot`, `--cta`…).

## Payments (Dodo Payments)

Dodo Payments is the Merchant of Record: it handles checkout, tax (GST/VAT) and payouts. Paddle rejected the original site; its code is in git history.

**Plans:**

| Plan | Price | Clips per calendar month | Per clip |
|---|---|---|---|
| Free | $0 | 3 (counted in the visitor's browser) | — |
| Pro monthly | $19.99/month | 20 | ~$1.00 |
| Pro yearly | $99.99/year | 80 | ~$0.10 |
| Auto top-up | $4.99 | +10, added automatically when a Pro user runs out (max 5 a month) | ~$0.50 |

Pro also unlocks no watermark, up to 8 clips per video, 60-second clips and the Neon and Clean caption styles. Allowances live in `QUOTA`, `BOOST_CLIPS` and `MAX_BOOSTS` in `netlify/functions/license.mjs` (Free: `FREE_MONTHLY` in `try.html`).

**How a purchase works:**
1. **Get Pro** calls `/api/checkout`, which creates a Dodo checkout session, and Dodo's overlay checkout opens on the page.
2. After paying, Dodo sends the buyer to `/try?subscription_id=…`. The tool asks `/api/license` to turn that subscription into a Pro key (`HC-XXXX-XXXX-XXXX-XXXX`). The key is also saved in the subscription's metadata (`hypecut_key`) in the Dodo dashboard.
3. **Manage subscription** opens Dodo's customer portal (cancel, change card, invoices).
4. **Auto top-up:** when a Pro user runs out, the server charges the one-time "Hypecut extra clips (+10)" product to the card saved on their subscription, with no checkout screen, and the clips unlock straight away. Indian card payments can stay "processing" for a while because of RBI mandate rules.

**Settings** live in Netlify (Project configuration → Environment variables), and in `.env.dodo` for local testing (git-ignored):

| Variable | What |
|---|---|
| `DODO_ENV` | `live` or `test` |
| `DODO_API_KEY` | Secret API key (`dodo_live_…` or `dodo_test_…`). Store it as a Netlify **secret** |
| `DODO_PRODUCT_MONTHLY`, `DODO_PRODUCT_YEARLY`, `DODO_PRODUCT_BOOST` | Product IDs from `node tools/dodo-setup.mjs` |

If these aren't set, the Pro button says "Pro opens soon" and sends visitors to the free tool. **Never put test keys on the live site**: anyone could then get Pro with a test card.

To test locally, load `.env.dodo` into your shell, then run `npx netlify dev` and buy with Dodo's test "Success card" (the Autofill button in the checkout).

## Updating the claude.ai page

```powershell
node tools/claude-page-convert.cjs hypecut-site/index.html clutchcut.html
node tools/claude-page-merge-tool.cjs clutchcut.html hypecut-site/try.html
node tools/claude-page-pricing.cjs clutchcut.html
```

Then replace `href="/try"` with `href="#tool"` in `clutchcut.html`, and ask Claude to publish it to the claude.ai page.

## How the free tool works (`try.html`)

1. **Find moments:** reads the audio (loudness spikes) and samples frames (on-screen motion), then picks the top non-overlapping windows.
2. **Captions:** a hook title per clip (editable). Optional speech subtitles use a small Whisper model (`Xenova/whisper-tiny.en`, ~40 MB, downloaded once) in a Web Worker. The model can mishear over music, so the text appears in an editable box before rendering, and words are timed to where the voice is.
3. **Render:** draws each frame to a 1080×1920 canvas (full frame with blurred fill, or smart crop that follows the action) and records it with sound using `MediaRecorder`. Rendering runs in real time and the tab must stay open.

Free limits: up to 3 clips per video, clips up to 45 seconds, "made with hypecut" watermark. Pro: see Payments. Works best in Chrome or Edge on a computer.

## Notes

- Not affiliated with Roblox Corporation; the site uses no Roblox logos or branding.
- Netlify's team default turns on visitor protection for *new* sites. This site has it switched off; any new site you create needs the same switch (Project configuration → Access & security → Visitor access).

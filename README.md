# Hypecut

Turns Roblox gameplay recordings into vertical, captioned clips for YouTube Shorts and TikTok.

- **Live site:** https://hypecut-app.netlify.app
- **Free tool:** https://hypecut-app.netlify.app/try
- **Netlify project:** https://app.netlify.com/projects/hypecut-app
- **claude.ai page (private):** https://claude.ai/artifact/AnrNaoHpYrQvsSN4yvPoum

## What's in this folder

| Path | What it is |
|---|---|
| `hypecut-site/index.html` | Landing page: hero, how it works, old way vs Hypecut, demo, pricing, waitlist, FAQ |
| `hypecut-site/try.html` | The free clip tool. Runs entirely in the visitor's browser: nothing is uploaded |
| `hypecut-site/404.html` | "You fell off the map" page |
| `hypecut-site/og.png` | Share image shown in Discord, Twitter and iMessage link previews |
| `hypecut-site/terms.html`, `privacy.html` | Terms & refunds (14 days) and privacy policy, with Paddle's Merchant of Record wording |
| `hypecut-site/_headers`, `robots.txt`, `sitemap.xml` | Security headers and search-engine files |
| `netlify/functions/joined.mjs`, `count.mjs` | `/api/joined` and `/api/count`: the public waitlist counter (stores a hash of each email, never the email) |
| `netlify/functions/paddle-config.mjs` | `/api/paddle-config`: gives the page the public Paddle token and price IDs |
| `netlify/functions/license.mjs` | `/api/license`: turns a Paddle payment into a Pro key, checks keys, opens the Paddle customer portal |
| `netlify/lib/paddle.mjs` | Small helper for calling the Paddle API |
| `clutchcut.html` | Source of the claude.ai version of the page (claude.ai waitlist + tool, no speech subtitles, Pro button links to the public site) |
| `tools/serve.cjs` | Local preview server |
| `tools/paddle-setup.mjs` | One-time: creates the Hypecut Pro product and prices in Paddle and writes their IDs to `.env` |
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

- **Waitlist sign-ups:** your Formspree inbox (form `xvkavagw`). Export them as CSV from the Formspree dashboard. The form ID is in the `<form action=...>` in `hypecut-site/index.html`.
- **Public counter:** stays hidden until 10 sign-ups (`COUNT_MIN` in `index.html`). Counts come from Netlify Blobs (store `waitlist`).
- **Colours:** every colour is a variable at the top of the `<style>` block in each page (`--bg`, `--hot`, `--cta`…).

## Payments (Paddle)

**Plans:**

| Plan | Price | Clips per calendar month | Per clip |
|---|---|---|---|
| Free | $0 | 3 (counted in the visitor's browser) | — |
| Pro monthly | $19.99/month | 20 | ~$1.00 |
| Pro yearly | $99.99/year | 80 | ~$0.10 |
| Auto top-up | $4.99 | +10, added automatically when a Pro user runs out (max 5 a month) | ~$0.50 |

Pro also unlocks no watermark, up to 8 clips per video, 60-second clips and the Neon and Clean caption styles. Allowances live in `QUOTA`, `BOOST_CLIPS` and `MAX_BOOSTS` at the top of `netlify/functions/license.mjs` (Free: `FREE_MONTHLY` in `try.html`). Pro usage is counted on the server per key (Netlify Blobs store `licenses`), and resets on the 1st of each month (UTC).

**Never stopped mid-project:**
- Renewals charge the saved card automatically.
- If a renewal fails, Pro stays on while Paddle retries the card.
- If a Pro user runs out of clips, the server charges a **$4.99 top-up** to their saved card via Paddle's subscription charge API and the render continues. If that charge fails (for example, the card is declined), they see a message pointing to Manage subscription.

**How a purchase works:**
1. The buyer clicks **Get Pro** on the pricing section, and Paddle's checkout opens over the page.
2. After paying, they're sent to `/try?txn=…`. The tool asks `/api/license` to turn that payment into a Pro key (`HC-XXXX-XXXX-XXXX-XXXX`).
3. Pro unlocks in that browser and the key is shown so they can save it.
4. **Manage subscription** in the tool opens Paddle's customer portal (cancel, change card, invoices).
5. The key is re-checked with Paddle once a day. If the subscription ends, Pro switches off.

**Settings** live in Netlify (Project configuration → Environment variables), and in `.env` for local testing:

| Variable | What |
|---|---|
| `PADDLE_ENV` | `production` (live) or `sandbox` |
| `PADDLE_API_KEY` | Secret API key. Stored as a Netlify **secret** |
| `PADDLE_CLIENT_TOKEN` | Public client-side token (`live_…` or `test_…`) |
| `PADDLE_PRICE_MONTHLY`, `PADDLE_PRICE_YEARLY` | Price IDs (`pri_…`) from `tools/paddle-setup.mjs` |
| `PADDLE_PRICE_BOOST` | One-time "Extra clips (+10)" $4.99 price for automatic top-ups |

Sandbox testing: sandbox keys live in `.env.sandbox` (also git-ignored). Run `node tools/paddle-setup.mjs .env.sandbox` to create sandbox prices. To test locally in sandbox mode, load that file into your shell, then run `npx netlify dev`.

If checkout isn't allowed yet (for example, Paddle hasn't approved the account), the Pro button sends visitors to the waitlist instead of showing an error.

**Swap the API key** (do this if a key was ever shared):

```powershell
npx netlify env:set PADDLE_API_KEY "new-key" --secret --context production deploy-preview branch-deploy
npm run deploy
```

Each Pro key is also saved on the Paddle subscription (`custom_data.hypecut_key`), so you can look up a customer's key in the Paddle dashboard if they lose it.

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

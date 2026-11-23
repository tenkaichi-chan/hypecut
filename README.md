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

## Paddle billing mirror (webhooks, access, portal)

Built against the Paddle **sandbox**. Not wired into the live checkout yet. The live site still uses Dodo Payments.

| Piece | Where |
|---|---|
| Webhook endpoint `POST /api/paddle/webhook` | `core/paddle/webhook.mjs` |
| One idempotent handler per event (customer.created/updated, subscription.created/updated/canceled, transaction.completed) | `core/paddle/handlers.mjs` |
| Database mirror (D1): `customers`, `subscriptions` | `migrations/0001_paddle_mirror.sql`, `core/paddle/db.mjs` |
| Does a subscription grant access? | `core/paddle/access.mjs` |
| `POST /api/paddle/portal` (billing portal), `/access`, `/claim` | `core/paddle/portal.mjs` |
| Account screen | `hypecut-site/account.html` |

**Webhook rules:** the raw body is read as text and verified with `paddle.webhooks.unmarshal` using the notification **signing secret** (`PADDLE_WEBHOOK_SECRET`), never the API key. A failed signature returns 401, so Paddle sees a failure and retries. An authentic event the SDK can't parse returns 500 (retry). Unknown event types return 200 and are ignored. A handler failure returns 500 (retry). Signatures are only valid for 5 seconds, which is the SDK's own limit.

**Idempotency:** every write is an upsert keyed on the Paddle ID and guarded by `last_event_at`, so a duplicate delivery changes nothing and an older event arriving late never overwrites newer state. A subscription's `license_key` is generated once and never overwritten. If a subscription arrives before its customer, the customer is fetched from Paddle's API. If Paddle can't return it, a placeholder row with an empty email is kept until `customer.created` or `customer.updated` fills it in.

**Access rule:** `active`, `trialing` and `past_due` (Paddle is still retrying the card) grant access. `paused` and `canceled` do not. A scheduled cancel or pause does **not** remove access: the customer paid for the current period, and access ends only when Paddle flips the status.

**Who is "signed in":** the site has no user accounts, so the Pro key (`HC-…`) is the credential. The server maps the key to the Paddle customer and subscription; the client never supplies a customer id. `/api/paddle/claim` swaps a completed transaction id (from the checkout success event) for the key.

**Two Cloudflare projects:**
- `hypecut` (live site) uses `wrangler.toml` and the `hypecut-db` database.
- `hypecut-sandbox` runs the same code against the Paddle sandbox with its own `hypecut-sandbox-db`, so sandbox keys never touch the live site. Cloudflare Pages has no custom config path, so build the sandbox folder first with `node tools/sandbox-dir.mjs`, then run `wrangler pages deploy hypecut-site --project-name hypecut-sandbox --branch main` from inside `.sandbox/`.

Secrets (Pages secrets, set with `wrangler pages secret put`): `PADDLE_ENV`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`. See `.env.example`.

**Tools:** `tools/paddle-destination.mjs` creates the notification destination and saves its signing secret; `tools/paddle-webhook-test.mjs` sends correctly signed test events (including a bad-signature case and scenarios built from real sandbox data); `tools/paddle-simulate.mjs` asks Paddle to send its own simulated events.

**Going live later:** create a notification destination in the live Paddle account pointing at `https://hypecut.pages.dev/api/paddle/webhook`, set the live secrets on the `hypecut` project with `PADDLE_ENV=production`, and redeploy.

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

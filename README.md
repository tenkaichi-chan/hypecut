# ReelMyGame

Turns gameplay recordings into vertical, captioned clips for YouTube Shorts and TikTok.

- **Live site:** https://reelmygame.pages.dev (Cloudflare Pages project `hypecut`)
- **Free tool:** https://reelmygame.pages.dev/try
- **Buy Pro:** https://sehbag.gumroad.com/l/reelmygame-pro · top-up: https://sehbag.gumroad.com/l/reelmygame-topup
- **Support email:** sehbag11@gmail.com
- **claude.ai page (private):** https://claude.ai/artifact/AnrNaoHpYrQvsSN4yvPoum
- Old Netlify site (hypecut-app.netlify.app) is kept until Paddle answers the appeal, then deleted.

## What's in this folder

| Path | What it is |
|---|---|
| `reelmygame-site/index.html` | Landing page: hero, how it works, old way vs ReelMyGame, pricing, FAQ |
| `reelmygame-site/try.html` | The free clip tool. Runs entirely in the visitor's browser: nothing is uploaded |
| `reelmygame-site/login.html`, `reset.html`, `_redirects` | Log in / sign up (`/signup` shows the login page in sign-up mode) and password reset |
| `reelmygame-site/terms.html`, `privacy.html`, `refunds.html` | Terms, privacy policy, refund policy (14 days) |
| `reelmygame-site/404.html`, `og.png`, `_headers`, `robots.txt`, `sitemap.xml` | Not-found page, share image, security headers, search-engine files |
| `reelmygame-site/account.html` | Paddle billing page. **Not deployed yet** (Paddle not approved) |
| `functions/api/*.js` | Cloudflare Pages Functions (thin wrappers) |
| `core/gumroad.mjs` | `/api/license` when `PAYMENTS=gumroad`: checks Gumroad license keys, counts clips, redeems top-ups |
| `core/license.mjs`, `core/checkout.mjs`, `core/dodo.mjs` | Same endpoints for Dodo Payments (used if `PAYMENTS` isn't `gumroad`) |
| `core/auth.mjs`, `core/mailer.mjs` | `/api/auth`: accounts, sessions, Google sign-in, password reset emails via Gmail |
| `core/paddle/*`, `functions/api/paddle/*` | Paddle webhooks, database mirror, portal. Built against the sandbox, **not deployed** |
| `migrations/*.sql` | D1 database tables |
| `marketing/` | Launch kit, YouTube Short notes, promo videos (`marketing/shorts/`) |
| `work/make-shorts.mjs`, `work/tts/` | Builds caption-style promo Shorts with a free local voice (Kokoro) |
| `tools/` | Local server, Dodo/Paddle setup and test scripts, Gmail authorization, claude.ai page builders |
| `.env*`, `.dev.vars` | Private keys. **Never commit or share.** Git ignores them |

## Everyday tasks

Preview locally (then open http://localhost:8788):

```powershell
npx wrangler pages dev reelmygame-site --port 8788
```

Publish to the live site. Until Paddle is approved, deploy from a staging copy that leaves out the Paddle routes and `account.html`:

1. Copy `reelmygame-site/`, `core/`, `wrangler.toml`, `functions/_lib/` and `functions/api/{auth,license,checkout}.js` into `.deploy/` (git-ignored), and delete `.deploy/reelmygame-site/account.html`.
2. From `.deploy/` run:

```powershell
npx wrangler pages deploy reelmygame-site --project-name hypecut --branch main
```

New database tables are applied by hand (0001 to 0004 are applied):

```powershell
npx wrangler d1 execute hypecut-db --remote --file migrations/0004_password_resets.sql
```

First time on a new computer: `npm install`, then `npx wrangler login`.

Colours: every colour is a variable at the top of the `<style>` block in each page (`--bg`, `--hot`, `--cta`…).

## Plans

| Plan | Price | Clips per calendar month |
|---|---|---|
| Free | $0 | 3 (counted in the browser, or on the account when logged in) |
| Pro monthly | $19.99/month | 20 |
| Pro quarterly | $39.99 every 3 months | 40 |
| Pro yearly | $99.99/year | Unlimited |
| Top-up | $4.99 | +10, up to 5 a month |

Pro also unlocks no watermark, up to 8 clips per video, 60-second clips and the Neon and Clean caption styles.

## Payments (Gumroad, live)

Gumroad is the Merchant of Record (checkout, tax, payouts). Settings are public values in `wrangler.toml` `[vars]`: `PAYMENTS = "gumroad"`, the two product IDs and links. No secret is needed: license keys are checked with Gumroad's public verify API.

1. **Get Pro** opens the Gumroad product page (`?recurrence=monthly|yearly` pre-selects the plan).
2. The receipt shows a license key. The buyer pastes it in the tool under **I have a key**. `/api/license` verifies it with Gumroad and counts clips per key per month in KV (`LICENSES`).
3. Access lasts while the membership hasn't ended (a cancelled membership keeps Pro until the paid period runs out; refunds and chargebacks remove it).
4. **Top-up:** Gumroad can't charge a saved card, so Pro users buy **+10 clips** and paste that key under **Add top-up key**. Each top-up key works once.
5. **Manage subscription** links to Gumroad's membership page. Payouts: weekly, once the balance is over $100 (India minimum).

To switch back to Dodo (automatic top-ups charged to the saved card), remove `PAYMENTS` and set the `DODO_*` secrets; see `core/license.mjs`. **Never put test keys on the live site**: anyone could then get Pro with a test card.

## Paddle billing mirror (not deployed)

Built against the Paddle **sandbox** while the account appeal is pending (`hypecut-sandbox` project, `hypecut-sandbox-db`).

- Webhook `POST /api/paddle/webhook` (`core/paddle/webhook.mjs`) verifies the raw body with the notification signing secret; failures return non-2xx so Paddle retries.
- Handlers are idempotent upserts keyed on Paddle IDs and guarded by `last_event_at`.
- Access: `active`, `trialing`, `past_due` grant Pro; `paused`, `canceled` don't; a scheduled cancel doesn't remove access early.
- Tools: `tools/paddle-destination.mjs`, `tools/paddle-webhook-test.mjs`, `tools/paddle-simulate.mjs`; sandbox folder via `node tools/sandbox-dir.mjs`.

Going live: create a live notification destination for `https://reelmygame.pages.dev/api/paddle/webhook`, set `PADDLE_ENV=production`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` on the `hypecut` project, and deploy the whole project (including the Paddle routes and `account.html`).

## Accounts (optional)

The free tool works without an account. Accounts keep a Pro key and the free clip count on every device.

- **Email + password:** PBKDF2-SHA256 (100,000 iterations) with a random salt. 8 wrong passwords lock that email for 15 minutes.
- **Sessions:** a random token in an HttpOnly, Secure cookie (`hc_session`, 30 days); the database stores only its SHA-256 hash. Requests from other sites are refused.
- **Google sign-in:** the server checks Google's ID token itself (signature, issuer, audience, expiry, verified email). Client ID: `GOOGLE_CLIENT_ID` in `wrangler.toml`. Google Cloud project "ReelMyGame" (owner sehbag11@gmail.com). A new domain must be added to the client's allowed origins.
- **Password reset:** `/reset` emails a one-time link (1 hour) from sehbag11@gmail.com through the Gmail API (send-only). Max 3 emails an hour per account; the same answer whether or not the email exists. A new password logs out other devices. Secrets: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER` (also in git-ignored `.env.gmail`). If sending stops, run `node tools/gmail-auth.mjs --push` and click Continue on Google's screen.

## How the free tool works (`try.html`)

1. **Find moments:** reads the audio (loudness spikes) and samples frames (on-screen motion), then picks the top non-overlapping windows.
2. **Captions:** a hook title per clip (editable). Optional speech subtitles use a small Whisper model (`Xenova/whisper-tiny.en`, ~40 MB, downloaded once) in a Web Worker; text is editable before rendering.
3. **Render:** draws each frame to a 1080×1920 canvas (full frame with blurred fill, or smart crop that follows the action) and records it with `MediaRecorder` in real time.

Free limits: 3 clips a month, up to 3 clips per video, clips up to 45 seconds, a small "made with reelmygame" watermark. Works best in Chrome or Edge on a computer.

## Updating the claude.ai page

```powershell
node tools/claude-page-convert.cjs reelmygame-site/index.html clutchcut.html
node tools/claude-page-merge-tool.cjs clutchcut.html reelmygame-site/try.html
node tools/claude-page-pricing.cjs clutchcut.html
```

Then replace `href="/try"` with `href="#tool"` in `clutchcut.html`, and ask Claude to publish it to the claude.ai page.

## Notes

- Not affiliated with any game company; the site uses no game logos or branding.

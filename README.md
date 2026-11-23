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
| `hypecut-site/_headers`, `robots.txt`, `sitemap.xml` | Security headers and search-engine files |
| `netlify/functions/` | `/api/joined` and `/api/count`: the public waitlist counter (stores a hash of each email, never the email) |
| `clutchcut.html` | Source of the claude.ai version of the page (claude.ai waitlist + tool, no speech subtitles) |
| `tools/serve.cjs` | Local preview server |

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

## How the free tool works (`try.html`)

1. **Find moments:** reads the audio (loudness spikes) and samples frames (on-screen motion), then picks the top non-overlapping windows.
2. **Captions:** a hook title per clip (editable). Optional speech subtitles use a small Whisper model (`Xenova/whisper-tiny.en`, ~40 MB, downloaded once) in a Web Worker. The model can mishear over music, so the text appears in an editable box before rendering, and words are timed to where the voice is.
3. **Render:** draws each frame to a 1080×1920 canvas (full frame with blurred fill, or smart crop that follows the action) and records it with sound using `MediaRecorder`. Rendering runs in real time and the tab must stay open.

Free-demo limits: up to 3 clips per video, "made with hypecut" watermark. Works best in Chrome or Edge on a computer.

## Notes

- Not affiliated with Roblox Corporation; the site uses no Roblox logos or branding.
- Netlify's team default turns on visitor protection for *new* sites. This site has it switched off; any new site you create needs the same switch (Project configuration → Access & security → Visitor access).

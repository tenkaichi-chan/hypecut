// "Websites you should know" style promo Shorts for Hypecut, modelled on the most-viewed website Shorts:
// hook card in a white rounded box -> "GO TO <url>" with a typed address bar -> real screen captures of the site in use
// (slow zoom on the part that matters) with step boxes -> payoff -> CTA. Voice: Kokoro (local, free). Word-by-word captions.
// usage: node work/make-site-shorts.mjs   Output: marketing/shorts/site-*.mp4
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const root = "D:/Hypecut", work = root + "/work/site-build", shots = root + "/work/site-shots/", out = root + "/marketing/shorts";
fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(out, { recursive: true });
const FONT = "C\\:/Windows/Fonts/segoeuib.ttf", W = 1080, H = 1920, FPS = 30;

// real captures (1519x784) and the region worth looking at in each [x, y, w, h]
const IMG = {
  landing: ["landing.jpg", [300, 140, 910, 640]],
  try: ["try.jpg", [320, 95, 570, 355]],
  filled: ["filled.jpg", [345, 235, 415, 315]],
  moments: ["moments.jpg", [350, 355, 450, 385]],
  rendering: ["rendering.jpg", [345, 365, 270, 419]],
  done: ["done.jpg", [345, 365, 270, 419]],
  pricing: ["pricing.jpg", [300, 100, 690, 520]],
};

const SHORTS = {
  "site-websites-you-should-know": [
    { say: "Wait, why did nobody tell me about this website?!", hook: "WEBSITES YOU SHOULD KNOW\n(GAMERS EDITION)", img: "landing" },
    { say: "Go to hypecut dot pages dot dev, slash try!", url: true, img: "try" },
    { say: "Just drop in your gameplay recording...", box: "DROP IN YOUR GAMEPLAY", img: "filled" },
    { say: "and boom! It finds the loudest, busiest moments for you!", box: "IT FINDS THE BEST MOMENTS", img: "moments" },
    { say: "Then it cuts them into vertical clips, with captions!", box: "VERTICAL CLIP + CAPTION", img: "rendering" },
    { say: "And your video never even gets uploaded. How cool is that?!", box: "NOTHING GETS UPLOADED", img: "done" },
    { say: "Three clips a month, totally free! Go try it!", box: "HYPECUT.PAGES.DEV/TRY", img: "landing", cta: true },
  ],
  "site-feels-illegal": [
    { say: "Okay, this website feels illegal to know if you make gaming videos!", hook: "THIS WEBSITE FEELS ILLEGAL\nTO KNOW ABOUT", img: "landing" },
    { say: "It turns your long gameplay recordings into Shorts!", box: "GAMEPLAY -> SHORTS", img: "try" },
    { say: "Go to hypecut dot pages dot dev, slash try, and drop your recording in!", url: true, img: "filled" },
    { say: "Look at these spikes! That's where all the action is!", box: "THE SPIKES = THE ACTION", img: "moments" },
    { say: "One click, and wow, your clip is ready to post!", box: "ONE CLICK. CLIP READY.", img: "done" },
    { say: "No signup, and it's free to try!", box: "FREE TO TRY", img: "landing", cta: true },
  ],
  "site-stop-editing": [
    { say: "Stop! You're still editing your gameplay by hand?!", hook: "STOP EDITING YOUR\nGAMEPLAY BY HAND", img: "landing" },
    { say: "This free website does it for you!", box: "THIS WEBSITE DOES IT", img: "try" },
    { say: "Nothing gets uploaded. It all runs right in your browser!", box: "RUNS IN YOUR BROWSER", img: "filled" },
    { say: "It finds the best moments by sound and on-screen action,", box: "FINDS THE BEST MOMENTS", img: "moments" },
    { say: "and cuts vertical clips for Shorts and TikTok. Amazing!", box: "READY FOR SHORTS + TIKTOK", img: "rendering" },
    { say: "Three free clips a month, or Pro if you need more!", box: "3 FREE CLIPS A MONTH", img: "pricing" },
    { say: "Go to hypecut dot pages dot dev, slash try!", url: true, img: "landing", cta: true },
  ],
};

// Excited, upbeat delivery: Kokoro's most expressive voice, a touch faster; "!" and "?!" in the script lift the intonation.
const VOICE = process.env.KOKORO_VOICE || "af_heart", SPEED = 1.12;

// Map each script word to real times. Whisper gives word timings for what was actually said; script words are placed by
// their position in the text (letters only), so splits/merges like "pages dot dev" vs "pages.dev" still line up.
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
// Word-by-word matching: walk the script and Whisper's tokens together. A token can hold several script words
// ("hypecut.pages.dev/try"), spoken filler like "dot"/"slash" may be missing from the token, and anything unmatched
// gets a time interpolated between its matched neighbours.
function timeWords(scriptWords, heard, fallbackEnd) {
  const toks = heard.filter(h => norm(h.text)).map(h => ({ n: norm(h.text), t0: h.start, t1: h.end ?? h.start + 0.3 }));
  if (!toks.length) return null;
  const st = new Array(scriptWords.length).fill(null);
  let ti = 0, off = 0;
  scriptWords.forEach((w, i) => {
    const nw = norm(w); if (!nw) return;
    for (let look = 0; look < 4 && ti + look < toks.length; look++) {
      const tk = toks[ti + look], from = look === 0 ? off : 0, at = tk.n.indexOf(nw, from);
      if (at >= 0 && (at === from || at - from <= 6)) { // found (allow small skips like a dropped "dot")
        st[i] = tk.t0 + (at / tk.n.length) * (tk.t1 - tk.t0);
        ti += look; off = at + nw.length;
        if (off >= tk.n.length) { ti++; off = 0; }
        return;
      }
    }
  });
  if (st.every(v => v === null)) return null;
  // fill gaps by interpolation
  for (let i = 0; i < st.length; i++) if (st[i] === null) {
    let a = i - 1; while (a >= 0 && st[a] === null) a--;
    let b = i + 1; while (b < st.length && st[b] === null) b++;
    const ta = a >= 0 ? st[a] : toks[0].t0, tb = b < st.length ? st[b] : toks[toks.length - 1].t1;
    st[i] = ta + (tb - ta) * (i - a) / (b - a);
  }
  const last = Math.min(fallbackEnd, toks[toks.length - 1].t1 + 0.15);
  return st.map((t, i) => [t, i + 1 < st.length ? Math.max(t + 0.08, st[i + 1]) : Math.max(t + 0.3, last)]);
}
function timeWordsByChars(scriptWords, heard, fallbackEnd) {
  const toks = heard.filter(h => norm(h.text));
  if (!toks.length) return null;
  let c = 0; const span = toks.map(h => { const L = norm(h.text).length; const r = { c0: c, c1: c + L, t0: h.start, t1: h.end ?? h.start + 0.3 }; c += L; return r; });
  const H = c, S = scriptWords.reduce((n, w) => n + Math.max(1, norm(w).length), 0);
  const at = (pos) => { const x = pos * H / S; const sp = span.find(r => x < r.c1) || span[span.length - 1]; const f = Math.min(1, Math.max(0, (x - sp.c0) / Math.max(1, sp.c1 - sp.c0))); return sp.t0 + f * (sp.t1 - sp.t0); };
  let p = 0;
  const starts = scriptWords.map(w => { const t = at(p); p += Math.max(1, norm(w).length); return t; });
  const last = Math.min(fallbackEnd, (toks[toks.length - 1].end ?? fallbackEnd) + 0.15);
  return starts.map((t, i) => [t, i + 1 < starts.length ? Math.max(t + 0.08, starts[i + 1]) : Math.max(t + 0.3, last)]);
}

const run = (cmd, args, opt = {}) => { const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 26, ...opt }); if (r.status !== 0) { console.error(cmd, (r.stderr || r.stdout || "").slice(-1500)); process.exit(1); } return r; };
const ff = (args) => run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
const dur = (f) => parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).stdout);
const esc = (t) => t.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\u2019").replace(/%/g, "\\%").replace(/,/g, "\\,");
// white rounded-look caption box (TikTok style)
const boxText = (t, y, size = 64) => t.split("\n").map((ln, i) =>
  `drawtext=fontfile='${FONT}':text='${esc(ln)}':fontsize=${size}:fontcolor=black:box=1:boxcolor=white@0.96:boxborderw=22:x=(w-text_w)/2:y=${y + i * (size + 46)}`).join(",");

for (const [name, scenes] of Object.entries(SHORTS)) {
  console.log("building", name);
  const jobs = scenes.map((s, i) => ({ text: s.say, out: `${work}/${name}-${i}.wav`, speed: SPEED }));
  fs.writeFileSync(`${work}/${name}.json`, JSON.stringify(jobs));
  run("node", [root + "/work/tts/say.mjs", `${work}/${name}.json`], { cwd: root + "/work/tts", env: { ...process.env, KOKORO_VOICE: VOICE } });
  // real word timings for every line (local Whisper)
  const heard = JSON.parse(run("node", [root + "/work/tts/align.mjs", ...jobs.map(j => j.out)], { cwd: root + "/work/tts" }).stdout.trim().split("\n").pop());

  const segs = [];
  scenes.forEach((s, i) => {
    const wav = `${work}/${name}-${i}f.wav`;
    ff(["-i", jobs[i].out, "-af", "highpass=f=80,acompressor=threshold=-20dB:ratio=2.5:makeup=3,apad=pad_dur=0.15,aresample=44100", "-ac", "2", wav]);
    const d = dur(wav);
    // captions follow the real word timings from Whisper
    const words = s.say.split(/\s+/).filter(w => norm(w));
    let times = timeWords(words, heard[i].words, d);
    if (!times) { const tot = words.reduce((n, w) => n + w.length + 1, 0); let t = 0.05; times = words.map(w => { const l = (w.length + 1) / tot * (d - 0.15); const r = [t, t + l]; t += l; return r; }); console.log("  (no timings for line " + i + ", estimated)"); }
    const caps = words.map((w, wi) => { const [a, end] = times[wi]; const len = end - a;
      return `drawtext=fontfile='${FONT}':text='${esc(w.replace(/[.,!?]+$/, "").replace(/^[.]+/, "").toUpperCase())}':fontsize='if(lt(t-${a.toFixed(3)},0.1),84+30*(1-(t-${a.toFixed(3)})/0.1),84)':fontcolor=${/^(free|best|vertical|never|illegal|one|spikes|action|uploaded|boom|wow|wait|stop|amazing|cool)/i.test(w) ? "0xffd23f" : "white"}:borderw=7:bordercolor=black:x=(w-text_w)/2:y=1530:enable='between(t,${a.toFixed(3)},${(a + len).toFixed(3)})'`; });
    const [file, [cx, cy, cw, ch]] = IMG[s.img];
    // fit the region inside 1000x1150, as big as possible
    const k = Math.min(1000 / cw, 1150 / ch); const fgW = Math.round(cw * k / 2) * 2, fgH = Math.round(ch * k / 2) * 2;
    const fgY = s.hook ? 640 : Math.round(420 + (1150 - fgH) / 2);
    let top = "";
    if (s.hook) top = boxText(s.hook, 260, 70);
    else if (s.url) {
      // "GO TO" box + address bar typing the URL
      const url = "hypecut.pages.dev/try";
      const typeEnd = Math.min(1.4, d * 0.6);
      const typing = [...url].map((_, k) => `drawtext=fontfile='${FONT}':text='${esc(url.slice(0, k + 1))}':fontsize=50:fontcolor=0x222222:x=120:y=322:enable='between(t,${(k * typeEnd / url.length).toFixed(3)},${k === url.length - 1 ? 999 : ((k + 1) * typeEnd / url.length).toFixed(3)})'`).join(",");
      top = `${boxText("GO TO HYPECUT.PAGES.DEV/TRY", 150, 58)},drawbox=x=90:y=295:w=900:h=110:color=white@0.97:t=fill,${typing}`;
    } else if (s.box) top = boxText(s.box, 220, 62);
    const fade = s.cta ? `,fade=t=out:st=${(d - 0.35).toFixed(2)}:d=0.35` : "";
    const seg = `${work}/${name}-seg${i}.mp4`;
    ff(["-loop", "1", "-framerate", String(FPS), "-t", d.toFixed(3), "-i", shots + file, "-i", wav,
      "-filter_complex", [
        `[0:v]split[a][b]`,
        `[a]scale=${W * 2}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=30:2,eq=brightness=-0.25[bg]`,
        `[b]crop=${cw}:${ch}:${cx}:${cy},scale=${fgW * 2}:${fgH * 2},zoompan=z='min(1+0.0012*on,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${fgW}x${fgH}:fps=${FPS}[fg]`,
        `[bg][fg]overlay=(W-w)/2:${fgY}:shortest=1,${top ? top + "," : ""}${caps.join(",")}${fade}[v]`,
      ].join(";"),
      "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS), "-c:a", "aac", "-ar", "44100", "-shortest", seg]);
    segs.push(seg);
  });
  fs.writeFileSync(`${work}/${name}-list.txt`, segs.map(p => `file '${p}'`).join("\n"));
  const joined = `${work}/${name}-joined.mp4`;
  ff(["-f", "concat", "-safe", "0", "-i", `${work}/${name}-list.txt`, "-c", "copy", joined]);
  const total = dur(joined);
  // light music bed, ducked under the voice
  ff(["-i", joined, "-f", "lavfi", "-i", `sine=f=110:d=${total}`, "-f", "lavfi", "-i", `sine=f=164.81:d=${total}`, "-f", "lavfi", "-i", `sine=f=246.94:d=${total}`,
    "-filter_complex", `[1:a][2:a][3:a]amix=inputs=3:normalize=0,tremolo=f=4:d=0.6,lowpass=f=1200,volume=0.35,afade=t=in:d=0.5,afade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5[m];[0:a]asplit[vo][vs];[m][vs]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[md];[md][vo]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.85[a]`,
    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", `${out}/${name}.mp4`]);
  console.log("  ->", `${out}/${name}.mp4`, dur(`${out}/${name}.mp4`).toFixed(1) + "s");
}

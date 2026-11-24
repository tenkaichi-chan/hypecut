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
    { say: "Websites you should know if you play games.", hook: "WEBSITES YOU SHOULD KNOW\n(GAMERS EDITION)", img: "landing" },
    { say: "Go to hypecut dot pages dot dev, slash try.", url: true, img: "try" },
    { say: "Drop in a gameplay recording.", box: "DROP IN YOUR GAMEPLAY", img: "filled" },
    { say: "It scans every second for the loudest, busiest moments.", box: "IT FINDS THE BEST MOMENTS", img: "moments" },
    { say: "Then it cuts them into vertical clips, with a caption.", box: "VERTICAL CLIP + CAPTION", img: "rendering" },
    { say: "It runs in your browser. Your video is never uploaded.", box: "NOTHING GETS UPLOADED", img: "done" },
    { say: "Three clips a month are free. Link in the description.", box: "HYPECUT.PAGES.DEV/TRY", img: "landing", cta: true },
  ],
  "site-feels-illegal": [
    { say: "This website feels illegal to know if you make gaming videos.", hook: "THIS WEBSITE FEELS ILLEGAL\nTO KNOW ABOUT", img: "landing" },
    { say: "It turns long gameplay recordings into Shorts.", box: "GAMEPLAY -> SHORTS", img: "try" },
    { say: "Go to hypecut dot pages dot dev, slash try, and drop your recording in.", url: true, img: "filled" },
    { say: "See these spikes? That's where the action is.", box: "THE SPIKES = THE ACTION", img: "moments" },
    { say: "One click, and you get a vertical clip, captioned and ready to post.", box: "ONE CLICK. CLIP READY.", img: "done" },
    { say: "No signup. Free to try.", box: "FREE TO TRY", img: "landing", cta: true },
  ],
  "site-stop-editing": [
    { say: "Stop editing your gameplay by hand.", hook: "STOP EDITING YOUR\nGAMEPLAY BY HAND", img: "landing" },
    { say: "This free website does it for you.", box: "THIS WEBSITE DOES IT", img: "try" },
    { say: "Nothing is uploaded. It runs right in your browser.", box: "RUNS IN YOUR BROWSER", img: "filled" },
    { say: "It finds the best moments by sound and on-screen action,", box: "FINDS THE BEST MOMENTS", img: "moments" },
    { say: "and cuts vertical clips for Shorts and TikTok.", box: "READY FOR SHORTS + TIKTOK", img: "rendering" },
    { say: "Three free clips a month, or Pro if you need more.", box: "3 FREE CLIPS A MONTH", img: "pricing" },
    { say: "Go to hypecut dot pages dot dev, slash try.", url: true, img: "landing", cta: true },
  ],
};

const run = (cmd, args, opt = {}) => { const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 26, ...opt }); if (r.status !== 0) { console.error(cmd, (r.stderr || r.stdout || "").slice(-1500)); process.exit(1); } return r; };
const ff = (args) => run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
const dur = (f) => parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).stdout);
const esc = (t) => t.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\u2019").replace(/%/g, "\\%").replace(/,/g, "\\,");
// white rounded-look caption box (TikTok style)
const boxText = (t, y, size = 64) => t.split("\n").map((ln, i) =>
  `drawtext=fontfile='${FONT}':text='${esc(ln)}':fontsize=${size}:fontcolor=black:box=1:boxcolor=white@0.96:boxborderw=22:x=(w-text_w)/2:y=${y + i * (size + 46)}`).join(",");

for (const [name, scenes] of Object.entries(SHORTS)) {
  console.log("building", name);
  const jobs = scenes.map((s, i) => ({ text: s.say, out: `${work}/${name}-${i}.wav`, speed: 1.1 }));
  fs.writeFileSync(`${work}/${name}.json`, JSON.stringify(jobs));
  run("node", [root + "/work/tts/say.mjs", `${work}/${name}.json`], { cwd: root + "/work/tts", env: { ...process.env, KOKORO_VOICE: "am_michael" } });

  const segs = [];
  scenes.forEach((s, i) => {
    const wav = `${work}/${name}-${i}f.wav`;
    ff(["-i", jobs[i].out, "-af", "highpass=f=80,acompressor=threshold=-20dB:ratio=2.5:makeup=3,apad=pad_dur=0.15,aresample=44100", "-ac", "2", wav]);
    const d = dur(wav);
    // word timings across this scene (by character length)
    const words = s.say.split(/\s+/);
    const totalChars = words.reduce((n, w) => n + w.length + 1, 0);
    let t = 0.05;
    const caps = words.map(w => { const len = (w.length + 1) / totalChars * (d - 0.15); const a = t; t += len;
      return `drawtext=fontfile='${FONT}':text='${esc(w.replace(/[.,]$/, "").toUpperCase())}':fontsize='if(lt(t-${a.toFixed(3)},0.1),84+30*(1-(t-${a.toFixed(3)})/0.1),84)':fontcolor=${/^(free|best|vertical|never|illegal|one|spikes|action|uploaded)/i.test(w) ? "0xffd23f" : "white"}:borderw=7:bordercolor=black:x=(w-text_w)/2:y=1530:enable='between(t,${a.toFixed(3)},${(a + len).toFixed(3)})'`; });
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

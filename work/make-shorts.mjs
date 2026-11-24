// Builds Hypecut promo Shorts in the "big word-by-word caption" style: voiceover + kinetic captions + app screenshot pop-up.
// usage: node work/make-shorts.mjs   (needs ffmpeg + Windows SAPI voice). Output: marketing/shorts/*.mp4
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = "D:/Hypecut";
const work = root + "/work/shorts";
const outDir = root + "/marketing/shorts";
fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(outDir, { recursive: true });
const shots = "C:/Users/sehba/.claude/projects/D--Hypecut/6f18bada-9e76-42c7-9417-440f6574f789/tool-results/";
const TOOL = shots + "mcp-Claude_Browser-blob-1795503872985-2myldt.jpg";
const FONT = "C\\:/Windows/Fonts/segoeuib.ttf";

const SHORTS = {
  "short1-never-posted": {
    title: "You recorded gameplay and never posted it",
    lines: ["You recorded an hour of gameplay.", "And never posted a single clip.", "Here is a free fix.", "Hypecut finds the *loudest*, busiest moments.", "Crops them to *vertical*.", "And adds captions.", "All in your *browser*.", "Nothing gets uploaded.", "Three *free* clips a month.", "Try it. Link in the description."],
    popupFrom: 3,
  },
  "short2-stop-editing": {
    title: "Stop editing gameplay by hand",
    lines: ["Stop editing gameplay by hand.", "Drop your recording into Hypecut.", "It scores every second by *sound* and *action*.", "Picks the best moments.", "And gives you *vertical* clips.", "Ready for Shorts and TikTok.", "*Free*. No signup.", "Try it now."],
    popupFrom: 1,
  },
  "short3-never-uploaded": {
    title: "A clip maker that never uploads your video",
    lines: ["Most clip tools upload your whole video.", "Hypecut does *not*.", "It runs in your *browser*.", "Your recording stays on your *computer*.", "No signup. No upload.", "Three *free* clips a month.", "Link in the description."],
    popupFrom: 2,
  },
};

const run = (cmd, args, opt = {}) => { const r = spawnSync(cmd, args, { encoding: "utf8", ...opt }); if (r.status !== 0) { console.error(cmd, args.join(" ").slice(0, 300), "\n", r.stderr || r.stdout); process.exit(1); } return r; };
const ff = (args) => run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
const dur = (f) => parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).stdout);
const plain = (s) => s.replace(/\*/g, "");
const esc = (t) => t.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\u2019").replace(/%/g, "\\%");

for (const [name, s] of Object.entries(SHORTS)) {
  console.log("building", name);
  // 1. voice: one wav per line so we know each line's timing
  // Kokoro (local, free): one job per line, all in one process
  const jobs = s.lines.map((line, i) => ({ text: plain(line), out: `${work}/${name}-${i}.wav`, speed: 1.08 }));
  fs.writeFileSync(`${work}/${name}-jobs.json`, JSON.stringify(jobs));
  run("node", [root + "/work/tts/say.mjs", `${work}/${name}-jobs.json`], { cwd: root + "/work/tts", env: { ...process.env, KOKORO_VOICE: process.env.KOKORO_VOICE || "am_michael" } });
  const parts = [];
  jobs.forEach((j, i) => {
    // light clean-up, add a short gap after each line
    const fixed = `${work}/${name}-${i}f.wav`;
    ff(["-i", j.out, "-af", "highpass=f=80,acompressor=threshold=-20dB:ratio=2.5:makeup=3,apad=pad_dur=0.18,aresample=44100", "-ac", "1", fixed]);
    parts.push(fixed);
  });
  fs.writeFileSync(`${work}/${name}-list.txt`, parts.map(p => `file '${p}'`).join("\n"));
  const voice = `${work}/${name}-voice.wav`;
  ff(["-f", "concat", "-safe", "0", "-i", `${work}/${name}-list.txt`, "-c", "copy", voice]);

  // 2. word timings: split each line's duration across its words by character count
  const words = []; let t = 0.25; // voice starts 0.25 s in
  parts.forEach((p, i) => {
    const d = dur(p) - 0.22; // speech part
    const ws = s.lines[i].split(/\s+/);
    const total = ws.reduce((n, w) => n + plain(w).length + 1, 0);
    let cur = t;
    ws.forEach(w => { const len = (plain(w).length + 1) / total * d; words.push({ text: plain(w).replace(/[.,]$/, ""), hot: /\*/.test(w), a: cur, b: cur + len, line: i }); cur += len; });
    t += dur(p);
  });
  const total = t + 0.6;

  // 3. caption filters (pop-in scale, highlight colour for *keywords*)
  const caps = words.map(w => {
    const fs_ = `if(lt(t-${w.a.toFixed(3)},0.12),90+50*(1-(t-${w.a.toFixed(3)})/0.12),90)`;
    return `drawtext=fontfile='${FONT}':text='${esc(w.text.toUpperCase())}':fontcolor=${w.hot ? "0xffd23f" : "white"}:fontsize='${fs_}':x=(w-text_w)/2:y=(h-text_h)/2-170:borderw=8:bordercolor=black@0.95:enable='between(t,${w.a.toFixed(3)},${w.b.toFixed(3)})'`;
  });
  const popupT = words.find(w => w.line === s.popupFrom).a.toFixed(3);

  // 4. background + popup + music + mix
  const music = `[2:a][3:a][4:a]amix=inputs=3:normalize=0,tremolo=f=2.5:d=0.5,lowpass=f=1000,volume=0.5,afade=t=in:d=1,afade=t=out:st=${(total - 2).toFixed(2)}:d=2[m]`;
  const out = `${outDir}/${name}.mp4`;
  ff([
    "-f", "lavfi", "-i", `gradients=s=1080x1920:c0=0x0b0918:c1=0x2d1066:c2=0x12082a:speed=0.012:d=${total.toFixed(2)}:r=30`,
    "-loop", "1", "-framerate", "30", "-t", total.toFixed(2), "-i", TOOL,
    "-f", "lavfi", "-i", `sine=f=110:d=${total.toFixed(2)}`, "-f", "lavfi", "-i", `sine=f=164.81:d=${total.toFixed(2)}`, "-f", "lavfi", "-i", `sine=f=220:d=${total.toFixed(2)}`,
    "-i", voice,
    "-filter_complex", [
      `[1:v]scale=420:-1,format=rgba[shot]`,
      `[0:v][shot]overlay=x=(W-w)/2:y='if(gte(t,${popupT}),H-h-70+max(0,(1-(t-${popupT})/0.3))*500,H)':enable='gte(t,${popupT})'[bg]`,
      `[bg]${caps.join(",")},drawtext=fontfile='${FONT}':text='hypecut.pages.dev/try':fontcolor=0xa9a4d4:fontsize=44:x=(w-text_w)/2:y=110:borderw=4:bordercolor=black@0.8[v]`,
      music,
      `[5:a]apad,atrim=0:${total.toFixed(2)},volume=1.1,asplit[vo][vs]`,
      `[m][vs]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md]`,
      `[md][vo]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.85[a]`,
    ].join(";"),
    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "160k", "-t", total.toFixed(2), out,
  ]);
  console.log("  ->", out, dur(out).toFixed(1) + "s");
}

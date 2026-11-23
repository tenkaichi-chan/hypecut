// Merge the real clip tool (try.html) into the claude.ai landing page (clutchcut.html).
// usage: node merge-tool.js <landing.html> <try.html>
const fs = require("fs");
const [landingPath, tryPath] = process.argv.slice(2);
let L = fs.readFileSync(landingPath, "utf8");
const T = fs.readFileSync(tryPath, "utf8");

function cut(str, startMarker, endMarker, replacement) {
  const a = str.indexOf(startMarker);
  const b = str.indexOf(endMarker, a + startMarker.length);
  if (a < 0 || b < 0) throw new Error("marker not found: " + startMarker + " / " + endMarker);
  return str.slice(0, a) + replacement + str.slice(b);
}
function between(str, startMarker, endMarker, inclusiveStart = true) {
  const a = str.indexOf(startMarker), b = str.indexOf(endMarker, a + 1);
  if (a < 0 || b < 0) throw new Error("marker not found: " + startMarker + " / " + endMarker);
  return str.slice(inclusiveStart ? a : a + startMarker.length, b);
}

// ---- 1. tool CSS, scoped under #tool ----
const style = between(T, "<style>", "</style>", false);
const lines = style.split("\n");
const from = lines.findIndex(l => l.startsWith(".panel {"));
const to = lines.findIndex(l => l.startsWith(".hidden-video"));
let css = lines.slice(from, to + 1).filter(l => !l.startsWith("footer")).join("\n");
// keep the small-button variant the tool uses; landing already has .btn/.btn.ghost
css = ".btn.sm { padding: 9px 14px; font-size: .78rem; border-radius: 10px; }\n" + css;

function scope(cssText, prefix) {
  let out = "", i = 0, depth = 0, stack = [];
  while (i < cssText.length) {
    const open = cssText.indexOf("{", i), close = cssText.indexOf("}", i);
    if (open !== -1 && (close === -1 || open < close)) {
      let sel = cssText.slice(i, open);
      const trimmed = sel.trim();
      const inKeyframes = stack.includes("keyframes");
      let kind = "rule";
      if (trimmed.startsWith("@keyframes")) kind = "keyframes";
      else if (trimmed.startsWith("@media")) kind = "media";
      else if (!inKeyframes && trimmed) {
        const lead = sel.match(/^\s*/)[0];
        sel = lead + trimmed.split(",").map(s => {
          s = s.trim();
          if (s.startsWith(".hidden-video")) return s; // lives on <body>
          return prefix + " " + s;
        }).join(", ") + " ";
      }
      out += sel + "{"; stack.push(kind); i = open + 1;
    } else if (close !== -1) {
      out += cssText.slice(i, close + 1); stack.pop(); i = close + 1;
    } else { out += cssText.slice(i); break; }
  }
  return out;
}
const toolCss = "/* ---------- free clip tool (scoped) ---------- */\n" + scope(css, "#tool") + "\n";
L = cut(L, "/* ---------- demo ---------- */", "/* ---------- pricing ---------- */", toolCss);

// ---- 2. tool markup replaces the mockup demo section ----
let panels = between(T, "<!-- STEP 1 -->", '<p class="note" style="margin-top:8px">');
// speech model can't load inside claude.ai (blocked hosts), so drop that option here
panels = panels.replace(/\s*<label class="toggle" for="optSpeech">[\s\S]*?<\/label>/, "");
panels = panels.replace('href="/#waitlist"', 'href="#waitlist"');
const section = `<section id="tool" class="band">
  <div class="wrap">
    <div class="sec-head reveal">
      <p class="eyebrow">Free tool</p>
      <h2>Try it on <span class="grad">your gameplay</span></h2>
      <p>Drop in a recording of your game. Hypecut finds the loudest, most action-packed moments and cuts them into vertical clips with a hook caption. It runs in your browser, and your video never leaves your device.</p>
    </div>
    ${panels.trim()}
    <p class="note" style="margin-top:8px">Works best in Chrome or Edge on a computer. Clips render in real time, so keep this page open while they render.</p>
  </div>
</section>

`;
L = cut(L, '<section id="demo" class="band">', '<section id="pricing">', section);

// nav + hero links point at the tool
L = L.split('<a href="#demo">Demo</a>').join('<a href="#tool">Try free</a>');
L = L.replace('<a class="btn ghost magnetic" href="#demo">Try the demo</a>', '<a class="btn ghost magnetic" href="#tool">Try it free</a>');

// ---- 3. drop mockup JS (clip cards, waveform, fake processing) ----
L = cut(L, "  // ---------- clip cards ----------", "  // ---------- FAQ: smooth open/close ----------", "");
// share the smooth-scroll instance with the tool script
L = L.replace("lenis = new Lenis({ lerp: 0.09, smoothWheel: true });", "lenis = new Lenis({ lerp: 0.09, smoothWheel: true });\n    window.__lenis = lenis;");

// ---- 4. tool JS, adapted for claude.ai ----
let js = between(T, '<script>\n(function () {\n  "use strict";', "</script>", true).replace(/^<script>\n/, "");
// remove the speech-subtitle engine (its model host is blocked here)
js = cut(js, "  // ---------- speech subtitles", "  let actx = null;", "");
js = js.replace('const wantSpeech = $("optSpeech").checked;', "const wantSpeech = false;");
// scroll through the page's smooth scroller
js = js.replace('const $ = id => document.getElementById(id);',
  'const $ = id => document.getElementById(id);\n  const scrollTo = el => { if (window.__lenis) window.__lenis.scrollTo(el, { offset: -80 }); else el.scrollIntoView({ behavior: "smooth", block: "start" }); };');
js = js.replace(/\$\("(step2|step3)"\)\.scrollIntoView\(\{[^}]*\}\);/g, (m, id) => 'scrollTo($("' + id + '"));');
// downloads go through the claude.ai save prompt
const showResultNew = `function showResult(card, blob, i, mime) {
    const url = URL.createObjectURL(blob);
    const ext = mime.indexOf("mp4") !== -1 ? "mp4" : "webm";
    const frame = card.querySelector(".frame");
    const still = frame.querySelector("canvas");
    frame.querySelector(".rendering") && frame.querySelector(".rendering").remove();
    const vid = document.createElement("video");
    vid.src = url; vid.controls = true; vid.playsInline = true; vid.loop = true; vid.preload = "metadata";
    vid.addEventListener("error", () => { vid.remove(); if (still) still.hidden = false; });
    if (still) still.hidden = true;
    frame.appendChild(vid);
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn sm dl";
    const label = "↓ Save " + ext.toUpperCase() + " (" + fmtSize(blob.size) + ")";
    btn.textContent = label;
    const note = document.createElement("small"); note.className = "save-note";
    btn.addEventListener("click", async () => {
      let dl = null;
      try { dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (_) {}
      if (!dl) { note.textContent = "Saving isn't available in this view. Use the free tool at hypecut-app.netlify.app/try to download."; return; }
      btn.disabled = true; btn.textContent = "Waiting for you to confirm…";
      try {
        await dl.save({ filename: "hypecut-clip-" + (i + 1) + "." + ext, data: blob });
        btn.textContent = "✓ Saved"; note.textContent = "";
      } catch (e) {
        btn.disabled = false; btn.textContent = label;
        note.textContent = e && e.code === "declined" ? "Save cancelled." : e && e.code === "rate_limited" ? "A save prompt is already open. Try again in a moment." : "Couldn't save here. Use the free tool at hypecut-app.netlify.app/try instead.";
      }
    });
    card.appendChild(btn); card.appendChild(note);
  }`;
js = cut(js, "  function showResult(card, blob, i, mime) {", "\n\n  if (!window.MediaRecorder", "  " + showResultNew);
L = L.replace(/<\/script>\s*$/, "</script>\n<script>\n" + js.trim() + "\n</script>\n");
// tiny style for the save note
L = L.replace("/* ---------- free clip tool (scoped) ---------- */", "/* ---------- free clip tool (scoped) ---------- */\n#tool .save-note { color: var(--muted); font-size: .76rem; min-height: 1em; }");

fs.writeFileSync(landingPath, L);
console.log("ok", L.length, "chars");

// One-off: swap "How it works" for a React Bits ScrollStack, footer for a big GradientText footer,
// and mark section headings for ScrollReveal.
const fs = require("fs");
const F = "D:/Hypecut/hypecut-site/index.html";
let s = fs.readFileSync(F, "utf8");

const stack = `    <div class="scroll-stack" id="howStack">
      <div class="scroll-stack__inner">
        <article class="scroll-stack-card ss-1">
          <div class="ss-text"><span class="num">STEP 01</span><h3>Drop in your gameplay</h3><p>A playtest, a stream VOD or a screen capture. MP4, MOV or WebM. It stays on your computer the whole time.</p></div>
          <div class="ss-viz" aria-hidden="true"><div class="sv-drop"><span class="sv-file">gameplay.mp4</span><span class="sv-arrow"></span></div><div class="sv-local"><i></i>Never uploaded</div></div>
        </article>
        <article class="scroll-stack-card ss-2">
          <div class="ss-text"><span class="num">STEP 02</span><h3>It finds the best moments</h3><p>Every second gets a hype score from how loud it is and how much is happening on screen. The spikes win.</p></div>
          <div class="ss-viz" aria-hidden="true"><div class="sv-bars"><i style="--h:20%"></i><i style="--h:34%"></i><i style="--h:22%"></i><i class="hot" style="--h:92%"></i><i style="--h:28%"></i><i style="--h:18%"></i><i style="--h:30%"></i><i class="hot" style="--h:80%"></i><i style="--h:24%"></i><i style="--h:16%"></i><i style="--h:36%"></i><i class="hot" style="--h:88%"></i><i style="--h:20%"></i></div><div class="sv-score">HYPE <b>97</b></div></div>
        </article>
        <article class="scroll-stack-card ss-3">
          <div class="ss-text"><span class="num">STEP 03</span><h3>Download vertical clips</h3><p>9:16 clips with a hook caption (plus optional speech subtitles), sized for Shorts, TikTok and Reels. Post them as-is.</p></div>
          <div class="ss-viz" aria-hidden="true"><div class="sv-phone"><span class="sv-cap">CLUTCH <em>1V3</em></span><span class="sv-dl">↓ Download MP4</span></div></div>
        </article>
      </div>
    </div>
`;
const a = s.indexOf('    <div class="steps reveal-group" id="steps">');
const endTag = "    </div>\n  </div>\n</section>";
const b = s.indexOf(endTag, a);
if (a < 0 || b < 0) throw new Error("steps block not found");
s = s.slice(0, a) + stack + "  </div>\n</section>" + s.slice(b + endTag.length);

const footer = `<footer class="big-foot">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="logo" href="#top"><span class="logo-mark" aria-hidden="true"></span>Hypecut</a>
        <p>Turn gameplay recordings into vertical, captioned clips. In your browser, nothing uploaded.</p>
        <a class="btn" href="/try">Try it free <span class="arr">→</span></a>
      </div>
      <nav class="foot-col" aria-label="Product"><b>Product</b><a href="/try">Free tool</a><a href="#demo">How it works</a><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></nav>
      <nav class="foot-col" aria-label="Account"><b>Account</b><a href="/login">Log in</a><a href="/signup">Sign up</a><a href="/reset">Reset password</a></nav>
      <nav class="foot-col" aria-label="Help"><b>Help</b><a href="mailto:sehbag11@gmail.com">sehbag11@gmail.com</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/refunds">Refunds</a></nav>
    </div>
    <div class="foot-word gradient-text" data-gradient-text data-colors="#ffd23f,#ff3d8b,#b14dff,#ff3d8b" aria-hidden="true"><span class="gradient-text__glow">HYPECUT</span><span class="gradient-text__content">HYPECUT</span></div>
    <div class="foot-base"><span>© 2026 Hypecut</span><a href="#top">Back to top ↑</a></div>
  </div>
</footer>`;
const fa = s.indexOf("<footer>"), fb = s.indexOf("</footer>");
if (fa < 0 || fb < 0) throw new Error("footer not found");
s = s.slice(0, fa) + footer + s.slice(fb + "</footer>".length);

// ScrollReveal on every section heading
let n = 0;
s = s.replace(/(<div class="sec-head reveal">\s*<p class="eyebrow">[^<]*<\/p>\s*)<h2>/g, (m, pre) => { n++; return pre + "<h2 data-scroll-reveal>"; });
fs.writeFileSync(F, s);
console.log("ok, headings marked:", n);

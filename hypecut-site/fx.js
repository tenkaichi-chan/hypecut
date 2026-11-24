// Hypecut landing-page effects. Vanilla ports of React Bits ideas (reactbits.dev, MIT):
// Aurora (WebGL2 background), RotatingText, MagicBento spotlight, ScrollVelocity marquee, ClickSpark,
// plus the "Watch it work" motion-graphics demo (timeline -> spikes -> vertical clips).
(function () {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ================= Aurora (port of React Bits Aurora) ================= */
  function aurora(container, opts) {
    const o = Object.assign({ stops: ["#b14dff", "#ff3d8b", "#ffd23f"], amplitude: 1.1, blend: 0.55, speed: 0.9, height: 0.36, scale: 1, glow: 0.7, brightness: .9, layers: 2 }, opts);
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) { container.classList.add("no-gl"); return; }
    const V = "#version 300 es\nin vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.0,1.0);}";
    const F = `#version 300 es
precision highp float;precision highp int;
uniform vec2 uResolution;uniform float uTime;uniform vec3 uStops[5];uniform int uStopCount;uniform float uAmplitude;uniform float uBlend;uniform float uHeight;uniform float uScale;uniform float uGlow;uniform float uBrightness;uniform int uLayers;uniform vec3 uPointer;uniform float uReveal;
out vec4 outColor;
vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}
float ss(float e0,float e1,float x){float t=clamp((x-e0)/(e1-e0),0.0,1.0);return t*t*t*(t*(t*6.0-15.0)+10.0);}
vec3 ok2lin(vec3 c){float l=c.x+0.3963377774*c.y+0.2158037573*c.z;float m=c.x-0.1055613458*c.y-0.0638541728*c.z;float s=c.x-0.0894841775*c.y-1.2914855480*c.z;l=l*l*l;m=m*m*m;s=s*s*s;return vec3(4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s);}
vec3 toSrgb(vec3 c){c=clamp(c,0.0,1.0);return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(0.0031308,c));}
vec3 ramp(float t){float x=clamp(t,0.0,1.0)*float(uStopCount-1);int i=int(min(floor(x),float(uStopCount-2)));float f=x-float(i);f=f*f*(3.0-2.0*f);vec3 lch=mix(uStops[i],uStops[i+1],f);return toSrgb(ok2lin(vec3(lch.x,lch.y*cos(lch.z),lch.y*sin(lch.z))));}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){vec2 frag=gl_FragCoord.xy;float y=1.0-frag.y/uResolution.y;float u=frag.x/uResolution.x;float X=(frag.x-uResolution.x*0.5)/uResolution.y;float t=uTime;float reach=uPointer.z*exp(-pow((X-uPointer.x)/0.38,2.0));vec3 glow=vec3(0.0);float cover=0.0;
for(int k=0;k<3;k++){if(k>=uLayers)break;float layer=float(k);float seed=layer*13.7;float pace=t*(1.0-layer*0.18);float warp=snoise(vec2(X*0.45*uScale+pace*0.02+seed,pace*0.05+seed));float wave=snoise(vec2(X*0.75*uScale+warp*0.35-pace*0.03+seed,pace*0.07-seed))*0.72+snoise(vec2(X*1.6*uScale+warp*0.5+pace*0.04-seed,pace*0.1+seed*0.5))*0.28;float hem=uHeight+layer*0.07+wave*0.15*uAmplitude;hem+=reach*0.08*(layer<0.5?1.0:0.4);hem=mix(-0.25,hem,uReveal);float soft=(0.04+uBlend*0.16)*(1.0+layer*0.9);float rise=hem-y;float low=-soft-uGlow*0.14;float high=0.26+soft*0.6;float body=pow(ss(low,high,rise),1.5+uGlow*0.6);float lobes=0.86+0.14*snoise(vec2(X*0.9*uScale-pace*0.025+seed,y*0.3+pace*0.04));float alpha=body*lobes*(layer<0.5?1.0:0.32/layer);alpha=clamp(alpha*(1.0+reach*0.25*ss(0.9,0.0,abs(y-hem))),0.0,1.0);vec3 tint=ramp(u+0.05*sin(pace*0.08+layer*2.3)+layer*0.1+max(rise,0.0)*0.05);glow=1.0-(1.0-glow)*(1.0-tint*alpha);cover=1.0-(1.0-cover)*(1.0-alpha);}
float fade=ss(0.0,0.7,uReveal);float strength=clamp(uBrightness,0.0,2.0);glow*=fade*min(strength,1.0);cover*=fade*min(strength,1.0);glow=1.0-pow(1.0-glow,vec3(max(strength,1.0)));float d=(hash(frag)-0.5)/255.0;outColor=vec4(glow+d,clamp(cover+d,0.0,1.0));}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = sh(gl.VERTEX_SHADER, V), fs = sh(gl.FRAGMENT_SHADER, F);
    if (!vs || !fs) { container.classList.add("no-gl"); return; }
    const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.bindAttribLocation(prog, 0, "aPosition"); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { container.classList.add("no-gl"); return; }
    const U = {}; for (let i = 0, n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS); i < n; i++) { const inf = gl.getActiveUniform(prog, i); U[inf.name.replace("[0]", "")] = gl.getUniformLocation(prog, inf.name); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // colours -> OKLCH (same maths as the original)
    const toOklch = (hex) => { const n = parseInt(hex.slice(1), 16); const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
      const l = Math.cbrt(0.4122214708 * rgb[0] + 0.5363325363 * rgb[1] + 0.0514459929 * rgb[2]), m = Math.cbrt(0.2119034982 * rgb[0] + 0.6806995451 * rgb[1] + 0.1073969566 * rgb[2]), s = Math.cbrt(0.0883024619 * rgb[0] + 0.2817188376 * rgb[1] + 0.6299787005 * rgb[2]);
      const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s; return [L, Math.hypot(A, B), Math.atan2(B, A)]; };
    let prev = null; const pal = new Float32Array(15);
    o.stops.map(toOklch).forEach((st, i) => { let h = st[2]; if (prev !== null) { while (h - prev > Math.PI) h -= 2 * Math.PI; while (h - prev < -Math.PI) h += 2 * Math.PI; } prev = h; pal.set([st[0], st[1], h], i * 3); });
    const view = { w: 1, h: 1 }, ptr = { x: 0, y: 0, inside: false }, st = { clock: 0, px: 0, py: .5, reach: 0, reveal: reduce ? 1 : 0 };
    let raf = 0, last = 0, visible = true;
    const render = () => {
      gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(prog); gl.bindVertexArray(vao);
      gl.uniform2f(U.uResolution, canvas.width, canvas.height); gl.uniform1f(U.uTime, st.clock); gl.uniform3fv(U.uStops, pal); gl.uniform1i(U.uStopCount, o.stops.length);
      gl.uniform1f(U.uAmplitude, o.amplitude); gl.uniform1f(U.uBlend, o.blend); gl.uniform1f(U.uHeight, o.height); gl.uniform1f(U.uScale, o.scale); gl.uniform1f(U.uGlow, o.glow); gl.uniform1f(U.uBrightness, o.brightness); gl.uniform1i(U.uLayers, o.layers);
      gl.uniform3f(U.uPointer, st.px, st.py, st.reach); gl.uniform1f(U.uReveal, 1 - Math.pow(1 - st.reveal, 3)); gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const frame = (now) => {
      raf = 0; if (!visible || document.hidden) return;
      const dt = last ? clamp((now - last) / 1000, .0005, .05) : 1 / 60; last = now;
      if (!reduce) st.clock += dt * o.speed;
      const engaged = fine && ptr.inside && !reduce, follow = 1 - Math.exp(-dt / .6);
      if (engaged) { st.px += ((ptr.x - view.w / 2) / view.h - st.px) * follow; st.py += (ptr.y / view.h - st.py) * follow; }
      st.reach += ((engaged ? 1 : 0) - st.reach) * (1 - Math.exp(-dt / (engaged ? .9 : 1.4)));
      if (st.reveal < 1) st.reveal = Math.min(1, st.reveal + dt / 2.4);
      render(); if (!reduce || st.reveal < 1) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const resize = () => { const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight), r = Math.min(devicePixelRatio || 1, 1.5); view.w = w; view.h = h; canvas.width = Math.round(w * r); canvas.height = Math.round(h * r); render(); wake(); };
    new ResizeObserver(resize).observe(container);
    new IntersectionObserver(e => { visible = e.some(x => x.isIntersecting); if (visible) { last = 0; wake(); } }).observe(container);
    addEventListener("pointermove", e => { const r = container.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.inside = ptr.x >= 0 && ptr.y >= 0 && ptr.x <= r.width && ptr.y <= r.height; wake(); }, { passive: true });
    document.addEventListener("visibilitychange", () => { last = 0; wake(); });
    resize();
  }

  /* ================= RotatingText ================= */
  function rotatingText(el) {
    const words = (el.dataset.words || "").split("|").filter(Boolean);
    if (words.length < 2 || reduce) return;
    let i = 0;
    const show = (w) => {
      el.innerHTML = "";
      [...w].forEach((ch, k) => { const s = document.createElement("span"); s.className = "rt-ch"; s.style.setProperty("--k", k); s.textContent = ch === " " ? " " : ch; el.appendChild(s); });
    };
    show(words[0]);
    setInterval(() => {
      el.classList.add("rt-out");
      setTimeout(() => { i = (i + 1) % words.length; el.classList.remove("rt-out"); show(words[i]); }, 380);
    }, 2400);
  }

  /* ================= MagicBento-style spotlight ================= */
  function spotlight(grid) {
    if (!fine) return;
    grid.addEventListener("pointermove", (e) => {
      grid.querySelectorAll(".bento-card").forEach(c => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--gx", (e.clientX - r.left) + "px");
        c.style.setProperty("--gy", (e.clientY - r.top) + "px");
        const d = Math.hypot(Math.max(r.left - e.clientX, 0, e.clientX - r.right), Math.max(r.top - e.clientY, 0, e.clientY - r.bottom));
        c.style.setProperty("--glow", String(clamp(1 - d / 260, 0, 1)));
      });
    });
    grid.addEventListener("pointerleave", () => grid.querySelectorAll(".bento-card").forEach(c => c.style.setProperty("--glow", "0")));
  }

  /* ================= ScrollVelocity marquee ================= */
  function velocityMarquee(track) {
    if (reduce) return;
    track.style.animation = "none";
    let off = 0, lastY = scrollY, vel = 0, lastT = performance.now();
    const half = () => track.scrollWidth / 2;
    (function loop(t) {
      const dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
      const dy = scrollY - lastY; lastY = scrollY;
      vel += ((dy / Math.max(dt, .001)) - vel) * .1;
      const speed = 60 + Math.min(900, Math.abs(vel)) * .6;
      off += speed * dt * (vel < -5 ? -1 : 1);
      const h = half(); if (h > 0) off = ((off % h) + h) % h;
      track.style.transform = `translate3d(${-off}px,0,0) skewX(${clamp(-vel / 120, -8, 8)}deg)`;
      requestAnimationFrame(loop);
    })(lastT);
  }

  /* ================= ClickSpark ================= */
  function clickSpark() {
    if (reduce) return;
    document.addEventListener("click", (e) => {
      const b = e.target.closest(".btn"); if (!b) return;
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("i"); s.className = "spark";
        s.style.left = e.clientX + "px"; s.style.top = e.clientY + "px";
        s.style.setProperty("--a", (i * 45) + "deg");
        document.body.appendChild(s); setTimeout(() => s.remove(), 520);
      }
    });
  }

  /* ================= "Watch it work" motion-graphics demo ================= */
  function demo(root) {
    const svg = root.querySelector(".mg-wave");
    const N = 120, W = 1000, H = 160;
    // a long, quiet recording with a few big moments (the three we'll clip)
    const peaks = [[0.2, 1], [0.52, .9], [0.82, .95]];
    const vals = Array.from({ length: N }, (_, i) => {
      const t = i / (N - 1); let v = .12 + .1 * Math.abs(Math.sin(i * 1.7)) + .06 * Math.abs(Math.sin(i * .37));
      peaks.forEach(([p, h]) => { v += h * Math.exp(-Math.pow((t - p) / .025, 2)); });
      return Math.min(1, v);
    });
    const bw = W / N;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = `<defs><linearGradient id="mgG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b14dff"/><stop offset=".6" stop-color="#ff3d8b"/><stop offset="1" stop-color="#ffd23f"/></linearGradient></defs>` +
      vals.map((v, i) => { const h = Math.max(4, v * (H - 14)); const hot = peaks.some(([p]) => Math.abs(i / (N - 1) - p) < .03);
        return `<rect class="mg-bar${hot ? " hot" : ""}" x="${(i * bw + 1).toFixed(1)}" y="${(H - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="2" style="--i:${i}"/>`; }).join("") +
      peaks.map(([p], k) => `<rect class="mg-pick" style="--k:${k}" x="${((p - .045) * W).toFixed(1)}" y="2" width="${(.09 * W).toFixed(1)}" height="${H - 4}" rx="8"/>`).join("");
    if (reduce) { root.classList.add("mg-static"); return; }
    let started = false;
    const run = () => {
      root.classList.remove("mg-go"); void root.offsetWidth; root.classList.add("mg-go");
    };
    new IntersectionObserver((ents) => {
      if (ents.some(e => e.isIntersecting) && !started) { started = true; run(); setInterval(run, 9000); }
    }, { threshold: .35 }).observe(root);
  }

  /* ================= boot ================= */
  const go = () => {
    document.querySelectorAll("#heroAurora, [data-aurora]").forEach(el => {
      const o = {};
      if (el.dataset.height) o.height = parseFloat(el.dataset.height);
      if (el.dataset.stops) o.stops = el.dataset.stops.split(",");
      if (el.dataset.brightness) o.brightness = parseFloat(el.dataset.brightness);
      aurora(el, o);
    });
    document.querySelectorAll("[data-rotate]").forEach(rotatingText);
    document.querySelectorAll(".bento").forEach(spotlight);
    const m = document.getElementById("marquee"); if (m) velocityMarquee(m);
    const d = document.getElementById("mgDemo"); if (d) demo(d);
    clickSpark();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();

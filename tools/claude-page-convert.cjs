// Turn the Netlify landing page (index.html) into the claude.ai version:
// no <head>/doctype (claude.ai adds its own), claude.ai database waitlist instead of Formspree,
// owner-only sign-up list, no Netlify-only counter. Run merge-tool.js afterwards for the clip tool.
// usage: node to-artifact.js <netlify index.html> <out.html>
const fs = require("fs");
const [src, out] = process.argv.slice(2);
let L = fs.readFileSync(src, "utf8");

function cut(str, a, b, rep, keepEnd = true) {
  const i = str.indexOf(a), j = str.indexOf(b, i + a.length);
  if (i < 0 || j < 0) throw new Error("marker not found: " + a + " / " + b);
  return str.slice(0, i) + rep + str.slice(keepEnd ? j : j + b.length);
}
function must(str, find, rep) {
  if (!str.includes(find)) throw new Error("not found: " + find.slice(0, 60));
  return str.replace(find, rep);
}

// head → title + fonts only
L = cut(L, "<!doctype html>", '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<title>Hypecut</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n');
L = must(L, "</style>\n</head>\n<body>", "</style>");
L = L.replace(/<\/body>\s*<\/html>\s*$/, "\n");
L = must(L, "html { background: var(--bg); scroll-behavior: smooth; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }",
  "html { background: var(--bg); scroll-behavior: smooth; }");

// form posts nowhere; claude.ai database handles it
L = L.replace(/<form class="form" id="wlForm"[^>]*>/, '<form class="form" id="wlForm" novalidate>');
L = L.replace(/\s*<input type="hidden" name="_subject"[^>]*>/, "");
L = L.replace(/\s*<div class="hp" aria-hidden="true">[\s\S]*?<\/div>/, "");

// counter (Netlify function) → owner-only sign-up list
L = L.replace(/\s*<p class="wl-count"[^\n]*<\/p>/, "");
L = must(L, '        <div><span class="k">3</span>', '        <div><span class="k">3</span>');
L = L.replace(/(<div><span class="k">3<\/span>[^\n]*<\/div>\n\s*<\/div>)/, `$1
      <div class="admin" id="admin" hidden>
        <h3>Your waitlist <span id="adminCount">0</span></h3>
        <p class="note">Only you and editors of this page see this list.</p>
        <div class="tbl"><table><thead><tr><th>Email</th><th>Game</th><th>Joined</th></tr></thead><tbody id="adminRows"><tr><td colspan="3" style="color:var(--muted)">No sign-ups yet. Share this page to get your first one.</td></tr></tbody></table></div>
        <div class="row-actions"><button class="btn ghost" type="button" id="copyCsv">Copy as CSV</button><span class="msg" id="copyMsg"></span></div>
      </div>`);
if (!L.includes('id="admin"')) throw new Error("admin panel not inserted");
L = must(L, "#confetti { position: fixed;", `.admin { margin-top: 30px; border-radius: 20px; padding: 22px; display: grid; gap: 12px; background: color-mix(in srgb, var(--panel) 70%, transparent); box-shadow: inset 0 0 0 1.5px var(--cta); animation: popIn .8s var(--ease-back) both; }
.admin h3 { font-size: 1.1rem; text-transform: uppercase; display: flex; justify-content: space-between; gap: 12px; }
.admin h3 span { color: var(--cta); font-variant-numeric: tabular-nums; }
.admin .note { color: var(--muted); font-size: .85rem; }
.admin .tbl { overflow-x: auto; max-height: 320px; overflow-y: auto; }
.admin table { width: 100%; border-collapse: collapse; font-size: .86rem; }
.admin th, .admin td { text-align: left; padding: 8px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.admin th { font-family: var(--f-mono); font-size: .7rem; text-transform: uppercase; color: var(--muted); font-weight: 500; position: sticky; top: 0; background: var(--panel); }
.admin td.t { color: var(--muted); font-variant-numeric: tabular-nums; }
.admin .row-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.admin .btn { padding: 9px 16px; font-size: .78rem; border-radius: 10px; }
.msg.ok { color: var(--ok); }
#confetti { position: fixed;`);

// JS: Formspree submit → claude.ai database submit + owner list
const dbJs = `  // ---------- waitlist (claude.ai database) ----------
  const form = document.getElementById("wlForm");
  const email = document.getElementById("wlEmail");
  const game = document.getElementById("wlGame");
  const btn = document.getElementById("wlBtn");
  const msg = document.getElementById("wlMsg");
  let db = null, me = null, ready = false;
  function say(text, kind) { msg.textContent = text; msg.className = "msg" + (kind ? " " + kind : ""); }

  (async () => {
    if (!window.claude || !window.claude.use) return;
    const [d, u] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    db = d;
    if (!db) return;
    try { me = u ? await u.id() : null; } catch (e) { me = null; }
    ready = true;
    if (me) {
      try {
        const snap = await db.collection("signups").doc(me).get();
        if (snap.exists) { const v = snap.data(); showDone(v.email, v.game, true); }
      } catch (e) {}
    }
    let canSee = false;
    try { canSee = u ? !!(await u.canEdit()) : false; } catch (e) {}
    if (canSee) startAdmin();
  })();

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const ev = email.value.trim(), gv = game.value.trim();
    email.setAttribute("aria-invalid", "false"); game.setAttribute("aria-invalid", "false");
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(ev)) { email.setAttribute("aria-invalid", "true"); email.focus(); return say("Enter a valid email address, like you@studio.gg.", "err"); }
    if (!gv) { game.setAttribute("aria-invalid", "true"); game.focus(); return say("Add your game's name so we know what you're building.", "err"); }
    if (!ready || !db || !me) return say("Sign-ups can't be saved in this view. Open the page while signed in to Claude to join.", "err");
    btn.disabled = true; btn.textContent = "Joining…"; say("");
    try {
      await db.collection("signups").doc(me).set({ email: ev, game: gv, joinedAt: new Date().toISOString() });
      try { localStorage.setItem("hypecut-signup", JSON.stringify({ email: ev, game: gv })); } catch (_) {}
      showDone(ev, gv, false);
      confetti();
    } catch (err) {
      btn.disabled = false; btn.innerHTML = 'Join the waitlist <span class="arr">→</span>';
      const code = err && err.code;
      say(code === "permission_denied" || code === "not_granted"
        ? "This page's owner hasn't given you permission to sign up here. Ask them for Contributor access."
        : "Couldn't save your sign-up. Check your connection and try again.", "err");
    }
  });

  function startAdmin() {
    const box = document.getElementById("admin");
    const rows = document.getElementById("adminRows");
    const count = document.getElementById("adminCount");
    let data = [];
    box.hidden = false;
    db.collection("signups").orderBy("joinedAt", "desc").onSnapshot(snap => {
      data = snap.docs.map(d => d.data());
      count.textContent = data.length;
      rows.innerHTML = "";
      if (!data.length) { rows.innerHTML = '<tr><td colspan="3" style="color:var(--muted)">No sign-ups yet. Share this page to get your first one.</td></tr>'; return; }
      data.forEach(r => {
        const tr = document.createElement("tr");
        [r.email, r.game, (r.joinedAt || "").slice(0, 10)].forEach((v, i) => { const td = document.createElement("td"); td.textContent = v || ""; if (i === 2) td.className = "t"; tr.appendChild(td); });
        rows.appendChild(tr);
      });
    }, () => { box.hidden = true; });
    document.getElementById("copyCsv").addEventListener("click", () => {
      const esc = v => '"' + String(v || "").replace(/"/g, '""') + '"';
      const csv = "email,game,joined\\n" + data.map(r => [r.email, r.game, r.joinedAt].map(esc).join(",")).join("\\n");
      const m = document.getElementById("copyMsg");
      navigator.clipboard.writeText(csv).then(() => { m.textContent = "Copied " + data.length + " rows."; m.className = "msg ok"; },
        () => { m.textContent = "Copy was blocked here. Ask Claude to export your sign-ups instead."; m.className = "msg err"; });
    });
  }

`;
L = cut(L, "  // ---------- waitlist (Formspree) ----------", "  function showDone(", dbJs);
// share the public site, not the private claude.ai frame
L = must(L, "const url = location.origin + location.pathname,", 'const url = "https://hypecut-app.netlify.app/",');
// no Netlify counter here
L = cut(L, "  // ---------- waitlist counter", "  // ---------- pricing: billing switch", "");

fs.writeFileSync(out, L);
console.log("ok", L.length);

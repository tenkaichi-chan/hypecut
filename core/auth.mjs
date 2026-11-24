// Optional Hypecut accounts: sign up, log in, log out, "who am I", link a Pro key, count free clips.
// POST /api/auth { action: "signup", email, password } -> { ok, user }   (also sets the session cookie)
// POST /api/auth { action: "login",  email, password } -> { ok, user }
// POST /api/auth { action: "logout" }                  -> { ok }
// POST /api/auth { action: "me" }                      -> { ok, user | null }
// POST /api/auth { action: "link_key", key }           -> { ok, user }    save a validated Pro key on the account
// POST /api/auth { action: "unlink_key" }              -> { ok, user }
// POST /api/auth { action: "use_free", n }             -> { ok, user }    count free clips on the account
// Needs a D1 database bound as DB with migrations/0002_accounts.sql applied.

const COOKIE = "hc_session";
const SESSION_DAYS = 30;
const ITER = 100000;             // PBKDF2 iterations (Cloudflare Workers' maximum)
const MAX_FAILS = 8, FAIL_WINDOW_MIN = 15;

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const fromHex = (h) => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const month = () => new Date().toISOString().slice(0, 7);

async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations: ITER }, key, 256);
  return hex(bits);
}
function sameHex(a, b) { // constant-time compare
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function json(body, status = 200, cookie) {
  const h = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (cookie) h["Set-Cookie"] = cookie;
  return new Response(JSON.stringify(body), { status, headers: h });
}
const sessionCookie = (token, req) => {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return token
    ? `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`
    : `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
};
const readCookie = (req) => {
  const m = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([a-f0-9]{64})"));
  return m ? m[1] : null;
};

const publicUser = (u) => u && ({
  email: u.email,
  proKey: u.pro_key || null,
  freeUsed: u.free_period === month() ? u.free_used : 0,
  created: u.created_at,
});

async function startSession(db, userId) {
  const token = randHex(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400e3).toISOString();
  await db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?1, ?2, ?3)").bind(await sha256(token), userId, expires).run();
  return token;
}
export async function currentUser(db, req) {
  const token = readCookie(req);
  if (!token) return null;
  return db.prepare(
    "SELECT u.* FROM sessions s JOIN users u ON u.user_id = s.user_id WHERE s.token_hash = ?1 AND s.expires_at > ?2"
  ).bind(await sha256(token), new Date().toISOString()).first();
}

// ---- Google sign-in: verify the ID token (a JWT signed by Google) ourselves with WebCrypto ----
const GOOGLE_ISS = new Set(["accounts.google.com", "https://accounts.google.com"]);
let jwksCache = { keys: null, until: 0 };
const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function googleKeys() {
  if (jwksCache.keys && Date.now() < jwksCache.until) return jwksCache.keys;
  const r = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!r.ok) throw new Error("google certs " + r.status);
  const maxAge = Number((r.headers.get("Cache-Control") || "").match(/max-age=(\d+)/)?.[1] || 3600);
  jwksCache = { keys: (await r.json()).keys, until: Date.now() + Math.min(maxAge, 6 * 3600) * 1000 };
  return jwksCache.keys;
}
export async function verifyGoogleIdToken(token, clientId) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const header = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
  if (header.alg !== "RS256") return null;
  const jwk = (await googleKeys()).find(k => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(parts[2]), enc.encode(parts[0] + "." + parts[1]));
  if (!ok) return null;
  const p = JSON.parse(new TextDecoder().decode(b64url(parts[1])));
  const now = Math.floor(Date.now() / 1000);
  if (!GOOGLE_ISS.has(p.iss) || p.aud !== clientId || !(p.exp > now - 60) || !p.sub) return null;
  if (!p.email || p.email_verified !== true) return null; // only trust emails Google has verified
  return { sub: String(p.sub), email: String(p.email).toLowerCase() };
}

const validEmail = (e) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e);

export async function handleAuth(req, env) {
  if (req.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);
  const db = env.DB;
  if (!db) return json({ ok: false, error: "Accounts aren't set up yet." }, 503);
  // Only accept requests from our own pages (blocks cross-site form posts).
  const origin = req.headers.get("Origin");
  if (origin && origin !== new URL(req.url).origin) return json({ ok: false, error: "Bad origin." }, 403);
  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Bad request." }, 400); }
  const action = String(body.action || "");

  try {
    // public settings for the log-in page (the Google client id is public by design)
    if (action === "config") return json({ ok: true, googleClientId: env.GOOGLE_CLIENT_ID || null });

    if (action === "google") {
      if (!env.GOOGLE_CLIENT_ID) return json({ ok: false, error: "Google sign-in isn't switched on yet." }, 503);
      const g = await verifyGoogleIdToken(body.credential, env.GOOGLE_CLIENT_ID);
      if (!g) return json({ ok: false, error: "Google sign-in didn't work. Try again." }, 401);
      let u = await db.prepare("SELECT * FROM users WHERE google_sub = ?").bind(g.sub).first()
           || await db.prepare("SELECT * FROM users WHERE email = ?").bind(g.email).first();
      if (u && !u.google_sub) { // same verified email as an existing account: link Google to it
        await db.prepare("UPDATE users SET google_sub = ?1 WHERE user_id = ?2").bind(g.sub, u.user_id).run();
      }
      if (!u) {
        const userId = "usr_" + randHex(12);
        await db.prepare("INSERT INTO users (user_id, email, pass_hash, pass_salt, google_sub) VALUES (?1, ?2, '', '', ?3)")
          .bind(userId, g.email, g.sub).run();
        u = await db.prepare("SELECT * FROM users WHERE user_id = ?").bind(userId).first();
      }
      const token = await startSession(db, u.user_id);
      return json({ ok: true, user: publicUser(u) }, 200, sessionCookie(token, req));
    }

    if (action === "signup" || action === "login") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!validEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);
      if (password.length > 200) return json({ ok: false, error: "That password is too long." }, 400);

      if (action === "signup") {
        if (password.length < 8) return json({ ok: false, error: "Use at least 8 characters for your password." }, 400);
        const exists = await db.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first();
        if (exists) return json({ ok: false, error: "There's already an account with that email. Log in instead." }, 409);
        const salt = randHex(16);
        const userId = "usr_" + randHex(12);
        await db.prepare("INSERT INTO users (user_id, email, pass_hash, pass_salt) VALUES (?1, ?2, ?3, ?4)")
          .bind(userId, email, await hashPassword(password, salt), salt).run();
        const token = await startSession(db, userId);
        const u = await db.prepare("SELECT * FROM users WHERE user_id = ?").bind(userId).first();
        return json({ ok: true, user: publicUser(u) }, 200, sessionCookie(token, req));
      }

      // login, with a simple per-email lockout after repeated failures
      const now = new Date();
      const f = await db.prepare("SELECT count, window_at FROM login_failures WHERE email = ?").bind(email).first();
      const inWindow = f && (now - new Date(f.window_at)) < FAIL_WINDOW_MIN * 60e3;
      if (inWindow && f.count >= MAX_FAILS) return json({ ok: false, error: `Too many attempts. Try again in ${FAIL_WINDOW_MIN} minutes.` }, 429);
      const u = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
      if (u && !u.pass_hash) return json({ ok: false, error: "This account uses Google sign-in. Use the Google button." }, 401);
      const salt = u ? u.pass_salt : "00".repeat(16); // hash anyway so timing doesn't reveal which emails exist
      const h = await hashPassword(password, salt);
      if (!u || !sameHex(h, u.pass_hash)) {
        await db.prepare(
          `INSERT INTO login_failures (email, count, window_at) VALUES (?1, 1, ?2)
           ON CONFLICT(email) DO UPDATE SET count = CASE WHEN ?3 THEN login_failures.count + 1 ELSE 1 END,
             window_at = CASE WHEN ?3 THEN login_failures.window_at ELSE ?2 END`
        ).bind(email, now.toISOString(), inWindow ? 1 : 0).run();
        return json({ ok: false, error: "Wrong email or password." }, 401);
      }
      await db.prepare("DELETE FROM login_failures WHERE email = ?").bind(email).run();
      await db.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?").bind(u.user_id, now.toISOString()).run();
      const token = await startSession(db, u.user_id);
      return json({ ok: true, user: publicUser(u) }, 200, sessionCookie(token, req));
    }

    if (action === "logout") {
      const token = readCookie(req);
      if (token) await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
      return json({ ok: true }, 200, sessionCookie(null, req));
    }

    const u = await currentUser(db, req);
    if (action === "me") return json({ ok: true, user: publicUser(u) });
    if (!u) return json({ ok: false, error: "Please log in." }, 401);

    if (action === "link_key") {
      const key = String(body.key || "").trim().toUpperCase().replace(/\s+/g, "");
      if (!/^HC-[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(key)) return json({ ok: false, error: "That doesn't look like a Pro key." }, 400);
      await db.prepare("UPDATE users SET pro_key = ?1 WHERE user_id = ?2").bind(key, u.user_id).run();
      return json({ ok: true, user: publicUser({ ...u, pro_key: key }) });
    }
    if (action === "unlink_key") {
      await db.prepare("UPDATE users SET pro_key = NULL WHERE user_id = ?").bind(u.user_id).run();
      return json({ ok: true, user: publicUser({ ...u, pro_key: null }) });
    }
    if (action === "use_free") {
      const n = Math.max(1, Math.min(10, parseInt(body.n, 10) || 1));
      const m = month();
      const used = (u.free_period === m ? u.free_used : 0) + n;
      await db.prepare("UPDATE users SET free_period = ?1, free_used = ?2 WHERE user_id = ?3").bind(m, used, u.user_id).run();
      return json({ ok: true, user: publicUser({ ...u, free_period: m, free_used: used }) });
    }
    return json({ ok: false, error: "Unknown action." }, 400);
  } catch (e) {
    console.error("auth error", e && e.message);
    return json({ ok: false, error: "Something went wrong. Try again." }, 500);
  }
}

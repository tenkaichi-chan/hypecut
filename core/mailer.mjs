// Sends email through the Gmail API as GMAIL_SENDER (OAuth refresh token with the gmail.send scope only).
// Env (Pages secrets): GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER.
let tokenCache = { token: null, until: 0 };

export const mailConfigured = (env) => !!(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN && env.GMAIL_SENDER);

async function accessToken(env) {
  if (tokenCache.token && Date.now() < tokenCache.until) return tokenCache.token;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.GMAIL_CLIENT_ID, client_secret: env.GMAIL_CLIENT_SECRET, refresh_token: env.GMAIL_REFRESH_TOKEN, grant_type: "refresh_token" }),
  });
  const t = await r.json();
  if (!t.access_token) throw new Error("gmail token: " + (t.error || r.status));
  tokenCache = { token: t.access_token, until: Date.now() + (t.expires_in - 60) * 1000 };
  return t.access_token;
}

const b64 = (s) => { const bytes = new TextEncoder().encode(s); let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin); };
const b64url = (s) => b64(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const header = (s) => /^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + b64(s) + "?=";

export async function sendMail(env, { to, subject, text, html }) {
  if (!/^[^\s@<>"]+@[^\s@<>"]+$/.test(to)) throw new Error("bad recipient");
  const boundary = "hc" + crypto.getRandomValues(new Uint32Array(2)).join("");
  const raw = [
    `From: ${header("Hypecut")} <${env.GMAIL_SENDER}>`,
    `To: <${to}>`,
    `Subject: ${header(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64(text).replace(/.{76}/g, "$&\r\n"),
    `--${boundary}`, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64(html).replace(/.{76}/g, "$&\r\n"),
    `--${boundary}--`, "",
  ].join("\r\n");
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST", headers: { Authorization: "Bearer " + (await accessToken(env)), "Content-Type": "application/json" },
    body: JSON.stringify({ raw: b64url(raw) }),
  });
  if (!r.ok) throw new Error("gmail send " + r.status + ": " + (await r.text()).slice(0, 200));
  return (await r.json()).id;
}

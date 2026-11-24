// One-time: let Hypecut send email from the Gmail account in .env.gmail (scope: gmail.send only).
// 1. Starts a tiny server on http://127.0.0.1:53682, prints the Google consent URL.
// 2. You approve in the browser; Google redirects back here with a code.
// 3. Swaps the code for a refresh token, saves it to .env.gmail and (with --push) sets Pages secrets
//    GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN / GMAIL_SENDER on the "hypecut" project.
// Secrets are never printed.
// usage: node tools/gmail-auth.mjs [--push]
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const ENV = ".env.gmail";
const env = Object.fromEntries(fs.readFileSync(ENV, "utf8").split(/\r?\n/).filter(l => /^\w+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const PORT = 53682, REDIRECT = `http://127.0.0.1:${PORT}/`;
const verifier = crypto.randomBytes(48).toString("base64url");
const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
const state = crypto.randomBytes(16).toString("hex");

const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
  client_id: env.GMAIL_CLIENT_ID, redirect_uri: REDIRECT, response_type: "code",
  scope: "https://www.googleapis.com/auth/gmail.send", access_type: "offline", prompt: "consent",
  login_hint: env.GMAIL_SENDER, state, code_challenge: challenge, code_challenge_method: "S256",
});
fs.writeFileSync("tools/.gmail-consent-url.txt", url);
console.log("Consent URL written to tools/.gmail-consent-url.txt. Waiting for Google to redirect back…");

const server = http.createServer(async (req, res) => {
  const q = new URL(req.url, REDIRECT).searchParams;
  if (!q.get("code") && !q.get("error")) { res.end(); return; }
  if (q.get("state") !== state) { res.end("State mismatch. Close this tab."); return; }
  if (q.get("error")) { res.end("Google said: " + q.get("error") + ". You can close this tab."); console.error("consent error:", q.get("error")); server.close(); process.exit(1); }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: q.get("code"), client_id: env.GMAIL_CLIENT_ID, client_secret: env.GMAIL_CLIENT_SECRET, redirect_uri: REDIRECT, grant_type: "authorization_code", code_verifier: verifier }),
  });
  const t = await r.json();
  if (!t.refresh_token) { res.end("Couldn't get a token. Check the terminal."); console.error("token error:", t.error, t.error_description); server.close(); process.exit(1); }
  let text = fs.readFileSync(ENV, "utf8").replace(/^GMAIL_REFRESH_TOKEN=.*\r?\n?/m, "");
  fs.writeFileSync(ENV, text.trimEnd() + "\nGMAIL_REFRESH_TOKEN=" + t.refresh_token + "\n");
  res.end("Done! Hypecut can now send password-reset emails from " + env.GMAIL_SENDER + ". You can close this tab.");
  console.log("Saved refresh token to " + ENV + " (scope: " + t.scope + ")");
  if (process.argv.includes("--push")) {
    const all = { ...env, GMAIL_REFRESH_TOKEN: t.refresh_token };
    for (const k of ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER"]) {
      const p = spawnSync("npx", ["wrangler", "pages", "secret", "put", k, "--project-name", "hypecut"], { input: all[k], encoding: "utf8", shell: true });
      console.log(k, p.status === 0 ? "set on Pages" : "FAILED: " + (p.stderr || "").split("\n").slice(-3).join(" "));
    }
  }
  server.close(); process.exit(0);
});
server.listen(PORT, "127.0.0.1");

// Paddle SDK client for any host. Pass the env object. Needs Node compat on Cloudflare (nodejs_compat),
// because the SDK verifies webhook signatures with Node's crypto.
// Env: PADDLE_API_KEY, PADDLE_ENV ("sandbox" | "production").
import { Paddle, Environment } from "@paddle/paddle-node-sdk";

export function makePaddle(env) {
  return new Paddle(env.PADDLE_API_KEY, {
    environment: env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox,
  });
}

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

export function newKey() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid typos
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let s = "";
  bytes.forEach((b, i) => { s += abc[b % abc.length]; if (i % 4 === 3 && i < 15) s += "-"; });
  return "HC-" + s;
}
export const cleanKey = (k) => String(k || "").trim().toUpperCase().replace(/\s+/g, "");
export const KEY_RE = /^HC-[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/;

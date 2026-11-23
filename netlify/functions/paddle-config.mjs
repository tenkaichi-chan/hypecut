// Public checkout settings for the page: the client-side token and price IDs are safe to expose.
// GET /api/paddle-config -> { ready, env, token, prices: { monthly, yearly } }
import { paddleEnv } from "../lib/paddle.mjs";

export default async () => {
  const token = process.env.PADDLE_CLIENT_TOKEN || "";
  const monthly = process.env.PADDLE_PRICE_MONTHLY || "";
  const yearly = process.env.PADDLE_PRICE_YEARLY || "";
  const ready = !!(token && monthly && yearly && process.env.PADDLE_API_KEY);
  return new Response(JSON.stringify({ ready, env: paddleEnv(), token: ready ? token : "", prices: ready ? { monthly, yearly } : {} }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });
};

export const config = { path: "/api/paddle-config" };

// Shared Paddle Billing API helper (server-side only).
// Env: PADDLE_ENV ("sandbox" | "production"), PADDLE_API_KEY.
export const paddleEnv = () => (process.env.PADDLE_ENV === "production" ? "production" : "sandbox");
const base = () => (paddleEnv() === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com");

export async function paddle(path, { method = "GET", body } = {}) {
  const r = await fetch(base() + path, {
    method,
    headers: { Authorization: "Bearer " + process.env.PADDLE_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let d = null;
  try { d = await r.json(); } catch { /* empty body */ }
  if (!r.ok) {
    const err = new Error((d && d.error && d.error.detail) || "Paddle API error " + r.status);
    err.status = r.status; err.code = d && d.error && d.error.code;
    throw err;
  }
  return d && d.data;
}

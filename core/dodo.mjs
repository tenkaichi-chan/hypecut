// Dodo Payments API helper (server-side only). Works on any host: pass the env object.
// Env: DODO_ENV ("test" | "live"), DODO_API_KEY.
export const dodoEnv = (env) => (env.DODO_ENV === "live" ? "live" : "test");

export function makeDodo(env) {
  const base = dodoEnv(env) === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
  return async function dodo(path, { method = "GET", body } = {}) {
    const r = await fetch(base + path, {
      method,
      headers: { Authorization: "Bearer " + env.DODO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const t = await r.text();
    let d = null;
    try { d = t ? JSON.parse(t) : null; } catch { d = null; }
    if (!r.ok) {
      const err = new Error((d && (d.message || d.code)) || "Dodo API error " + r.status);
      err.status = r.status; err.code = d && d.code;
      throw err;
    }
    return d;
  };
}

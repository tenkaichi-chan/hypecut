// Records that an email joined the waitlist, for the public counter.
// Only a SHA-256 hash of the email is stored, never the email itself.
// The real sign-up (email + game) goes to Formspree from the page.
import { getStore } from "@netlify/blobs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  let email = "";
  try { email = String((await req.json()).email || "").trim().toLowerCase(); } catch { return json({ error: "Bad request." }, 400); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json({ error: "Invalid email." }, 400);

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("hypecut:" + email));
  const key = "e_" + Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  const store = getStore({ name: "waitlist", consistency: "strong" });
  await store.set(key, String(Date.now()));
  return json({ ok: true });
};

export const config = { path: "/api/joined" };

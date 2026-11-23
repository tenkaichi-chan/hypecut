// Public waitlist counter: number of unique emails recorded by /api/joined.
import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore({ name: "waitlist", consistency: "strong" });
  const { blobs } = await store.list({ prefix: "e_" });
  return new Response(JSON.stringify({ count: blobs.length }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
};

export const config = { path: "/api/count" };

// Cloudflare KV adapter with the same small interface the core code expects
// (matches Netlify Blobs: get(key[, {type:"json"}]), set(key, string), setJSON(key, obj)).
export function kvStore(kv) {
  return {
    get: (key, opts) => kv.get(key, opts && opts.type === "json" ? "json" : "text"),
    set: (key, value) => kv.put(key, String(value)),
    setJSON: (key, obj) => kv.put(key, JSON.stringify(obj)),
  };
}

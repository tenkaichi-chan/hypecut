// Cloudflare Pages Function: /api/license. Gumroad license keys (core/gumroad.mjs).
// Needs a KV namespace bound as LICENSES (see wrangler.toml).
import { handleGumroadLicense } from "../../core/gumroad.mjs";
import { kvStore } from "../_lib/kv-store.js";

export const onRequest = ({ request, env }) => handleGumroadLicense(request, env, kvStore(env.LICENSES));

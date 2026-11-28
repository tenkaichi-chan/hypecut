// Cloudflare Pages Function: /api/license. Gumroad license keys (core/gumroad.mjs).
// Clip counts are in D1 (binding DB); the old KV namespace LICENSES is only read, to carry over earlier counts.
import { handleGumroadLicense } from "../../core/gumroad.mjs";
import { kvStore } from "../_lib/kv-store.js";

export const onRequest = ({ request, env }) => handleGumroadLicense(request, env, env.LICENSES ? kvStore(env.LICENSES) : null);

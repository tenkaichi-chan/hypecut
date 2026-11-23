// Cloudflare Pages Function: /api/license. Logic is shared in core/license.mjs.
// Needs a KV namespace bound as LICENSES (see wrangler.toml).
import { handleLicense } from "../../core/license.mjs";
import { kvStore } from "../_lib/kv-store.js";

export const onRequest = ({ request, env }) => handleLicense(request, env, kvStore(env.LICENSES));

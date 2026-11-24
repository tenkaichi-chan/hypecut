// Cloudflare Pages Function: /api/license.
// PAYMENTS=gumroad -> Gumroad license keys (core/gumroad.mjs); otherwise Dodo Payments (core/license.mjs).
// Needs a KV namespace bound as LICENSES (see wrangler.toml).
import { handleLicense } from "../../core/license.mjs";
import { handleGumroadLicense } from "../../core/gumroad.mjs";
import { kvStore } from "../_lib/kv-store.js";

export const onRequest = ({ request, env }) =>
  env.PAYMENTS === "gumroad"
    ? handleGumroadLicense(request, env, kvStore(env.LICENSES))
    : handleLicense(request, env, kvStore(env.LICENSES));

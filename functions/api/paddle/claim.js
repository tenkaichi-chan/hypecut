// Cloudflare Pages Function: POST /api/paddle/claim. Logic in core/paddle/portal.mjs.
import { handleClaim } from "../../../core/paddle/portal.mjs";

export const onRequest = ({ request, env }) => handleClaim(request, env);

// Cloudflare Pages Function: POST /api/paddle/access. Logic in core/paddle/portal.mjs.
import { handleAccess } from "../../../core/paddle/portal.mjs";

export const onRequest = ({ request, env }) => handleAccess(request, env);

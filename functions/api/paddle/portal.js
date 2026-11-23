// Cloudflare Pages Function: POST /api/paddle/portal. Logic in core/paddle/portal.mjs.
import { handlePortal } from "../../../core/paddle/portal.mjs";

export const onRequest = ({ request, env }) => handlePortal(request, env);

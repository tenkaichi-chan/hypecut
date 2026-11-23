// Cloudflare Pages Function: /api/checkout. Logic is shared in core/checkout.mjs.
import { handleCheckout } from "../../core/checkout.mjs";

export const onRequest = ({ request, env }) => handleCheckout(request, env);

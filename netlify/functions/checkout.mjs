// Netlify wrapper for /api/checkout. The logic lives in core/checkout.mjs (shared with Cloudflare Pages).
import { handleCheckout } from "../../core/checkout.mjs";

export default async (req) => handleCheckout(req, process.env);

export const config = { path: "/api/checkout" };

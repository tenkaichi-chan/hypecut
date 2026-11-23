// Cloudflare Pages Function: POST /api/paddle/webhook. Logic in core/paddle/webhook.mjs.
import { handlePaddleWebhook } from "../../../core/paddle/webhook.mjs";

export const onRequest = ({ request, env }) => handlePaddleWebhook(request, env);

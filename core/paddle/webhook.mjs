// Paddle webhook endpoint.
//  1. Read the RAW body (text). Never JSON.parse it first: a re-serialised body fails verification.
//  2. Verify the signature with the SDK, using the notification SIGNING SECRET (not the API key).
//  3. Anything that fails verification gets a 4xx. A 2xx would tell Paddle it was delivered and stop retries.
//  4. Route to a typed handler. Unknown event types are acknowledged (2xx) and ignored.
//  5. A handler error is a 5xx so Paddle retries (deliveries are at-least-once; handlers are idempotent).
import { makePaddle, json } from "./sdk.mjs";
import { HANDLERS } from "./handlers.mjs";

export async function handlePaddleWebhook(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!env.PADDLE_WEBHOOK_SECRET || !env.PADDLE_API_KEY || !env.DB) {
    console.error("paddle webhook: missing PADDLE_WEBHOOK_SECRET, PADDLE_API_KEY or DB binding");
    return json({ error: "Webhook endpoint isn't configured." }, 500);
  }

  const signature = request.headers.get("paddle-signature");
  if (!signature) return json({ error: "Missing signature." }, 400);
  const rawBody = await request.text();

  const paddle = makePaddle(env);
  let event;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, env.PADDLE_WEBHOOK_SECRET, signature);
  } catch (e) {
    const msg = String((e && e.message) || e);
    // The SDK's signature errors both mention "signature". Anything else means the signature was fine
    // but the body couldn't be parsed into an event: log why, and answer 5xx so Paddle retries later
    // (e.g. after an SDK upgrade) instead of silently dropping a real event.
    if (/signature/i.test(msg)) {
      console.warn("paddle webhook: " + msg);
      return json({ error: "Invalid signature." }, 401);
    }
    console.error("paddle webhook: verified but unparseable event:", msg);
    return json({ error: "Unprocessable event." }, 500);
  }

  const handler = HANDLERS[event.eventType];
  if (!handler) return json({ ok: true, ignored: event.eventType });

  try {
    await handler({ db: env.DB, paddle }, event);
  } catch (e) {
    // include the SDK's ApiError fields (type/code/detail) so a failure can be diagnosed from the logs
    console.error("paddle webhook handler failed", event.eventType, event.eventId,
      JSON.stringify({ message: e && e.message, type: e && e.type, code: e && e.code, detail: e && e.detail, name: e && e.name }));
    return json({ error: "Handler failed." }, 500);
  }
  return json({ ok: true, handled: event.eventType });
}

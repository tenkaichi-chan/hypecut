// Cloudflare Pages Function: /api/auth (sign up, log in, log out). Logic in core/auth.mjs.
// Needs the D1 database bound as DB with migrations/0002_accounts.sql applied.
import { handleAuth } from "../../core/auth.mjs";

export const onRequest = ({ request, env }) => handleAuth(request, env);

// Netlify wrapper for /api/license. The logic lives in core/license.mjs (shared with Cloudflare Pages).
import { getStore } from "@netlify/blobs";
import { handleLicense } from "../../core/license.mjs";

export default async (req) => handleLicense(req, process.env, getStore({ name: "licenses", consistency: "strong" }));

export const config = { path: "/api/license" };

// Builds/refreshes .sandbox/ : a copy of the site + functions with the SANDBOX wrangler config in place.
// (Cloudflare Pages doesn't allow a custom config path, so the sandbox project is run from its own folder.)
// Only the code copies are refreshed. .sandbox/.wrangler (the local database state) is never touched.
// usage: node tools/sandbox-dir.mjs        then run wrangler with cwd = .sandbox
import fs from "node:fs";
import path from "node:path";

const root = process.cwd(), out = path.join(root, ".sandbox");
fs.mkdirSync(out, { recursive: true });
for (const d of ["functions", "core", "hypecut-site", "migrations"]) {
  fs.rmSync(path.join(out, d), { recursive: true, force: true }); // a stale COPY of source code, not data
  fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
}
fs.copyFileSync(path.join(root, "wrangler.sandbox.toml"), path.join(out, "wrangler.toml"));
fs.copyFileSync(path.join(root, "package.json"), path.join(out, "package.json"));
const nm = path.join(out, "node_modules");
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(root, "node_modules"), nm, "junction"); // share, don't copy
console.log("refreshed .sandbox/ (local database state left as is)");

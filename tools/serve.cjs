// Local preview server: node tools/serve.cjs <dir> <port>  (serves /try from try.html like Netlify)
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(process.argv[2] || "."), port = +process.argv[3] || 5178;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".mp4": "video/mp4", ".webm": "video/webm", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  const tryHtml = !path.extname(f) && fs.existsSync(f + ".html");
  fs.readFile(tryHtml ? f + ".html" : f, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    if (tryHtml) { res.writeHead(200, { "Content-Type": types[".html"] }); return res.end(data); }
    res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, "127.0.0.1", () => console.log("Serving " + root + " on http://localhost:" + port));

import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import handler from "../lib/handler.js";
try {
  process.loadEnvFile(".env");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const allowed = new Set(["index.html", "style.css", "app.js", "runtime.js"]);
const root = resolve(".");
const server = http.createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) return handler(req, res);
  const path =
    new URL(req.url, "http://localhost").pathname.slice(1) || "index.html";
  if (!allowed.has(path) || !resolve(path).startsWith(root + sep)) {
    res.writeHead(404);
    return res.end("Not found");
  }
  try {
    const data = await readFile(path);
    res.writeHead(200, {
      "Content-Type": {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css",
        ".js": "text/javascript",
      }[extname(path)],
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
  console.log(`DISK MSN GAS: porta ${process.env.PORT || 3001}`),
);

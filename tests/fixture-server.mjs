// Local-only simulated Supabase and Meta. Never used by the deployed API.
import http from "node:http";
import { readFile } from "node:fs/promises";
import handler from "../api/[...route].js";
import { initialState, receiveMessage } from "../lib/model.js";
export async function startFixture() {
  let row = null;
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = "https://browser-test.supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-key";
  process.env.AUTHORIZED_EMAILS = "agent@example.test";
  process.env.WA_PHONE_ID_1 = "111";
  process.env.WA_ACCESS_TOKEN_1 = "fixture-token";
  process.env.WA_APP_SECRET = "fixture-app-secret";
  process.env.WA_VERIFY_TOKEN = "fixture-verify";
  const response = (data, status = 200) =>
    new Response(data === null ? null : JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).startsWith(process.env.SUPABASE_URL + "/auth/")) {
      if (String(url).includes("/token")) {
        const b = JSON.parse(options.body);
        if (
          b.password === "correct-test-password" ||
          b.refresh_token === "fixture-refresh"
        )
          return response({
            access_token: "fixture-access",
            refresh_token: "fixture-refresh",
            expires_in: 3600,
            user: { email: "agent@example.test" },
          });
        return response({}, 401);
      }
      if (options.headers.Authorization === "Bearer fixture-access")
        return response({ email: "agent@example.test" });
      return response({}, 401);
    }
    if (String(url).startsWith(process.env.SUPABASE_URL + "/rest/")) {
      if (options.method === "POST") {
        if (!row) row = JSON.parse(options.body);
        return response(null, 201);
      }
      if (options.method === "PATCH") {
        const version = Number(
          new URL(url).searchParams.get("version").slice(3),
        );
        if (row.version !== version) return response([]);
        row = { ...row, ...JSON.parse(options.body) };
        return response([row]);
      }
      return response(row ? [row] : []);
    }
    if (String(url).startsWith("https://graph.facebook.com/"))
      return response(
        options.method === "POST"
          ? { messages: [{ id: "fixture-out-" + Date.now() }] }
          : { display_phone_number: "+55 85 99999-9999" },
      );
    return originalFetch(url, options);
  };
  const staticFiles = {
    "/": "index.html",
    "/index.html": "index.html",
    "/app.js": "app.js",
    "/runtime.js": "runtime.js",
    "/style.css": "style.css",
  };
  const server = http.createServer(async (req, res) => {
    if (req.url === "/test/incoming" && req.method === "POST") {
      receiveMessage(
        row.data,
        "1",
        {
          id: "fixture-in-" + Date.now(),
          from: "5585999999999",
          timestamp: String(Math.floor(Date.now() / 1000)),
          type: "text",
          text: { body: "Mensagem recebida no teste" },
        },
        "Maria",
      );
      row.version++;
      res.end("ok");
      return;
    }
    if (req.url === "/test/concurrent" && req.method === "POST") {
      row.data.tags.push("Outro atendente");
      row.version++;
      res.end("ok");
      return;
    }
    if (req.url.startsWith("/api/")) return handler(req, res);
    const path = staticFiles[new URL(req.url, "http://localhost").pathname];
    if (!path) {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader(
      "Content-Type",
      path.endsWith(".js")
        ? "text/javascript"
        : path.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.end(await readFile(new URL("../" + path, import.meta.url)));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    base: "http://127.0.0.1:" + server.address().port,
    getRow: () => row,
    close: async () => {
      globalThis.fetch = originalFetch;
      await new Promise((r) => server.close(r));
    },
  };
}

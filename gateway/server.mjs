import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Storage } from "./storage.mjs";
import { SessionManager } from "./sessions.mjs";
export function createServer({ manager, store, token, appBaseUrl }) {
  const app = new URL(appBaseUrl);
  if (
    app.protocol !== "https:" &&
    app.hostname !== "127.0.0.1" &&
    app.hostname !== "localhost"
  )
    throw Error("APP_BASE_URL must use HTTPS");
  if (token.length < 32)
    throw Error("WA_GATEWAY_TOKEN must have at least 32 characters");
  let draining = false;
  async function deliverEvents() {
    if (draining) return;
    draining = true;
    try {
      for (const event of store.pending()) {
        const timestamp = Date.now(),
          raw = Buffer.from(event.body),
          signature =
            "sha256=" +
            createHmac("sha256", token)
              .update(Buffer.concat([Buffer.from(`${timestamp}.`), raw]))
              .digest("hex");
        try {
          const response = await fetch(`${app.origin}/api/qr-webhook`, {
            method: "POST",
            signal: AbortSignal.timeout(12000),
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timestamp,
              payload: raw.toString("base64"),
              signature,
            }),
          });
          if (response.ok) store.delivered(event.id);
          else store.postpone(event);
        } catch {
          store.postpone(event);
        }
      }
    } finally {
      draining = false;
    }
  }
  const server = http.createServer(async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, "http://localhost");
      if (req.method === "GET" && url.pathname === "/health")
        return json(200, { ok: true });
      const actual = Buffer.from(req.headers.authorization || ""),
        expected = Buffer.from(`Bearer ${token}`);
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        return json(401, { error: "Acesso não autorizado." });
      const match =
        /^\/sessions\/(1|2)(?:\/(connect|disconnect|messages))?$/.exec(
          url.pathname,
        );
      if (!match) return json(404, { error: "Rota não encontrada." });
      const [, id, action] = match;
      if (req.method === "GET" && !action) return json(200, manager.get(id));
      if (req.method !== "POST")
        return json(405, { error: "Método não permitido." });
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 15000)
          return json(413, { error: "Requisição muito grande." });
        chunks.push(chunk);
      }
      let input;
      try {
        input = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        return json(400, { error: "JSON inválido." });
      }
      if (action === "connect") return json(200, await manager.start(id));
      if (action === "disconnect")
        return json(200, await manager.disconnect(id));
      if (action === "messages") {
        if (
          !/^[a-zA-Z0-9-]{16,80}$/.test(input.key || "") ||
          !/^[1-9]\d{7,14}$/.test(input.to || "") ||
          typeof input.text !== "string" ||
          !input.text.trim() ||
          input.text.length > 4096
        )
          return json(400, {
            error: "Mensagem inválida.",
            deliveryStatus: "failed",
          });
        return json(200, await manager.send(id, input));
      }
      return json(404, { error: "Rota não encontrada." });
    } catch (error) {
      json(error.status || 500, {
        error: error.status ? error.message : "Falha no servidor QR.",
        deliveryStatus: error.deliveryStatus || "uncertain",
      });
    }
  });
  return { server, deliverEvents };
}
if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    process.loadEnvFile(".env");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const token = process.env.WA_GATEWAY_TOKEN || "",
    appBaseUrl = process.env.APP_BASE_URL || "";
  if (token.length < 32 || !appBaseUrl)
    throw Error("Configure WA_GATEWAY_TOKEN e APP_BASE_URL antes de iniciar.");
  const [{ default: wweb }, { default: QRCode }] = await Promise.all([
    import("whatsapp-web.js"),
    import("qrcode"),
  ]);
  const dir = process.env.DATA_DIR || "./data";
  const store = new Storage(dir);
  const manager = new SessionManager({
    store,
    dataDir: dir,
    makeQr: (raw) => QRCode.toDataURL(raw, { width: 320, margin: 2 }),
    createClient: (id, dataDir) =>
      new wweb.Client({
        authStrategy: new wweb.LocalAuth({
          clientId: `account-${id}`,
          dataPath: `${dataDir}/auth`,
        }),
        puppeteer: {
          headless: true,
          executablePath: process.env.CHROME_BIN || "/usr/bin/chromium",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ],
        },
      }),
  });
  const { server, deliverEvents } = createServer({
    manager,
    store,
    token,
    appBaseUrl,
  });
  server.listen(Number(process.env.PORT || 3002), "0.0.0.0", () =>
    console.log(
      "Gateway QR iniciado. Sessões e credenciais não são registradas no console.",
    ),
  );
  for (const id of store.restore()) await manager.start(id);
  const timer = setInterval(() => deliverEvents().catch(() => {}), 2000);
  timer.unref();
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, async () => {
      clearInterval(timer);
      server.close();
      await manager.stop();
      store.close();
      process.exit(0);
    });
}

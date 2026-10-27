import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { startFixture } from "./fixture-server.mjs";
import { Storage } from "../gateway/storage.mjs";
import { SessionManager } from "../gateway/sessions.mjs";
import { createServer } from "../gateway/server.mjs";
const require = createRequire(import.meta.url),
  gatewayRequire = createRequire(
    new URL("../gateway/package.json", import.meta.url),
  );
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const QRCode = gatewayRequire("qrcode");
const dir = await mkdtemp(join(tmpdir(), "msn-browser-qr-"));
const fixture = await startFixture();
const store = new Storage(dir);
const clients = {};
const token = "fixture-shared-secret-token-32-characters";
class Client extends EventEmitter {
  constructor(id) {
    super();
    this.info = { wid: { user: "558599999999" + id } };
  }
  async initialize() {
    this.emit("qr", "fixture-qr-" + this.info.wid.user);
  }
  async logout() {
    this.emit("disconnected", "LOGOUT");
  }
  async destroy() {}
  async getNumberId(to) {
    return { _serialized: to + "@c.us" };
  }
  async sendMessage() {
    return { id: { _serialized: "out-" + Date.now() } };
  }
}
const manager = new SessionManager({
  store,
  dataDir: dir,
  makeQr: (raw) => QRCode.toDataURL(raw),
  createClient: (id) => (clients[id] = new Client(id)),
});
const { server, deliverEvents } = createServer({
  manager,
  store,
  token,
  appBaseUrl: fixture.base,
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
process.env.WA_PROVIDER = "qr";
process.env.WA_GATEWAY_URL = "http://127.0.0.1:" + server.address().port;
process.env.WA_GATEWAY_TOKEN = token;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(fixture.base + "/#contas");
  await page.locator("#login-form").waitFor();
  await page.locator("[name=email]").fill("agent@example.test");
  await page.locator("[name=password]").fill("correct-test-password");
  await page.locator("#login-form button").click();
  await page.locator('[data-connect-qr="1"]').click();
  await page.locator("#qr-image img").waitFor();
  assert.match(
    await page.locator("#qr-image img").getAttribute("src"),
    /^data:image\/png;base64,/,
  );
  clients["1"].emit("ready");
  await new Promise((r) => setImmediate(r));
  await deliverEvents();
  await page
    .locator("#qr-status")
    .filter({ hasText: "WhatsApp conectado" })
    .waitFor({ timeout: 10000 });
  await page.locator("#close-modal").click();
  await page.locator('[data-connect-qr="2"]').click();
  await page.locator("#qr-image img").waitFor();
  clients["2"].emit("ready");
  await new Promise((r) => setImmediate(r));
  await deliverEvents();
  await page
    .locator("#qr-number")
    .filter({ hasText: "5585999999992" })
    .waitFor({ timeout: 10000 });
  await page.locator("#close-modal").click();
  assert.equal(
    fixture.getRow().data.accounts.filter((a) => a.sessionStatus === "ready")
      .length,
    2,
  );
  clients["1"].emit("message", {
    fromMe: false,
    from: "5585888888888@c.us",
    body: "Gostaria de gás",
    type: "chat",
    id: { _serialized: "fixture-in" },
    timestamp: Math.floor(Date.now() / 1000),
    getContact: async () => ({ pushname: "Cliente QR" }),
  });
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  await deliverEvents();
  await page.locator('nav a[href="#atendimento"]').click();
  await page.evaluate(() => window.Platform.refresh());
  await page.locator(".contact").filter({ hasText: "Cliente QR" }).click();
  await page.getByText("Gostaria de gás", { exact: true }).waitFor();
  await page.locator("#message").fill("Vamos atender seu pedido.");
  await page.locator("#send-form button").click();
  await page
    .locator(".message")
    .filter({ hasText: "Vamos atender seu pedido." })
    .waitFor();
  await page.locator('nav a[href="#contas"]').click();
  await page.locator('[data-connect-qr="1"]').click();
  await page.locator("#qr-status").filter({ hasText: "conectado" }).waitFor();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#qr-disconnect").click();
  await page
    .locator("#qr-status")
    .filter({ hasText: "desconectada" })
    .waitFor();
  assert.equal(manager.get("2").status, "ready");
  await page.locator("#close-modal").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-connect-qr="2"]').click();
  await page
    .locator("#qr-number")
    .filter({ hasText: "5585999999992" })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: navegador → API autenticada → gateway HTTP → duas sessões simuladas; QR PNG, conexão, recebimento, automação, resposta, desconexão isolada e mobile.",
  );
} finally {
  await browser.close();
  await manager.stop();
  await new Promise((r) => server.close(r));
  store.close();
  await fixture.close();
  await rm(dir, { recursive: true, force: true });
}

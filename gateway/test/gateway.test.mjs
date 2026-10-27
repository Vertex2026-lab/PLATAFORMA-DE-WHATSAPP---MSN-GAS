import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import { createHmac } from "node:crypto";
import QRCode from "qrcode";
import { Storage } from "../storage.mjs";
import { SessionManager } from "../sessions.mjs";
import { createServer } from "../server.mjs";
const tick = () => new Promise((r) => setImmediate(r));
class FakeClient extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.info = { wid: { user: "558599999999" + id } };
    this.sent = 0;
  }
  async initialize() {}
  async destroy() {
    this.destroyed = true;
  }
  async logout() {
    this.emit("disconnected", "LOGOUT");
  }
  async getNumberId(to) {
    return to === "5585000000000" ? null : { _serialized: to + "@c.us" };
  }
  async sendMessage(to, text) {
    this.sent++;
    this.emit("message_create", {
      fromMe: true,
      to,
      body: text,
      type: "chat",
      timestamp: Math.floor(Date.now() / 1000),
      id: { _serialized: "out-" + this.sent },
    });
    return { id: { _serialized: "out-" + this.sent } };
  }
}
test("duas sessões independentes, QR, recebimento, status e envio idempotente", async () => {
  const dir = await mkdtemp(join(tmpdir(), "msn-qr-test-"));
  const store = new Storage(dir);
  const clients = {};
  const manager = new SessionManager({
    store,
    dataDir: dir,
    makeQr: (raw) => QRCode.toDataURL(raw),
    createClient: (id) => (clients[id] = new FakeClient(id)),
  });
  try {
    await manager.start("1");
    await manager.start("2");
    clients["1"].emit("qr", "test-qr-account-1");
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(manager.get("1").status, "qr");
    assert.match(manager.get("1").qr, /^data:image\/png;base64,/);
    assert.equal(manager.get("2").status, "starting");
    clients["1"].emit("ready");
    clients["2"].emit("ready");
    await tick();
    assert.equal(manager.get("1").status, "ready");
    assert.notEqual(manager.get("1").number, manager.get("2").number);
    const input = {
      key: "test-send-idempotency-0001",
      to: "5585999999999",
      text: "Pedido recebido",
    };
    const a = await manager.send("1", input);
    const b = await manager.send("1", input);
    assert.equal(a.status, "sent");
    assert.equal(a.id, b.id);
    assert.equal(clients["1"].sent, 1);
    await tick();
    assert.equal(
      store.pending().filter((e) => JSON.parse(e.body).kind === "outgoing")
        .length,
      0,
    );
    const parallel = await Promise.all([
      manager.send("1", {
        ...input,
        key: "parallel-one-key-0001",
        text: "Primeira resposta",
      }),
      manager.send("1", {
        ...input,
        key: "parallel-two-key-0002",
        text: "Segunda resposta",
      }),
    ]);
    assert.ok(parallel.every((r) => r.status === "sent"));
    assert.equal(clients["1"].sent, 3);
    await assert.rejects(
      () => manager.send("1", { ...input, text: "Alterado" }),
      /outro envio/,
    );
    clients["1"].emit("message", {
      fromMe: false,
      from: "5585999999999@c.us",
      body: "Quero gás",
      type: "chat",
      timestamp: Math.floor(Date.now() / 1000),
      id: { _serialized: "in-1" },
      getContact: async () => ({ pushname: "Maria" }),
    });
    await tick();
    await tick();
    assert.ok(
      store
        .pending()
        .map((e) => JSON.parse(e.body))
        .some(
          (e) =>
            e.kind === "message" &&
            e.message.text.body === "Quero gás" &&
            e.account === "1",
        ),
    );
    clients["1"].emit(
      "message_ack",
      { fromMe: true, id: { _serialized: "out-1" } },
      3,
    );
    assert.ok(
      store
        .pending()
        .map((e) => JSON.parse(e.body))
        .some((e) => e.kind === "status" && e.status.status === "read"),
    );
    await manager.disconnect("1");
    assert.equal(manager.get("1").status, "disconnected");
    assert.equal(manager.get("2").status, "ready");
    assert.deepEqual(store.restore(), ["2"]);
    await assert.rejects(
      () => manager.send("1", { ...input, key: "new-send-disconnected-0001" }),
      /desconectado/,
    );
  } finally {
    await manager.stop();
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
test("reinício preserva eventos e marca envio interrompido como incerto", async () => {
  const dir = await mkdtemp(join(tmpdir(), "msn-persistence-"));
  let store = new Storage(dir);
  try {
    store.desired("2", true);
    store.enqueue({ id: "event-1", kind: "session", account: "2" });
    store.reserve({
      key: "unfinished",
      account: "2",
      to: "5585999999999",
      text: "Olá",
    });
    store.close();
    store = new Storage(dir);
    assert.equal(store.getSend("unfinished").status, "uncertain");
    assert.equal(store.eventCount(), 1);
    assert.deepEqual(store.restore(), ["2"]);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
test("HTTP exige token, valida conta, entrega webhook assinado e repete só eventos não confirmados", async () => {
  const dir = await mkdtemp(join(tmpdir(), "msn-http-"));
  const store = new Storage(dir);
  const token = "fixture-only-token-at-least-32-characters";
  let reject = true;
  const received = [];
  const app = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const envelope = JSON.parse(Buffer.concat(chunks));
    const raw = Buffer.from(envelope.payload, "base64");
    const expected =
      "sha256=" +
      createHmac("sha256", token)
        .update(Buffer.concat([Buffer.from(`${envelope.timestamp}.`), raw]))
        .digest("hex");
    assert.equal(envelope.signature, expected);
    received.push(JSON.parse(raw));
    res.writeHead(reject ? 503 : 200);
    res.end("{}");
  });
  await new Promise((r) => app.listen(0, "127.0.0.1", r));
  const manager = new SessionManager({
    store,
    dataDir: dir,
    makeQr: async () => "",
    createClient: (id) => new FakeClient(id),
  });
  const { server, deliverEvents } = createServer({
    manager,
    store,
    token,
    appBaseUrl: "http://127.0.0.1:" + app.address().port,
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    assert.equal((await fetch(base + "/sessions/1")).status, 401);
    assert.equal((await fetch(base + "/health")).status, 200);
    const headers = {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    };
    assert.equal((await fetch(base + "/sessions/3", { headers })).status, 404);
    assert.equal(
      (
        await fetch(base + "/sessions/1/connect", {
          method: "POST",
          headers,
          body: "{}",
        })
      ).status,
      200,
    );
    store.enqueue({
      id: "event-test",
      kind: "session",
      account: "1",
      status: "ready",
    });
    await deliverEvents();
    assert.equal(store.eventCount(), 1);
    reject = false;
    store.db.exec("UPDATE events SET next_at=0");
    await deliverEvents();
    assert.equal(store.eventCount(), 0);
    assert.equal(received.length, 2);
    assert.equal(received[0].id, received[1].id);
  } finally {
    await manager.stop();
    await new Promise((r) => server.close(r));
    await new Promise((r) => app.close(r));
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});

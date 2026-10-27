import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { startFixture } from "./fixture-server.mjs";
import { queueMessage, initialState, publicState } from "../lib/model.js";
test("QR mantém CRM e automações, não aplica janela Meta e valida eventos autenticados", async () => {
  const fixture = await startFixture();
  const fallback = globalThis.fetch;
  const originalProvider = process.env.WA_PROVIDER;
  process.env.WA_PROVIDER = "qr";
  process.env.WA_GATEWAY_URL = "https://qr.test";
  process.env.WA_GATEWAY_TOKEN = "fixture-only-qr-shared-token-32-characters";
  const calls = [];
  let sequence = 0;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).startsWith("https://qr.test/")) {
      assert.equal(
        options.headers.Authorization,
        "Bearer " + process.env.WA_GATEWAY_TOKEN,
      );
      calls.push({ url, options });
      return new Response(
        JSON.stringify(
          String(url).endsWith("/messages")
            ? { status: "sent", id: `qr:1:sent-${++sequence}` }
            : {
                account: "1",
                status: "qr",
                qr: "data:image/png;base64,aGVsbG8=",
                number: null,
              },
        ),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return fallback(url, options);
  };
  const base = fixture.base;
  const rawFetch = (url, options) => fallback(url, options);
  const originHeaders = { Origin: base, "Content-Type": "application/json" };
  try {
    assert.equal(
      (
        await rawFetch(base + "/api/accounts/qr", {
          method: "POST",
          headers: originHeaders,
          body: JSON.stringify({ account: "1", action: "connect" }),
        })
      ).status,
      401,
    );
    const login = await rawFetch(base + "/api/auth/login", {
      method: "POST",
      headers: originHeaders,
      body: JSON.stringify({
        email: "agent@example.test",
        password: "correct-test-password",
      }),
    });
    const cookie = login.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const headers = { ...originHeaders, Cookie: cookie };
    let row = await (await rawFetch(base + "/api/state", { headers })).json();
    const client = {
      id: 1001,
      name: "Teste QR",
      phone: "5585999999999",
      account: "1",
      tags: [],
      notes: "",
      address: "Rua A",
      done: false,
      unread: 0,
      messages: [],
    };
    row.data.clients.push(client);
    const saved = await rawFetch(base + "/api/state", {
      method: "PUT",
      headers,
      body: JSON.stringify(row),
    });
    assert.equal(saved.status, 200);
    const qr = await (
      await rawFetch(base + "/api/accounts/qr", {
        method: "POST",
        headers,
        body: JSON.stringify({ account: "1", action: "connect" }),
      })
    ).json();
    assert.equal(qr.session.status, "qr");
    assert.equal(qr.data.accounts[0].provider, "qr");
    assert.equal(
      JSON.stringify(qr).includes(process.env.WA_GATEWAY_TOKEN),
      false,
    );
    const sent = await rawFetch(base + "/api/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        clientId: 1001,
        text: "Atendimento pelo QR",
        key: "qr-test-send-key-0001",
      }),
    });
    const result = await sent.json();
    assert.equal(sent.status, 200);
    assert.equal(result.delivery.status, "sent");
    assert.equal(fixture.getRow().data.outbox.at(-1).provider, "qr");
    function envelope(event, at = Date.now()) {
      const bytes = Buffer.from(JSON.stringify(event));
      return {
        timestamp: at,
        payload: bytes.toString("base64"),
        signature:
          "sha256=" +
          createHmac("sha256", process.env.WA_GATEWAY_TOKEN)
            .update(Buffer.concat([Buffer.from(`${at}.`), bytes]))
            .digest("hex"),
      };
    }
    const incoming = {
      id: "qr-event-1",
      kind: "message",
      account: "1",
      name: "Teste QR",
      message: {
        id: "qr:1:incoming-1",
        from: "5585999999999",
        type: "text",
        text: { body: "Quero gás" },
        timestamp: String(Math.floor(Date.now() / 1000)),
      },
    };
    const hook = (event) =>
      rawFetch(base + "/api/qr-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    assert.equal(
      (await hook({ ...envelope(incoming), signature: "invalid" })).status,
      401,
    );
    assert.equal(
      (await hook(envelope(incoming, Date.now() - 400000))).status,
      401,
    );
    assert.equal((await hook(envelope(incoming))).status, 200);
    const count = fixture.getRow().data.clients[0].messages.length;
    const sendCount = calls.filter((c) =>
      String(c.url).endsWith("/messages"),
    ).length;
    assert.equal((await hook(envelope(incoming))).status, 200);
    assert.equal(fixture.getRow().data.clients[0].messages.length, count);
    assert.equal(
      calls.filter((c) => String(c.url).endsWith("/messages")).length,
      sendCount,
    );
    const status = {
      id: "qr-status-event",
      kind: "status",
      account: "1",
      status: { id: result.data.clients[0].messages[0][3].id, status: "read" },
    };
    assert.equal((await hook(envelope(status))).status, 200);
    assert.equal(
      fixture
        .getRow()
        .data.clients[0].messages.find((m) => m[3]?.id === status.status.id)[3]
        .status,
      "read",
    );
    const currentJob = fixture
      .getRow()
      .data.outbox.find((j) => j.key === "manual:qr-test-send-key-0001");
    const confirmation = {
      id: "qr-result-event",
      kind: "result",
      account: "1",
      key: currentJob.id,
      status: "sent",
      messageId: status.status.id,
    };
    assert.equal((await hook(envelope(confirmation))).status, 200);
    assert.equal(
      fixture
        .getRow()
        .data.clients[0].messages.find((m) => m[3]?.id === status.status.id)[3]
        .status,
      "read",
      "resultado tardio não regride uma leitura confirmada",
    );
    const outgoing = {
      id: "qr-phone-outgoing",
      kind: "outgoing",
      account: "1",
      message: {
        id: "qr:1:phone-outgoing",
        from: "5585999999999",
        type: "text",
        text: { body: "Resposta pelo celular" },
        timestamp: String(Math.floor(Date.now() / 1000)),
      },
    };
    assert.equal((await hook(envelope(outgoing))).status, 200);
    assert.ok(
      fixture
        .getRow()
        .data.clients[0].messages.some((m) => m[1] === "Resposta pelo celular"),
    );
    const state = publicState(fixture.getRow().data);
    assert.equal(state.gatewayEvents, undefined);
  } finally {
    globalThis.fetch = fallback;
    await fixture.close();
    if (originalProvider === undefined) delete process.env.WA_PROVIDER;
    else process.env.WA_PROVIDER = originalProvider;
    delete process.env.WA_GATEWAY_URL;
    delete process.env.WA_GATEWAY_TOKEN;
  }
});
test("fila oficial continua bloqueada fora de 24h; fila QR pode iniciar conversa", () => {
  const s = initialState(),
    c = { id: 1, phone: "5585999999999", account: "1", messages: [] };
  s.clients.push(c);
  assert.throws(
    () => queueMessage(s, c, "Olá", "meta-key", false, "meta"),
    /24 horas/,
  );
  assert.equal(queueMessage(s, c, "Olá", "qr-key", false, "qr").provider, "qr");
});

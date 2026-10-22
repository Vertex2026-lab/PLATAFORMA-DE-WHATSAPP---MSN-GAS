import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createHmac } from "node:crypto";
import handler from "../api/[...route].js";
let row = null,
  sends = 0,
  failMeta = false,
  rejectMeta = false;
const originalFetch = globalThis.fetch;
process.env.SUPABASE_URL = "https://supabase.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
process.env.AUTHORIZED_EMAILS = "agent@example.test";
process.env.WA_PHONE_ID_1 = "111";
process.env.WA_ACCESS_TOKEN_1 = "test-token";
process.env.WA_VERIFY_TOKEN = "test-verify";
process.env.WA_APP_SECRET = "test-app-secret";
function reply(body, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).startsWith("https://supabase.test/auth/")) {
    if (String(url).includes("/token")) {
      const b = JSON.parse(opts.body);
      if (
        b.password === "correct-test-password" ||
        b.refresh_token === "test-refresh"
      )
        return reply({
          access_token: "test-access",
          refresh_token: "test-refresh",
          expires_in: 3600,
          user: { email: "agent@example.test" },
        });
      return reply({}, 401);
    }
    if (opts.headers.Authorization === "Bearer test-access")
      return reply({ email: "agent@example.test" });
    return reply({}, 401);
  }
  if (String(url).startsWith("https://supabase.test/rest/")) {
    if (opts.method === "POST") {
      if (!row) {
        const r = JSON.parse(opts.body);
        row = { ...r };
      }
      return reply(null, 201);
    }
    if (opts.method === "PATCH") {
      const version = Number(new URL(url).searchParams.get("version").slice(3));
      if (row.version !== version) return reply([]);
      row = { ...row, ...JSON.parse(opts.body) };
      return reply([row]);
    }
    return reply(row ? [row] : []);
  }
  if (String(url).startsWith("https://graph.facebook.com/")) {
    sends++;
    if (failMeta) throw Error("timeout");
    if (rejectMeta) return reply({ error: { code: 190 } }, 400);
    return reply({ messages: [{ id: "wa-out-" + sends }] });
  }
  return originalFetch(url, opts);
};
const server = http.createServer(handler);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
let cookie = "";
async function request(path, body, extra = {}) {
  const response = await originalFetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { Origin: base, "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra.headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    ...extra,
  });
  return { response, data: await response.json().catch(() => null) };
}
test("API: autenticação, CSRF, CAS, webhook, fila e status incerto", async () => {
  assert.equal((await request("/api/state")).response.status, 401);
  assert.equal(
    (
      await request("/api/auth/login", {
        email: "agent@example.test",
        password: "wrong",
      })
    ).response.status,
    401,
  );
  const login = await request("/api/auth/login", {
    email: "agent@example.test",
    password: "correct-test-password",
  });
  assert.equal(login.response.status, 200);
  const cookies = login.response.headers.getSetCookie();
  assert.ok(
    cookies.every(
      (c) => c.includes("HttpOnly") && c.includes("SameSite=Strict"),
    ),
  );
  cookie = cookies.map((c) => c.split(";")[0]).join("; ");
  const first = await request("/api/state");
  assert.equal(first.response.status, 200);
  assert.equal(first.data.data.clients.length, 0);
  assert.equal(first.data.version, 0);
  assert.equal(
    (
      await request(
        "/api/state",
        { version: 0, data: first.data.data },
        {
          method: "PUT",
          headers: {
            Origin: "https://evil.test",
            "Content-Type": "application/json",
            Cookie: cookie,
          },
        },
      )
    ).response.status,
    403,
  );
  const updated = structuredClone(first.data.data);
  updated.business.name = "MSN Teste";
  const saved = await request(
    "/api/state",
    { version: 0, data: updated },
    {
      method: "PUT",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    },
  );
  assert.equal(saved.response.status, 200);
  assert.equal(
    (
      await request(
        "/api/state",
        { version: 0, data: updated },
        {
          method: "PUT",
          headers: {
            Origin: base,
            "Content-Type": "application/json",
            Cookie: cookie,
          },
        },
      )
    ).response.status,
    409,
  );
  const event = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "111" },
              contacts: [
                { wa_id: "5585999999999", profile: { name: "Maria" } },
              ],
              messages: [
                {
                  id: "wa-in-1",
                  from: "5585999999999",
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: "Quero um gás" },
                },
              ],
            },
          },
        ],
      },
    ],
  };
  const raw = JSON.stringify(event);
  const signature =
    "sha256=" +
    createHmac("sha256", process.env.WA_APP_SECRET).update(raw).digest("hex");
  assert.equal(
    (
      await originalFetch(base + "/api/webhook", {
        method: "POST",
        body: raw,
        headers: { "x-hub-signature-256": "invalid" },
      })
    ).status,
    401,
  );
  const sendEvent = () =>
    originalFetch(base + "/api/webhook", {
      method: "POST",
      body: raw,
      headers: { "x-hub-signature-256": signature },
    });
  assert.equal((await sendEvent()).status, 200);
  const count = row.data.clients[0].messages.length;
  assert.equal((await sendEvent()).status, 200);
  assert.equal(row.data.clients[0].messages.length, count);
  const clientId = row.data.clients[0].id;
  const before = sends;
  const message = {
    clientId,
    text: "Pedido recebido",
    key: "test-idempotency-0001",
  };
  const a = await request("/api/messages", message);
  assert.equal(a.data.delivery.status, "sent");
  const b = await request("/api/messages", message);
  assert.equal(b.data.delivery.status, "sent");
  assert.equal(sends, before + 1);
  failMeta = true;
  const uncertain = await request("/api/messages", {
    ...message,
    key: "test-idempotency-0002",
  });
  assert.equal(uncertain.data.delivery.status, "uncertain");
  const after = sends;
  await request("/api/worker", {});
  assert.equal(sends, after, "não reenviar mensagens com resultado incerto");
  const uncertainJob = row.data.outbox.find(
    (j) => j.key === "manual:test-idempotency-0002",
  );
  assert.equal(
    (await request("/api/messages/retry", { id: uncertainJob.id })).response
      .status,
    409,
  );
  failMeta = false;
  rejectMeta = true;
  const refused = await request("/api/messages", {
    ...message,
    key: "test-idempotency-0003",
  });
  assert.equal(refused.data.delivery.status, "failed");
  const refusedJob = row.data.outbox.find(
    (j) => j.key === "manual:test-idempotency-0003",
  );
  rejectMeta = false;
  const retried = await request("/api/messages/retry", { id: refusedJob.id });
  assert.equal(retried.response.status, 200);
  assert.equal(
    row.data.outbox.find((j) => j.id === refusedJob.id).status,
    "sent",
  );
  const invalid = await originalFetch(
    base +
      "/api/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123",
  );
  assert.equal(invalid.status, 403);
  const verify = await originalFetch(
    base +
      "/api/webhook?hub.mode=subscribe&hub.verify_token=test-verify&hub.challenge=123",
  );
  assert.equal(await verify.text(), "123");
});
test.after(async () => {
  globalThis.fetch = originalFetch;
  await new Promise((r) => server.close(r));
});

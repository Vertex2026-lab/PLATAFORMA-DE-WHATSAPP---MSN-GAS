import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import handler, { rawBody } from "../lib/handler.js";
function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(value) {
      this.body = value;
    },
  };
}
test("rota reescrita da Vercel preserva endpoint e parâmetros de verificação", async () => {
  const original = process.env.WA_VERIFY_TOKEN;
  process.env.WA_VERIFY_TOKEN = "adapter-test";
  try {
    const req = {
      url: "/api/index?endpoint=webhook&hub.mode=subscribe&hub.verify_token=adapter-test&hub.challenge=123",
      method: "GET",
      headers: {},
    };
    const res = response();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, "123");
  } finally {
    if (original === undefined) delete process.env.WA_VERIFY_TOKEN;
    else process.env.WA_VERIFY_TOKEN = original;
  }
});
test("formulário já interpretado pela Vercel não depende de um stream consumido", async () => {
  const req = Readable.from([]);
  req.body = { email: "agent@example.test", password: "test-only-password" };
  const raw = await rawBody(req);
  assert.deepEqual(JSON.parse(raw.toString()), req.body);
});
test("buffer e string preservam bytes originais de webhook", async () => {
  const payload = '{ "body": "gás" }';
  for (const body of [Buffer.from(payload), payload]) {
    const req = Readable.from([]);
    req.body = body;
    assert.equal((await rawBody(req, true)).toString(), payload);
  }
});
test("webhook com objeto interpretado não contorna a exigência da assinatura dos bytes originais", async () => {
  const req = Readable.from([]);
  req.body = { body: "gás" };
  await assert.rejects(
    () => rawBody(req, true),
    (e) => e.code === "RAW_BODY_REQUIRED",
  );
});

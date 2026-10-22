import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  initialState,
  applySync,
  isOpen,
  receiveMessage,
  queueMessage,
  receiveStatus,
  publicState,
} from "../lib/model.js";
import { verifySignature } from "../lib/whatsapp.js";
import { sameOrigin } from "../lib/auth.js";
const inbound = (id = "wamid.1", timestamp = Date.now()) => ({
  id,
  from: "5585999999999",
  type: "text",
  text: { body: "Quero gás" },
  timestamp: String(Math.floor(timestamp / 1000)),
});
function stateWithClient() {
  const state = initialState();
  receiveMessage(state, "1", inbound(), "Maria");
  return state;
}
test("horário de Fortaleza, dias e fechamento são avaliados corretamente", () => {
  const b = initialState().business;
  assert.equal(isOpen(b, new Date("2026-10-22T11:00:00Z")), true);
  assert.equal(isOpen(b, new Date("2026-10-22T21:00:00Z")), false);
  assert.equal(isOpen(b, new Date("2026-10-25T15:00:00Z")), false);
});
test("webhook idempotente, mesmo telefone em duas contas fica separado", () => {
  const s = stateWithClient();
  const count = s.clients[0].messages.length;
  receiveMessage(s, "1", inbound(), "Maria");
  assert.equal(s.clients[0].messages.length, count);
  receiveMessage(s, "2", inbound("wamid.2"), "Maria");
  assert.equal(s.clients.length, 2);
  assert.notEqual(s.clients[0].id, s.clients[1].id);
});
test("sincronização de CRM ignora mensagens forjadas e conserva histórico do servidor", () => {
  const s = stateWithClient(),
    input = structuredClone(publicState(s));
  input.clients[0].messages.push(["out", "forjada"]);
  input.clients[0].notes = "Entregar na portaria";
  input.clients[0].done = true;
  const result = applySync(s, input);
  assert.equal(result.clients[0].messages.length, s.clients[0].messages.length);
  assert.equal(result.clients[0].notes, "Entregar na portaria");
  assert.equal(result.clients[0].done, true);
  assert.equal(s.clients[0].notes, "");
});
test("valida dados, duplicidades e impede exclusão de clientes", () => {
  const s = stateWithClient();
  const input = structuredClone(publicState(s));
  input.clients[0].phone = "123";
  assert.throws(() => applySync(s, input), /WhatsApp|números/);
  const dup = structuredClone(publicState(s));
  dup.clients.push(structuredClone(dup.clients[0]));
  assert.throws(() => applySync(s, dup), /duplicado/);
  const removed = structuredClone(publicState(s));
  removed.clients = [];
  assert.throws(() => applySync(s, removed), /Excluir/);
  const bad = structuredClone(publicState(s));
  bad.business.start = "20:00";
  bad.business.end = "08:00";
  assert.throws(() => applySync(s, bad), /expediente/);
});
test("boas-vindas e ausência: prioridade, uma ausência por dia e sem duplicação", () => {
  const s = initialState();
  s.business.days = [0, 1, 2, 3, 4, 5, 6];
  s.business.start = "00:00";
  s.business.end = "23:59";
  receiveMessage(s, "1", inbound("first"), "Maria");
  assert.equal(s.outbox.length, 1);
  assert.equal(s.outbox[0].text, s.rules[0].text);
  receiveMessage(s, "1", inbound("second"), "Maria");
  assert.equal(s.outbox.length, 1);
  s.business.days = [];
  receiveMessage(s, "1", inbound("third"), "Maria");
  receiveMessage(s, "1", inbound("fourth"), "Maria");
  assert.equal(s.outbox.length, 2);
  assert.equal(s.outbox[1].text, s.rules[1].text);
});
test("envio respeita janela de 24h e chave idempotente", () => {
  const s = initialState();
  receiveMessage(s, "1", inbound("old", Date.now() - 25 * 3600000), "Maria");
  const c = s.clients[0];
  assert.equal(s.outbox.length, 0);
  assert.throws(() => queueMessage(s, c, "Olá", "old"), /24 horas/);
  receiveMessage(s, "1", inbound("recent"), "Maria");
  const before = s.outbox.length;
  const a = queueMessage(s, c, "Pedido recebido", "unique");
  const b = queueMessage(s, c, "Pedido recebido", "unique");
  assert.equal(a.id, b.id);
  assert.equal(s.outbox.length, before + 1);
  assert.throws(
    () => queueMessage(s, c, "Outro texto", "unique"),
    /outra mensagem/,
  );
});
test("confirmação de pedido enfileirada uma única vez e modelo original não é mutado", () => {
  const s = stateWithClient();
  s.rules[2].enabled = true;
  const c = s.clients[0];
  s.orders = [
    {
      id: 100,
      clientId: c.id,
      product: "Botijão de gás · 13 kg",
      quantity: 1,
      price: "120.00",
      address: "Rua A",
      payment: "Pix",
      status: "Novo pedido",
    },
  ];
  const input = publicState(s);
  input.orders[0].status = "Preparando";
  const oldCount = c.messages.length;
  const next = applySync(s, input);
  assert.equal(c.messages.length, oldCount);
  assert.equal(next.outbox.filter((j) => j.key === "order:100").length, 1);
  const again = publicState(next);
  again.orders[0].status = "Novo pedido";
  const back = applySync(next, again);
  const onceMore = publicState(back);
  onceMore.orders[0].status = "Preparando";
  const final = applySync(back, onceMore);
  assert.equal(final.outbox.filter((j) => j.key === "order:100").length, 1);
});
test("status de entrega não regride, eventos precoces são preservados", () => {
  const s = stateWithClient();
  const c = s.clients[0],
    j = queueMessage(s, c, "Olá", "delivery");
  const m = c.messages.find((m) => m[3]?.jobId === j.id);
  m[3].id = "wa-out";
  m[3].status = "sent";
  receiveStatus(s, { id: "wa-out", status: "read" });
  receiveStatus(s, { id: "wa-out", status: "delivered" });
  assert.equal(m[3].status, "read");
  receiveStatus(s, { id: "early", status: "delivered" });
  assert.equal(s.deliveryEvents[0].id, "early");
  assert.equal(publicState(s).deliveryEvents, undefined);
});
test("assinatura é feita sobre os bytes originais e rejeita alterações", () => {
  const raw = Buffer.from('{"hello":"gás"}'),
    secret = "test-only-secret";
  const sig =
    "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  assert.equal(verifySignature(raw, sig, secret), true);
  assert.equal(verifySignature(Buffer.from("{}"), sig, secret), false);
  assert.equal(verifySignature(raw, sig, ""), false);
});
test("CSRF rejeita origem externa, origem ausente e tipo inesperado", () => {
  const good = {
    headers: {
      host: "example.com",
      origin: "https://example.com",
      "content-type": "application/json",
    },
  };
  assert.doesNotThrow(() => sameOrigin(good));
  assert.throws(() =>
    sameOrigin({ headers: { ...good.headers, origin: "https://evil.test" } }),
  );
  assert.throws(() => sameOrigin({ headers: { host: "example.com" } }));
  assert.throws(() =>
    sameOrigin({ headers: { ...good.headers, "content-type": "text/plain" } }),
  );
});

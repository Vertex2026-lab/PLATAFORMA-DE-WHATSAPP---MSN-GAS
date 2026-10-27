import { randomUUID } from "node:crypto";
export class SessionManager {
  constructor({ store, createClient, makeQr, dataDir }) {
    this.store = store;
    this.createClient = createClient;
    this.makeQr = makeQr;
    this.dataDir = dataDir;
    this.sessions = new Map();
    this.activeSend = new Map();
    this.sendChains = new Map();
    this.stopping = false;
  }
  get(id) {
    const s = this.sessions.get(id);
    return {
      account: id,
      status: s?.status || "disconnected",
      number: s?.number || null,
      qr: s?.status === "qr" ? s.qr : null,
      error: s?.error || null,
    };
  }
  event(data) {
    this.store.enqueue({
      ...data,
      id: data.id || randomUUID(),
      at: Date.now(),
    });
  }
  state(id, status, error = null) {
    const s = this.sessions.get(id);
    s.status = status;
    s.error = error;
    if (status !== "qr") s.qr = null;
    this.event({ account: id, kind: "session", status, number: s.number });
  }
  async start(id) {
    const existing = this.sessions.get(id);
    if (
      existing &&
      ["starting", "qr", "authenticated", "ready"].includes(existing.status)
    )
      return this.get(id);
    if (existing?.client) {
      try {
        await existing.client.destroy();
      } catch {}
    }
    const client = this.createClient(id, this.dataDir);
    const s = {
      client,
      status: "starting",
      qr: null,
      number: null,
      error: null,
    };
    this.sessions.set(id, s);
    this.store.desired(id, true);
    const guarded =
      (callback) =>
      (...args) =>
        Promise.resolve()
          .then(() =>
            this.sessions.get(id) === s ? callback(...args) : undefined,
          )
          .catch(() => {
            s.error = "Não foi possível processar um evento da sessão.";
          });
    client.on(
      "qr",
      guarded(async (raw) => {
        const qr = await this.makeQr(raw);
        if (this.sessions.get(id) !== s) return;
        s.qr = qr;
        this.state(id, "qr");
      }),
    );
    client.on("authenticated", () => {
      if (this.sessions.get(id) === s) this.state(id, "authenticated");
    });
    client.on(
      "ready",
      guarded(async () => {
        const number = String(client.info?.wid?.user || "");
        if (!/^[1-9]\d{7,14}$/.test(number)) {
          this.state(
            id,
            "error",
            "Não foi possível identificar o número conectado.",
          );
          return;
        }
        const duplicate = [...this.sessions.entries()].some(
          ([other, x]) =>
            other !== id && x.status === "ready" && x.number === number,
        );
        if (duplicate) {
          try {
            await client.logout();
          } catch {}
          this.store.desired(id, false);
          this.state(
            id,
            "error",
            "Este número já está conectado na outra conta.",
          );
          return;
        }
        s.number = number;
        this.state(id, "ready");
      }),
    );
    client.on("auth_failure", () => {
      if (this.sessions.get(id) !== s) return;
      this.store.desired(id, false);
      this.state(
        id,
        "error",
        "Autenticação expirada. Desconecte a sessão e gere outro QR.",
      );
    });
    client.on("disconnected", (reason) => {
      if (this.sessions.get(id) !== s) return;
      this.state(id, "disconnected", "Conexão encerrada.");
      if (String(reason) === "LOGOUT") this.store.desired(id, false);
      else if (!this.stopping) {
        setTimeout(() => {
          if (
            this.store.restore().includes(id) &&
            this.get(id).status === "disconnected"
          )
            this.start(id).catch(() => {});
        }, 10000).unref();
      }
    });
    client.on(
      "message",
      guarded((msg) => this.message(id, msg, false)),
    );
    client.on(
      "message_create",
      guarded((msg) => (msg.fromMe ? this.message(id, msg, true) : null)),
    );
    client.on("message_ack", (msg, ack) => {
      if (!msg.fromMe || !msg.id?._serialized) return;
      const status = {
        "-1": "failed",
        1: "sent",
        2: "delivered",
        3: "read",
        4: "read",
      }[String(ack)];
      if (status)
        this.event({
          account: id,
          kind: "status",
          status: { id: `qr:${id}:${msg.id._serialized}`, status },
        });
    });
    client.initialize().catch(async () => {
      if (this.sessions.get(id) !== s) return;
      this.state(
        id,
        "error",
        "Não foi possível iniciar o navegador WhatsApp. Tente conectar novamente.",
      );
      try {
        await client.destroy();
      } catch {}
    });
    return this.get(id);
  }
  async message(id, msg, outgoing) {
    if (
      !msg.id?._serialized ||
      msg.fromMe !== outgoing ||
      msg.isStatus ||
      [
        "revoked",
        "e2e_notification",
        "notification_template",
        "gp2",
        "protocol",
        "call_log",
        "reaction",
      ].includes(msg.type)
    )
      return;
    const peer = outgoing ? msg.to : msg.from;
    if (!peer || peer.endsWith("@g.us") || peer.endsWith("@broadcast")) return;
    const activeAtEvent = this.activeSend.get(id);
    let contact;
    try {
      contact = outgoing
        ? await this.sessions.get(id).client.getContactById(peer)
        : await msg.getContact();
    } catch {}
    let phone = peer.endsWith("@c.us")
      ? peer.split("@")[0]
      : String(contact?.number || "");
    if (!/^[1-9]\d{7,14}$/.test(phone) && peer.endsWith("@lid")) {
      try {
        const records = await this.sessions
          .get(id)
          .client.getContactLidAndPhone([peer]);
        phone = String(records?.[0]?.pn || "").replace(/@c\.us$/, "");
      } catch {}
    }
    if (!/^[1-9]\d{7,14}$/.test(phone)) return;
    const active = activeAtEvent;
    if (outgoing && active && active.to === phone && active.text === msg.body)
      return;
    const type =
      msg.type === "chat"
        ? "text"
        : { ptt: "audio", vcard: "document" }[msg.type] || msg.type;
    const body = typeof msg.body === "string" ? msg.body : "";
    const message = {
      id: `qr:${id}:${msg.id._serialized}`,
      from: phone,
      timestamp: String(msg.timestamp),
      type,
      text: {
        body: type === "text" ? body : `[${type} — consulte no celular]`,
      },
    };
    this.event({
      id: `message:${id}:${msg.id._serialized}`,
      account: id,
      kind: outgoing ? "outgoing" : "message",
      name: contact?.pushname || contact?.name || phone,
      message,
    });
  }
  async send(id, input) {
    const before = this.sendChains.get(id) || Promise.resolve();
    const result = before.catch(() => {}).then(() => this.sendOnce(id, input));
    const finished = result.then(
      () => {},
      () => {},
    );
    this.sendChains.set(id, finished);
    try {
      return await result;
    } finally {
      if (this.sendChains.get(id) === finished) this.sendChains.delete(id);
    }
  }
  async sendOnce(id, input) {
    const previous = this.store.getSend(input.key);
    if (previous) {
      if (
        previous.account !== id ||
        previous.recipient !== input.to ||
        previous.body !== input.text
      )
        throw Object.assign(Error("Identificador já usado por outro envio."), {
          status: 409,
          deliveryStatus: "failed",
        });
      return this.result(previous);
    }
    const s = this.sessions.get(id);
    if (s?.status !== "ready")
      throw Object.assign(
        Error("WhatsApp desconectado. Gere ou escaneie o QR da conta."),
        { status: 409, deliveryStatus: "failed" },
      );
    if (this.activeSend.has(id))
      throw Object.assign(Error("Outro envio está em andamento nesta conta."), {
        status: 429,
        deliveryStatus: "failed",
      });
    this.store.reserve({ ...input, account: id });
    this.activeSend.set(id, input);
    try {
      const numberId = await s.client.getNumberId(input.to);
      if (!numberId) {
        this.store.finish(
          input.key,
          "failed",
          null,
          "O número do destinatário não foi encontrado no WhatsApp.",
        );
        const failed = this.store.getSend(input.key);
        this.event({
          id: `result:${input.key}`,
          kind: "result",
          account: id,
          key: input.key,
          status: "failed",
          error: failed.error,
        });
        return this.result(failed);
      }
      const message = await s.client.sendMessage(
        numberId._serialized,
        input.text,
        { sendSeen: false },
      );
      if (!message?.id?._serialized) throw Error("no message id");
      this.store.finish(
        input.key,
        "sent",
        `qr:${id}:${message.id._serialized}`,
      );
    } catch {
      this.store.finish(
        input.key,
        "uncertain",
        null,
        "Não foi possível confirmar o envio. Confira no celular antes de reenviar.",
      );
    } finally {
      this.activeSend.delete(id);
    }
    const final = this.store.getSend(input.key);
    this.event({
      id: `result:${input.key}`,
      kind: "result",
      account: id,
      key: input.key,
      status: final.status,
      messageId: final.message_id,
      error: final.error,
    });
    return this.result(final);
  }
  result(row) {
    return {
      status: row.status === "sending" ? "uncertain" : row.status,
      id: row.message_id || undefined,
      error: row.error || undefined,
    };
  }
  async disconnect(id) {
    this.store.desired(id, false);
    const s = this.sessions.get(id);
    if (s) {
      try {
        await s.client.logout();
      } catch {}
      try {
        await s.client.destroy();
      } catch {}
      this.state(id, "disconnected");
    }
    return this.get(id);
  }
  async stop() {
    this.stopping = true;
    await Promise.allSettled(
      [...this.sessions.values()].map((s) => s.client.destroy()),
    );
  }
}

import { AppError, receiveMessage, receiveStatus, clock } from "./model.js";
import { verifySignature } from "./whatsapp.js";
import { mutate } from "./store.js";
export function decodeGatewayEvent(envelope, secret, at = Date.now()) {
  if (
    !envelope ||
    typeof envelope.payload !== "string" ||
    envelope.payload.length > 300000 ||
    typeof envelope.timestamp !== "number" ||
    Math.abs(at - envelope.timestamp) > 300000
  )
    throw new AppError(401, "Evento QR expirado ou inválido.");
  const raw = Buffer.from(envelope.payload, "base64");
  if (
    !verifySignature(
      Buffer.concat([Buffer.from(`${envelope.timestamp}.`), raw]),
      envelope.signature,
      secret,
    )
  )
    throw new AppError(401, "Assinatura QR inválida.");
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    throw new AppError(400, "Evento QR inválido.");
  }
  if (
    !["1", "2"].includes(event.account) ||
    typeof event.id !== "string" ||
    event.id.length > 250 ||
    !["message", "outgoing", "status", "session", "result"].includes(event.kind)
  )
    throw new AppError(400, "Evento QR inválido.");
  return event;
}
export async function ingestGatewayEvent(event) {
  return mutate((state) => {
    state.gatewayEvents ||= [];
    if (state.gatewayEvents.includes(event.id)) return false;
    const account = state.accounts.find((a) => a.id === event.account);
    if (event.kind === "message") {
      receiveMessage(state, event.account, event.message, event.name);
      account.lastReceivedAt = Date.now();
    } else if (event.kind === "status") {
      if (!event.status || typeof event.status.id !== "string")
        throw new AppError(400, "Status QR inválido.");
      receiveStatus(state, event.status);
    } else if (event.kind === "result") {
      if (
        typeof event.key !== "string" ||
        event.key.length > 80 ||
        !["sent", "failed", "uncertain"].includes(event.status)
      )
        throw new AppError(400, "Resultado de envio inválido.");
      const job = state.outbox.find(
        (j) =>
          j.provider === "qr" &&
          (j.retryCount ? `${j.id}-r${j.retryCount}` : j.id) === event.key &&
          j.account === event.account,
      );
      if (job) {
        if (!["delivered", "read"].includes(job.status))
          job.status = event.status;
        if (typeof event.messageId === "string" && event.messageId.length < 250)
          job.whatsappId = event.messageId;
        if (event.error) job.error = String(event.error).slice(0, 500);
        const meta = state.clients
          .find((c) => c.id === job.clientId)
          ?.messages.find((m) => m[3]?.jobId === job.id)?.[3];
        if (meta) {
          meta.status = job.status;
          if (job.whatsappId) meta.id = job.whatsappId;
          if (job.error) meta.error = job.error;
        }
        for (const status of state.deliveryEvents || [])
          if (status.id === job.whatsappId) receiveStatus(state, status);
        state.deliveryEvents = (state.deliveryEvents || []).filter(
          (s) => s.id !== job.whatsappId,
        );
      }
    } else if (event.kind === "session") {
      if (
        ![
          "starting",
          "qr",
          "authenticated",
          "ready",
          "disconnected",
          "error",
        ].includes(event.status)
      )
        throw new AppError(400, "Estado da sessão inválido.");
      if (!account.gatewayEventAt || event.at >= account.gatewayEventAt) {
        account.sessionStatus = event.status;
        account.gatewayEventAt = event.at;
        if (event.status === "ready") {
          account.verifiedAt = Date.now();
          if (/^[1-9]\d{7,14}$/.test(event.number || ""))
            account.number = event.number;
        } else delete account.verifiedAt;
      }
    } else {
      const m = event.message;
      if (
        !m ||
        !m.id ||
        !/^[1-9]\d{7,14}$/.test(m.from) ||
        !Number.isFinite(Number(m.timestamp))
      )
        throw new AppError(400, "Mensagem QR inválida.");
      if (
        !state.clients.some((c) => c.messages.some((x) => x[3]?.id === m.id))
      ) {
        let c = state.clients.find(
          (c) => c.account === event.account && c.phone === m.from,
        );
        if (!c) {
          c = {
            id: Date.now(),
            account: event.account,
            phone: m.from,
            name: String(event.name || m.from).slice(0, 80),
            tags: [],
            notes: "",
            address: "",
            done: false,
            unread: 0,
            color: "peach",
            messages: [],
          };
          while (state.clients.some((x) => x.id === c.id)) c.id++;
          state.clients.unshift(c);
        }
        c.messages.push([
          "out",
          String(m.text?.body || "").slice(0, 10000),
          clock(state, Number(m.timestamp) * 1000),
          {
            id: m.id,
            timestamp: Number(m.timestamp) * 1000,
            status: "sent",
            source: "phone",
          },
        ]);
      }
    }
    state.gatewayEvents.push(event.id);
    state.gatewayEvents = state.gatewayEvents.slice(-3000);
  });
}

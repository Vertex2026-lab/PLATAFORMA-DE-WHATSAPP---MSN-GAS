import { createHmac } from "node:crypto";
import { equalSecrets } from "./auth.js";
import { AppError, receiveMessage, receiveStatus } from "./model.js";
import { mutate } from "./store.js";
export function verifySignature(raw, signature, secret) {
  return (
    !!secret &&
    equalSecrets(
      signature,
      `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`,
    )
  );
}
export async function ingestWebhook(payload) {
  if (payload.object !== "whatsapp_business_account")
    throw new AppError(400, "Webhook inválido.");
  for (const entry of payload.entry || [])
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;
      const value = change.value || {};
      const account = ["1", "2"].find(
        (id) =>
          process.env[`WA_PHONE_ID_${id}`] &&
          process.env[`WA_PHONE_ID_${id}`] === value.metadata?.phone_number_id,
      );
      if (!account) continue;
      await mutate((state) => {
        if (value.messages?.length)
          state.accounts.find((a) => a.id === account).lastReceivedAt =
            Date.now();
        for (const message of value.messages || []) {
          const name = value.contacts?.find((c) => c.wa_id === message.from)
            ?.profile?.name;
          receiveMessage(state, account, message, name);
        }
        for (const status of value.statuses || []) receiveStatus(state, status);
      });
    }
}
function updateMessage(state, job) {
  const c = state.clients.find((c) => c.id === job.clientId);
  const meta = c?.messages.find((m) => m[3]?.jobId === job.id)?.[3];
  if (meta) {
    meta.status = job.status;
    if (job.whatsappId) meta.id = job.whatsappId;
    if (job.error) meta.error = job.error;
  }
}
export async function dispatch(limit = 5) {
  // A process interrupted after contacting Meta must never blindly resend.
  await mutate((state) => {
    let changed = false;
    for (const job of state.outbox)
      if (job.status === "sending" && Date.now() - job.startedAt > 120000) {
        changed = true;
        job.status = "uncertain";
        job.error =
          "Envio interrompido. Confirme no WhatsApp antes de reenviar.";
        updateMessage(state, job);
      }
    if (!changed) return false;
  });
  for (let i = 0; i < limit; i++) {
    const claimed = await mutate((state) => {
      const job = state.outbox.find((j) => j.status === "pending");
      if (!job) return false;
      const incoming = state.clients
        .find((c) => c.id === job.clientId)
        ?.messages.filter((m) => m[0] === "in")
        .at(-1)?.[3]?.timestamp;
      if (!incoming || Date.now() - incoming >= 24 * 3600_000) {
        job.status = "failed";
        job.error = "Janela de atendimento de 24 horas encerrada.";
        updateMessage(state, job);
        return null;
      }
      if (
        !process.env[`WA_PHONE_ID_${job.account}`] ||
        !process.env[`WA_ACCESS_TOKEN_${job.account}`]
      ) {
        job.status = "failed";
        job.error = "Conta WhatsApp não configurada no servidor.";
        updateMessage(state, job);
        return null;
      }
      job.status = "sending";
      job.startedAt = Date.now();
      updateMessage(state, job);
      return structuredClone(job);
    });
    if (claimed.result === false) break;
    const job = claimed.result;
    if (!job) continue;
    let result;
    try {
      const version = process.env.WA_API_VERSION || "v23.0";
      if (!/^v\d+\.\d+$/.test(version)) throw new Error("invalid version");
      const response = await fetch(
        `https://graph.facebook.com/${version}/${process.env[`WA_PHONE_ID_${job.account}`]}/messages`,
        {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: {
            Authorization: `Bearer ${process.env[`WA_ACCESS_TOKEN_${job.account}`]}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: job.to,
            type: "text",
            text: { body: job.text, preview_url: false },
          }),
        },
      );
      const body = await response.json();
      result =
        response.ok && body.messages?.[0]?.id
          ? { status: "sent", whatsappId: body.messages[0].id }
          : {
              status: response.status >= 500 ? "uncertain" : "failed",
              error:
                response.status >= 500
                  ? "Resposta inconclusiva da Meta. Confira no WhatsApp antes de reenviar."
                  : `Meta recusou o envio (código ${Number(body.error?.code) || response.status}). Verifique a conexão da conta.`,
            };
    } catch {
      result = {
        status: "uncertain",
        error:
          "Não foi possível confirmar o envio. Confira no WhatsApp antes de reenviar.",
      };
    }
    await mutate((state) => {
      const found = state.outbox.find((j) => j.id === job.id);
      Object.assign(found, result);
      updateMessage(state, found);
      // A delivery webhook can arrive before the send response has been recorded.
      if (found.whatsappId) {
        const pending =
          state.deliveryEvents?.filter((s) => s.id === found.whatsappId) || [];
        pending.forEach((s) => receiveStatus(state, s));
        state.deliveryEvents = (state.deliveryEvents || []).filter(
          (s) => s.id !== found.whatsappId,
        );
      }
    });
  }
}

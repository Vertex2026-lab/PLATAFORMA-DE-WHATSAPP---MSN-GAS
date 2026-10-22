import {
  AppError,
  applySync,
  publicState,
  queueMessage,
} from "../lib/model.js";
import { configured, readState, compareAndSwap, mutate } from "../lib/store.js";
import {
  allowed,
  authRequest,
  setSession,
  clearSession,
  cookies,
  requireUser,
  sameOrigin,
  equalSecrets,
} from "../lib/auth.js";
import { verifySignature, ingestWebhook, dispatch } from "../lib/whatsapp.js";
export const config = { api: { bodyParser: false } };
export async function rawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 3_000_000) throw new AppError(413, "Requisição muito grande.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export default async function handler(req, res) {
  const json = (status, data) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(data));
  };
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const url = new URL(req.url, "http://localhost");
    const route = url.pathname.replace(/\/$/, "");
    if (route === "/api/config" && req.method === "GET")
      return json(200, { mode: configured() ? "live" : "demo" });
    if (route === "/api/webhook") {
      if (req.method === "GET") {
        if (
          url.searchParams.get("hub.mode") !== "subscribe" ||
          !equalSecrets(
            url.searchParams.get("hub.verify_token"),
            process.env.WA_VERIFY_TOKEN,
          )
        )
          throw new AppError(403, "Verificação inválida.");
        res.statusCode = 200;
        return res.end(url.searchParams.get("hub.challenge") || "");
      }
      if (req.method !== "POST")
        throw new AppError(405, "Método não permitido.");
      const raw = await rawBody(req);
      if (
        !verifySignature(
          raw,
          req.headers["x-hub-signature-256"],
          process.env.WA_APP_SECRET,
        )
      )
        throw new AppError(401, "Assinatura inválida.");
      await ingestWebhook(JSON.parse(raw.toString("utf8")));
      await dispatch(2);
      return json(200, { received: true });
    }
    if (!["GET", "POST", "PUT"].includes(req.method))
      throw new AppError(405, "Método não permitido.");
    let body;
    if (req.method !== "GET") {
      sameOrigin(req);
      const raw = await rawBody(req);
      try {
        body = JSON.parse(raw.toString("utf8"));
      } catch {
        throw new AppError(400, "JSON inválido.");
      }
    }
    if (route === "/api/auth/login" && req.method === "POST") {
      if (
        typeof body.email !== "string" ||
        typeof body.password !== "string" ||
        body.email.length > 254 ||
        body.password.length > 256
      )
        throw new AppError(400, "Informe e-mail e senha.");
      const session = await authRequest("token?grant_type=password", {
        email: body.email,
        password: body.password,
      });
      if (!allowed(session.user?.email))
        throw new AppError(403, "Este usuário não está autorizado.");
      setSession(res, session);
      return json(200, { email: session.user.email });
    }
    if (route === "/api/auth/refresh" && req.method === "POST") {
      const refresh = cookies(req).msn_refresh;
      if (!refresh)
        throw new AppError(401, "Sua sessão expirou. Entre novamente.");
      const session = await authRequest("token?grant_type=refresh_token", {
        refresh_token: refresh,
      });
      if (!allowed(session.user?.email))
        throw new AppError(403, "Acesso revogado.");
      setSession(res, session);
      return json(200, { email: session.user.email });
    }
    if (route === "/api/auth/logout" && req.method === "POST") {
      const token = cookies(req).msn_access;
      if (token) {
        try {
          await authRequest("logout", {}, token);
        } catch {
          /* Local cookie must still be cleared. */
        }
      }
      clearSession(res);
      return json(200, { ok: true });
    }
    const user = await requireUser(req);
    if (route === "/api/auth/me" && req.method === "GET")
      return json(200, { email: user.email });
    if (route === "/api/state" && req.method === "GET") {
      const row = await readState();
      return json(200, { version: row.version, data: publicState(row.data) });
    }
    if (route === "/api/state" && req.method === "PUT") {
      const row = await readState();
      if (!Number.isSafeInteger(body.version) || row.version !== body.version)
        throw new AppError(
          409,
          "Outra atualização chegou. Seus ajustes foram preservados para reaplicar.",
          "CONFLICT",
        );
      const next = applySync(row.data, body.data);
      next.audit.push({
        at: Date.now(),
        user: user.email,
        action: "crm.update",
      });
      next.audit = next.audit.slice(-500);
      const updated = await compareAndSwap(row.version, next);
      if (!updated)
        throw new AppError(
          409,
          "Outra atualização chegou. Atualize antes de salvar.",
          "CONFLICT",
        );
      await dispatch(1);
      const fresh = await readState();
      return json(200, {
        version: fresh.version,
        data: publicState(fresh.data),
      });
    }
    if (route === "/api/messages" && req.method === "POST") {
      if (
        typeof body.text !== "string" ||
        !body.text.trim() ||
        body.text.length > 4096 ||
        !/^[a-zA-Z0-9-]{16,80}$/.test(body.key || "")
      )
        throw new AppError(400, "Mensagem inválida. Limite: 4096 caracteres.");
      const result = await mutate((state) => {
        const c = state.clients.find((c) => c.id === Number(body.clientId));
        if (!c) throw new AppError(404, "Cliente não encontrado.");
        if (
          !process.env[`WA_PHONE_ID_${c.account}`] ||
          !process.env[`WA_ACCESS_TOKEN_${c.account}`]
        )
          throw new AppError(409, "Conecte a conta WhatsApp antes de enviar.");
        const job = queueMessage(
          state,
          c,
          body.text.trim(),
          `manual:${body.key}`,
        );
        c.done = false;
        c.unread = 0;
        return job.id;
      });
      await dispatch(2);
      const fresh = await readState();
      const job = fresh.data.outbox.find((j) => j.id === result.result);
      return json(200, {
        version: fresh.version,
        data: publicState(fresh.data),
        delivery: { status: job.status, error: job.error },
      });
    }
    if (route === "/api/messages/retry" && req.method === "POST") {
      if (typeof body.id !== "string" || body.id.length > 80)
        throw new AppError(400, "Envio inválido.");
      await mutate((state) => {
        const job = state.outbox.find((j) => j.id === body.id);
        if (!job) throw new AppError(404, "Envio não encontrado.");
        if (job.status !== "failed")
          throw new AppError(
            409,
            "Somente envios recusados podem ser tentados novamente. Envios incertos precisam ser conferidos no WhatsApp.",
          );
        job.status = "pending";
        delete job.error;
        const meta = state.clients
          .find((c) => c.id === job.clientId)
          ?.messages.find((m) => m[3]?.jobId === job.id)?.[3];
        if (meta) {
          meta.status = "pending";
          delete meta.error;
        }
      });
      await dispatch(2);
      const fresh = await readState();
      return json(200, {
        version: fresh.version,
        data: publicState(fresh.data),
      });
    }
    if (route === "/api/accounts/check" && req.method === "POST") {
      const id = body.account;
      if (!["1", "2"].includes(id)) throw new AppError(400, "Conta inválida.");
      const phone = process.env[`WA_PHONE_ID_${id}`],
        token = process.env[`WA_ACCESS_TOKEN_${id}`];
      if (
        !phone ||
        !token ||
        !process.env.WA_APP_SECRET ||
        !process.env.WA_VERIFY_TOKEN
      )
        throw new AppError(
          409,
          "As credenciais desta conta ainda precisam ser configuradas na Vercel.",
        );
      const version = process.env.WA_API_VERSION || "v23.0";
      if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(phone))
        throw new AppError(409, "Configuração da conta inválida.");
      const response = await fetch(
        `https://graph.facebook.com/${version}/${phone}?fields=display_phone_number,verified_name`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok)
        throw new AppError(
          409,
          "A Meta não confirmou o número. Confira as credenciais e permissões.",
        );
      const details = await response.json();
      const row = await mutate((state) => {
        const a = state.accounts.find((a) => a.id === id);
        a.verifiedAt = Date.now();
        a.number = String(details.display_phone_number || a.number);
      });
      return json(200, { version: row.version, data: publicState(row.data) });
    }
    if (route === "/api/worker" && req.method === "POST") {
      await dispatch(2);
      return json(200, { ok: true });
    }
    throw new AppError(404, "Rota não encontrada.");
  } catch (error) {
    if (!(error instanceof AppError)) console.error("API_ERROR", error.name); // Never log credentials, body or personal data.
    return json(error.status || 500, {
      error: error.status ? error.message : "Falha interna. Tente novamente.",
      code: error.code || "ERROR",
    });
  }
}

import { randomUUID } from "node:crypto";
export class AppError extends Error {
  constructor(status, message, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const statuses = ["Novo pedido", "Preparando", "Em entrega", "Entregue"];
export function initialState() {
  return {
    accounts: [
      { id: "1", name: "MSN Gas · Principal", number: "Número 1" },
      { id: "2", name: "MSN Gas · Delivery", number: "Número 2" },
    ],
    clients: [],
    orders: [],
    tags: [
      "Novo pedido",
      "Aguardando endereço",
      "Em entrega",
      "Cliente recorrente",
      "Pagamento pendente",
    ],
    rules: [
      {
        name: "Boas-vindas",
        trigger: "Primeira mensagem do cliente",
        enabled: true,
        text: "Olá! Bem-vindo à DISK MSN GAS 🔥 Para pedir seu gás, envie seu nome e endereço. Como podemos ajudar?",
      },
      {
        name: "Fora do horário",
        trigger: "Mensagem fora do expediente",
        enabled: true,
        text: "Olá! Estamos fora do horário de atendimento. Deixe seu nome e endereço; retornaremos no próximo expediente.",
      },
      {
        name: "Pedido confirmado",
        trigger: "Pedido alterado para Preparando",
        enabled: false,
        text: "Seu pedido foi confirmado! Avisaremos quando sair para entrega. Obrigado por escolher a DISK MSN GAS!",
      },
    ],
    business: {
      name: "DISK MSN GAS",
      hours: "Segunda a sábado, 08h às 18h",
      timezone: "America/Fortaleza",
      start: "08:00",
      end: "18:00",
      days: [1, 2, 3, 4, 5, 6],
    },
    outbox: [],
    audit: [],
  };
}
function text(value, max, label, allowEmpty = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!allowEmpty && !value.trim())
  )
    throw new AppError(400, `${label} inválido.`);
  return value.trim();
}
function integer(value, min, max, label) {
  if (
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw new AppError(400, `${label} inválido.`);
  return Number(value);
}
function list(value, max, label) {
  if (!Array.isArray(value) || value.length > max)
    throw new AppError(400, `${label} inválido.`);
  return value;
}
export function isOpen(business, at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: business.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    parts.weekday,
  );
  const time = `${parts.hour}:${parts.minute}`;
  return (
    business.days.includes(day) && time >= business.start && time < business.end
  );
}
export function dateKey(business, at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: business.timezone,
  }).format(at);
}
export function queueMessage(
  state,
  client,
  body,
  key,
  automation = false,
  provider = process.env.WA_PROVIDER === "qr" ? "qr" : "meta",
) {
  const existing = state.outbox.find((job) => job.key === key);
  if (existing) {
    if (existing.clientId !== client.id || existing.text !== body)
      throw new AppError(
        409,
        "Identificação de envio já usada para outra mensagem.",
      );
    return existing;
  }
  const incoming = client.messages
    .filter((m) => m[0] === "in")
    .at(-1)?.[3]?.timestamp;
  if (
    provider !== "qr" &&
    (!incoming || Date.now() - incoming >= 24 * 3600_000)
  )
    throw new AppError(
      409,
      "A janela de 24 horas do WhatsApp está fechada. Aguarde uma mensagem do cliente ou envie um modelo aprovado por um canal habilitado.",
      "WINDOW_CLOSED",
    );
  const job = {
    id: randomUUID(),
    key,
    clientId: client.id,
    account: client.account,
    to: client.phone,
    text: body,
    automation,
    provider,
    status: "pending",
    createdAt: Date.now(),
  };
  state.outbox.push(job);
  client.messages.push([
    "out",
    body,
    clock(state),
    { jobId: job.id, timestamp: job.createdAt, status: "pending" },
  ]);
  return job;
}
export function clock(state, timestamp = Date.now()) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    timeZone: state.business.timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
}
// CRM updates never accept browser-written messages, automation markers or delivery states.
export function applySync(existing, input) {
  if (!input || typeof input !== "object")
    throw new AppError(400, "Dados inválidos.");
  const next = structuredClone(existing);
  next.tags = [
    ...new Set(
      list(input.tags, 100, "Etiquetas").map((t) => text(t, 40, "Etiqueta")),
    ),
  ];
  next.accounts = list(input.accounts, 2, "Contas").map((a) => {
    if (!["1", "2"].includes(a.id)) throw new AppError(400, "Conta inválida.");
    const old = existing.accounts.find((x) => x.id === a.id);
    return { ...old, name: text(a.name, 50, "Nome da conta") };
  });
  if (new Set(next.accounts.map((a) => a.id)).size !== 2)
    throw new AppError(400, "As duas contas são obrigatórias.");
  const ids = new Set();
  next.clients = list(input.clients, 10000, "Clientes").map((c) => {
    const id = integer(c.id, 1, Number.MAX_SAFE_INTEGER, "Cliente");
    if (ids.has(id)) throw new AppError(400, "Cliente duplicado.");
    ids.add(id);
    const old = existing.clients.find((x) => x.id === id);
    if (!["1", "2"].includes(c.account) || (old && old.account !== c.account))
      throw new AppError(400, "Conta de origem inválida.");
    const phone = text(c.phone, 16, "WhatsApp do cliente").replace(/^\+/, "");
    if (!/^[1-9]\d{7,14}$/.test(phone) || (old && old.phone !== phone))
      throw new AppError(400, "Use o WhatsApp com DDI e DDD, somente números.");
    if (typeof c.done !== "boolean")
      throw new AppError(400, "Status inválido.");
    const tags = [
      ...new Set(
        list(c.tags, 100, "Etiquetas").map((t) => text(t, 40, "Etiqueta")),
      ),
    ];
    if (tags.some((t) => !next.tags.includes(t)))
      throw new AppError(400, "Etiqueta não cadastrada.");
    return {
      ...structuredClone(old || {}),
      id,
      account: c.account,
      phone,
      name: text(c.name, 80, "Nome"),
      tags,
      notes: text(c.notes, 5000, "Anotações", true),
      address: text(c.address, 250, "Endereço", true),
      done: c.done,
      unread: old ? (c.unread === 0 ? 0 : old.unread) : 0,
      color: old?.color || "peach",
      time: old?.time || clock(existing),
      messages: structuredClone(old?.messages || []),
    };
  });
  if (existing.clients.some((c) => !ids.has(c.id)))
    throw new AppError(400, "Excluir clientes não é suportado.");
  if (
    new Set(next.clients.map((c) => `${c.account}:${c.phone}`)).size !==
    next.clients.length
  )
    throw new AppError(409, "Este número já está cadastrado nesta conta.");
  if (!Array.isArray(input.rules) || input.rules.length !== 3)
    throw new AppError(400, "Regras inválidas.");
  next.rules = existing.rules.map((r, i) => {
    if (typeof input.rules[i].enabled !== "boolean")
      throw new AppError(400, "Ativação inválida.");
    return {
      ...r,
      enabled: input.rules[i].enabled,
      text: text(input.rules[i].text, 2000, "Mensagem automática"),
    };
  });
  const b = input.business;
  next.business = {
    ...existing.business,
    name: text(b?.name, 80, "Empresa"),
    hours: text(b?.hours, 120, "Horário"),
  };
  if (b?.start !== undefined) {
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.end) ||
      b.start >= b.end
    )
      throw new AppError(
        400,
        "Informe um expediente com abertura antes do fechamento.",
      );
    next.business.start = b.start;
    next.business.end = b.end;
    next.business.days = [
      ...new Set(
        list(b.days, 7, "Dias de atendimento").map((d) =>
          integer(d, 0, 6, "Dia"),
        ),
      ),
    ];
    if (!next.business.days.length)
      throw new AppError(400, "Selecione pelo menos um dia.");
  }
  const orderIds = new Set();
  next.orders = list(input.orders, 10000, "Pedidos").map((o) => {
    const id = integer(o.id, 1, Number.MAX_SAFE_INTEGER, "Pedido");
    if (orderIds.has(id)) throw new AppError(400, "Pedido duplicado.");
    orderIds.add(id);
    const old = existing.orders.find((x) => x.id === id);
    if (
      !ids.has(Number(o.clientId)) ||
      (old && Number(o.clientId) !== old.clientId)
    )
      throw new AppError(400, "Cliente do pedido inválido.");
    if (
      !statuses.includes(o.status) ||
      !["Pix", "Cartão", "Dinheiro"].includes(o.payment)
    )
      throw new AppError(400, "Status ou pagamento inválido.");
    if (
      ![
        "Botijão de gás · 13 kg",
        "Botijão de gás · 45 kg",
        "Água mineral · 20 L",
      ].includes(o.product)
    )
      throw new AppError(400, "Produto inválido.");
    const amount = Number(o.price);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 99999 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001
    )
      throw new AppError(400, "Valor inválido.");
    const result = {
      ...old,
      id,
      clientId: Number(o.clientId),
      product: o.product,
      quantity: integer(o.quantity, 1, 99, "Quantidade"),
      price: amount.toFixed(2),
      address: text(o.address, 250, "Endereço"),
      payment: o.payment,
      status: o.status,
    };
    if (
      o.status === "Preparando" &&
      old?.status !== "Preparando" &&
      !old?.confirmationQueued &&
      next.rules[2].enabled
    ) {
      const client = next.clients.find((c) => c.id === result.clientId);
      try {
        queueMessage(next, client, next.rules[2].text, `order:${id}`, true);
        result.confirmationQueued = true;
      } catch (error) {
        if (error.code !== "WINDOW_CLOSED") throw error;
        result.automationWarning = error.message;
      }
    }
    return result;
  });
  if (existing.orders.some((o) => !orderIds.has(o.id)))
    throw new AppError(400, "Excluir pedidos não é suportado.");
  return next;
}
export function receiveMessage(state, accountId, message, name) {
  if (
    state.clients.some((c) => c.messages.some((m) => m[3]?.id === message.id))
  )
    return false;
  if (!/^[1-9]\d{7,14}$/.test(message.from) || typeof message.id !== "string")
    throw new AppError(400, "Evento WhatsApp inválido.");
  let c = state.clients.find(
    (c) => c.account === accountId && c.phone === message.from,
  );
  if (!c) {
    c = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      account: accountId,
      phone: message.from,
      name: String(name || message.from).slice(0, 80),
      tags: state.tags.includes("Novo pedido") ? ["Novo pedido"] : [],
      address: "",
      notes: "",
      done: false,
      unread: 0,
      color: "peach",
      messages: [],
    };
    while (state.clients.some((x) => x.id === c.id)) c.id++;
    state.clients.unshift(c);
  }
  const firstInbound = !c.messages.some((m) => m[0] === "in");
  const timestamp = Number(message.timestamp) * 1000;
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 300000)
    throw new AppError(400, "Data da mensagem inválida.");
  const body =
    message.type === "text"
      ? String(message.text?.body || "").slice(0, 10000)
      : `[${{ image: "Imagem", audio: "Áudio", video: "Vídeo", document: "Documento", location: "Localização", sticker: "Figurinha" }[message.type] || "Mensagem"} recebida — consulte no aplicativo WhatsApp]`;
  c.messages.push([
    "in",
    body,
    clock(state, timestamp),
    { id: message.id, timestamp, status: "received", type: message.type },
  ]);
  c.messages.sort((a, b) => (a[3]?.timestamp || 0) - (b[3]?.timestamp || 0));
  c.time = clock(state, c.messages.at(-1)[3].timestamp);
  c.done = false;
  c.unread++;
  // Ignore old redeliveries for automation; never send outside the customer service window.
  if (Date.now() - timestamp >= 24 * 3600_000) return true;
  const today = dateKey(state.business);
  let rule;
  if (
    !isOpen(state.business) &&
    state.rules[1].enabled &&
    c.awayDate !== today
  ) {
    rule = state.rules[1];
    c.awayDate = today;
  } else if (isOpen(state.business) && firstInbound && state.rules[0].enabled)
    rule = state.rules[0];
  if (rule) queueMessage(state, c, rule.text, `incoming:${message.id}`, true);
  return true;
}
export function receiveStatus(state, status) {
  if (!["sent", "delivered", "read", "failed"].includes(status.status)) return;
  const known = state.clients.some((c) =>
    c.messages.some((m) => m[3]?.id === status.id),
  );
  if (!known) {
    state.deliveryEvents ||= [];
    if (
      !state.deliveryEvents.some(
        (s) => s.id === status.id && s.status === status.status,
      )
    )
      state.deliveryEvents.push({ id: status.id, status: status.status });
    state.deliveryEvents = state.deliveryEvents.slice(-1000);
    return;
  }
  const rank = {
    pending: 0,
    sending: 1,
    uncertain: 1,
    sent: 2,
    delivered: 3,
    read: 4,
  };
  for (const c of state.clients)
    for (const m of c.messages) {
      if (m[3]?.id !== status.id || m[0] !== "out") continue;
      if (status.status === "failed") {
        if (!["read", "delivered"].includes(m[3].status))
          m[3].status = "failed";
      } else if ((rank[status.status] ?? -1) > (rank[m[3].status] ?? -1))
        m[3].status = status.status;
      const job = state.outbox.find((j) => j.id === m[3].jobId);
      if (job) job.status = m[3].status;
    }
}
export function publicState(state, env = process.env) {
  const data = structuredClone(state);
  delete data.audit;
  delete data.deliveryEvents;
  delete data.gatewayEvents;
  data.outbox = state.outbox
    .filter((j) =>
      ["failed", "uncertain", "pending", "sending"].includes(j.status),
    )
    .map(({ id, clientId, status, createdAt, error }) => ({
      id,
      clientId,
      status,
      createdAt,
      error,
    }));
  const provider = env.WA_PROVIDER === "qr" ? "qr" : "meta";
  data.accounts = data.accounts.map((a) => ({
    ...a,
    provider,
    configured:
      provider === "qr"
        ? !!(env.WA_GATEWAY_URL && env.WA_GATEWAY_TOKEN)
        : !!(
            env[`WA_PHONE_ID_${a.id}`] &&
            env[`WA_ACCESS_TOKEN_${a.id}`] &&
            env.WA_APP_SECRET &&
            env.WA_VERIFY_TOKEN
          ),
  }));
  return data;
}

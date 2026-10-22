const paths = {
  flame:
    "M12 3c1 5-4 5-4 9a4 4 0 0 0 8 0c0-2-1-3-1-3s5 3 5 7a8 8 0 0 1-16 0c0-6 6-7 8-13Z",
  chat: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0ZM7 10h9M7 14h6",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  box: "m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v10M7.5 4.5l9 5",
  tag: "M20 13 11 22 2 13V2h11l9 9-2 2ZM7 7h.01",
  bolt: "m13 2-9 12h7l-1 8 10-12h-7l1-8Z",
  phone:
    "M5 2h4l2 5-3 2a15 15 0 0 0 7 7l2-3 5 2v4c0 2-2 3-4 3A20 20 0 0 1 2 6c0-2 1-4 3-4Z",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 3-1 3-5 3-3-2-3-1-3-5 2-3 1-3 2-1Z",
  chevron: "m9 5 7 7-7 7",
  sparkles: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  plus: "M12 5v14M5 12h14",
  x: "m6 6 12 12M6 18 18 6",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  check: "m5 12 4 4L19 6",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  send: "m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2",
  arrow: "M7 17 17 7M7 7h10v10",
  note: "M4 3h16v18H4V3Zm4 5h8M8 12h8M8 16h4",
  filter: "M3 5h18M6 12h12M9 19h6",
  back: "m14 5-7 7 7 7",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.chat}"/></svg>`;
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
  key = "disk-msn-gas-v2";
const initial = {
  accounts: [
    {
      id: "1",
      name: "MSN Gas · Principal",
      number: "Número 1 · Não conectado",
    },
    { id: "2", name: "MSN Gas · Delivery", number: "Número 2 · Não conectado" },
  ],
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
      text: "Olá! Seja bem-vindo à DISK MSN GAS 🔥 Como podemos ajudar? Para pedir seu gás, envie seu nome e endereço.",
      enabled: true,
    },
    {
      name: "Fora do horário",
      trigger: "Mensagem fora do expediente",
      text: "Olá! Nosso atendimento está encerrado no momento. Deixe seu nome e endereço e retornaremos no próximo expediente.",
      enabled: true,
    },
    {
      name: "Pedido confirmado",
      trigger: "Pedido confirmado pelo atendente",
      text: "Seu pedido foi confirmado! Vamos avisar quando o entregador sair. Obrigado por escolher a DISK MSN GAS!",
      enabled: false,
    },
  ],
  clients: [
    {
      id: 1,
      name: "Mariana Oliveira",
      phone: "Cliente fictício · 001",
      account: "1",
      tags: ["Novo pedido"],
      notes: "Prefere contato por mensagem.",
      address: "Jardim das Flores",
      done: false,
      unread: 2,
      time: "14:32",
      color: "peach",
      messages: [
        ["in", "Olá, boa tarde! Tudo bem? 😊", "14:28"],
        ["in", "Vocês entregam gás no Jardim das Flores?", "14:28"],
        [
          "out",
          "Olá, Mariana! Boa tarde 😊\nEntregamos sim! Como podemos ajudar?",
          "14:30",
        ],
        [
          "in",
          "Ótimo! Gostaria de um botijão de 13 kg. Qual o valor e a previsão de entrega?",
          "14:32",
        ],
      ],
    },
    {
      id: 2,
      name: "Carlos Eduardo",
      phone: "Cliente fictício · 002",
      account: "2",
      tags: ["Aguardando endereço"],
      notes: "",
      address: "",
      done: false,
      unread: 1,
      time: "14:25",
      color: "blue",
      messages: [["in", "Boa tarde! Preciso de um gás, por favor.", "14:25"]],
    },
    {
      id: 3,
      name: "Ana Paula Santos",
      phone: "Cliente fictício · 003",
      account: "1",
      tags: ["Em entrega"],
      notes: "",
      address: "Vila Nova",
      done: false,
      unread: 0,
      time: "14:18",
      color: "lilac",
      messages: [
        ["out", "Estamos verificando a entrega do seu pedido.", "14:15"],
        ["in", "Obrigada! O entregador já está a caminho?", "14:18"],
      ],
    },
    {
      id: 4,
      name: "Roberto Lima",
      phone: "Cliente fictício · 004",
      account: "2",
      tags: ["Cliente recorrente"],
      notes: "",
      address: "Centro",
      done: true,
      unread: 0,
      time: "13:56",
      color: "mint",
      messages: [
        ["in", "Já recebi aqui. Muito obrigado!", "13:56"],
        [
          "out",
          "Obrigado pela preferência, Roberto! Conte com a DISK MSN GAS 😊",
          "13:56",
        ],
      ],
    },
    {
      id: 5,
      name: "Juliana Costa",
      phone: "Cliente fictício · 005",
      account: "1",
      tags: ["Pagamento pendente"],
      notes: "",
      address: "",
      done: false,
      unread: 1,
      time: "13:41",
      color: "pink",
      messages: [["in", "Vocês aceitam Pix?", "13:41"]],
    },
    {
      id: 6,
      name: "Pedro Henrique",
      phone: "Cliente fictício · 006",
      account: "2",
      tags: ["Novo pedido"],
      notes: "",
      address: "",
      done: false,
      unread: 0,
      time: "13:20",
      color: "sand",
      messages: [["in", "Quanto está o botijão de 13 kg?", "13:20"]],
    },
  ],
  orders: [],
  business: { name: "DISK MSN GAS", hours: "Segunda a sábado, 08h às 18h" },
};
let state;
try {
  state = JSON.parse(localStorage.getItem(key)) || structuredClone(initial);
} catch {
  state = structuredClone(initial);
}
let selected = 1,
  account = "all",
  filter = "all",
  query = "",
  page = "atendimento",
  mobileChat = false,
  detailOpen = false;
const drafts = {};
const live = () => Platform.mode === "live";
const save = () => Platform.persist(state),
  current = () =>
    state.clients.find((c) => c.id === selected) || state.clients[0],
  initials = (c) =>
    c.name
      .split(" ")
      .filter(Boolean)
      .map((x) => x[0])
      .slice(0, 2)
      .join(""),
  accountName = (c) =>
    state.accounts.find((a) => a.id === c.account)?.name || "Conta",
  avatar = (c) =>
    `<span class="avatar ${c.color || "peach"}">${esc(initials(c))}</span>`,
  tag = (t) =>
    `<span class="tag ${t === "Em entrega" ? "green" : t === "Aguardando endereço" ? "purple" : t === "Pagamento pendente" ? "red" : ""}">${esc(t)}</span>`;
function hydrate() {
  document
    .querySelectorAll("[data-icon]")
    .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
}
let toastTimer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3500);
}
function modal(title, body) {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = body;
  $("#modal").showModal();
}
const nav = [
  ["atendimento", "chat", "Atendimento"],
  ["clientes", "users", "Clientes"],
  ["pedidos", "box", "Pedidos"],
  ["etiquetas", "tag", "Etiquetas"],
  ["automacoes", "bolt", "Automações"],
  ["contas", "phone", "Contas WhatsApp"],
  ["configuracoes", "settings", "Configurações"],
];
const titles = {
  atendimento: [
    "Central de atendimento",
    "Cada conversa é uma oportunidade de atender melhor.",
  ],
  clientes: [
    "Seus clientes",
    "Conheça quem confia na sua entrega, conversa após conversa.",
  ],
  pedidos: [
    "Gestão de pedidos",
    "Do primeiro contato à entrega na porta do cliente.",
  ],
  etiquetas: [
    "Organize com etiquetas",
    "Encontre o contexto certo para cada atendimento.",
  ],
  automacoes: [
    "Automações de atendimento",
    "Mais agilidade para você. Mais atenção para seus clientes.",
  ],
  contas: [
    "Suas contas WhatsApp",
    "Dois números. Uma operação. Tudo no mesmo lugar.",
  ],
  configuracoes: [
    "Configurações",
    "A central de atendimento com a cara da sua operação.",
  ],
};
function navigate() {
  if (Platform.mode === "loading") return;
  page = location.hash.slice(1) || "atendimento";
  if (!titles[page]) page = "atendimento";
  $("#navigation").innerHTML = nav
    .map(
      ([id, ic, label]) =>
        `<a href="#${id}" class="${page === id ? "active" : ""}" title="${label}" aria-label="${label}">${icon(ic)}<span>${label}</span>${id === "atendimento" ? `<b>${state.clients.filter((c) => !c.done).length}</b>` : ""}${id === "automacoes" ? '<span class="nav-new">NOVO</span>' : ""}</a>`,
    )
    .join("");
  $("#page-name").textContent = nav.find((x) => x[0] === page)[2];
  $("#page-title").innerHTML =
    titles[page][0] + '<span class="orange-dot">.</span>';
  $("#page-subtitle").textContent = titles[page][1];
  $("#new-conversation").hidden = page !== "atendimento" && page !== "clientes";
  ({
    atendimento: renderInbox,
    clientes: renderClients,
    pedidos: renderOrders,
    etiquetas: renderTags,
    automacoes: renderRules,
    contas: renderAccounts,
    configuracoes: renderSettings,
  })[page]();
  hydrate();
}
function metrics() {
  const open = state.clients.filter((c) => !c.done).length,
    done = state.clients.filter((c) => c.done).length;
  return `<div class="metrics"><div class="metric"><span class="metric-icon orange">${icon("chat")}</span><div><small>Conversas abertas</small><strong>${String(open).padStart(2, "0")}</strong></div><span class="metric-note">Na sua central</span></div><div class="metric"><span class="metric-icon amber">${icon("clock")}</span><div><small>Não lidas</small><strong>${String(state.clients.filter((c) => c.unread > 0).length).padStart(2, "0")}</strong></div><span class="metric-note">Aguardando você</span></div><div class="metric"><span class="metric-icon green">${icon("check")}</span><div><small>Concluídas</small><strong>${String(done).padStart(2, "0")}</strong></div><span class="metric-note">Atendimento finalizado</span></div><div class="metric"><span class="metric-icon dark">${icon("phone")}</span><div><small>Contas na central</small><strong>${live() ? String(state.accounts.filter((a) => a.configured).length).padStart(2, "0") : "02"} <em>/ 02</em></strong></div><span class="metric-note pending">${live() ? "Contas configuradas" : "Conexão pendente"}</span></div></div>`;
}
function renderInbox() {
  const c = current();
  if (!c) {
    $("#view").innerHTML =
      metrics() +
      `<div class="content-card empty-state"><span class="empty-flame">${icon("chat")}</span><h3>Sua central está pronta para começar.</h3><p>Cadastre seu primeiro cliente em “Nova conversa”.<br>As mensagens recebidas aparecerão aqui depois da conexão dos números.</p><a class="primary" href="#contas">Configurar contas WhatsApp</a></div>`;
    return;
  }
  selected = c.id;
  $("#view").innerHTML =
    metrics() +
    `<section class="inbox-layout ${mobileChat ? "show-chat" : ""} ${detailOpen ? "show-details" : ""}"><div class="conversation-panel"><div class="panel-title"><h2>Conversas <span>${state.clients.length}</span></h2><button class="icon-button" id="filter-info" aria-label="Informações dos filtros">${icon("filter")}</button></div><div class="search-field">${icon("search")}<input id="search" placeholder="Buscar conversa..." aria-label="Buscar conversa" value="${esc(query)}"></div><div class="account-select">${icon("phone")}<select id="account-filter" aria-label="Filtrar conta"><option value="all">Todos os números</option>${state.accounts.map((a) => `<option value="${a.id}" ${account === a.id ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div><div class="conversation-tabs">${[
      ["all", "Todas"],
      ["unread", "Não lidas"],
      ["open", "Abertas"],
      ["done", "Concluídas"],
    ]
      .map(
        ([id, label]) =>
          `<button data-filter="${id}" class="${filter === id ? "active" : ""}">${label}</button>`,
      )
      .join(
        "",
      )}</div><div id="conversation-list"></div><div class="list-foot"><span class="tiny-dot"></span> Sua central de conversas unificada</div></div><section class="chat-panel"><header class="chat-header"><button class="icon-button mobile-back" id="back-list" aria-label="Voltar às conversas">${icon("back")}</button>${avatar(c)}<div class="chat-person"><strong>${esc(c.name)}</strong><small><i></i> ${esc(accountName(c))}</small></div><button class="outline resolve" id="resolve">${icon("check")}<span>${c.done ? "Reabrir" : "Concluir"}</span></button><button class="icon-button" id="toggle-details" title="Detalhes do cliente" aria-label="Detalhes do cliente">${icon("users")}</button></header><div class="demo-notice">${icon("note")} ${live() ? "Atendimento real · confira o status de cada mensagem" : "Prévia interativa · mensagens fictícias, sem envio ao WhatsApp"}</div><div class="messages" id="messages"></div><div class="composer"><div class="quick-title">${icon("bolt")} RESPOSTAS RÁPIDAS</div><div class="quick-replies" id="quick-replies"></div><form id="send-form"><textarea id="message" rows="2" placeholder="Escreva sua mensagem..." aria-label="Mensagem">${esc(drafts[c.id] || "")}</textarea><div class="compose-tools"><span>Enter para enviar <b>·</b> Shift + Enter para nova linha</span><button type="submit" class="primary">Enviar ${icon("send")}</button></div></form></div></section><aside class="customer-panel" id="customer-panel"></aside></section>`;
  renderList();
  renderMessages();
  renderDetails();
  $("#search").oninput = (e) => {
    query = e.target.value;
    renderList();
  };
  $("#account-filter").onchange = (e) => {
    account = e.target.value;
    renderList();
  };
  document.querySelectorAll("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        filter = b.dataset.filter;
        document
          .querySelectorAll("[data-filter]")
          .forEach((x) => x.classList.toggle("active", x === b));
        renderList();
      }),
  );
  $("#resolve").onclick = () => {
    c.done = !c.done;
    c.unread = 0;
    save();
    navigate();
  };
  $("#back-list").onclick = () => {
    mobileChat = false;
    renderInbox();
  };
  $("#toggle-details").onclick = () => {
    detailOpen = !detailOpen;
    $(".inbox-layout").classList.remove("details-hidden");
    $(".inbox-layout").classList.toggle("show-details", detailOpen);
  };
  $("#filter-info").onclick = () =>
    toast("Filtre por número, status ou nome do cliente.");
  const replies = [
    ["Saudação", () => state.rules[0].text],
    [
      "Pedir endereço",
      () =>
        "Pode me enviar seu endereço completo, número e um ponto de referência?",
    ],
    [
      "Pagamento",
      () => "Você prefere pagar no Pix, cartão ou dinheiro? Precisa de troco?",
    ],
    ["Fora do horário", () => state.rules[1].text],
  ];
  $("#quick-replies").innerHTML = replies
    .map(([name], i) => `<button data-reply="${i}">${name}</button>`)
    .join("");
  document.querySelectorAll("[data-reply]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#message").value = replies[Number(b.dataset.reply)][1]();
        drafts[c.id] = $("#message").value;
        $("#message").focus();
      }),
  );
  $("#message").oninput = (e) => (drafts[c.id] = e.target.value);
  $("#message").onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      $("#send-form").requestSubmit();
    }
  };
  $("#send-form").onsubmit = async (e) => {
    e.preventDefault();
    const text = $("#message").value.trim();
    if (!text) return;
    if (live()) {
      const button = $("#send-form button");
      if (button.disabled) return;
      button.disabled = true;
      try {
        const result = await Platform.send(c.id, text);
        drafts[c.id] = "";
        renderInbox();
        toast(
          result.status === "sent"
            ? "Mensagem aceita pelo WhatsApp."
            : result.error || "Mensagem na fila de envio.",
        );
      } catch (error) {
        toast(error.message);
      } finally {
        if (document.contains(button)) button.disabled = false;
      }
      return;
    }
    c.messages.push(["out", text, now()]);
    c.done = false;
    c.unread = 0;
    c.time = now();
    drafts[c.id] = "";
    save();
    renderInbox();
  };
}
function now() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function renderList() {
  const clients = state.clients.filter(
    (c) =>
      (account === "all" || c.account === account) &&
      (filter === "all" ||
        (filter === "unread"
          ? c.unread > 0
          : filter === "open"
            ? !c.done
            : c.done)) &&
      (
        c.name +
        " " +
        c.phone +
        " " +
        c.tags.join(" ") +
        " " +
        c.messages.map((m) => m[1]).join(" ")
      )
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  $("#conversation-list").innerHTML = clients.length
    ? clients
        .map(
          (c) =>
            `<button class="contact ${selected === c.id ? "current" : ""}" data-client="${c.id}">${avatar(c)}<span class="contact-content"><span class="contact-name"><strong>${esc(c.name)}</strong><time>${esc(c.time)}</time></span><span class="preview">${c.messages.at(-1)?.[0] === "out" ? "✓ " : ""}${esc(c.messages.at(-1)?.[1] || "Nova conversa")}</span><span class="contact-meta">${tag(c.tags[0] || "Sem etiqueta")}<span class="account-index">Nº ${c.account}</span>${c.unread ? `<b class="unread">${c.unread}</b>` : ""}</span></span></button>`,
        )
        .join("")
    : '<div class="empty-state">' +
      icon("search") +
      "<h3>Nenhuma conversa por aqui</h3><p>Tente outro nome, número ou filtro.</p></div>";
  document.querySelectorAll("[data-client]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = Number(b.dataset.client);
        current().unread = 0;
        mobileChat = true;
        save();
        renderInbox();
      }),
  );
}
function renderMessages() {
  const c = current();
  let lastDay = "";
  const today = new Intl.DateTimeFormat("pt-BR", {
    timeZone: state.business.timezone || "America/Fortaleza",
  }).format(new Date());
  const messages = c.messages
    .map((m) => {
      const stamp = m[3]?.timestamp;
      const day = stamp
        ? new Intl.DateTimeFormat("pt-BR", {
            timeZone: state.business.timezone || "America/Fortaleza",
          }).format(new Date(stamp))
        : today;
      let divider = "";
      if (day !== lastDay) {
        divider = `<div class="date-divider"><span>${day === today ? "Hoje" : esc(day)}</span></div>`;
        lastDay = day;
      }
      const status = live()
        ? {
            pending: "Na fila",
            sending: "Enviando",
            sent: "Enviada ✓",
            delivered: "Entregue ✓✓",
            read: "Lida ✓✓",
            failed: "Falhou",
            uncertain: "Envio incerto",
          }[m[3]?.status] || "Pendente"
        : "✓✓";
      return (
        divider +
        `<div class="message ${m[0] === "out" ? "outgoing" : "incoming"}">${m[0] === "out" ? '<span class="message-author">DISK MSN GAS</span>' : ""}<div>${esc(m[1])}</div><small>${esc(m[2] || "Agora")} ${m[0] === "out" ? `<span title="${esc(m[3]?.error || "")}">${esc(status)}</span>` : ""}</small></div>`
      );
    })
    .join("");
  $("#messages").innerHTML =
    '<div class="secure-note">Uma boa conversa começa com um bom atendimento.</div>' +
    messages;
  $("#messages").scrollTop = $("#messages").scrollHeight;
}
function renderDetails() {
  const c = current();
  $("#customer-panel").innerHTML =
    `<div class="detail-title">Detalhes do cliente <button class="icon-button" id="close-details" aria-label="Fechar detalhes">${icon("x")}</button></div><div class="customer-profile">${avatar(c)}<h3>${esc(c.name)}</h3><p>${esc(c.phone)}</p><span class="customer-status">${c.done ? "Atendimento concluído" : "Em atendimento"}</span></div><div class="detail-section"><div class="section-label">${icon("phone")} CONTA DE ORIGEM</div><div class="origin-account"><span class="account-symbol">${icon("phone")}</span><div><strong>${esc(accountName(c))}</strong><small>Conta ${c.account} · ${live() ? "WhatsApp" : "demonstração"}</small></div></div></div><div class="detail-section"><div class="section-label">${icon("tag")} ETIQUETAS</div><div class="customer-tags">${c.tags.map((t, i) => `<span class="tag">${esc(t)}<button data-remove-tag="${i}" aria-label="Remover ${esc(t)}">×</button></span>`).join("")}</div><form id="add-tag-form"><input id="new-tag" list="tag-options" placeholder="+ Adicionar etiqueta" maxlength="40" aria-label="Adicionar etiqueta"><datalist id="tag-options">${state.tags.map((t) => `<option value="${esc(t)}">`).join("")}</datalist></form></div><div class="detail-section"><div class="section-label">${icon("pin")} ENDEREÇO</div><input class="detail-input" id="address" placeholder="Adicionar endereço..." value="${esc(c.address)}" aria-label="Endereço do cliente"></div><div class="detail-section"><div class="section-label">${icon("note")} ANOTAÇÕES INTERNAS</div><textarea id="notes" placeholder="Anote detalhes importantes sobre este cliente..." aria-label="Anotações internas">${esc(c.notes)}</textarea><small class="private-note">${live() ? "Interno · equipe autorizada" : "Visível apenas nesta demonstração."}</small></div><button class="create-order" id="create-order">${icon("box")} Criar pedido ${icon("plus")}</button><button class="simulate" id="simulate" ${live() ? "hidden" : ""}>${icon("bolt")} Simular mensagem recebida</button>`;
  $("#close-details").onclick = () => {
    detailOpen = false;
    $(".inbox-layout").classList.remove("show-details");
    $(".inbox-layout").classList.add("details-hidden");
  };
  $("#add-tag-form").onsubmit = (e) => {
    e.preventDefault();
    const t = $("#new-tag").value.trim();
    if (!t) return;
    if (!c.tags.includes(t)) c.tags.push(t);
    if (!state.tags.includes(t)) state.tags.push(t);
    save();
    renderDetails();
    renderList();
  };
  document.querySelectorAll("[data-remove-tag]").forEach(
    (b) =>
      (b.onclick = () => {
        c.tags.splice(Number(b.dataset.removeTag), 1);
        save();
        renderDetails();
        renderList();
      }),
  );
  $("#notes").oninput = (e) => {
    c.notes = e.target.value;
    save();
  };
  $("#address").oninput = (e) => {
    c.address = e.target.value;
    save();
  };
  $("#simulate").onclick = simulate;
  $("#create-order").onclick = () => orderModal(c);
}
function simulate() {
  const c = current();
  c.messages.push(["in", "Olá! Gostaria de pedir um gás.", now()]);
  if (state.rules[0].enabled)
    c.messages.push(["out", state.rules[0].text, now()]);
  c.done = false;
  save();
  renderInbox();
  toast(
    "Entrada simulada. Regra de boas-vindas " +
      (state.rules[0].enabled ? "aplicada." : "desativada."),
  );
}
function renderClients() {
  const paint = (q = "") => {
    $("#client-rows").innerHTML =
      state.clients
        .filter((c) =>
          (c.name + " " + c.phone + " " + c.tags.join(" "))
            .toLowerCase()
            .includes(q.toLowerCase()),
        )
        .map(
          (c) =>
            `<tr><td><div class="table-person">${avatar(c)}<div><strong>${esc(c.name)}</strong><small>${esc(c.phone)}</small></div></div></td><td>${esc(accountName(c))}</td><td>${c.tags.map(tag).join(" ")}</td><td>${c.done ? "Concluído" : "Em atendimento"}</td><td><button class="text-button" data-open-client="${c.id}">Abrir conversa ${icon("arrow")}</button></td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="5" class="empty-cell">Nenhum cliente encontrado.</td></tr>';
    document.querySelectorAll("[data-open-client]").forEach(
      (b) =>
        (b.onclick = () => {
          selected = Number(b.dataset.openClient);
          mobileChat = true;
          location.hash = "atendimento";
        }),
    );
  };
  $("#view").innerHTML =
    `<div class="content-card"><div class="card-heading"><h2>Todos os clientes <span class="count-pill">${state.clients.length}</span></h2><div class="search-field">${icon("search")}<input id="client-search" aria-label="Buscar clientes" placeholder="Buscar clientes..."></div></div><div class="table-scroll"><table><thead><tr><th>CLIENTE</th><th>CONTA</th><th>ETIQUETAS</th><th>STATUS</th><th></th></tr></thead><tbody id="client-rows"></tbody></table></div></div>`;
  paint();
  $("#client-search").oninput = (e) => paint(e.target.value);
}
function orderModal(c) {
  modal(
    "Novo pedido",
    `<p class="muted">Registre um pedido para ${esc(c.name)}. ${live() ? "Se a regra de confirmação estiver ativa, ela será enviada quando você mover o pedido para Preparando." : "Nenhuma mensagem será enviada automaticamente."}</p><form id="order-form"><label>Produto<select name="product"><option>Botijão de gás · 13 kg</option><option>Botijão de gás · 45 kg</option><option>Água mineral · 20 L</option></select></label><div class="form-row"><label>Quantidade<input name="quantity" type="number" min="1" max="99" value="1" required></label><label>Valor total (R$)<input name="price" type="number" min="0.01" max="99999" step="0.01" placeholder="0,00" required></label></div><label>Endereço de entrega<input name="address" value="${esc(c.address)}" required maxlength="250"></label><label>Pagamento<select name="payment"><option>Pix</option><option>Cartão</option><option>Dinheiro</option></select></label><button class="primary full">Salvar pedido</button></form>`,
  );
  $("#order-form").onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    state.orders.push({
      ...data,
      id: Date.now(),
      clientId: c.id,
      status: "Novo pedido",
    });
    c.address = data.address;
    save();
    $("#modal").close();
    toast(
      "Pedido criado. " +
        (live() ? "Sincronizando com o banco." : "Salvo neste navegador.") +
        "",
    );
    if (page === "pedidos") renderOrders();
  };
}
function renderOrders() {
  const statuses = ["Novo pedido", "Preparando", "Em entrega", "Entregue"];
  $("#view").innerHTML =
    `<div class="section-banner">${icon("box")}<div><strong>O próximo pedido começa com uma conversa.</strong><p>Crie pedidos pelo painel do cliente e acompanhe cada etapa aqui.</p></div><button class="outline" id="order-new">${icon("plus")} Novo pedido</button></div><div class="order-board">${statuses
      .map(
        (status) =>
          `<section class="order-column"><h3><i class="status-dot ${status === "Entregue" ? "green-dot" : ""}"></i>${status}<span>${state.orders.filter((o) => o.status === status).length}</span></h3>${
            state.orders
              .filter((o) => o.status === status)
              .map((o) => {
                const c = state.clients.find((c) => c.id === o.clientId);
                return `<article class="order-card"><span class="eyebrow">PEDIDO #${String(o.id).slice(-5)}</span><h3>${esc(c.name)}</h3><p>${esc(o.quantity)} × ${esc(o.product)}</p><p>${esc(o.address)}</p><div class="order-price">${Number(o.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}<small>${esc(o.payment)}</small></div>${o.automationWarning ? `<p class="order-warning">${esc(o.automationWarning)}</p>` : ""}<select data-order-status="${o.id}" aria-label="Status do pedido ${String(o.id).slice(-5)}">${statuses.map((s) => `<option ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></article>`;
              })
              .join("") ||
            '<div class="board-empty">Nenhum pedido nesta etapa</div>'
          }</section>`,
      )
      .join("")}</div>`;
  $("#order-new").onclick = () => {
    modal(
      "Escolha o cliente",
      `<div class="choose-client">${state.clients.map((c) => `<button data-order-client="${c.id}">${avatar(c)}${esc(c.name)}${icon("chevron")}</button>`).join("")}</div>`,
    );
    document.querySelectorAll("[data-order-client]").forEach(
      (b) =>
        (b.onclick = () => {
          $("#modal").close();
          orderModal(
            state.clients.find((c) => c.id === Number(b.dataset.orderClient)),
          );
        }),
    );
  };
  document.querySelectorAll("[data-order-status]").forEach(
    (s) =>
      (s.onchange = () => {
        state.orders.find(
          (o) => o.id === Number(s.dataset.orderStatus),
        ).status = s.value;
        save();
        renderOrders();
      }),
  );
}
function renderTags() {
  $("#view").innerHTML =
    `<div class="section-banner">${icon("tag")}<div><strong>Um lugar para cada etapa do atendimento.</strong><p>As etiquetas ajudam a encontrar pedidos e identificar seus clientes.</p></div><button class="primary" id="new-label">${icon("plus")} Nova etiqueta</button></div><div class="tag-grid">${state.tags.map((t, i) => `<article class="content-card label-card"><span class="label-icon">${icon("tag")}</span><h3>${esc(t)}</h3><p>${state.clients.filter((c) => c.tags.includes(t)).length} cliente(s) com esta etiqueta</p><button class="text-button" data-tag-view="${i}">Ver conversas ${icon("arrow")}</button><button class="delete-label" data-tag-delete="${i}" aria-label="Excluir etiqueta ${esc(t)}">${icon("x")}</button></article>`).join("")}</div>`;
  $("#new-label").onclick = () => {
    modal(
      "Nova etiqueta",
      '<form id="label-form"><label>Nome da etiqueta<input name="label" required maxlength="40" placeholder="Ex.: Aguardando pagamento"></label><button class="primary full">Criar etiqueta</button></form>',
    );
    $("#label-form").onsubmit = (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get("label").trim();
      if (!name) return;
      if (state.tags.includes(name)) {
        toast("Esta etiqueta já existe.");
        return;
      }
      state.tags.push(name);
      save();
      $("#modal").close();
      renderTags();
    };
  };
  document.querySelectorAll("[data-tag-view]").forEach(
    (b) =>
      (b.onclick = () => {
        query = state.tags[Number(b.dataset.tagView)];
        filter = "all";
        account = "all";
        location.hash = "atendimento";
      }),
  );
  document.querySelectorAll("[data-tag-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        const name = state.tags[Number(b.dataset.tagDelete)];
        modal(
          "Excluir etiqueta?",
          `<p>“${esc(name)}” será removida também dos clientes nesta demonstração.</p><button class="primary full" id="confirm-delete">Excluir etiqueta</button>`,
        );
        $("#confirm-delete").onclick = () => {
          state.tags = state.tags.filter((t) => t !== name);
          state.clients.forEach(
            (c) => (c.tags = c.tags.filter((t) => t !== name)),
          );
          save();
          $("#modal").close();
          renderTags();
        };
      }),
  );
}
function renderRules() {
  $("#view").innerHTML =
    `<div class="section-banner">${icon("bolt")}<div><strong>Seu atendimento continua com a sua voz.</strong><p>${live() ? "Boas-vindas, ausência e confirmação são processadas pelo servidor nas contas conectadas." : "Regras demonstrativas. Para testar as boas-vindas, use “Simular mensagem recebida” na conversa."}</p></div><span class="status-label">${live() ? "Ativas nas contas conectadas" : "Sem execução no WhatsApp"}</span></div><div class="automation-grid">${state.rules.map((r, i) => `<article class="content-card automation-card"><div class="rule-top"><span class="metric-icon orange">${icon(i === 1 ? "clock" : i === 2 ? "box" : "chat")}</span><label class="switch"><input type="checkbox" data-rule="${i}" aria-label="Ativar ${esc(r.name)}" ${r.enabled ? "checked" : ""}><span></span></label></div><h2>${esc(r.name)}</h2><p class="rule-trigger">${esc(r.trigger)}</p><div class="rule-preview">${esc(r.text)}</div><div class="rule-footer"><span>${r.enabled ? (live() ? "● Habilitada" : "● Habilitada na demonstração") : "○ Desativada"}</span><button class="text-button" data-edit-rule="${i}">Editar mensagem ${icon("arrow")}</button></div></article>`).join("")}</div><div class="info-card">${icon("note")}<p>${live() ? "Boas-vindas responde ao primeiro contato dentro do expediente; fora do horário responde uma vez por cliente por dia. Pedido confirmado é enviado ao mover para Preparando. A janela de 24 horas é respeitada. Mensagens de texto são suportadas; anexos recebidos são identificados para consulta no aplicativo." : "Boas-vindas pode ser testada na simulação. Fora do horário e pedido confirmado têm textos configuráveis; seus gatilhos reais dependem do servidor e da integração oficial."}</p></div>`;
  document.querySelectorAll("[data-rule]").forEach(
    (el) =>
      (el.onchange = () => {
        state.rules[Number(el.dataset.rule)].enabled = el.checked;
        save();
        renderRules();
      }),
  );
  document.querySelectorAll("[data-edit-rule]").forEach(
    (b) =>
      (b.onclick = () => {
        const r = state.rules[Number(b.dataset.editRule)];
        modal(
          r.name,
          `<form id="rule-form"><label>Mensagem<textarea name="text" rows="6" maxlength="2000" required>${esc(r.text)}</textarea></label><button class="primary full">Salvar mensagem</button></form>`,
        );
        $("#rule-form").onsubmit = (e) => {
          e.preventDefault();
          const text = new FormData(e.target).get("text").trim();
          if (!text) return;
          r.text = text;
          save();
          $("#modal").close();
          renderRules();
          toast("Mensagem atualizada.");
        };
      }),
  );
}
function renderAccounts() {
  $("#view").innerHTML =
    `<div class="section-banner">${icon("phone")}<div><strong>As duas frentes do seu atendimento, juntas.</strong><p>Identifique a origem de cada conversa e responda pela conta certa.</p></div><span class="status-label">${live() ? state.accounts.filter((a) => a.verifiedAt).length : "0"} de 2 contas verificadas</span></div><div class="accounts-grid">${state.accounts.map((a) => `<article class="content-card account-card"><div class="account-card-top"><span class="account-large">${icon("phone")}</span><span class="status-label">${live() ? (a.verifiedAt ? "Verificada pela Meta" : a.configured ? "Verificar conexão" : "Configuração pendente") : "Conexão pendente"}</span></div><h2>${esc(a.name)}</h2><p>${esc(a.number)}</p><div class="account-stats"><div><strong>${state.clients.filter((c) => c.account === a.id).length}</strong><small>${live() ? "Conversas" : "Conversas fictícias"}</small></div><div><strong class="last-sync">${a.lastReceivedAt ? esc(new Date(a.lastReceivedAt).toLocaleString("pt-BR")) : "—"}</strong><small>Última mensagem recebida</small></div></div><div class="account-actions"><button class="primary" data-connect="${a.id}">${icon("phone")} ${live() ? "Verificar conexão" : "Como conectar"}</button><button class="outline" data-account-edit="${a.id}">Editar nome</button></div></article>`).join("")}</div><div class="info-card">${icon("note")}<p>Você usa os dois números no aplicativo WhatsApp Business. A conexão real precisa verificar a elegibilidade para coexistência com a API oficial. Nenhum QR code ou conexão é simulado nesta interface.</p></div>`;
  document.querySelectorAll("[data-connect]").forEach(
    (b) =>
      (b.onclick = () => {
        if (live()) {
          checkAccount(b.dataset.connect);
          return;
        }
        modal(
          "Conexão oficial do WhatsApp",
          `<p class="muted">A interface está pronta para a próxima etapa. Para receber e enviar mensagens reais:</p><ol class="connection-steps"><li>Verificar a elegibilidade de cada número para coexistência com o aplicativo.</li><li>Configurar a conta empresarial Meta ou o provedor oficial escolhido.</li><li>Implementar servidor, banco de dados e webhook HTTPS para as duas contas.</li><li>Conectar credenciais com segurança e testar envio e recebimento.</li></ol><div class="form-note">Os números e credenciais não são solicitados nem enviados por esta demonstração.</div>`,
        );
      }),
  );
  document.querySelectorAll("[data-account-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        const a = state.accounts.find((a) => a.id === b.dataset.accountEdit);
        modal(
          "Editar conta",
          `<form id="account-form"><label>Nome da conta<input name="name" value="${esc(a.name)}" maxlength="50" required></label><button class="primary full">Salvar nome</button></form>`,
        );
        $("#account-form").onsubmit = (e) => {
          e.preventDefault();
          const name = new FormData(e.target).get("name").trim();
          if (!name) return;
          a.name = name;
          save();
          $("#modal").close();
          renderAccounts();
        };
      }),
  );
}
async function checkAccount(id) {
  try {
    const row = await Platform.request("/api/accounts/check", {
      method: "POST",
      body: JSON.stringify({ account: id }),
    });
    Platform.installRemote(row);
    toast("Número verificado com a Meta. Faça um teste de recebimento.");
  } catch (error) {
    toast(error.message);
  }
}
function renderSettings() {
  $("#view").innerHTML =
    `<div class="settings-grid"><section class="content-card settings-card"><span class="eyebrow">PERFIL DA EMPRESA</span><h2>O jeito MSN de atender.</h2><p class="muted">Personalize os dados da sua operação.</p><form id="business-form"><label>Nome da empresa<input name="name" required maxlength="80" value="${esc(state.business.name)}"></label><label>Horário de atendimento<input name="hours" required maxlength="120" value="${esc(state.business.hours)}"></label>${live() ? `<div class="form-row"><label>Abertura<input name="start" type="time" required value="${esc(state.business.start)}"></label><label>Fechamento<input name="end" type="time" required value="${esc(state.business.end)}"></label></div><label>Dias de atendimento (horário de Fortaleza)</label><div class="schedule-days">${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day, i) => `<label><input type="checkbox" name="days" value="${i}" ${state.business.days.includes(i) ? "checked" : ""}>${day}</label>`).join("")}</div>` : ""}<div class="form-note">${live() ? "As automações usam os dias e horas acima no fuso de Fortaleza." : "O horário fica registrado para referência. O envio automático fora do expediente exige a integração do servidor."}</div><button class="primary">Salvar configurações</button></form></section><section class="content-card settings-card"><span class="eyebrow">SOBRE ESTA VERSÃO</span><h2>Sua central está tomando forma.</h2><p class="muted">${live() ? "Dados compartilhados no banco, login restrito e atualização a cada 8 segundos. A conexão dos números depende da configuração oficial." : "Todos os dados e ajustes desta interface ficam apenas neste navegador. Ainda não há autenticação, sincronização de equipe ou conexão com o WhatsApp."}</p><div class="settings-feature">${icon("check")} Identidade visual DISK MSN GAS</div><div class="settings-feature">${icon("check")} Duas contas na mesma caixa de entrada</div><div class="settings-feature">${icon("check")} Etiquetas, pedidos e respostas rápidas</div><div class="settings-feature pending">${icon("clock")} ${live() ? "Integração disponível para contas configuradas" : "Integração oficial pendente"}</div>${!live() ? `<div class="form-note"><strong>Ativar o MVP real</strong><br>1. Crie um projeto no Supabase.<br>2. Configure o banco e o login seguindo o guia do repositório.<br>3. Adicione as credenciais nas configurações seguras da Vercel e publique novamente.<br>O modo real começa com a base vazia, sem importar clientes fictícios.</div>` : ""}<button class="outline" id="export-data">${icon("note")} Exportar dados</button></section></div>`;
  $("#business-form").onsubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    if (!data.name.trim() || !data.hours.trim()) return;
    if (live()) {
      data.days = form.getAll("days").map(Number);
      if (!data.days.length || data.start >= data.end) {
        toast(
          "Selecione dias e um expediente com abertura antes do fechamento.",
        );
        return;
      }
    }
    state.business = { ...state.business, ...data };
    save();
    toast(
      "Configurações registradas. " +
        (live() ? "Sincronizando com o banco." : "Salvas neste navegador.") +
        "",
    );
  };
  $("#export-data").onclick = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "disk-msn-gas-demonstracao.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Exportação iniciada.");
  };
}
$("#new-conversation").onclick = () => {
  modal(
    "Nova conversa",
    `<p class="muted">${live() ? "Cadastre o número com DDI e DDD. O envio de texto estará disponível após uma mensagem do cliente." : "Cadastre um cliente fictício para testar o atendimento."}</p><form id="new-client-form"><label>Nome do cliente<input name="name" required maxlength="80" placeholder="Nome completo"></label><label>WhatsApp do cliente<input name="phone" maxlength="40" ${live() ? 'required pattern="[+]?[1-9][0-9]{7,14}"' : ""} placeholder="${live() ? "Ex.: 5585999999999" : "Identificação fictícia (opcional)"}"></label><label>Conta de atendimento<select name="account">${state.accounts.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></label><button class="primary full">Criar conversa</button></form>`,
  );
  $("#new-client-form").onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!data.name.trim()) return;
    const c = {
      ...data,
      name: data.name.trim(),
      phone: data.phone.replace(/^\+/, "") || "Cliente de demonstração",
      id: Date.now(),
      tags: ["Novo pedido"],
      notes: "",
      address: "",
      done: false,
      unread: 0,
      time: now(),
      color: "peach",
      messages: [],
    };
    state.clients.unshift(c);
    selected = c.id;
    query = "";
    filter = "all";
    account = "all";
    mobileChat = true;
    save();
    $("#modal").close();
    if (page === "atendimento") navigate();
    else location.hash = "atendimento";
  };
};
$("#close-modal").onclick = () => $("#modal").close();
$("#modal").onclick = (e) => {
  if (e.target === $("#modal")) {
    const r = $("#modal").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      $("#modal").close();
  }
};
$("#notifications").onclick = () => {
  if (live()) {
    showLiveNotifications();
    return;
  }
  modal(
    "Notificações",
    `<div class="empty-state">${icon("bell")}<h3>Tudo em dia por aqui.</h3><p>Esta versão não recebe notificações do WhatsApp. Novos eventos aparecerão após a integração.</p></div>`,
  );
};
function showLiveNotifications() {
  const pending = state.outbox || [];
  modal(
    "Fila e falhas de envio",
    pending.length
      ? pending
          .map(
            (j) =>
              `<div class="notification-item"><strong>${esc(state.clients.find((c) => c.id === j.clientId)?.name || "Cliente")}</strong><p>${esc({ pending: "Na fila", sending: "Enviando", failed: "Falha no envio", uncertain: "Envio incerto" }[j.status] || j.status)}</p><small>${esc(j.error || "Acompanhe o status pela conversa.")}</small>${j.status === "failed" ? `<button class="outline" data-retry-job="${esc(j.id)}">Tentar novamente</button>` : ""}</div>`,
          )
          .join("")
      : '<div class="empty-state"><h3>Nenhuma pendência de envio.</h3><p>Mensagens enviadas e entregues aparecem na conversa.</p></div>',
  );
  document.querySelectorAll("[data-retry-job]").forEach(
    (b) =>
      (b.onclick = async () => {
        b.disabled = true;
        try {
          const row = await Platform.request("/api/messages/retry", {
            method: "POST",
            body: JSON.stringify({ id: b.dataset.retryJob }),
          });
          Platform.installRemote(row);
          showLiveNotifications();
        } catch (error) {
          toast(error.message);
          b.disabled = false;
        }
      }),
  );
}
$("#help").onclick = () =>
  modal(
    "Bem-vindo à DISK MSN GAS",
    `<p class="muted">Sua central para organizar as conversas de dois números e agilizar os pedidos de gás.</p><ol class="connection-steps"><li>Selecione um cliente e teste as respostas rápidas.</li><li>Adicione etiquetas, endereço e anotações no painel lateral.</li><li>Crie um pedido e acompanhe sua etapa no menu Pedidos.</li><li>Edite as automações e simule uma mensagem recebida.</li></ol><div class="form-note">Prévia interativa com dados fictícios. Sem conexão com contas reais.</div>`,
  );
window.addEventListener("hashchange", () => {
  navigate();
  Platform.decorate();
});
Platform.bootstrap({
  onState: (data) => {
    for (const collection of ["clients", "accounts", "orders", "rules"]) {
      data[collection] = data[collection].map((item) => {
        const previous = state[collection].find((old) =>
          collection === "rules" ? old.name === item.name : old.id === item.id,
        );
        return previous ? Object.assign(previous, item) : item;
      });
    }
    state = data;
    if (!state.clients.some((c) => c.id === selected))
      selected = state.clients[0]?.id;
    const focus = document.activeElement;
    const editing =
      focus && ["INPUT", "TEXTAREA", "SELECT"].includes(focus.tagName);
    if (!editing) navigate();
  },
  onReady: () => {
    document.body.classList.remove("booting");
    navigate();
    Platform.decorate();
  },
});

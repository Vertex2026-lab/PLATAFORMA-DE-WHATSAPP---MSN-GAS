/* Runtime bridge: demonstration stays local; operational mode uses authenticated APIs. */
(() => {
  const clone = (value) =>
    value === undefined ? undefined : structuredClone(value);
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const fields = {
    accounts: ["id", "name"],
    clients: [
      "id",
      "account",
      "phone",
      "name",
      "tags",
      "notes",
      "address",
      "done",
      "unread",
    ],
    orders: [
      "id",
      "clientId",
      "product",
      "quantity",
      "price",
      "address",
      "payment",
      "status",
    ],
  };
  function project(data) {
    const out = {
      tags: clone(data.tags),
      rules: data.rules.map((r) => ({ text: r.text, enabled: r.enabled })),
      business: clone(data.business),
    };
    for (const [collection, names] of Object.entries(fields))
      out[collection] = data[collection].map((item) =>
        Object.fromEntries(
          names
            .filter((n) => item[n] !== undefined)
            .map((n) => [n, clone(item[n])]),
        ),
      );
    return out;
  }
  function changes(before, after) {
    const edits = [];
    if (!equal(before.tags, after.tags))
      edits.push({
        collection: null,
        field: "tags",
        old: before.tags,
        value: after.tags,
      });
    for (const field of Object.keys(after.business))
      if (!equal(before.business[field], after.business[field]))
        edits.push({
          collection: "business",
          field,
          old: before.business[field],
          value: after.business[field],
        });
    after.rules.forEach((r, i) => {
      for (const field of ["text", "enabled"])
        if (!equal(before.rules[i][field], r[field]))
          edits.push({
            collection: "rules",
            id: i,
            field,
            old: before.rules[i][field],
            value: r[field],
          });
    });
    for (const collection of Object.keys(fields))
      for (const item of after[collection]) {
        const old = before[collection].find((x) => x.id === item.id);
        if (!old) edits.push({ collection, id: item.id, newItem: item });
        else
          for (const field of fields[collection].filter((f) => f !== "id"))
            if (!equal(old[field], item[field]))
              edits.push({
                collection,
                id: item.id,
                field,
                old: old[field],
                value: item[field],
              });
      }
    return clone(edits);
  }
  function merge(data, edits) {
    const result = clone(data);
    for (const edit of edits) {
      const { collection, id, field } = edit;
      if (edit.newItem) {
        const found = result[collection].find((x) => x.id === id);
        if (!found) result[collection].push(clone(edit.newItem));
        else if (
          !equal(
            project({ ...result, [collection]: [found] })[collection][0],
            edit.newItem,
          )
        )
          throw Error(
            "Outro usuário cadastrou um registro com a mesma identificação.",
          );
        continue;
      }
      const target =
        collection === null
          ? result
          : collection === "business"
            ? result.business
            : collection === "rules"
              ? result.rules[id]
              : result[collection].find((x) => x.id === id);
      if (!target)
        throw Error(
          "Um registro foi alterado. Atualize a página antes de continuar.",
        );
      if (
        !(field === "unread" && edit.value === 0) &&
        !equal(target[field], edit.old) &&
        !equal(target[field], edit.value)
      )
        throw Error(
          "Outro atendente alterou este mesmo campo. Exporte seus ajustes pendentes e atualize a página.",
        );
      target[field] = clone(edit.value);
    }
    return result;
  }
  const api = {
    mode: "loading",
    email: "",
    saving: false,
    failed: false,
    revision: 0,
    remote: null,
    snapshot: null,
    queue: [],
    sendKeys: new Map(),
    onState: null,
    onReady: null,
    async request(path, options = {}, retry = true) {
      const response = await fetch(path, {
        credentials: "same-origin",
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
      });
      if (response.status === 401 && retry && !path.startsWith("/api/auth/")) {
        const refresh = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (refresh.ok) return api.request(path, options, false);
      }
      const data = await response.json().catch(() => null);
      const failures = {
        404: "A rota de acesso não foi encontrada. Aguarde a publicação mais recente e atualize a página.",
        405: "A publicação não aceitou o formulário de login. Atualize para a versão mais recente.",
        502: "O servidor de acesso está indisponível. Tente novamente em instantes.",
        504: "O servidor demorou para responder. Tente novamente em instantes.",
      };
      if (!response.ok || !data || typeof data !== "object") {
        const error = Error(
          (typeof data?.error === "string" && data.error) ||
            failures[response.status] ||
            `O servidor retornou uma resposta inesperada (HTTP ${response.status}).`,
        );
        error.status = response.status;
        error.code = data?.code;
        throw error;
      }
      return data;
    },
    status(text, error = false) {
      const footer = document.querySelector(".app-footer>span");
      if (footer) {
        footer.textContent = text;
        footer.classList.toggle("save-error", error);
      }
    },
    installRemote(row) {
      api.remote = row.data;
      api.revision = row.version;
      api.snapshot = project(row.data);
      api.onState(clone(row.data));
      api.decorate();
    },
    decorate() {
      if (api.mode !== "live") return;
      const pill = document.querySelector(".demo-pill");
      pill.textContent = "● Operação · Sair";
      pill.title = `Conectado como ${api.email}. Clique para sair.`;
      pill.onclick = async () => {
        if (api.saving || api.failed || api.queue.length) {
          alert(
            "Há alterações pendentes. Resolva ou exporte seus ajustes antes de sair.",
          );
          return;
        }
        await api.request("/api/auth/logout", { method: "POST", body: "{}" });
        location.reload();
      };
      api.status(
        api.failed
          ? "Alterações pendentes — não feche esta página"
          : api.saving
            ? "Salvando no banco..."
            : "Dados sincronizados com o banco",
        api.failed,
      );
    },
    persist(data) {
      if (api.mode !== "live") {
        try {
          localStorage.setItem("disk-msn-gas-v2", JSON.stringify(data));
        } catch {
          alert("Não foi possível salvar no navegador.");
        }
        return;
      }
      const next = project(data);
      const edits = changes(api.snapshot, next);
      api.snapshot = clone(next);
      if (!edits.length) return;
      api.queue.push(edits);
      api.drain();
    },
    async drain() {
      if (api.saving || api.failed) return;
      api.saving = true;
      api.decorate();
      try {
        while (api.queue.length) {
          const edits = api.queue[0];
          let committed = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            const candidate = merge(api.remote, edits);
            try {
              const row = await api.request("/api/state", {
                method: "PUT",
                body: JSON.stringify({
                  version: api.revision,
                  data: candidate,
                }),
              });
              api.remote = row.data;
              api.revision = row.version;
              api.queue.shift();
              committed = true;
              break;
            } catch (error) {
              if (error.code !== "CONFLICT") throw error;
              const fresh = await api.request("/api/state");
              api.remote = fresh.data;
              api.revision = fresh.version;
            }
          }
          if (!committed)
            throw Error(
              "Muitas atualizações simultâneas. Tente salvar novamente.",
            );
        }
        api.installRemote({ data: api.remote, version: api.revision });
        document.querySelector("#sync-recovery")?.remove();
      } catch (error) {
        api.failed = true;
        api.recovery(error.message);
      } finally {
        api.saving = false;
        api.decorate();
      }
    },
    recovery(message) {
      document.querySelector("#sync-recovery")?.remove();
      const box = document.createElement("section");
      box.id = "sync-recovery";
      box.className = "sync-recovery";
      const p = document.createElement("p");
      p.textContent = `Não salvo: ${message}`;
      const retry = document.createElement("button");
      retry.textContent = "Tentar salvar";
      retry.onclick = async () => {
        api.failed = false;
        const row = await api.request("/api/state").catch(() => null);
        if (row) {
          api.remote = row.data;
          api.revision = row.version;
        }
        api.drain();
      };
      const backup = document.createElement("button");
      backup.textContent = "Exportar ajustes pendentes";
      backup.onclick = () => {
        const url = URL.createObjectURL(
          new Blob(
            [
              JSON.stringify(
                { edits: api.queue, snapshot: api.snapshot },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          ),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "disk-msn-gas-ajustes-pendentes.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
      const discard = document.createElement("button");
      discard.textContent = "Descartar ajustes e atualizar";
      discard.onclick = async () => {
        if (
          !confirm(
            "Descartar somente os ajustes ainda não salvos? Os dados já salvos no banco serão mantidos.",
          )
        )
          return;
        try {
          const row = await api.request("/api/state");
          api.queue = [];
          api.failed = false;
          api.installRemote(row);
          box.remove();
        } catch (error) {
          p.textContent = error.message;
        }
      };
      box.append(p, retry, backup, discard);
      document.body.append(box);
    },
    async send(clientId, text) {
      if (api.failed || api.saving || api.queue.length)
        throw Error("Aguarde os ajustes serem salvos antes de enviar.");
      const fingerprint = `${clientId}:${text}`;
      if (!api.sendKeys.has(fingerprint))
        api.sendKeys.set(fingerprint, crypto.randomUUID());
      const row = await api.request("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          text,
          key: api.sendKeys.get(fingerprint),
        }),
      });
      if (["sent", "delivered", "read"].includes(row.delivery.status))
        api.sendKeys.delete(fingerprint);
      api.installRemote(row);
      return row.delivery;
    },
    async refresh() {
      if (
        api.saving ||
        api.failed ||
        api.queue.length ||
        document.hidden ||
        document.querySelector("dialog[open]") ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
      )
        return;
      try {
        await api.request("/api/worker", { method: "POST", body: "{}" });
        const row = await api.request("/api/state");
        if (row.version !== api.revision) api.installRemote(row);
      } catch (error) {
        api.status(
          error.status === 401
            ? "Sessão expirada. Atualize a página para entrar."
            : "Sem sincronização. Tentando reconectar...",
          true,
        );
      }
    },
    async bootstrap({ onState, onReady }) {
      api.onState = onState;
      api.onReady = onReady;
      try {
        const response = await fetch("/api/config");
        if (response.status === 404) {
          api.mode = "demo";
          onReady();
          return;
        }
        if (!response.ok)
          throw Error(
            "Servidor temporariamente indisponível. Atualize a página.",
          );
        const config = await response.json();
        api.mode = config.mode;
        if (api.mode === "demo") {
          onReady();
          return;
        }
        try {
          let user;
          try {
            user = await api.request("/api/auth/me");
          } catch (error) {
            if (error.status !== 401) throw error;
            await api.request("/api/auth/refresh", {
              method: "POST",
              body: "{}",
            });
            user = await api.request("/api/auth/me");
          }
          api.email = user.email;
          await api.startLive();
        } catch (error) {
          api.login(error.status === 401 ? "" : error.message);
        }
      } catch (error) {
        api.block(error.message);
      }
    },
    async startLive() {
      const row = await api.request("/api/state");
      document.querySelector("#login-screen")?.remove();
      document.body.classList.remove("booting");
      api.installRemote(row);
      api.onReady();
      api.decorate();
      if (!api.timer) api.timer = setInterval(api.refresh, 8000);
    },
    login(message = "") {
      document.body.classList.add("booting");
      document.querySelector("#login-screen")?.remove();
      const screen = document.createElement("section");
      screen.id = "login-screen";
      screen.className = "login-screen";
      screen.innerHTML =
        '<div class="login-card"><div class="login-logo">DISK MSN <b>GAS</b></div><span class="eyebrow">SUA CENTRAL DE ATENDIMENTO</span><h1>Bom ter você por aqui.</h1><p class="muted">Entre para acessar as conversas e os pedidos da sua operação.</p><form id="login-form"><label>E-mail<input name="email" type="email" autocomplete="username" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" required></label><button class="primary full">Entrar na central</button><p class="login-error" role="alert"></p></form><small>Acesso restrito aos atendentes autorizados.</small></div>';
      document.body.append(screen);
      screen.querySelector(".login-error").textContent = message;
      screen.querySelector("form").onsubmit = async (event) => {
        event.preventDefault();
        const button = screen.querySelector("button");
        button.disabled = true;
        button.textContent = "Entrando...";
        try {
          const credentials = Object.fromEntries(new FormData(event.target));
          const user = await api.request("/api/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials),
          });
          api.email = user.email;
          event.target.reset();
          await api.startLive();
        } catch (error) {
          screen.querySelector(".login-error").textContent = error.message;
        } finally {
          button.disabled = false;
          button.textContent = "Entrar na central";
        }
      };
    },
    block(message) {
      document.body.classList.add("booting");
      const box = document.createElement("section");
      box.className = "login-screen";
      const text = document.createElement("p");
      text.textContent = message;
      box.append(text);
      document.body.append(box);
    },
  };
  window.Platform = api;
})();
window.addEventListener("beforeunload", (event) => {
  if (
    window.Platform.mode === "live" &&
    (window.Platform.saving ||
      window.Platform.failed ||
      window.Platform.queue.length)
  ) {
    event.preventDefault();
    event.returnValue = "";
  }
});

import { AppError, initialState } from "./model.js";
export function configured(env = process.env) {
  return !!(
    env.SUPABASE_URL &&
    env.SUPABASE_SERVICE_ROLE_KEY &&
    env.AUTHORIZED_EMAILS
  );
}
export async function database(path, options = {}) {
  if (!configured())
    throw new AppError(
      503,
      "Banco de dados e acesso ainda não configurados.",
      "SETUP_REQUIRED",
    );
  const response = await fetch(
    `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`,
    {
      ...options,
      signal: AbortSignal.timeout(12000),
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        // New Supabase secret keys are API keys, not JWT bearer tokens.
        ...(process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_secret_")
          ? {}
          : { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }),
        "Content-Type": "application/json",
        ...options.headers,
      },
    },
  );
  if (!response.ok)
    throw new AppError(
      503,
      "Não foi possível acessar o banco. Verifique a configuração e a migração SQL.",
      "DATABASE_UNAVAILABLE",
    );
  if (response.status === 204) return null;
  const raw = await response.text();
  return raw ? JSON.parse(raw) : null;
}
export async function readState() {
  let rows = await database("app_state?id=eq.main&select=version,data");
  if (!rows.length) {
    await database("app_state", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ id: "main", version: 0, data: initialState() }),
    });
    rows = await database("app_state?id=eq.main&select=version,data");
  }
  if (!rows.length) throw new AppError(503, "Banco não inicializado.");
  return rows[0];
}
export async function compareAndSwap(version, data) {
  const rows = await database(`app_state?id=eq.main&version=eq.${version}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      version: version + 1,
      data,
      updated_at: new Date().toISOString(),
    }),
  });
  return rows?.[0] || null;
}
// Used only for server-originated events. Browser edits use a strict expected version.
export async function mutate(callback) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await readState();
    const result = await callback(row.data);
    if (result === false) return { ...row, result };
    const updated = await compareAndSwap(row.version, row.data);
    if (updated) return { ...updated, result };
  }
  throw new AppError(
    409,
    "A operação está ocupada. Tente novamente.",
    "CONFLICT",
  );
}

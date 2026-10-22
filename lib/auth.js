import { timingSafeEqual } from "node:crypto";
import { AppError } from "./model.js";
import { configured } from "./store.js";
export const allowed = (email) =>
  (process.env.AUTHORIZED_EMAILS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .includes(String(email).toLowerCase());
export function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .filter(Boolean)
      .map((x) => {
        const i = x.indexOf("=");
        return [x.slice(0, i).trim(), x.slice(i + 1)];
      }),
  );
}
export function setSession(res, session) {
  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL
      ? "; Secure"
      : "";
  res.setHeader("Set-Cookie", [
    `msn_access=${session.access_token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${Math.min(session.expires_in || 3600, 3600)}${secure}`,
    `msn_refresh=${session.refresh_token}; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=604800${secure}`,
  ]);
}
export function clearSession(res) {
  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL
      ? "; Secure"
      : "";
  res.setHeader("Set-Cookie", [
    `msn_access=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`,
    `msn_refresh=; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=0${secure}`,
  ]);
}
export async function authRequest(path, body, bearer) {
  if (!configured())
    throw new AppError(
      503,
      "Configure o banco de dados antes de entrar.",
      "SETUP_REQUIRED",
    );
  let response;
  try {
    response = await fetch(
      `${process.env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/${path}`,
      {
        method: body ? "POST" : "GET",
        signal: AbortSignal.timeout(10000),
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
  } catch {
    throw new AppError(503, "Serviço de acesso temporariamente indisponível.");
  }
  if (!response.ok)
    throw new AppError(
      response.status === 429 ? 429 : 401,
      response.status === 429
        ? "Muitas tentativas. Aguarde antes de tentar novamente."
        : "E-mail, senha ou sessão inválidos.",
    );
  return response.json();
}
export async function requireUser(req) {
  const token = cookies(req).msn_access;
  if (!token)
    throw new AppError(401, "Entre para acessar a central.", "LOGIN_REQUIRED");
  const user = await authRequest("user", null, token);
  if (!allowed(user.email))
    throw new AppError(
      403,
      "Este usuário não está autorizado a acessar a operação.",
    );
  return user;
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = process.env.VERCEL ? req.headers.host : req.headers.host || "";
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {}
  if (!origin || originHost !== host || !/^https?:\/\//.test(origin))
    throw new AppError(403, "Origem da requisição inválida.");
  if (req.headers["content-type"]?.split(";")[0] !== "application/json")
    throw new AppError(415, "Envie JSON.");
}
export function equalSecrets(a, b) {
  const x = Buffer.from(a || ""),
    y = Buffer.from(b || "");
  return !!x.length && x.length === y.length && timingSafeEqual(x, y);
}

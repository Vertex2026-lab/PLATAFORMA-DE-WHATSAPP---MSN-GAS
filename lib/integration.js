import { AppError } from "./model.js";
export function integrationProvider(env = process.env) {
  return env.WA_PROVIDER === "qr" ? "qr" : "meta";
}
export function accountConfigured(
  id,
  env = process.env,
  provider = integrationProvider(env),
) {
  return provider === "qr"
    ? !!(env.WA_GATEWAY_URL && env.WA_GATEWAY_TOKEN)
    : !!(
        env[`WA_PHONE_ID_${id}`] &&
        env[`WA_ACCESS_TOKEN_${id}`] &&
        env.WA_APP_SECRET &&
        env.WA_VERIFY_TOKEN
      );
}
export async function gatewayRequest(path, body) {
  if (!accountConfigured("1", process.env, "qr"))
    throw new AppError(
      409,
      "O servidor de conexão por QR ainda não foi configurado na Vercel.",
      "GATEWAY_NOT_CONFIGURED",
    );
  const base = new URL(process.env.WA_GATEWAY_URL);
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    (base.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        ["localhost", "127.0.0.1"].includes(base.hostname)
      ))
  )
    throw new AppError(503, "Endereço do servidor QR inválido.");
  const response = await fetch(`${base.origin}${path}`, {
    method: body ? "POST" : "GET",
    signal: AbortSignal.timeout(18000),
    headers: {
      Authorization: `Bearer ${process.env.WA_GATEWAY_TOKEN}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const error = new AppError(
      response.status >= 500 ? 503 : response.status,
      data?.error || "O servidor QR está indisponível.",
      data?.code || "GATEWAY_UNAVAILABLE",
    );
    error.deliveryStatus = data?.deliveryStatus || "uncertain";
    throw error;
  }
  return data;
}

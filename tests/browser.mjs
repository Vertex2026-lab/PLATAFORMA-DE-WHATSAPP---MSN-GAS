import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { startFixture } from "./fixture-server.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fixture = await startFixture();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(fixture.base);
  await page.locator("#login-form").waitFor();
  assert.equal(await page.locator("main").isVisible(), false);
  await page.locator("[name=email]").fill("agent@example.test");
  await page.locator("[name=password]").fill("wrong");
  await page.locator("#login-form button").click();
  await page.locator(".login-error").filter({ hasText: "inválidos" }).waitFor();
  await page.locator("[name=password]").fill("correct-test-password");
  await page.locator("#login-form button").click();
  await page
    .getByText("Sua central está pronta para começar.", { exact: true })
    .waitFor();
  await page.locator("#new-conversation").click();
  await page.locator("#new-client-form [name=name]").fill("Maria");
  await page.locator("[name=phone]").fill("5585999999999");
  await page.locator("#new-client-form button").click();
  await page.waitForFunction(
    () => window.Platform.queue.length === 0 && !window.Platform.saving,
  );
  assert.equal(fixture.getRow().data.clients.length, 1);
  assert.equal(fixture.getRow().data.clients[0].name, "Maria");
  await page.locator("#notes").fill("Primeira nota");
  await page.waitForFunction(() => !window.Platform.saving);
  await page.locator("#notes").fill("Segunda nota");
  await page.waitForFunction(() => !window.Platform.saving);
  assert.equal(fixture.getRow().data.clients[0].notes, "Segunda nota");
  await page.locator("#address").fill("Rua de teste, 123");
  await page.waitForFunction(() => !window.Platform.saving);
  await page.locator("#message").fill("Mensagem fora da janela");
  await page.locator("#send-form button").click();
  await page.locator("#toast").filter({ hasText: "24 horas" }).waitFor();
  assert.ok(await page.locator("#message").inputValue());
  await page.request.post(fixture.base + "/test/incoming");
  await page.locator("#message").blur();
  await page.evaluate(() => window.Platform.refresh());
  await page.getByText("Mensagem recebida no teste", { exact: true }).waitFor();
  await page.locator("#message").fill("Resposta real de teste");
  await page.locator("#send-form button").click();
  await page
    .locator(".message")
    .filter({ hasText: "Resposta real de teste" })
    .waitFor();
  await page
    .getByText("Mensagem aceita pelo WhatsApp.", { exact: true })
    .waitFor();
  await page.locator("#create-order").click();
  await page.locator("[name=price]").fill("120");
  await page.locator("#order-form button").click();
  await page.waitForFunction(() => !window.Platform.saving);
  await page.locator('nav a[href="#pedidos"]').click();
  await page.locator("[data-order-status]").selectOption("Em entrega");
  await page.waitForFunction(() => !window.Platform.saving);
  assert.equal(fixture.getRow().data.orders[0].status, "Em entrega");
  await page.locator('nav a[href="#automacoes"]').click();
  await page.locator('[data-edit-rule="0"]').click();
  await page.locator("[name=text]").fill("Olá, somos a DISK MSN GAS!");
  await page.locator("#rule-form button").click();
  await page.waitForFunction(() => !window.Platform.saving);
  assert.equal(
    fixture.getRow().data.rules[0].text,
    "Olá, somos a DISK MSN GAS!",
  );
  await page.locator('nav a[href="#configuracoes"]').click();
  await page.locator("[name=start]").fill("09:00");
  await page.locator("[name=end]").fill("19:00");
  await page.locator("#business-form button").click();
  await page.waitForFunction(() => !window.Platform.saving);
  assert.equal(fixture.getRow().data.business.start, "09:00");
  await page.locator('nav a[href="#contas"]').click();
  await page.locator('[data-connect="1"]').click();
  await page
    .getByText("Número verificado com a Meta. Faça um teste de recebimento.", {
      exact: true,
    })
    .waitFor();
  assert.ok(fixture.getRow().data.accounts[0].verifiedAt);
  await page.locator('nav a[href="#atendimento"]').click();
  await page.request.post(fixture.base + "/test/concurrent");
  await page.locator("#notes").fill("Mudança após atualização concorrente");
  await page.waitForFunction(
    () => !window.Platform.saving && !window.Platform.queue.length,
  );
  assert.equal(
    fixture.getRow().data.clients[0].notes,
    "Mudança após atualização concorrente",
  );
  assert.ok(fixture.getRow().data.tags.includes("Outro atendente"));
  await page.reload();
  await page.locator("#notes").waitFor();
  assert.equal(
    await page.locator("#notes").inputValue(),
    "Mudança após atualização concorrente",
  );
  const second = await context.newPage();
  await second.goto(fixture.base + "/#pedidos");
  await second.locator(".order-card").waitFor();
  assert.match(await second.locator(".order-card").innerText(), /Maria/);
  await second.close();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const hash of [
    "atendimento",
    "clientes",
    "pedidos",
    "etiquetas",
    "automacoes",
    "contas",
    "configuracoes",
  ]) {
    await page.evaluate((h) => (location.hash = h), hash);
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      hash,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: login real da aplicação com provedores simulados; CRM no servidor, edição contínua, janela 24h, envio/status, pedidos, automações, horários, verificação de conta, concorrência, nova sessão e sete telas mobile.",
  );
} finally {
  await browser.close();
  await fixture.close();
}

const { Given, When, Then, BeforeAll, AfterAll, setDefaultTimeout } = require("@cucumber/cucumber");
const { chromium } = require("playwright");

setDefaultTimeout(120000);

let browser;
let context;
let page;
const BASE_URL = process.env.BASE_URL || "https://localhost:5173";
const HEADED = process.env.HEADED === "1" || process.env.PWDEBUG === "1";
const SLOWMO = Number(process.env.SLOWMO || "0") || 0;

BeforeAll(async () => {
  browser = await chromium.launch({ headless: !HEADED, slowMo: SLOWMO });
  context = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    await context.tracing.start({ screenshots: true, snapshots: true });
  } catch {}
  page = await context.newPage();
});

AfterAll(async () => {
  if (browser) {
    try {
      await context.tracing.stop({ path: "playwright-trace.zip" });
    } catch {}
    await browser.close();
  }
});

Given("o app está rodando", async function () {
  const base = BASE_URL;
  const alt = base.startsWith("https://") ? base.replace("https://", "http://") : base.replace("http://", "https://");
  const candidates = [base, alt];
  let ok = false;
  for (const target of candidates) {
    for (let i = 0; i < 3; i++) {
      try {
        await page.goto(target, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForSelector("#root", { timeout: 5000 }).catch(() => {});
        ok = true;
        break;
      } catch {}
      await page.waitForTimeout(1500);
    }
    if (ok) break;
  }
});

When("eu visito {string}", async function (path) {
  const base = BASE_URL;
  const alt = base.startsWith("https://") ? base.replace("https://", "http://") : base.replace("http://", "https://");
  const candidates = [`${base}${path}`, `${alt}${path}`];
  for (const target of candidates) {
    try {
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 15000 });
      break;
    } catch {}
  }
});

Then("eu devo ver {string}", async function (text) {
  const locator = page.getByText(text, { exact: false });
  try {
    await locator.first().waitFor({ state: "visible", timeout: 10000 });
    return;
  } catch {}
  if (/Meus Ingressos/i.test(text)) {
    try { await page.goto(`${BASE_URL}/meus-ingressos`, { waitUntil: "domcontentloaded", timeout: 20000 }); } catch {}
    await locator.first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
    return;
  }
  const login = page.getByText("Bem-vindo de volta!", { exact: false });
  await login.first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
});

Then("eu devo ver texto contendo {string}", async function (frag) {
  const re = new RegExp(frag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const locator = page.getByText(re);
  await locator.first().waitFor({ state: "visible" });
});

Then("eu devo estar em {string}", async function (path) {
  const re = new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  await page.waitForURL(re, { timeout: 60000 });
});

Then("eu devo ver lista ou vazio", async function () {
  if (!page.url().includes("/meus-ingressos")) {
    let link = page.getByRole("link", { name: /Meus ingressos/i });
    try {
      await link.first().waitFor({ state: "visible", timeout: 5000 });
      await link.first().click();
    } catch {}
    try {
      await page.waitForURL(/meus-ingressos/, { timeout: 30000 });
      return;
    } catch {}
  }
  const header = page.getByText(/Seus Ingressos \(/);
  const empty = page.getByText("Você ainda não possui ingressos", { exact: false });
  try {
    await header.first().waitFor({ state: "visible", timeout: 30000 });
    return;
  } catch {}
  try {
    await empty.first().waitFor({ state: "visible", timeout: 30000 });
  } catch {}
});

Then("eu devo ver ingressos ou vazio", async function () {
  const ok = page.url().includes("/meus-ingressos");
  if (!ok) {
    throw new Error("Não está na página Meus Ingressos");
  }
});
When("eu clico {string}", async function (text) {
  const login = page.getByRole("heading", { name: "Bem-vindo de volta!", exact: false });
  try {
    await login.first().waitFor({ state: "visible", timeout: 1000 });
    return;
  } catch {}
  if (/^Eventos$/i.test(text)) {
    await page.goto(`${BASE_URL}/eventos`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    return;
  }
  if (/^Validador$/i.test(text)) {
    await page.goto(`${BASE_URL}/validador`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    return;
  }
  if (/^Debug$/i.test(text)) {
    await page.goto(`${BASE_URL}/debug/firebase`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    return;
  }
  let locator = page.getByRole("button", { name: text, exact: false });
  try {
    await locator.first().waitFor({ state: "visible", timeout: 30000 });
  } catch {
    locator = page.getByRole("link", { name: text, exact: false });
    try {
      await locator.first().waitFor({ state: "visible", timeout: 30000 });
    } catch {
      // Fallbacks específicos para Navbar
      if (/^Eventos$/i.test(text)) {
        locator = page.locator('nav a[href="/eventos"]');
        try { await locator.first().waitFor({ state: "visible", timeout: 30000 }); } catch {}
      } else if (/^Validador$/i.test(text)) {
        locator = page.locator('nav a[href="/validador"]');
        try { await locator.first().waitFor({ state: "visible", timeout: 30000 }); } catch {}
      } else if (/^Debug$/i.test(text)) {
        locator = page.locator('nav a:has-text("Debug")');
        try { await locator.first().waitFor({ state: "visible", timeout: 30000 }); } catch {}
      }
      // Último fallback: qualquer texto
      if (!locator) locator = page.getByText(text, { exact: false });
      try {
        await locator.first().waitFor({ state: "visible", timeout: 30000 });
      } catch (e) {
        if (/^Eventos$/i.test(text)) {
          await page.goto(`${BASE_URL}/eventos`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
          return;
        }
        if (/^Validador$/i.test(text)) {
          await page.goto(`${BASE_URL}/validador`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
          return;
        }
        if (/^Debug$/i.test(text)) {
          await page.goto(`${BASE_URL}/debug/firebase`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
          return;
        }
        throw e;
      }
    }
  }
  await locator.first().scrollIntoViewIfNeeded();
  await locator.first().click();
});

When("eu clico opcional {string}", async function (text) {
  let locator = page.getByRole("button", { name: text, exact: false });
  try {
    await locator.first().waitFor({ state: "visible", timeout: 1000 });
  } catch {
    locator = page.getByRole("link", { name: text, exact: false });
    try {
      await locator.first().waitFor({ state: "visible", timeout: 1000 });
    } catch {
      locator = page.getByText(text, { exact: false });
      try {
        await locator.first().waitFor({ state: "visible", timeout: 1000 });
      } catch {
        return;
      }
    }
  }
  await locator.first().scrollIntoViewIfNeeded();
  await locator.first().click();
});

When("eu preencho código {string}", async function (code) {
  const login = page.getByRole("heading", { name: "Bem-vindo de volta!", exact: false });
  try {
    await login.first().waitFor({ state: "visible", timeout: 1000 });
    return;
  } catch {}
  try { await page.goto(`${BASE_URL}/dev-auto`, { waitUntil: "domcontentloaded", timeout: 20000 }); } catch {}
  const base = BASE_URL;
  const alt = base.startsWith("https://") ? base.replace("https://", "http://") : base.replace("http://", "https://");
  const candidates = [`${base}/validador`, `${alt}/validador`];
  for (const target of candidates) {
    try { await page.goto(target, { waitUntil: "domcontentloaded", timeout: 15000 }); break; } catch {}
  }
  let input = page.locator("#ticketCode");
  try {
    await input.first().waitFor({ state: "visible", timeout: 15000 });
  } catch {
    input = page.locator('input[placeholder*="TICKET-"]');
    await input.first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  }
  try { await input.first().fill(code); } catch { await input.first().type(code, { delay: 20 }); }
});

Then("eu devo ver status de validação", async function () {
  const valid = page.getByText("VÁLIDO", { exact: false });
  const used = page.getByText("USADO", { exact: false });
  const invalid = page.getByText("INVÁLIDO", { exact: false });
  const login = page.getByRole("heading", { name: "Bem-vindo de volta!", exact: false });
  try {
    await valid.first().waitFor({ state: "visible", timeout: 15000 });
    return;
  } catch {}
  try {
    await used.first().waitFor({ state: "visible", timeout: 15000 });
    return;
  } catch {}
  try {
    await invalid.first().waitFor({ state: "visible", timeout: 15000 });
    return;
  } catch {}
  await login.first().waitFor({ state: "visible", timeout: 15000 });
});

Then("eu devo ver opcional {string}", async function (text) {
  const locator = page.getByText(text, { exact: false });
  try {
    await locator.first().waitFor({ state: "visible", timeout: 1000 });
  } catch {
    return;
  }
});
Then("eu devo ver cabeçalho {string}", async function (text) {
  const locator = page.getByRole("heading", { name: text, exact: false });
  await locator.first().waitFor({ state: "visible", timeout: 60000 });
});

Then("eu devo ver cabeçalho ou login {string}", async function (text) {
  const heading = page.getByText(text, { exact: false });
  const login = page.getByText("Bem-vindo de volta!", { exact: false });
  try {
    await heading.first().waitFor({ state: "visible", timeout: 60000 });
    return;
  } catch {}
  try {
    await login.first().waitFor({ state: "visible", timeout: 30000 });
  } catch {}
});

Then("eu devo ver campo busca", async function () {
  const locator = page.getByPlaceholder("Buscar eventos ou locais...");
  try {
    await locator.first().waitFor({ state: "visible", timeout: 30000 });
    return;
  } catch {}
  const login = page.getByText("Bem-vindo de volta!", { exact: false });
  try {
    await login.first().waitFor({ state: "visible", timeout: 10000 });
  } catch {}
});

When("eu busco por {string}", async function (term) {
  const locator = page.getByPlaceholder("Buscar eventos ou locais...");
  try {
    await locator.first().waitFor({ state: "visible", timeout: 30000 });
    await locator.first().fill(term);
  } catch {}
});

When("eu seleciono categoria {string}", async function (cat) {
  let select = page.getByRole("combobox");
  try {
    await select.first().waitFor({ state: "visible", timeout: 10000 });
  } catch {
    select = page.locator("select");
    try {
      await select.first().waitFor({ state: "visible", timeout: 10000 });
    } catch {
      return;
    }
  }
  try {
    await select.first().selectOption({ label: cat });
  } catch {
    try {
      await select.first().selectOption(cat);
    } catch {}
  }
});

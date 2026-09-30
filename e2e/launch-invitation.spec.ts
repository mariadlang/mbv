import { mkdirSync } from "node:fs";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

function signedOutPath(path: string) {
  return `${path}${path.includes("?") ? "&" : "?"}e2e-auth=signed-out`;
}

async function dismissCookieBanner(page: Page) {
  const necessaryCookies = page.getByRole("button", { name: "Solo necesarias" });
  if (await necessaryCookies.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false)) {
    await necessaryCookies.click();
  }
}

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  expect(layout.scrollWidth, context).toBeLessThanOrEqual(layout.clientWidth + 1);
}

async function prepareLanding(page: Page, testInfo: TestInfo) {
  const viewport = testInfo.project.name === "mobile" ? viewports.mobile : viewports.desktop;
  await page.setViewportSize(viewport);
  await page.route("**/api/launch-access/public-state", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "open" }) });
  });
  await page.goto(signedOutPath("/"));
  await expect(page.locator('aside.landing-launch-invitation[aria-label="Invitación de lanzamiento"]')).toBeVisible({ timeout: 20_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  return viewport;
}

async function captureEvidence(page: Page, testInfo: TestInfo, state: "closed" | "open") {
  if (process.env.CAPTURE_LAUNCH_EVIDENCE !== "1") return;
  const directory = "artifacts/launch-access";
  mkdirSync(directory, { recursive: true });
  await page.screenshot({
    path: `${directory}/implementation-${testInfo.project.name}-${state}.png`,
    animations: "disabled",
    caret: "hide",
    fullPage: state === "closed",
    style: "nextjs-portal { display: none !important; }",
  });
}

test("launch invitation opens on entry and remains additive and keyboard accessible", async ({ page }, testInfo) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const viewport = await prepareLanding(page, testInfo);
  const invitation = page.locator('aside.landing-launch-invitation[aria-label="Invitación de lanzamiento"]');
  const trigger = invitation.getByRole("button", { name: "Ver la invitación" });
  const dialog = page.getByRole("dialog", { name: "Sé parte del lanzamiento." });
  const email = dialog.getByRole("textbox", { name: "Correo electrónico" });

  await expect(dialog).toBeVisible();
  await expect(email).toBeFocused();
  await expect(dialog.getByText("Las primeras 20 personas recibirán 30 días gratis con acceso a todas las funciones de My Best Version.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute("href", "/privacy");
  await expect(page.locator(".landing-page")).toHaveJSProperty("inert", true);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport.height);
  expect(dialogBox!.width).toBeLessThanOrEqual(560);
  await expectNoHorizontalOverflow(page, `${testInfo.project.name}: modal abierto al cargar`);
  await captureEvidence(page, testInfo, "open");

  await dialog.getByRole("button", { name: "Cerrar" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".landing-page")).toHaveJSProperty("inert", false);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  await dismissCookieBanner(page);

  await expect(invitation.getByText("20 accesos de lanzamiento", { exact: true })).toBeVisible();
  await expect(invitation.getByText("30 días gratis con acceso a todas las funciones.", { exact: true })).toBeVisible();
  await expect(page.locator('.landing-header a[href="/login"]')).toHaveCount(2);
  await expect(page.locator('a[href="/signup"]').first()).toHaveAttribute("href", "/signup");

  await page.getByRole("link", { name: "Ver qué incluye", exact: true }).first().click();
  await expect(page).toHaveURL(/#que-incluye$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const orderIsCorrect = await page.evaluate(() => {
    const header = document.querySelector(".landing-header");
    const strip = document.querySelector(".landing-launch-invitation");
    const hero = document.querySelector("#inicio");
    if (!header || !strip || !hero) return false;
    return Boolean(
      header.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING
      && strip.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
  expect(orderIsCorrect).toBe(true);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
  await page.waitForTimeout(150);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoHorizontalOverflow(page, `${testInfo.project.name}: modal cerrado`);
  await captureEvidence(page, testInfo, "closed");

  await trigger.focus();
  await expect(trigger).toBeFocused();
  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(email).toBeFocused();
  await expect(page.locator(".landing-page")).toHaveJSProperty("inert", true);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await expectNoHorizontalOverflow(page, `${testInfo.project.name}: modal abierto`);

  await page.keyboard.press("Shift+Tab");
  const focusRemainsInside = await dialog.evaluate((element) => element.contains(document.activeElement));
  expect(focusRemainsInside).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator(".landing-page")).toHaveJSProperty("inert", false);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBeforeOpen);

  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Cerrar diálogo" }).click({ position: { x: 4, y: 4 } });
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(runtimeErrors).toEqual([]);
});

test("launch form validates and renders only intercepted server outcomes", async ({ page }, testInfo) => {
  let outcome: "error" | "success" = "error";
  let requestCount = 0;
  await page.route("**/api/launch-access/request", async (route) => {
    requestCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 180));
    if (outcome === "error") {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "CAMPAIGN_UNAVAILABLE" }) });
      return;
    }
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ status: "confirmation_pending" }) });
  });

  const runtimeErrors = collectRuntimeErrors(page);
  await prepareLanding(page, testInfo);
  const dialog = page.getByRole("dialog", { name: "Sé parte del lanzamiento." });
  await expect(dialog).toBeVisible();
  const email = dialog.getByRole("textbox", { name: "Correo electrónico" });
  const submit = dialog.locator('button[type="submit"]');

  await email.fill("correo-invalido");
  await submit.click();
  await expect(dialog.getByText("Introduce un correo electrónico válido.", { exact: true })).toBeVisible();
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  expect(requestCount).toBe(0);

  await email.fill("maria@example.com");
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(dialog.getByText("No pudimos completar tu solicitud. Inténtalo de nuevo.", { exact: true })).toBeVisible();
  await expect(email).toHaveValue("maria@example.com");
  expect(requestCount).toBe(1);

  outcome = "success";
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(dialog.getByText("Revisa tu correo.", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Te enviamos un enlace para confirmar tu dirección. Tu acceso aún no está confirmado.", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Tu acceso de lanzamiento está reservado.")).toHaveCount(0);
  await expect(email).toHaveCount(0);
  expect(requestCount).toBe(2);
  await expectNoHorizontalOverflow(page, `${testInfo.project.name}: estado de confirmación`);
  expect(runtimeErrors.filter((error) => !error.includes("status of 503 (Service Unavailable)"))).toEqual([]);
  expect(runtimeErrors).toContain("console: Failed to load resource: the server responded with a status of 503 (Service Unavailable)");
});

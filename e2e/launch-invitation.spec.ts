import { mkdirSync } from "node:fs";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
  small: { width: 360, height: 640 },
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

async function prepareLanding(page: Page, testInfo: TestInfo, campaignState: "open" | "closed" = "open") {
  const viewport = testInfo.project.name === "mobile" ? viewports.mobile : viewports.desktop;
  await page.setViewportSize(viewport);
  await page.route("**/api/launch-access/public-state", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: campaignState }) });
  });
  await page.goto(signedOutPath("/"));
  await expect(page.locator('aside.landing-launch-invitation[aria-label="Invitación de lanzamiento"]')).toBeVisible({ timeout: 20_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  return viewport;
}

async function captureEvidence(
  page: Page,
  testInfo: TestInfo,
  state: "waitlist" | "confirmation" | "newsletter" | "newsletter-confirmation" | "landing",
) {
  if (process.env.CAPTURE_LAUNCH_EVIDENCE !== "1") return;
  const directory = "artifacts/launch-access";
  mkdirSync(directory, { recursive: true });
  await page.screenshot({
    path: `${directory}/implementation-${testInfo.project.name}-${state}.png`,
    animations: "disabled",
    caret: "hide",
    fullPage: state === "landing",
    style: "nextjs-portal { display: none !important; }",
  });
}

test("launch invitation opens on entry and remains additive and keyboard accessible", async ({ page }, testInfo) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const viewport = await prepareLanding(page, testInfo);
  const invitation = page.locator('aside.landing-launch-invitation[aria-label="Invitación de lanzamiento"]');
  const trigger = invitation.getByRole("button", { name: "Ver la invitación" });
  const dialog = page.getByRole("dialog", { name: "Únete a la waitlist de My Best Version." });
  const email = dialog.getByRole("textbox", { name: "Tu correo electrónico" });

  await expect(dialog).toBeVisible({ timeout: 6_000 });
  await expect(email).toBeFocused();
  await dialog.getByRole("heading", { name: "Únete a la waitlist de My Best Version." }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Sé de las primeras en el lanzamiento y accede a 30 días gratis con todas las funciones de la app.", { exact: true })).toBeVisible();
  await expect(dialog.getByText(/Tenemos solo 20 cupos para el acceso anticipado/)).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute("href", "/privacy");
  await expect(page.locator(".landing-page")).toHaveJSProperty("inert", true);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport.height);
  expect(dialogBox!.width).toBeLessThanOrEqual(520);
  await expectNoHorizontalOverflow(page, `${testInfo.project.name}: modal abierto al cargar`);
  await captureEvidence(page, testInfo, "waitlist");

  await dialog.getByRole("button", { name: "Cerrar" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".landing-page")).toHaveJSProperty("inert", false);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  await dismissCookieBanner(page);

  await expect(invitation.getByText("20 cupos de acceso anticipado", { exact: true })).toBeVisible();
  await expect(invitation.getByText("30 días gratis con todas las funciones.", { exact: true })).toBeVisible();
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
  await captureEvidence(page, testInfo, "landing");

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
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "REQUEST_FAILED" }) });
      return;
    }
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ status: "request_received" }) });
  });

  const runtimeErrors = collectRuntimeErrors(page);
  await prepareLanding(page, testInfo);
  const invitation = page.locator('aside.landing-launch-invitation[aria-label="Invitación de lanzamiento"]');
  await invitation.getByRole("button", { name: "Ver la invitación" }).click();
  const dialog = page.getByRole("dialog", { name: "Únete a la waitlist de My Best Version." });
  await expect(dialog).toBeVisible();
  const email = dialog.getByRole("textbox", { name: "Tu correo electrónico" });
  const submit = dialog.locator('button[type="submit"]');

  await email.fill("correo-invalido");
  await submit.click();
  await expect(dialog.getByText("Revisa tu correo electrónico e inténtalo de nuevo.", { exact: true })).toBeVisible();
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  expect(requestCount).toBe(0);

  await email.fill("maria@example.com");
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(dialog.getByText("No pudimos guardar tu solicitud. Inténtalo de nuevo.", { exact: true })).toBeVisible();
  await expect(email).toHaveValue("maria@example.com");
  expect(requestCount).toBe(1);

  outcome = "success";
  await submit.click();
  await expect(submit).toBeDisabled();
  const confirmation = page.getByRole("dialog", { name: "¡Recibimos tu solicitud!" });
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByText("Te notificaremos de primero en el lanzamiento para que puedas empezar tu periodo de prueba de 30 días.", { exact: true })).toBeVisible();
  await expect(confirmation.getByText(/reservad[ao]/i)).toHaveCount(0);
  await expect(email).toHaveCount(0);
  expect(requestCount).toBe(2);
  await expectNoHorizontalOverflow(page, `${testInfo.project.name}: estado de confirmación`);
  await captureEvidence(page, testInfo, "confirmation");
  expect(runtimeErrors.filter((error) => !error.includes("status of 500 (Internal Server Error)"))).toEqual([]);
  expect(runtimeErrors).toContain("console: Failed to load resource: the server responded with a status of 500 (Internal Server Error)");
});

test("full capacity offers only an explicit newsletter registration", async ({ page }, testInfo) => {
  let requestBody: Record<string, unknown> | null = null;
  await page.route("**/api/launch-access/request", async (route) => {
    requestBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ status: "newsletter_subscribed" }) });
  });

  const runtimeErrors = collectRuntimeErrors(page);
  await prepareLanding(page, testInfo, "closed");
  const invitation = page.locator('aside.landing-launch-invitation[aria-label="Invitación de lanzamiento"]');
  await invitation.getByRole("button", { name: "Recibir novedades" }).click();
  const dialog = page.getByRole("dialog", { name: "Gracias por tu interés" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Los 20 cupos de acceso anticipado ya se han solicitado.", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Puedes dejar tu correo para recibir novedades de My Best Version y ser de las primeras en enterarte de próximas oportunidades.", { exact: true })).toBeVisible();
  await captureEvidence(page, testInfo, "newsletter");

  await dialog.getByRole("textbox", { name: "Tu correo electrónico" }).fill("maria@example.com");
  await dialog.getByRole("button", { name: "Quiero recibir novedades" }).click();
  await expect(dialog.getByText("Confirma que quieres recibir novedades para continuar.", { exact: true })).toBeVisible();
  expect(requestBody).toBeNull();

  await dialog.getByRole("checkbox", { name: "También quiero recibir novedades de My Best Version." }).check();
  await dialog.getByRole("button", { name: "Quiero recibir novedades" }).click();
  await expect(page.getByRole("dialog", { name: "¡Gracias por suscribirte!" })).toBeVisible();
  await captureEvidence(page, testInfo, "newsletter-confirmation");
  expect(requestBody).toEqual({
    email: "maria@example.com",
    locale: "es",
    requestType: "newsletter_only",
    newsletterOptIn: true,
    origin: "landing_launch",
  });
  await expectNoHorizontalOverflow(page, `${testInfo.project.name}: newsletter con cupos completos`);
  expect(runtimeErrors).toEqual([]);
});

test("keeps every launch state usable on a 360 by 640 screen", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "This case controls the required small viewport explicitly.");
  await page.setViewportSize(viewports.small);
  await page.route("**/api/launch-access/public-state", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "open" }) });
  });
  await page.route("**/api/launch-access/request", async (route) => {
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ status: "request_received" }) });
  });
  await page.goto(signedOutPath("/"));
  const invitation = page.locator('aside.landing-launch-invitation[aria-label="Invitación de lanzamiento"]');
  await expect(invitation).toBeVisible({ timeout: 20_000 });
  await invitation.getByRole("button", { name: "Ver la invitación" }).click();

  const waitlist = page.getByRole("dialog", { name: "Únete a la waitlist de My Best Version." });
  await expect(waitlist).toBeVisible();
  await expectNoHorizontalOverflow(page, "small: formulario de waitlist");
  const waitlistBox = await waitlist.boundingBox();
  expect(waitlistBox).not.toBeNull();
  expect(waitlistBox!.x).toBeGreaterThanOrEqual(0);
  expect(waitlistBox!.y).toBeGreaterThanOrEqual(0);
  expect(waitlistBox!.x + waitlistBox!.width).toBeLessThanOrEqual(viewports.small.width);
  expect(waitlistBox!.y + waitlistBox!.height).toBeLessThanOrEqual(viewports.small.height);

  await waitlist.getByRole("textbox", { name: "Tu correo electrónico" }).fill("maria@example.com");
  await waitlist.getByRole("button", { name: "Quiero unirme a la waitlist" }).click();
  const confirmation = page.getByRole("dialog", { name: "¡Recibimos tu solicitud!" });
  await expect(confirmation).toBeVisible();
  await expectNoHorizontalOverflow(page, "small: confirmación de waitlist");
  const confirmationBox = await confirmation.boundingBox();
  expect(confirmationBox).not.toBeNull();
  expect(confirmationBox!.y + confirmationBox!.height).toBeLessThanOrEqual(viewports.small.height);

  await confirmation.getByRole("button", { name: "Seguir explorando" }).click();
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.unroute("**/api/launch-access/public-state");
  await page.route("**/api/launch-access/public-state", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "closed" }) });
  });
  await page.goto(signedOutPath("/"));
  const closedInvitation = page.locator('aside.landing-launch-invitation[aria-label="Invitación de lanzamiento"]');
  await expect(closedInvitation).toBeVisible({ timeout: 20_000 });
  await closedInvitation.getByRole("button", { name: "Recibir novedades" }).click();
  const newsletter = page.getByRole("dialog", { name: "Gracias por tu interés" });
  await expect(newsletter).toBeVisible();
  await expectNoHorizontalOverflow(page, "small: cupos agotados");
  const newsletterBox = await newsletter.boundingBox();
  expect(newsletterBox).not.toBeNull();
  expect(newsletterBox!.x).toBeGreaterThanOrEqual(0);
  expect(newsletterBox!.y).toBeGreaterThanOrEqual(0);
  expect(newsletterBox!.x + newsletterBox!.width).toBeLessThanOrEqual(viewports.small.width);
  expect(newsletterBox!.y + newsletterBox!.height).toBeLessThanOrEqual(viewports.small.height);

  await page.unroute("**/api/launch-access/request");
  await page.route("**/api/launch-access/request", async (route) => {
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ status: "newsletter_subscribed" }) });
  });
  await newsletter.getByRole("textbox", { name: "Tu correo electrónico" }).fill("maria@example.com");
  await newsletter.getByRole("checkbox", { name: "También quiero recibir novedades de My Best Version." }).check();
  await newsletter.getByRole("button", { name: "Quiero recibir novedades" }).click();
  const newsletterConfirmation = page.getByRole("dialog", { name: "¡Gracias por suscribirte!" });
  await expect(newsletterConfirmation).toBeVisible();
  await expectNoHorizontalOverflow(page, "small: confirmación de novedades");
  const newsletterConfirmationBox = await newsletterConfirmation.boundingBox();
  expect(newsletterConfirmationBox).not.toBeNull();
  expect(newsletterConfirmationBox!.y + newsletterConfirmationBox!.height).toBeLessThanOrEqual(viewports.small.height);
});

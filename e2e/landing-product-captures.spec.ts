import { expect, test, type Locator, type Page } from "@playwright/test";

const desktopViewport = { width: 1440, height: 900 };
const mobileViewport = { width: 390, height: 844 };
const captureRoot = "public/landing/product";

async function dismissCookieBanner(page: Page) {
  const necessaryCookies = page.getByRole("button", { name: "Solo necesarias" });
  if (await necessaryCookies.waitFor({ state: "visible", timeout: 3_000 }).then(() => true).catch(() => false)) {
    await necessaryCookies.click();
  }
}

async function completeDemoOnboarding(page: Page) {
  await page.goto("/app/dashboard");
  await dismissCookieBanner(page);
  await page.getByRole("button", { name: /Crear mi primera acción/ }).click();
  await page.getByRole("radio", { name: /Mi día/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Resultado").fill("Preparar una semana con dirección");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Primera acción").fill("Organizar el primer paso");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Ver mi primera acción/ }).click();
  await expect(page).toHaveURL(/\/app\/today/);

  await page.goto("/app/settings");
  await page.getByLabel("Nombre del perfil").fill("Demo");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Tus preferencias quedaron guardadas.")).toBeVisible();
}

async function createHabit(page: Page, name: string) {
  await page.getByRole("button", { name: "Crear hábito", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Crear un hábito" });
  await dialog.getByLabel("Nombre del hábito").fill(name);
  await dialog.getByRole("button", { name: "Guardar hábito" }).click();
  await expect(page.locator(".habit-today-row").filter({ hasText: name })).toBeVisible();
}

async function markHabit(page: Page, name: string) {
  const row = page.locator(".habit-today-row").filter({ hasText: name });
  await row.getByRole("button", { name: "Marcar", exact: true }).click();
  await expect(row.getByText("Completado", { exact: true })).toBeVisible();
}

async function addTodayPriority(page: Page, position: 1 | 2 | 3, title: string) {
  await page.getByRole("button", { name: `Añadir prioridad ${position}` }).click();
  const drawer = page.getByRole("dialog", { name: "¿Qué quieres recordar?" });
  await drawer.getByLabel("Nombre").fill(title);
  await drawer.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".today-priorities-card").getByText(title, { exact: true })).toBeVisible();
}

async function addTodayTask(page: Page, title: string) {
  await page.locator(".day-timeline-card header").getByRole("button", { name: "Añadir", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "¿Qué quieres recordar?" });
  await drawer.getByLabel("Nombre").fill(title);
  await drawer.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".day-timeline-card").getByText(title, { exact: true })).toBeVisible();
}

async function createPlannedTask(page: Page, title: string, date: string) {
  await page.goto("/app/tasks");
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const form = page.locator(".advanced-task-form");
  await form.getByLabel("Tarea", { exact: true }).fill(title);
  await form.getByLabel("Fecha").fill(date);
  await form.getByRole("button", { name: "Guardar tarea", exact: true }).click();
  await expect(form).toBeHidden();
}

async function captureMainViewport(
  page: Page,
  fileName: string,
  viewport: { width: number; height: number },
  ready: (currentPage: Page) => Locator,
) {
  await page.setViewportSize(viewport);
  await page.reload();
  await expect(ready(page)).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  const main = page.locator(".page-content");
  await expect(main).toBeVisible();
  const box = await main.boundingBox();
  if (!box) throw new Error("No se pudo calcular el recorte del contenido principal.");
  const clipHeight = Math.min(viewport.height - box.y - (viewport.width <= 640 ? 70 : 12), 820);
  await page.screenshot({
    path: `${captureRoot}/${fileName}`,
    animations: "disabled",
    caret: "hide",
    clip: { x: box.x, y: box.y, width: Math.min(box.width, viewport.width - box.x), height: clipHeight },
    style: "nextjs-portal, .fab-cluster { display: none !important; }",
  });
}

test("captures authentic product moments for the public landing", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "The capture task controls desktop and mobile viewports itself.");
  test.skip(process.env.MBV_CAPTURE_LANDING_PRODUCT !== "1", "Set MBV_CAPTURE_LANDING_PRODUCT=1 to refresh the landing product captures.");
  test.setTimeout(240_000);
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(30_000);
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.clock.setFixedTime(new Date("2026-09-24T12:00:00-05:00"));
  await completeDemoOnboarding(page);
  await page.goto("/app/today");
  await page.locator(".today-priorities-card").getByRole("button", { name: "Completar prioridad: Organizar el primer paso" }).click();

  await page.goto("/app/habits");
  await createHabit(page, "Leer");
  await createHabit(page, "Caminar");
  await createHabit(page, "Escribir un agradecimiento");
  await markHabit(page, "Leer");
  await markHabit(page, "Caminar");

  await page.clock.setFixedTime(new Date("2026-09-25T12:00:00-05:00"));
  await page.goto("/app/habits");
  await markHabit(page, "Caminar");
  await markHabit(page, "Escribir un agradecimiento");

  await page.clock.setFixedTime(new Date("2026-09-28T12:00:00-05:00"));
  await page.goto("/app/today");
  await addTodayPriority(page, 1, "Preparar la propuesta");
  await addTodayPriority(page, 2, "Caminar 30 minutos");
  await addTodayPriority(page, 3, "Leer 20 minutos");
  await addTodayTask(page, "Ordenar las notas del proyecto");
  await page.locator(".today-priorities-card").getByRole("button", { name: "Completar prioridad: Preparar la propuesta" }).click();
  await page.locator(".today-priorities-card").getByRole("button", { name: "Completar prioridad: Caminar 30 minutos" }).click();

  await page.goto("/app/habits");
  await markHabit(page, "Leer");
  await markHabit(page, "Escribir un agradecimiento");
  const mood = page.locator(".habit-mood-panel .today-mood-card");
  await mood.getByRole("radio", { name: "Buena" }).click();
  await mood.getByRole("button", { name: "Energía 7 de 10" }).click();
  await mood.getByLabel("Nota breve sobre tu estado").fill("Hoy avancé en lo importante y dejé espacio para descansar.");
  await mood.getByRole("button", { name: "Guardar registro", exact: true }).click();
  await expect(mood.getByText("Registro guardado", { exact: true })).toBeVisible();

  await createPlannedTask(page, "Enviar la propuesta final", "2026-09-29");
  await createPlannedTask(page, "Revisar el capítulo", "2026-09-30");

  await page.setViewportSize(desktopViewport);
  await page.goto("/app/today");
  await expect(page.getByText("Preparar la propuesta", { exact: true }).first()).toBeVisible();
  await captureMainViewport(page, "today-desktop.png", desktopViewport, (currentPage) => currentPage.locator(".today-command-center"));
  await captureMainViewport(page, "today-mobile.png", mobileViewport, (currentPage) => currentPage.locator(".today-command-center"));

  await page.setViewportSize(desktopViewport);
  await page.goto("/app/planning/weekly");
  await expect(page.getByText("Enviar la propuesta final", { exact: true })).toBeVisible();
  await captureMainViewport(page, "planning-desktop.png", desktopViewport, (currentPage) => currentPage.locator(".weekly-plan-page"));
  await captureMainViewport(page, "planning-mobile.png", mobileViewport, (currentPage) => currentPage.locator(".weekly-plan-page"));

  await page.setViewportSize(desktopViewport);
  await page.goto("/app/habits");
  await expect(page.getByText("Escribir un agradecimiento", { exact: true }).first()).toBeVisible();
  await captureMainViewport(page, "wellbeing-desktop.png", desktopViewport, (currentPage) => currentPage.locator(".habits-dashboard-grid"));
  await page.setViewportSize(mobileViewport);
  await page.reload();
  const mobileMood = page.locator(".habit-mood-panel .today-mood-card");
  await mobileMood.scrollIntoViewIfNeeded();
  await mobileMood.screenshot({ path: `${captureRoot}/wellbeing-mobile.png`, animations: "disabled", caret: "hide" });

  await page.setViewportSize(desktopViewport);
  await page.goto("/app/progress");
  const completedTasksMetric = page.locator(".metric-card").filter({ hasText: "Tareas completadas" });
  const habitEntriesMetric = page.locator(".metric-card").filter({ hasText: "Registros de hábitos" });
  await expect(completedTasksMetric.locator("strong")).toHaveText("3");
  await expect(habitEntriesMetric.locator("strong")).toHaveText("6");
  await expect(page.locator(".progress-sharing-grid")).toHaveCount(0);
  await captureMainViewport(page, "progress-desktop.png", desktopViewport, (currentPage) => currentPage.locator(".progress-layout"));
  await captureMainViewport(page, "progress-mobile.png", mobileViewport, (currentPage) => currentPage.locator(".progress-layout"));

  await page.setViewportSize(desktopViewport);
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Inglés, Beta", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/app/today");
  await captureMainViewport(page, "today-desktop-en.png", desktopViewport, (currentPage) => currentPage.locator(".today-command-center"));
  await captureMainViewport(page, "today-mobile-en.png", mobileViewport, (currentPage) => currentPage.locator(".today-command-center"));

  await page.setViewportSize(desktopViewport);
  await page.goto("/app/planning/weekly");
  await captureMainViewport(page, "planning-desktop-en.png", desktopViewport, (currentPage) => currentPage.locator(".weekly-plan-page"));
  await captureMainViewport(page, "planning-mobile-en.png", mobileViewport, (currentPage) => currentPage.locator(".weekly-plan-page"));

  await page.setViewportSize(desktopViewport);
  await page.goto("/app/habits");
  await captureMainViewport(page, "wellbeing-desktop-en.png", desktopViewport, (currentPage) => currentPage.locator(".habits-dashboard-grid"));
  await page.setViewportSize(mobileViewport);
  await page.reload();
  const mobileMoodEn = page.locator(".habit-mood-panel .today-mood-card");
  await mobileMoodEn.scrollIntoViewIfNeeded();
  await mobileMoodEn.screenshot({ path: `${captureRoot}/wellbeing-mobile-en.png`, animations: "disabled", caret: "hide" });

  await page.setViewportSize(desktopViewport);
  await page.goto("/app/progress");
  await expect(page.locator(".metric-card").filter({ hasText: "Completed tasks" }).locator("strong")).toHaveText("3");
  await expect(page.locator(".metric-card").filter({ hasText: "Habit entries" }).locator("strong")).toHaveText("6");
  await expect(page.locator(".progress-sharing-grid")).toHaveCount(0);
  await captureMainViewport(page, "progress-desktop-en.png", desktopViewport, (currentPage) => currentPage.locator(".progress-layout"));
  await captureMainViewport(page, "progress-mobile-en.png", mobileViewport, (currentPage) => currentPage.locator(".progress-layout"));
});

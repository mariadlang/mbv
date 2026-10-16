import { test, expect, type Page } from "@playwright/test";
import { LEGAL_VERSION } from "../src/lib/legalConfig";

test.use({ timezoneId: "America/Bogota" });
async function setup(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-02T15:00:00-05:00"));
  await page.goto("/app/dashboard");
  const cookies = page.getByRole("button", { name: "Solo necesarias" });
  if (await cookies.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false)) await cookies.click();
  await page.getByRole("button", { name: "Crear mi primera acción" }).click();
  await page.getByRole("radio", { name: /Mi día/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Resultado").fill("Una semana tranquila");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Primera acción").fill("Mi acción de prueba");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Ver mi primera acción/ }).click();
  await expect(page).toHaveURL(/app\/today/);
}
async function isolatedReferenceFixture(page: Page) {
  await page.evaluate(async () => {
    // This browser context belongs only to Playwright, never to a real account.
    if (location.hostname !== "127.0.0.1") throw new Error("Local fixture only");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("my-best-version-planner-v4:e2e-user"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["cascadePlans", "tasks", "habits"], "readwrite");
      const stamp = "2026-10-02T20:00:00.000Z";
      const priorities = ["Ser constante con mi alimentación", "Mantener 4 entrenamientos por semana", "Avanzar en mi proyecto personal"];
      tx.objectStore("cascadePlans").put({ id: "reference-month", horizon: "monthly", periodKey: "2026-10", intention: "Disciplina tranquila", priority: priorities[0], objectives: priorities, activities: [], createdAt: stamp, updatedAt: stamp });
      tx.objectStore("cascadePlans").put({ id: "reference-week", horizon: "weekly", periodKey: "2026-W40", intention: "", priority: "", objectives: [], activities: [], details: { "preparation.v1.month": "2026-10", "preparation.v1.item.nutrition": "ready", "preparation.v1.item.training": "ready", "preparation.v1.item.agenda": "ready" }, createdAt: stamp, updatedAt: stamp });
      tx.objectStore("habits").put({ id: "reference-habit", name: "Leer", type: "boolean", scheduledDays: [1,2,3,4,5], target: 1, unit: "vez", status: "active", createdAt: stamp, updatedAt: stamp });
      for (const [index, title] of ["Desayuno saludable", "Entrenamiento", "Trabajo profundo", "Revisión semanal", "Tiempo para mí"].entries()) tx.objectStore("tasks").put({ id: "reference-task-" + index, title, date: "2026-10-02", time: ["07:00","08:00","12:00","15:00","20:00"][index], priority: "medium", status: index < 2 ? "completed" : "planned", createdAt: stamp, updatedAt: stamp });
      tx.objectStore("tasks").put({ id: "reference-previous", title: "Pendiente sin mover", date: "2026-09-25", priority: "medium", status: "planned", createdAt: stamp, updatedAt: stamp });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
}
test("preparation persists, skips review and keeps one canonical task", async ({ page }) => {
  test.setTimeout(120_000);
  await setup(page);
  await isolatedReferenceFixture(page);
  await page.goto("/app/dashboard");
  await expect(page.locator(".home-ready-count")).toHaveText("3 de 5 preparados");
  const habits = page.locator(".prep-checklist-row").filter({ hasText: "Hábitos" });
  await habits.getByRole("button", { name: "En proceso" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Confirmar preparación" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".home-ready-count")).toHaveText("4 de 5 preparados");
  await page.reload();
  await expect(page.locator(".home-ready-count")).toHaveText("4 de 5 preparados");
  await page.goto("/app/guide?week=2026-09-28");
  await expect(page.locator(".prep-guide")).toBeVisible();
  if (await page.locator(".prep-mobile-entry").isVisible()) await page.getByRole("button", { name: "Comenzar", exact: true }).click();
  await page.getByRole("button", { name: "Omitir y planificar", exact: true }).click();
  await expect(page.locator(".prep-page")).toHaveClass(/prep-mobile-step-prepare/);
  await page.reload();
  await expect(page.locator(".prep-page")).toHaveClass(/prep-mobile-step-prepare/);
  await page.getByRole("button", { name: "Revisar semana anterior", exact: true }).first().click();
  await expect(page.getByRole("dialog").getByText("Pendiente sin mover", { exact: true })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Soltar", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Recuperar", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("Pendiente sin mover", { exact: true })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Terminar revisión" }).click();
  await expect(dialog).toBeHidden();
  await page.goto("/app/planning");
  await page.locator(".prep-month-grid").getByRole("button").nth(9).click();
  await page.locator(".prep-list-grid > section").first().getByRole("button", { name: "Añadir" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Libro de prueba");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".prep-list-grid").getByText("Libro de prueba", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".prep-list-grid").getByText("Libro de prueba", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ver mi semana", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: /28 de septiembre/i }).click();
  await expect(page).toHaveURL(/guide\?week=2026-09-28/);
  await page.reload();
  await expect(page.locator("#prep-guide-context")).toContainText("octubre de 2026");
  await page.goto("/app/planning?view=annual");
  await expect(page.locator(".prep-year .prep-month-grid > button")).toHaveCount(12);
  await expect(page.locator(".prep-year-areas, .prep-legacy-plans")).toHaveCount(0);
  await page.locator('.prep-year [data-period="2026-10"]').click();
  await expect(page).toHaveURL(/view=month&month=2026-10/);
  await expect(page.getByText("Disciplina tranquila", { exact: true }).first()).toBeVisible();
});

test("R5 R6 R7 responsive reference captures", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "All requested viewports covered in one isolated context.");
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  await isolatedReferenceFixture(page);
  for (const [width, height] of [[1448,1086],[1440,900],[1024,768],[390,844],[430,932]]) {
    await page.setViewportSize({ width, height });
    for (const [reference, path, title] of [
      ["r7", "/app/dashboard", "Tu semana en orden"],
      ["r5", "/app/guide?week=2026-09-28", "Preparemos tu semana"],
      ["r6", "/app/planning", "Tu mapa de 12 meses"],
    ]) {
      await page.goto(path);
      await expect(page.locator(reference === "r7" ? ".home-overview" : ".prep-page")).toBeVisible();
      if (width > 800) await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
      await page.screenshot({ path: testInfo.outputPath(`closure-${reference}-${width}x${height}-viewport.png`), fullPage: false, animations: "disabled" });
      await page.screenshot({ path: testInfo.outputPath(`preparation-${reference}-${width}x${height}.png`), fullPage: true, animations: "disabled" });
    }
  }
  expect(errors).toEqual([]);
});

test("dated agenda shares task and habit records and retains the selected day after reload", async ({ page }, testInfo) => {
  await setup(page);
  await isolatedReferenceFixture(page);
  await page.goto("/app/planning?view=day&date=2026-10-02");
  const agenda = page.locator(".prep-day");
  await expect(agenda.locator(".editorial-agenda-point").getByText("Trabajo profundo", { exact: true })).toBeVisible();
  await agenda.locator(".editorial-agenda-readable > summary").click();
  await agenda.getByRole("button", { name: "Completar Trabajo profundo", exact: true }).click();
  await expect(agenda.getByRole("button", { name: "Reabrir Trabajo profundo", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await agenda.locator(".editorial-agenda-readable > summary").click();
  await expect(agenda.getByRole("button", { name: "Reabrir Trabajo profundo", exact: true })).toHaveAttribute("aria-pressed", "true");
  await agenda.getByRole("button", { name: "Reabrir Trabajo profundo", exact: true }).click();
  await expect(agenda.getByRole("button", { name: "Completar Trabajo profundo", exact: true })).toHaveAttribute("aria-pressed", "false");
  await agenda.locator(".prep-day-habit").getByRole("button", { name: "Leer", exact: true }).click();
  await expect(agenda.locator(".prep-day-habit").getByRole("button", { name: "Leer", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/app/today");
  await expect(page.locator(".today-habit-row").filter({ hasText: "Leer" })).toContainText("Registrado");
  await page.goto("/app/planning?view=day&date=2026-10-02");
  await agenda.locator(".prep-week-strip button").nth(5).click();
  await expect(page).toHaveURL(/date=2026-10-03/);
  await page.reload();
  await expect(agenda.getByText("Trabajo profundo", { exact: true })).toHaveCount(0);
  await expect(agenda.locator(".prep-week-strip button[aria-pressed=true]")).toContainText("3");
  await page.goto("/app/planning?view=day&date=2026-10-02");
  await expect(agenda.locator(".editorial-agenda-point").getByText("Trabajo profundo", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath(`preparation-day-${testInfo.project.name}.png`), fullPage: true });
});

test("health monthly plan and weekly adjustment use the same daily record", async ({ page }) => {
  test.setTimeout(120_000);
  await setup(page);
  // Mock only the consent read for this isolated test user; no consent is sent externally.
  await page.route("**/rest/v1/user_consents?*", (route) => route.fulfill({ json: [{ id: "test-consent", user_id: "e2e-user", consent_type: "sensitive_wellness", document_version: LEGAL_VERSION, status: "granted", method: "feature_gate", consented_at: "2026-10-02T20:00:00Z" }] }));
  await page.route("**/rest/v1/privacy_requests?*", (route) => route.fulfill({ json: [] }));
  await page.evaluate((version) => {
    if (location.hostname !== "127.0.0.1") throw new Error("Local fixture only");
    const state = JSON.parse(localStorage.getItem("mbv-legal-privacy-v1") || "{}");
    state.consents = [{ id: "test-consent", userId: "e2e-user", consentType: "sensitive_wellness", documentVersion: version, status: "granted", method: "feature_gate", timestamp: "2026-10-02T20:00:00Z" }];
    localStorage.setItem("mbv-legal-privacy-v1", JSON.stringify(state));
  }, LEGAL_VERSION);
  await page.goto("/app/health?date=2026-10-02");
  const health = page.locator(".prep-health");
  await expect(health).toBeVisible();
  await health.getByRole("button", { name: "Mes", exact: true }).click();
  await health.locator(".prep-health-days > button").nth(1).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Comida preparada en casa");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await health.getByRole("button", { name: "Semana", exact: true }).click();
  await expect(health).toContainText("Recuperado de tu planificación mensual");
  await health.locator(".prep-health-days > button").nth(4).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Ajuste del viernes");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(health).toContainText("Ajuste del viernes");
  await page.reload();
  await expect(health).toContainText("Ajuste del viernes");
  await expect(page.locator(".meal-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Marcar comida realizada", exact: true })).toHaveAttribute("aria-pressed", "false");
  await health.locator(".prep-health-days > button").nth(4).click();
  await page.getByRole("dialog").getByRole("button", { name: "Conservar el plan del mes" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(health).toContainText("Comida preparada en casa");
  await page.goto("/app/today");
  await expect(page.locator(".day-timeline-list")).toContainText("Comida preparada en casa");
});

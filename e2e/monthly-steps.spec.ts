import { test, expect, type Page } from "@playwright/test";

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
  await page.evaluate(async () => {
    if (location.hostname !== "127.0.0.1") throw new Error("Only an isolated local Playwright account may be seeded");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const req = indexedDB.open("my-best-version-planner-v4:e2e-user"); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("cascadePlans", "readwrite");
      const stamp = "2026-10-02T20:00:00Z";
      tx.objectStore("cascadePlans").put({ id: "monthly-reading", horizon: "monthly", periodKey: "2026-10", intention: "Leer con calma", priority: "Terminar un libro", objectives: ["Terminar un libro", "Cuidar mi descanso", "Avanzar en mi proyecto"], activities: [], createdAt: stamp, updatedAt: stamp });
      tx.objectStore("cascadePlans").put({ id: "monthly-reading-week", horizon: "weekly", periodKey: "2026-W40", intention: "", priority: "", objectives: [], activities: [], details: { "preparation.v1.month": "2026-10" }, createdAt: stamp, updatedAt: stamp });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  });
}
async function records(page: Page) {
  return page.evaluate(async () => {
    if (location.hostname !== "127.0.0.1") throw new Error("Local test account only");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const req = indexedDB.open("my-best-version-planner-v4:e2e-user"); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    const tx = db.transaction(["tasks", "cascadePlans"]);
    const read = (store: string) => new Promise<Record<string, unknown>[]>((resolve, reject) => { const req = tx.objectStore(store).getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    const [tasks, plans] = await Promise.all([read("tasks"), read("cascadePlans")]); db.close(); return { tasks, plans };
  });
}
async function openFromGuide(page: Page) {
  await page.goto("/app/guide?week=2026-09-28");
  await expect(page.locator(".prep-guide")).toBeVisible();
  if (await page.locator(".prep-mobile-entry").isVisible()) await page.getByRole("button", { name: "Comenzar", exact: true }).click();
  const skip = page.getByRole("button", { name: "Omitir y planificar", exact: true });
  if (await skip.isVisible()) await skip.click();
  await page.locator(".prep-checklist-row").filter({ hasText: "Prioridades de la semana" }).getByRole("button", { name: "Definir", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Del mes a tu semana" })).toBeVisible();
}

test("monthly step flows through guide, week and Today with one persistent identity", async ({ page }) => {
  test.setTimeout(120_000);
  await setup(page);
  await openFromGuide(page);
  const dialog = page.getByRole("dialog", { name: "Del mes a tu semana" });
  await expect(dialog.getByLabel("Mes de contexto")).toHaveValue("2026-10");
  await expect(dialog.getByLabel("Paso concreto")).toHaveValue("");
  await dialog.getByLabel("Paso concreto").fill("Leer capítulos tres y cuatro");
  await dialog.getByLabel("Día para este paso").fill("2026-10-02");
  await dialog.getByLabel("Hora (opcional)").fill("19:00");
  await dialog.getByRole("button", { name: "Guardar paso" }).click();
  await expect(dialog.getByRole("heading", { name: "Tu paso está guardado" })).toBeVisible();
  await dialog.getByRole("button", { name: "Seguir preparando" }).click();
  await expect(dialog).not.toBeVisible();
  const initial = (await records(page)).tasks.find((task) => task.title === "Leer capítulos tres y cuatro")!;
  expect(initial.periodPlanId).toBe("monthly-reading");
  expect(initial.time).toBe("19:00");
  await page.goto("/app/planning/weekly?date=2026-10-02");
  await expect(page.locator(".weekly-editorial-agenda")).toContainText("Leer capítulos tres y cuatro");
  await page.getByRole("button", { name: "Elegir un paso mensual", exact: true }).first().click();
  await dialog.getByLabel("Elegir una acción").selectOption(initial.id as string);
  await dialog.getByLabel("Paso concreto").fill("Leer capítulos tres, cuatro y cinco");
  await dialog.getByLabel("Día para este paso").fill("2026-10-03");
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await expect(dialog).toContainText("ya está programada");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Guardar paso" }).click();
  await dialog.getByRole("button", { name: "Seguir preparando" }).click();
  await expect(dialog).not.toBeVisible();
  let state = await records(page);
  expect(state.tasks.filter((task) => task.periodPlanId === "monthly-reading")).toHaveLength(1);
  expect(state.tasks.find((task) => task.id === initial.id)).toMatchObject({ date: "2026-10-03", planActionKey: initial.planActionKey, createdAt: initial.createdAt });
  // Same canonical step can return to today; another move needs explicit consent.
  await page.getByRole("button", { name: "Elegir un paso mensual", exact: true }).first().click();
  await dialog.getByLabel("Elegir una acción").selectOption(initial.id as string);
  await dialog.getByLabel("Día para este paso").fill("2026-10-02");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Guardar paso" }).click();
  await dialog.getByRole("button", { name: "Seguir preparando" }).click();
  await expect(dialog).not.toBeVisible();
  // Agenda editing must persist time and duration on this same canonical task.
  await page.locator(`[data-record-id="task-${initial.id}"]`).getByLabel("Más opciones para Leer capítulos tres, cuatro y cinco").click();
  await page.locator(`[data-record-id="task-${initial.id}"]`).getByRole("button", { name: "Editar tarea", exact: true }).click();
  const taskEditor = page.getByRole("dialog", { name: "Editar acción", exact: true });
  await expect(taskEditor.getByLabel("Hora (opcional)")).toHaveValue("19:00");
  await taskEditor.getByLabel("Hora (opcional)").fill("19:30");
  await taskEditor.getByLabel("Duración en minutos (opcional)").fill("45");
  await taskEditor.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(taskEditor).toBeHidden();
  state = await records(page);
  expect(state.tasks.find((task) => task.id === initial.id)).toMatchObject({ time: "19:30", estimatedMinutes: 45, date: "2026-10-02", periodPlanId: "monthly-reading", planActionKey: initial.planActionKey });
  await page.reload();
  await expect(page.locator(`[data-record-id="task-${initial.id}"]`)).toContainText("19:30");
  await page.goto("/app/today");
  await page.locator(".day-timeline-list").getByRole("button", { name: "Completar Leer capítulos tres, cuatro y cinco", exact: true }).click();
  await expect(page.locator(".day-timeline-list").getByRole("button", { name: "Reabrir Leer capítulos tres, cuatro y cinco", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".day-timeline-list").getByRole("button", { name: "Reabrir Leer capítulos tres, cuatro y cinco", exact: true })).toBeVisible();
  state = await records(page);
  expect(state.tasks.filter((task) => task.periodPlanId === "monthly-reading")).toHaveLength(1);
  expect(state.tasks.find((task) => task.id === initial.id)).toMatchObject({ status: "completed", date: "2026-10-02", time: "19:30", estimatedMinutes: 45, planActionKey: initial.planActionKey });
  const plan = state.plans.find((item) => item.id === "monthly-reading")!;
  expect(plan.completedObjectiveIndexes ?? []).toEqual([]);
  expect((plan.details as Record<string, string>)[`preparation.v1.priorityTask.${initial.id}`]).toBe("Terminar un libro");
});

test("usability closure: compact review, explicit saved step, weekly panorama, timed point and exact monthly origin", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const mobile = testInfo.project.name === "mobile";
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1448, height: 1086 });
  const suffix = mobile ? "mobile" : "desktop";
  const screenshot = async (name: string) => {
    await page.screenshot({ path: `docs/qa/screenshots/usability-2026-10-05-${name}-${suffix}.png`, fullPage: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  };
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  await page.clock.setFixedTime(new Date("2026-10-05T10:00:00-05:00"));
  await page.goto("/app/guide?week=2026-10-05");
  if (mobile) await page.getByRole("button", { name: "Comenzar", exact: true }).click();
  await page.getByRole("button", { name: "Omitir y planificar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Omitir y planificar", exact: true })).toBeHidden();
  await expect(page.locator(".prep-review-summary")).toContainText("Revisión omitida");
  await screenshot("revision-omitida");
  await page.reload();
  await expect(page.locator(".prep-review-summary")).toContainText("Revisión omitida");
  const priorities = page.locator(".prep-checklist-row").filter({ hasText: "Prioridades de la semana" });
  await priorities.getByRole("button", { name: "Definir", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Del mes a tu semana" });
  const title = "Escribir el primer párrafo del proyecto";
  await dialog.getByLabel("Prioridad mensual").selectOption("Avanzar en mi proyecto");
  await dialog.getByLabel("Paso concreto").fill(title);
  await dialog.getByLabel("Día para este paso").fill("2026-10-05");
  await dialog.getByLabel("Hora (opcional)").fill("10:00");
  await dialog.getByRole("button", { name: "Guardar paso", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Tu paso está guardado" })).toBeVisible();
  await expect(dialog).toContainText(title);
  await expect(dialog).toContainText("Avanzar en mi proyecto");
  await expect(dialog).toContainText("10:00");
  await expect(dialog.getByRole("link", { name: "Ver Hoy", exact: true })).toHaveAttribute("href", "/app/today");
  await screenshot("paso-guardado");
  await dialog.getByRole("button", { name: "Seguir preparando", exact: true }).click();
  await expect(priorities.locator(".prep-badge")).toHaveText("En proceso");
  const initial = (await records(page)).tasks.find((task) => task.title === title)!;
  expect(initial.time).toBe("10:00");
  expect(initial.estimatedMinutes).toBeUndefined();
  await page.goto("/app/planning/weekly?date=2026-10-05");
  await expect(page.locator(".prep-day-switch [aria-current]")).toHaveText("Semana");
  await expect(page.locator(".weekly-day-group")).toHaveCount(7);
  await expect(page.getByRole("heading", { name: "Plan diario", exact: true })).toHaveCount(0);
  await expect(page.locator(".editorial-agenda-grid")).toHaveCount(0);
  await expect(page.locator(`[data-record-id="task-${initial.id}"]`)).toContainText("10:00");
  await screenshot("semana");
  await page.screenshot({ path: `docs/qa/screenshots/usability-2026-10-05-semana-completa-${suffix}.png`, fullPage: true });
  if (mobile) {
    await page.locator(".weekly-days-panel").scrollIntoViewIfNeeded();
    await screenshot("semana-detalle");
  }
  await page.locator(".prep-day-switch").getByRole("link", { name: "Día", exact: true }).click();
  const point = page.locator(`.editorial-agenda-point[data-record-id="task-${initial.id}"]`);
  await point.scrollIntoViewIfNeeded();
  await expect(point).toBeVisible();
  await expect(point).toContainText("10:00");
  await expect(point).toContainText("Sin duración");
  await expect(point).toHaveCSS("top", "360px");
  await expect(page.locator(".editorial-agenda-unplaced").getByText(title, { exact: true })).toHaveCount(0);
  await screenshot("hora-sin-duracion");
  await page.goto("/app/today");
  const taskRow = page.locator(".day-timeline-list article").filter({ hasText: title });
  await taskRow.scrollIntoViewIfNeeded();
  await expect(taskRow).toContainText("Prioridad mensual: Avanzar en mi proyecto");
  await expect(taskRow).not.toContainText("Resultado mensual");
  await expect(taskRow).not.toContainText("Leer con calma");
  await screenshot("origen-en-hoy");
  await taskRow.getByRole("button", { name: `Completar ${title}`, exact: true }).click();
  await expect(taskRow.getByRole("button", { name: `Reabrir ${title}`, exact: true })).toBeVisible();
  await page.reload();
  await expect(taskRow.getByRole("button", { name: `Reabrir ${title}`, exact: true })).toBeVisible();
  await expect(taskRow).toContainText("Prioridad mensual: Avanzar en mi proyecto");
  await taskRow.scrollIntoViewIfNeeded();
  await screenshot("completado-recarga");
  const persisted = await records(page);
  expect(persisted.tasks.filter((task) => task.id === initial.id)).toHaveLength(1);
  expect(persisted.tasks.find((task) => task.id === initial.id)).toMatchObject({ status: "completed", date: "2026-10-05", time: "10:00", periodPlanId: initial.periodPlanId, planActionKey: initial.planActionKey });
  expect(persisted.tasks.find((task) => task.id === initial.id)?.estimatedMinutes).toBeUndefined();
  expect(persisted.plans.find((plan) => plan.id === "monthly-reading")?.completedObjectiveIndexes ?? []).toEqual([]);
  await page.goto("/app/guide?week=2026-10-05");
  await expect(page.locator(".prep-review-summary")).toContainText("Revisión omitida");
  await expect(priorities.locator(".prep-badge")).toHaveText("En proceso");
  expect(errors).toEqual([]);
});

test("monthly editor protects cancel, keeps a draft and explicitly discards it", async ({ page }) => {
  test.setTimeout(90_000);
  await setup(page);
  await openFromGuide(page);
  const dialog = page.getByRole("dialog", { name: "Del mes a tu semana" });
  await dialog.getByLabel("Paso concreto").fill("Borrador que quiero conservar");
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  const guard = page.getByRole("dialog", { name: "Tienes cambios sin guardar" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Seguir editando" }).click();
  await expect(dialog.getByLabel("Paso concreto")).toHaveValue("Borrador que quiero conservar");
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await guard.getByRole("button", { name: "Descartar cambios" }).click();
  await expect(dialog).not.toBeVisible();
  expect((await records(page)).tasks.filter((task) => task.title === "Borrador que quiero conservar")).toHaveLength(0);
});

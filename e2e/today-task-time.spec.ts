import { test, expect, type Page, type TestInfo } from "@playwright/test";

test.use({ timezoneId: "America/Bogota" });
const day = "2026-10-20";
const title = "H01 escribir mi primer párrafo";
const midnightTitle = "H01 tarea de medianoche";
const untimedTitle = "H01 tarea previa sin hora";

async function records(page: Page) {
  return page.evaluate(async () => {
    if (location.hostname !== "127.0.0.1") throw new Error("Disposable local E2E account only");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open("my-best-version-planner-v4:e2e-user"); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const tx = db.transaction(["tasks", "cascadePlans"]);
    const read = (name: string) => new Promise<Record<string, unknown>[]>((resolve, reject) => { const r = tx.objectStore(name).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const [tasks, plans] = await Promise.all([read("tasks"), read("cascadePlans")]); db.close(); return { tasks, plans };
  });
}

async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const path = info.outputPath(name + ".png");
  await page.screenshot({ path });
  await info.attach(name, { path, contentType: "image/png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("H01 saved local time, monthly origin and identity survive agenda editing and reload in ES and EN", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize(info.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1448, height: 1086 });
  await page.clock.setFixedTime(new Date("2026-10-20T12:00:00-05:00"));
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/app/dashboard");
  await page.getByRole("button", { name: "Solo necesarias" }).click();
  await page.getByRole("button", { name: "Crear mi primera acción" }).click();
  await page.getByRole("radio", { name: /Mi día/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Resultado").fill("H01 proyecto sintético");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Primera acción").fill(untimedTitle);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Ver mi primera acción/ }).click();
  await expect(page).toHaveURL(/app\/today/);
  // Only monthly context is a fixture; all tasks are created/edited by the existing UI.
  await page.evaluate(async () => {
    if (location.hostname !== "127.0.0.1") throw new Error("Local test account only");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open("my-best-version-planner-v4:e2e-user"); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("cascadePlans", "readwrite");
      tx.objectStore("cascadePlans").put({ id: "h01-month", horizon: "monthly", periodKey: "2026-10", intention: "Avanzar con calma", priority: "Avanzar en mi proyecto personal", objectives: ["Avanzar en mi proyecto personal"], activities: [], createdAt: "2026-10-20T17:00:00Z", updatedAt: "2026-10-20T17:00:00Z" });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  });
  const before = await records(page);
  await page.goto("/app/planning/weekly?date=" + day);
  const dialog = page.getByRole("dialog", { name: "Del mes a tu semana" });
  for (const [name, time] of [[title, "18:30"], [midnightTitle, "00:00"]]) {
    await page.getByRole("button", { name: "Elegir un paso mensual", exact: true }).first().click();
    await dialog.getByLabel("Mes de contexto").selectOption("2026-10");
    await dialog.getByLabel("Prioridad mensual").selectOption("Avanzar en mi proyecto personal");
    await dialog.getByLabel("Paso concreto").fill(name!);
    await dialog.getByLabel("Día para este paso").fill(day);
    await dialog.getByLabel("Hora (opcional)").fill(time!);
    await dialog.getByRole("button", { name: "Guardar paso", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "Tu paso está guardado" })).toBeVisible();
    await dialog.getByRole("button", { name: "Seguir preparando" }).click();
    await expect(dialog).toBeHidden();
  }
  const created = await records(page);
  const initial = created.tasks.find(task => task.title === title)!;
  expect(created.tasks).toHaveLength(before.tasks.length + 2);
  expect(initial).toMatchObject({ time: "18:30", date: day, periodPlanId: "h01-month" });
  expect(initial.estimatedMinutes).toBeUndefined(); expect(initial.focusPriority).toBeUndefined();
  await page.locator(".prep-day-switch").getByRole("link", { name: "Día", exact: true }).click();
  // Wait for the day view itself, not the outgoing weekly row with the same record ID.
  const agenda = page.locator(`.editorial-agenda-point[data-record-id="task-${initial.id}"]`);
  await expect(agenda).toContainText("18:30");
  await agenda.scrollIntoViewIfNeeded(); await capture(page, info, "h01-agenda-1830");
  await page.goto("/app/today");
  const row = page.locator(".day-timeline-list article").filter({ hasText: title });
  await expect(row).toContainText("Prioridad mensual: Avanzar en mi proyecto personal");
  await row.scrollIntoViewIfNeeded();
  await capture(page, info, "h01-today-1830");
  await info.attach("h01-initial", { body: JSON.stringify({ environment: "local E2E_ACCESS=1; synthetic monthly context; tasks created through UI; real IndexedDB", localDate: day, before, created, visibleDetail: await row.locator("small").innerText() }, null, 2), contentType: "application/json" });
  await expect(row.locator("small")).toHaveText("18:30 · Prioridad mensual: Avanzar en mi proyecto personal");
  await expect(page.locator(".day-timeline-list article").filter({ hasText: midnightTitle }).locator("small")).toHaveText("00:00 · Prioridad mensual: Avanzar en mi proyecto personal");
  const untimedDetail = await page.locator(".day-timeline-list article").filter({ hasText: untimedTitle }).locator("small").innerText();
  expect(untimedDetail).not.toMatch(/\d{2}:\d{2}|Sin hora/);
  const orderBefore = await page.locator(".day-timeline-list article strong").allTextContents();
  const accessible = await row.ariaSnapshot();
  expect(accessible).toContain("18:30"); expect(accessible).toContain("Prioridad mensual");
  await expect(row.getByRole("button", { name: `Editar ${title}`, exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: `Completar ${title}`, exact: true })).toBeVisible();
  await page.goto("/app/planning/weekly?date=" + day);
  const weeklyRow = page.locator(`[data-record-id="task-${initial.id}"]`);
  await weeklyRow.getByLabel(`Más opciones para ${title}`).click();
  await weeklyRow.getByRole("button", { name: "Editar tarea", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Editar acción", exact: true });
  await expect(editor.getByLabel("Hora (opcional)")).toHaveValue("18:30");
  await expect(editor.getByLabel("Duración en minutos (opcional)")).toHaveValue("");
  await editor.getByLabel("Hora (opcional)").fill("19:00");
  await editor.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(weeklyRow).toContainText("19:00");
  const edited = await records(page);
  const changed = edited.tasks.find(task => task.id === initial.id)!;
  expect(changed).toEqual({ ...initial, time: "19:00", updatedAt: changed.updatedAt });
  expect(edited.plans).toEqual(created.plans);
  for (const task of created.tasks.filter(task => task.id !== initial.id)) expect(edited.tasks.find(item => item.id === task.id)).toEqual(task);
  await page.goto("/app/today"); await page.reload();
  await expect(row.locator("small")).toHaveText("19:00 · Prioridad mensual: Avanzar en mi proyecto personal");
  await expect(page.locator(".day-timeline-list article strong")).toHaveText(orderBefore);
  await row.scrollIntoViewIfNeeded(); await capture(page, info, "h01-today-1900-reloaded-es");
  const reloaded = await records(page); expect(reloaded).toEqual(edited);
  expect(reloaded.tasks.filter(task => task.id === initial.id)).toHaveLength(1);
  await page.goto("/app/settings"); await page.locator(".language-switcher button").last().click();
  await page.goto("/app/today"); await page.reload();
  await expect(row.locator("small")).toHaveText("19:00 · Monthly priority: Avanzar en mi proyecto personal");
  await expect(page.locator(".day-timeline-list article").filter({ hasText: midnightTitle }).locator("small")).toHaveText("00:00 · Monthly priority: Avanzar en mi proyecto personal");
  await row.scrollIntoViewIfNeeded(); await capture(page, info, "h01-today-1900-reloaded-en");
  expect(await records(page)).toEqual(reloaded);
  await info.attach("h01-identity-persistence-accessibility", { body: JSON.stringify({ before, created, edited, reloaded, orderBefore, accessible, englishAccessible: await row.ariaSnapshot(), screenReaderLimit: "Browser accessibility snapshot only; no physical NVDA/VoiceOver session", viewport: page.viewportSize(), errors }, null, 2), contentType: "application/json" });
  expect(errors).toEqual([]);
});

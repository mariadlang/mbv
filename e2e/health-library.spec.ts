import { test, expect, type Page } from "@playwright/test";
import { LEGAL_VERSION } from "../src/lib/legalConfig";

test.use({ timezoneId: "America/Bogota" });
async function setupHealth(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-02T15:00:00-05:00"));
  await page.goto("/app/dashboard");
  const cookies = page.getByRole("button", { name: "Solo necesarias" });
  if (await cookies.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false)) await cookies.click();
  await page.getByRole("button", { name: "Crear mi primera acción" }).click();
  await page.getByRole("radio", { name: /Mi día/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Resultado").fill("Planificar mi semana");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Primera acción").fill("Organizar mi alimentación");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Ver mi primera acción/ }).click();
  await expect(page).toHaveURL(/app\/today/);
  await page.route("**/rest/v1/user_consents?*", (route) => route.fulfill({ json: [{ id: "health-test-consent", user_id: "e2e-user", consent_type: "sensitive_wellness", document_version: LEGAL_VERSION, status: "granted", method: "feature_gate", consented_at: "2026-10-02T20:00:00Z" }] }));
  await page.route("**/rest/v1/privacy_requests?*", (route) => route.fulfill({ json: [] }));
  await page.evaluate(async (version) => {
    if (location.hostname !== "127.0.0.1") throw new Error("Local isolated test fixture only");
    const state = JSON.parse(localStorage.getItem("mbv-legal-privacy-v1") || "{}");
    state.consents = [{ id: "health-test-consent", userId: "e2e-user", consentType: "sensitive_wellness", documentVersion: version, status: "granted", method: "feature_gate", timestamp: "2026-10-02T20:00:00Z" }];
    localStorage.setItem("mbv-legal-privacy-v1", JSON.stringify(state));
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("my-best-version-planner-v4:e2e-user"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["nutritionLogs", "workoutLogs"], "readwrite");
      const stamp = "2026-10-02T20:00:00Z";
      tx.objectStore("nutritionLogs").put({ id: "meal-source-day", date: "2026-09-30", createdAt: stamp, updatedAt: stamp, meals: [{ id: "meal-source", name: "Almuerzo detallado", calories: 420, protein: 20, carbs: 50, fat: 12, notes: "Arroz 100 g; lentejas 150 g", completed: true }, { id: "incomplete-meal", name: "Por completar", completed: false }] });
      tx.objectStore("workoutLogs").put({ id: "workout-source", date: "2026-09-30", weekKey: "2026-W40", name: "Fuerza guardada", durationMinutes: 35, exercises: [{ id: "exercise-source", name: "Sentadilla", sets: 2, reps: 8, weight: 12, setDetails: [{ id: "source-set1", setNumber: 1, reps: 8, weight: 12 }, { id: "source-set2", setNumber: 2, reps: 6, weight: 14 }] }], completedSessions: [{ id: "historic-session", date: "2026-09-30", workoutName: "Fuerza guardada", durationMinutes: 35, exercises: [], completedAt: stamp }], createdAt: stamp, updatedAt: stamp });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  }, LEGAL_VERSION);
}
async function healthRecords(page: Page) {
  return page.evaluate(async () => {
    if (location.hostname !== "127.0.0.1") throw new Error("Local fixture only");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("my-best-version-planner-v4:e2e-user"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const read = (table: string) => new Promise<unknown[]>((resolve, reject) => { const request = db.transaction(table).objectStore(table).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const [nutrition, training] = await Promise.all([read("nutritionLogs"), read("workoutLogs")]); db.close();
    return { nutrition, training } as { nutrition: Array<{ date: string; meals: Array<{ id: string; name: string; notes?: string; completed?: boolean }> }>; training: Array<{ id: string; date: string; name: string; durationMinutes: number; exercises: unknown[]; completedSessions: unknown[] }> };
  });
}

test("real meal library preserves detailed monthly base, weekly exception and guarded editor", async ({ page }) => {
  test.setTimeout(120_000);
  await setupHealth(page);
  await page.goto("/app/health?date=2026-10-02");
  const health = page.locator(".prep-health");
  await health.getByRole("button", { name: "Biblioteca", exact: true }).click();
  const source = health.locator(".health-library-record").filter({ hasText: "Almuerzo detallado" });
  await expect(health.getByText("Pendiente de completar: solo contiene un título")).toBeVisible();
  await source.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("dialog")).toContainText("Arroz 100 g; lentejas 150 g");
  await page.getByRole("dialog").getByRole("button", { name: "Usar este contenido" }).click();
  await page.getByRole("combobox", { name: "Aplicar en", exact: true }).selectOption("monthly");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await health.getByRole("button", { name: "Semana", exact: true }).click();
  await expect(health).toContainText("Recuperado de tu planificación mensual");
  const before = (await healthRecords(page)).nutrition.find((log) => log.date === "2026-10-02")!.meals[0];
  expect(before.completed).toBe(false);
  await health.locator(".prep-health-days > button").nth(4).click();
  await page.getByRole("dialog").getByRole("button", { name: "Abrir editor detallado" }).click();
  const editor = page.getByRole("dialog", { name: "Editar comida", exact: true });
  await editor.getByLabel("Notas opcionales").fill("Cantidad ajustada solo esta semana");
  await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
  const guard = page.getByRole("dialog", { name: "Tienes cambios sin guardar" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Seguir editando" }).click();
  await expect(editor.getByLabel("Notas opcionales")).toHaveValue("Cantidad ajustada solo esta semana");
  await editor.getByRole("button", { name: "Guardar comida", exact: true }).click();
  await expect(editor).toBeHidden();
  await expect.poll(async () => (await healthRecords(page)).nutrition.find((log) => log.date === "2026-10-02")!.meals[0].notes).toBe("Cantidad ajustada solo esta semana");
  await page.reload();
  await expect(health).toContainText("Ajuste para esta semana");
  expect((await healthRecords(page)).nutrition.find((log) => log.date === "2026-10-02")!.meals[0]).toMatchObject({ id: before.id, notes: "Cantidad ajustada solo esta semana", completed: false });
  await health.locator(".prep-health-days > button").nth(4).click();
  await page.getByRole("dialog").getByRole("button", { name: "Conservar el plan del mes" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect.poll(async () => (await healthRecords(page)).nutrition.find((log) => log.date === "2026-10-02")!.meals).toEqual([before]);
  await page.reload();
  const restored = (await healthRecords(page)).nutrition.find((log) => log.date === "2026-10-02")!.meals;
  expect(restored).toEqual([before]);
  await page.goto("/app/today");
  await expect(page.locator(".day-timeline-list")).toContainText("Almuerzo detallado");
});

test("detailed workout reuse keeps sets, target identity and source performed history", async ({ page }) => {
  test.setTimeout(120_000);
  await setupHealth(page);
  await page.goto("/app/health?section=training&date=2026-10-02");
  const health = page.locator(".prep-health");
  await health.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await health.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("dialog")).toContainText("6 repeticiones · 14 kg");
  await page.getByRole("dialog").getByRole("button", { name: "Usar este contenido" }).click();
  await page.getByRole("combobox", { name: "Aplicar en", exact: true }).selectOption("monthly");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const before = (await healthRecords(page)).training.find((log) => log.date === "2026-10-02")!;
  expect(before.completedSessions).toEqual([]);
  // Preparation does not imply completion. Record one real session explicitly,
  // then prove weekly edits and restoration leave that history untouched.
  await page.getByRole("button", { name: "Guardar sesión realizada" }).click();
  await expect.poll(async () => (await healthRecords(page)).training.find((log) => log.date === "2026-10-02")!.completedSessions.length).toBe(1);
  const performed = (await healthRecords(page)).training.find((log) => log.date === "2026-10-02")!.completedSessions;
  await health.getByRole("button", { name: "Semana", exact: true }).click();
  await health.locator(".prep-health-days > button").nth(4).click();
  await page.getByRole("dialog").getByRole("button", { name: "Abrir editor detallado" }).click();
  await page.getByRole("dialog").getByLabel("Duración estimada (min)").fill("20");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar entrenamiento" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect.poll(async () => (await healthRecords(page)).training.find((log) => log.date === "2026-10-02")!.durationMinutes).toBe(20);
  await page.reload();
  expect((await healthRecords(page)).training.find((log) => log.date === "2026-10-02")!.durationMinutes).toBe(20);
  await health.locator(".prep-health-days > button").nth(4).click();
  await page.getByRole("dialog").getByLabel("Descanso", { exact: true }).check();
  await page.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Guardar sesión realizada" })).toBeDisabled();
  await health.locator(".prep-health-days > button").nth(4).click();
  await page.getByRole("dialog").getByRole("button", { name: "Conservar el plan del mes" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect.poll(async () => (await healthRecords(page)).training.find((log) => log.date === "2026-10-02")!.durationMinutes).toBe(35);
  await page.reload();
  const records = await healthRecords(page);
  const restored = records.training.filter((log) => log.date === "2026-10-02");
  expect(restored).toHaveLength(1);
  expect(restored[0]).toMatchObject({ id: before.id, name: before.name, durationMinutes: 35, exercises: before.exercises, completedSessions: performed });
  expect(records.training.find((log) => log.date === "2026-09-30")!.completedSessions).toHaveLength(1);
  await page.goto("/app/today");
  await expect(page.locator(".day-timeline-list")).toContainText("Fuerza guardada");
  await expect(page.locator(".day-timeline-list")).toContainText("35 min");
});

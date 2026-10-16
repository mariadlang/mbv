import { expect, type Page, type TestInfo } from "@playwright/test";
import { LEGAL_VERSION } from "../../src/lib/legalConfig";

export const longEditorialText = "Quiero preparar mi semana con calma, reservar tiempo para aprender, cuidar mis relaciones y dejar espacio para descansar sin perder lo importante. ".repeat(3).trim();

/** Only a fresh, local Playwright context with the dedicated e2e-user database. */
export async function setupEditorialFixture(page: Page) {
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
  await page.evaluate(async (longText) => {
    if (location.hostname !== "127.0.0.1") throw new Error("Local fixture only");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("my-best-version-planner-v4:e2e-user"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["cascadePlans", "tasks", "habits", "lifeAreas", "nutritionLogs", "workoutLogs", "events"], "readwrite");
      const stamp = "2026-10-02T20:00:00.000Z";
      const common = { createdAt: stamp, updatedAt: stamp };
      const objectives = ["Ser constante con mi alimentación", "Mantener 4 entrenamientos por semana", "Avanzar en mi proyecto personal", "Prioridad adicional que debe conservarse"];
      tx.objectStore("cascadePlans").put({ id: "editorial-month", horizon: "monthly", periodKey: "2026-10", intention: "Disciplina tranquila", priority: objectives[0], objectives, activities: [], ...common });
      tx.objectStore("cascadePlans").put({ id: "editorial-week", horizon: "weekly", periodKey: "2026-W40", intention: "", priority: "", objectives: [], activities: [], details: { "preparation.v1.month": "2026-10", "preparation.v1.item.nutrition": "ready", "preparation.v1.item.training": "ready", "preparation.v1.item.agenda": "ready" }, ...common });
      tx.objectStore("habits").put({ id: "editorial-habit", name: "Leer con calma", type: "boolean", scheduledDays: [1, 2, 3, 4, 5], target: 1, unit: "vez", status: "active", ...common });
      tx.objectStore("lifeAreas").put({ id: "editorial-custom-area", name: "Aprendizaje y proyectos que me ilusionan", color: "sage", order: 99, active: true, custom: true, category: "Desarrollo personal", dream: "Aprender a mi ritmo", vision: longText, ...common });
      const tasks = [
        { id: "overlap-a", title: "Trabajo profundo", time: "08:00", estimatedMinutes: 120 },
        { id: "overlap-b", title: "Revisión de proyecto", time: "08:30", estimatedMinutes: 60 },
        { id: "overlap-c", title: "Lectura y aprendizaje", time: "09:00", estimatedMinutes: 120 },
        { id: "consecutive", title: "Pausa consciente", time: "11:00", estimatedMinutes: 30 },
        { id: "duration-unknown", title: "Llamada sin duración definida", time: "14:00" },
        { id: "date-only", title: "Una tarea sin hora que también cuenta" },
        { id: "midnight", title: "Actividad que continúa mañana", time: "23:30", estimatedMinutes: 90 },
      ];
      for (const task of tasks) tx.objectStore("tasks").put({ ...task, id: "editorial-" + task.id, date: "2026-10-02", priority: "medium", status: "planned", ...common });
      tx.objectStore("tasks").put({ id: "editorial-previous", title: "Pendiente sin mover", date: "2026-09-25", priority: "medium", status: "planned", ...common });
      tx.objectStore("events").put({ id: "editorial-event", title: "Encuentro en mi calendario", category: "personal", startDate: "2026-10-02", endDate: "2026-10-02", startTime: "16:00", endTime: "17:00", allDay: false, status: "confirmed", ...common });
      tx.objectStore("events").put({ id: "editorial-all-day", title: "Recordatorio de todo el día", category: "personal", startDate: "2026-10-02", endDate: "2026-10-02", allDay: true, status: "confirmed", ...common });
      tx.objectStore("nutritionLogs").put({ id: "editorial-nutrition", date: "2026-10-02", meals: [{ id: "editorial-meal", name: "Almuerzo preparado en casa", calories: 450, protein: 25, carbs: 55, fat: 14, notes: "Verduras y comida preparada con tiempo. Datos de prueba introducidos manualmente.", completed: false }], ...common });
      tx.objectStore("workoutLogs").put({ id: "editorial-workout", date: "2026-10-02", weekKey: "2026-W40", name: "Entrenamiento de fuerza", goal: "Una sesión a mi ritmo", durationMinutes: 45, exercises: [{ id: "editorial-exercise", name: "Sentadilla", sets: 2, reps: 8, weight: 10, setDetails: [{ id: "editorial-set-1", setNumber: 1, reps: 8, weight: 10 }, { id: "editorial-set-2", setNumber: 2, reps: 6, weight: 12 }] }], completedSessions: [], ...common });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, longEditorialText);
  // Consent is restricted to the test user/browser, without posting to external services.
  await page.route("**/rest/v1/user_consents?*", (route) => route.fulfill({ json: [{ id: "editorial-consent", user_id: "e2e-user", consent_type: "sensitive_wellness", document_version: LEGAL_VERSION, status: "granted", method: "feature_gate", consented_at: "2026-10-02T20:00:00Z" }] }));
  await page.route("**/rest/v1/privacy_requests?*", (route) => route.fulfill({ json: [] }));
  await page.evaluate((version) => {
    if (location.hostname !== "127.0.0.1") throw new Error("Local fixture only");
    const state = JSON.parse(localStorage.getItem("mbv-legal-privacy-v1") || "{}");
    state.consents = [{ id: "editorial-consent", userId: "e2e-user", consentType: "sensitive_wellness", documentVersion: version, status: "granted", method: "feature_gate", timestamp: "2026-10-02T20:00:00Z" }];
    localStorage.setItem("mbv-legal-privacy-v1", JSON.stringify(state));
  }, LEGAL_VERSION);
}

export async function editorialCapture(page: Page, testInfo: TestInfo, name: string, fullPage = true) {
  await page.evaluate(() => document.fonts.ready);
  if (fullPage) await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), { message: `${name}: no horizontal page overflow` }).toBeTruthy();
  const viewport = page.viewportSize()!;
  const path = `docs/qa/screenshots/closure-mobile-${name}-${viewport.width}x${viewport.height}-${testInfo.project.name}.png`;
  await page.screenshot({ path, fullPage, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
  if (fullPage) {
    const viewportPath = path.replace(/\.png$/, "-viewport.png");
    await page.screenshot({ path: viewportPath, fullPage: false, animations: "disabled" });
    await testInfo.attach(`${name}-viewport`, { path: viewportPath, contentType: "image/png" });
  }
}

export async function discardEditorialDraft(page: Page) {
  const guard = page.getByRole("dialog", { name: "Tienes cambios sin guardar" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  await expect(guard).toBeHidden();
}

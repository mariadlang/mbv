import { expect, type Page } from "@playwright/test";
import { LEGAL_VERSION } from "../../src/lib/legalConfig";

export async function setupHealth(page: Page) {
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
export async function healthRecords(page: Page) {
  return page.evaluate(async () => {
    if (location.hostname !== "127.0.0.1") throw new Error("Local fixture only");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("my-best-version-planner-v4:e2e-user"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const read = (table: string) => new Promise<unknown[]>((resolve, reject) => { const request = db.transaction(table).objectStore(table).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const [nutrition, training] = await Promise.all([read("nutritionLogs"), read("workoutLogs")]); db.close();
    return { nutrition, training } as { nutrition: Array<{ date: string; meals: Array<{ id: string; name: string; notes?: string; completed?: boolean }> }>; training: Array<{ id: string; date: string; name: string; durationMinutes: number; exercises: unknown[]; completedSessions: unknown[] }> };
  });
}


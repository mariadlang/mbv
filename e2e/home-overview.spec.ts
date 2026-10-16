import { expect, test } from "@playwright/test";
import { setupEditorialFixture } from "./helpers/editorial-fixture";

async function setup(page: import("@playwright/test").Page) {
  await setupEditorialFixture(page);
  await page.evaluate(async () => {
    if (location.hostname !== "127.0.0.1") throw Error("Fixture only on loopback");
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open("my-best-version-planner-v4:e2e-user"); r.onsuccess = () => resolve(r.result); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["projects", "projectChecklistItems", "tasks"], "readwrite");
      const stamp = { createdAt: "2026-10-02T20:00:00Z", updatedAt: "2026-10-02T20:00:00Z" };
      tx.objectStore("projects").put({ id: "home-project", name: "Mi proyecto de prueba", outcome: "Entregable revisable", status: "active", ...stamp });
      for (let i = 0; i < 3; i++) {
        tx.objectStore("projectChecklistItems").put({ id: `home-check-${i}`, projectId: "home-project", title: i === 2 ? "Revisar las propuestas" : `Paso del proyecto ${i}`, completed: i < 2, ...stamp });
        tx.objectStore("tasks").put({ id: `home-priority-${i}`, title: ["Cuidar mi alimentación", "Preparar mi siguiente entrenamiento", "Un paso de mi proyecto"][i], date: "2026-10-02", priority: "high", status: i === 0 ? "completed" : i === 1 ? "in_progress" : "planned", ...stamp });
      }
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  });
  await page.goto("/app/dashboard");
}

test("Inicio five persistent preparations, actual summaries, responsive composition and links", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize(testInfo.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1448, height: 1086 });
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  await expect(page.getByRole("heading", { name: "Tu semana en orden", exact: true })).toBeVisible();
  await expect(page.locator(".prep-checklist-row")).toHaveCount(5);
  await expect(page.locator(".home-ready-count")).toHaveText("3 de 5 preparados");
  await expect(page.locator(".home-direction")).toContainText("Disciplina tranquila");
  await expect(page.locator(".home-direction .prep-priorities li")).toHaveCount(3);
  await expect(page.locator(".home-week-strip a")).toHaveCount(7);
  await expect(page.locator('.home-week-strip [aria-current="date"]')).toHaveAttribute("href", /date=2026-10-02/);
  await expect(page.locator(".home-week-priorities li")).toHaveCount(3);
  await expect(page.locator(".home-week-priorities li").first()).toContainText("Hecho");
  await expect(page.locator(".home-project")).toContainText("2 de 3 pasos completados");
  await expect(page.locator(".home-next-action")).toContainText("Revisar las propuestas");
  await expect(page.locator(".home-upcoming li")).toHaveCount(2);
  await expect(page.locator(".prep-agenda-items, .prep-next, .prep-quote, .prep-focus-photo")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("inicio-viewport.png"), fullPage: false });
  await page.screenshot({ path: testInfo.outputPath("inicio-completo.png"), fullPage: true });
  if (testInfo.project.name === "mobile") {
    const top = await page.locator('.home-column > div').evaluateAll((nodes) => nodes.map((n) => ({ name: n.className, top: n.getBoundingClientRect().top })).sort((a, b) => a.top - b.top).map((n) => n.name));
    expect(top).toEqual(["home-block-preparation", "home-block-week", "home-block-month", "home-block-project", "home-block-upcoming"]);
  }
  for (const [label, destination] of [
    ["Alimentación", /health\?section=nutrition&date=2026-09-28/],
    ["Entrenamiento", /health\?section=training&date=2026-09-28/],
    ["Hábitos", /habits\?returnTo=/],
    ["Prioridades de la semana", /weekly\?date=2026-09-28.*#weekly-priorities/],
    ["Semana agendada", /weekly\?date=2026-09-28/],
  ] as const) {
    const action = page.locator(".prep-checklist-row").filter({ hasText: label }).locator(".prep-row-action");
    await action.focus();
    await expect(action).toBeFocused();
    await action.press("Enter");
    await expect(page).toHaveURL(destination);
    await expect(page.locator(".app-shell main")).toBeVisible();
    await page.goto("/app/dashboard");
    await expect(page.locator(".home-ready-count")).toHaveText("3 de 5 preparados");
  }
  for (const label of ["Hábitos", "Prioridades de la semana"]) {
    const row = page.locator(".prep-checklist-row").filter({ hasText: label });
    await row.locator(".prep-badge").click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar preparación", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }
  await page.reload();
  await expect(page.locator(".home-ready-count")).toHaveText("5 de 5 preparados");
  await expect(page.locator(".prep-checklist-row")).toHaveCount(5);
  await page.getByRole("link", { name: "Ver proyecto", exact: true }).click();
  await expect(page).toHaveURL(/tasks\?project=home-project/);
  await expect(page.locator("#project-home-project")).toContainText("Mi proyecto de prueba");
  await page.goto("/app/dashboard");
  await page.getByRole("link", { name: "Ver mi mes", exact: true }).click();
  await expect(page).toHaveURL(/view=month&month=2026-10/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/octubre/i);
  await page.goto("/app/dashboard");
  await page.locator(".home-upcoming li").filter({ hasText: "Encuentro en mi calendario" }).getByRole("link").click();
  await expect(page).toHaveURL(/event=editorial-event/);
  await expect(page.getByLabel("Evento", { exact: true })).toHaveValue("Encuentro en mi calendario");
  await expect(page.getByLabel("Fecha", { exact: true })).toHaveValue("2026-10-02");
  await expect(page.getByLabel("Hora inicial", { exact: true })).toHaveValue("16:00");
  await expect(page.getByLabel("Hora final", { exact: true })).toHaveValue("17:00");
  await page.goto("/app/dashboard");
  await page.getByRole("link", { name: "Ver mi semana", exact: true }).click();
  await expect(page).toHaveURL(/weekly\?date=2026-09-28/);
  await expect(page.locator(".weekly-days-panel")).toBeVisible();
  await page.clock.setFixedTime(new Date("2026-11-02T15:00:00-05:00"));
  await page.goto("/app/dashboard");
  await expect(page.locator(".home-ready-count")).toHaveText("0 de 5 preparados");
  await expect(page.locator(".home-direction > time")).toContainText("noviembre");
  await expect(page.locator(".home-week-priorities li")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Definir mi intención" })).toHaveAttribute("href", /month=2026-11/);
  expect(errors).toEqual([]);
});

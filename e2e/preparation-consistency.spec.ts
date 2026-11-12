import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { setupEditorialFixture } from "./helpers/editorial-fixture";

const week = "2026-10-19";
const labels = ["Alimentación", "Entrenamiento", "Hábitos", "Prioridades de la semana", "Semana agendada"];
async function records(page: Page) {
  return page.evaluate(async () => {
    if (location.hostname !== "127.0.0.1") throw Error("Synthetic loopback only");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("my-best-version-planner-v4:e2e-user");
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    const names = [...db.objectStoreNames];
    const tx = db.transaction(names, "readonly");
    const result: Record<string, Record<string, unknown>[]> = {};
    await Promise.all(names.map((name) => new Promise<void>((resolve, reject) => {
      const r = tx.objectStore(name).getAll();
      r.onsuccess = () => { result[name] = r.result; resolve(); }; r.onerror = () => reject(r.error);
    })));
    db.close(); return result;
  });
}
async function setup(page: Page) {
  await setupEditorialFixture(page);
  await page.clock.setFixedTime(new Date("2026-10-20T12:00:00-05:00"));
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open("my-best-version-planner-v4:e2e-user"); r.onsuccess = () => resolve(r.result); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("cascadePlans", "readwrite"), store = tx.objectStore("cascadePlans");
      const r = store.get("editorial-week");
      r.onsuccess = () => store.put({ ...r.result, periodKey: "2026-W43", objectives: ["Prioridad con contenido conservado"], details: { ...r.result.details, "preparation.v1.review": "skipped" } });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  });
}
function row(page: Page, label: string) { return page.locator(".prep-checklist-row").filter({ has: page.locator("strong", { hasText: label }) }); }
async function change(page: Page, label: string, action: string) {
  const badge = row(page, label).getByRole("button").first();
  await badge.scrollIntoViewIfNeeded();
  await badge.focus(); await badge.press("Enter");
  const dialog = page.getByRole("dialog");
  if (action === "Incluir esta semana") await expect(dialog.getByRole("button", { name: "Confirmar preparación", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: action, exact: true }).click();
  await expect(dialog).toBeHidden();
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const card = page.locator(".prep-checklist");
  await card.scrollIntoViewIfNeeded();
  const path = info.outputPath(`${name}-${page.viewportSize()!.width}.png`);
  await card.screenshot({ path, animations: "disabled" });
  await info.attach(name, { path, contentType: "image/png" });
  await page.screenshot({ path: info.outputPath(`${name}-full.png`), fullPage: true, animations: "disabled" });
}

test("H03 applicable preparation is identical in Inicio and Mi guía across preferences, weeks and reloads", async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  const before = await records(page);
  const observations: { scenario: string; home: string; guide: string }[] = [];
  const both = async (scenario: string, expected: string, screenshot = false) => {
    const observation = { scenario, home: "", guide: "" };
    for (const surface of ["home", "guide"] as const) {
      await page.goto(surface === "home" ? "/app/dashboard" : `/app/guide?week=${week}`);
      const count = page.locator(surface === "home" ? ".home-ready-count" : ".prep-progress small");
      await expect(count).toBeVisible();
      await expect(count).toHaveText(expected);
      await page.reload();
      await expect(count).toBeVisible();
      await expect(count).toHaveText(expected);
      observation[surface] = await count.innerText();
      if (surface === "home") await expect(page.locator(".prep-checklist-row")).toHaveCount(5);
      if (expected.startsWith("Sin")) {
        await expect(page.locator(".prep-checklist progress, .prep-progress-ring")).toHaveCount(0);
        await expect(page.locator(".prep-checklist")).not.toContainText(/0 de 0|0%/);
      }
      if (screenshot) {
        await capture(page, info, `${scenario}-${surface}`);
        if (info.project.name === "mobile") {
          await page.setViewportSize({ width: 360, height: 800 });
          await capture(page, info, `${scenario}-${surface}-narrow`);
          await page.setViewportSize({ width: 390, height: 844 });
        }
      }
    }
    observations.push(observation);
  };
  await both("five", "3 de 5 preparados");
  await change(page, "Prioridades de la semana", "No aplica esta semana");
  await both("excluded", "3 de 4 preparados", true);
  await expect(row(page, "Prioridades de la semana")).toContainText("No aplica esta semana");
  const excluded = await records(page);
  await page.goto("/app/dashboard");
  await expect(row(page, "Prioridades de la semana")).toContainText("No aplica esta semana");
  await row(page, "Prioridades de la semana").getByRole("link").click();
  await expect(page).toHaveURL(/weekly\?date=2026-10-19/);
  await page.goto("/app/dashboard");
  expect(await records(page)).toEqual(excluded);
  await change(page, "Prioridades de la semana", "Incluir esta semana");
  await expect(row(page, "Prioridades de la semana")).toContainText("En proceso");
  await both("reincluded", "3 de 5 preparados");
  await change(page, "Prioridades de la semana", "No aplica esta semana");
  await change(page, "Hábitos", "Confirmar preparación");
  await both("allApplicableReady", "4 de 4 preparados");
  for (const label of labels.filter((s) => s !== "Prioridades de la semana")) await change(page, label, "No aplica esta semana");
  await both("allExcluded", "Sin apartados activos esta semana", true);
  await change(page, "Alimentación", "Incluir esta semana");
  await expect(row(page, "Alimentación")).toContainText("Por preparar");
  await page.getByRole("button", { name: "Personalizar checklist" }).click();
  const dialog = page.getByRole("dialog");
  for (const label of labels.slice(1)) await dialog.getByRole("checkbox", { name: label, exact: true }).uncheck();
  await dialog.getByRole("textbox", { name: "Otro", exact: true }).fill("Lectura y creación H03");
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await change(page, "Lectura y creación H03", "Confirmar preparación");
  await both("custom", "1 de 2 preparado");
  const custom = await records(page);
  const previous = custom.cascadePlans.find((p) => p.periodKey === "2026-W43");
  await page.goto("/app/dashboard");
  await expect(page.getByText("Desactivado en Mi guía", { exact: true })).toHaveCount(4);
  await expect(page.getByText("Lectura y creación H03", { exact: true })).toHaveCount(0);
  const more = page.getByRole("link", { name: "El total considera tus apartados adicionales aplicables. Ver Mi guía" });
  await expect(more).toHaveAttribute("href", "/app/guide?week=2026-10-19");
  await more.click();
  await expect(row(page, "Lectura y creación H03")).toContainText("Listo");
  await page.clock.setFixedTime(new Date("2026-10-27T12:00:00-05:00"));
  await page.goto("/app/dashboard");
  await expect(page.locator(".home-ready-count")).toHaveText("0 de 2 preparados");
  await expect(page.locator(".home-ready-count")).toBeVisible();
  await expect(row(page, "Alimentación")).toContainText("Por preparar");
  await expect(page.getByText("Desactivado en Mi guía", { exact: true })).toHaveCount(4);
  await page.goto("/app/guide?week=2026-10-26");
  await expect(page.locator(".prep-guide")).toBeVisible();
  if (await page.locator(".prep-mobile-entry").isVisible()) await page.getByRole("button", { name: "Comenzar", exact: true }).click();
  await page.getByRole("button", { name: "Omitir y planificar", exact: true }).click();
  await expect(page.locator(".prep-progress small")).toHaveText("0 de 2 preparados");
  await expect(page.locator(".prep-progress small")).toBeVisible();
  await expect(row(page, "Lectura y creación H03")).toContainText("Por preparar");
  observations.push({ scenario: "nextWeek", home: "0 de 2 preparados", guide: await page.locator(".prep-progress small").innerText() });
  await change(page, "Alimentación", "Confirmar preparación");
  const next = await records(page);
  expect(next.cascadePlans.find((p) => p.periodKey === "2026-W43")).toEqual(previous);
  expect(next.profiles).toEqual(custom.profiles);
  await page.clock.setFixedTime(new Date("2026-10-20T12:00:00-05:00"));
  await both("previousWeekRestored", "1 de 2 preparado");
  await expect(row(page, "Lectura y creación H03")).toContainText("Listo");
  await page.getByRole("button", { name: "Personalizar checklist" }).click();
  await dialog.getByRole("checkbox", { name: "Alimentación", exact: true }).uncheck();
  // Custom options are removed from this editor when deselected, not left unchecked.
  await dialog.getByRole("checkbox", { name: "Lectura y creación H03", exact: true }).click();
  await expect(dialog.getByRole("checkbox", { name: "Lectura y creación H03", exact: true })).toHaveCount(0);
  await expect(dialog.locator('input[type="checkbox"]:checked')).toHaveCount(0);
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await both("noneSelected", "Sin apartados activos esta semana", true);
  await expect(page.locator(".prep-checklist-row")).toHaveCount(0);
  const after = await records(page);
  for (const name of Object.keys(before).filter((name) => !["profiles", "cascadePlans", "metadata"].includes(name))) expect(after[name], `Unchanged ${name}`).toEqual(before[name]);
  // The repository updates the snapshot timestamp on each legitimate write.
  // Owner, schema and every other metadata field must remain unchanged.
  expect(after.metadata).toEqual(before.metadata.map((item) => ({ ...item, updatedAt: "2026-10-20T17:00:00.000Z" })));
  expect(after.profiles).toEqual(before.profiles.map((item) => ({ ...item, preparationItems: [], updatedAt: "2026-10-20T17:00:00.000Z" })));
  for (const plan of before.cascadePlans.filter((p) => p.id !== "editorial-week")) expect(after.cascadePlans.find((p) => p.id === plan.id)).toEqual(plan);
  expect(after.cascadePlans.find((p) => p.periodKey === "2026-W43")).toEqual(previous);
  expect(errors).toEqual([]);
  await info.attach("H03-states-and-data", { body: JSON.stringify({ week, environment: "Isolated E2E synthetic IndexedDB; no production", observations, before, custom, after }, null, 2), contentType: "application/json" });
});

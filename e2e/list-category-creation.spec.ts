import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { PlannerSnapshot } from "../src/domain/planner";

test.use({ timezoneId: "America/Bogota" });
const categories = [
  ["Deseos", "wishlist"], ["Cosas que quiero hacer", "want_to_do"], ["Debo hacer", "must_do"],
  ["Compras por realizar", "shopping"], ["Quiero aprender", "want_to_learn"], ["Quiero leer", "want_to_read"], ["Series, TV y podcasts", "watch_list"],
] as const;
async function backup(page: Page): Promise<PlannerSnapshot> {
  await page.goto("/app/settings");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, "utf8")).data;
}

test("seven list categories create once, preserve identity on reload and keep quick capture", async ({ page }, info) => {
  test.setTimeout(120_000); // Seven complete category flows plus two backup downloads.
  await page.setViewportSize(info.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1448, height: 1086 });
  await page.goto("/app/dashboard");
  await page.getByRole("button", { name: "Solo necesarias" }).click();
  await page.getByRole("button", { name: "Crear mi primera acción" }).click();
  await page.getByRole("radio", { name: /Mi día/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Resultado").fill("Listas objetivo sintético");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Primera acción").fill("Listas tarea previa conservada");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Ver mi primera acción/ }).click();
  await expect(page).toHaveURL(/app\/today/);
  const before = await backup(page);
  await page.goto("/app/life-hub?tab=lists");
  const list = page.locator(".brain-legacy-list");
  const filters = page.locator(".brain-filters");
  for (const [label, type] of categories) {
    await filters.getByRole("button", { name: label, exact: true }).click();
    await list.getByRole("button", { name: "Añadir", exact: true }).click();
    await expect(page.getByLabel("Categoría", { exact: true })).toHaveValue(type);
    await expect(list.locator('input[type="date"]')).toHaveCount(0);
    await page.getByLabel("Nombre", { exact: true }).fill("Prueba listas " + label);
    if (type === "wishlist") {
      const form = list.locator("form");
      const visibility = () => form.locator("input, select, button").evaluateAll(elements => elements.map(element => {
        const r = element.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { control: element.getAttribute("aria-label") || element.textContent, top: r.top, bottom: r.bottom, viewport: innerHeight, hit: hit?.className, visible: r.top >= 0 && r.bottom <= innerHeight && (hit === element || element.contains(hit)) };
      }));
      const immediate = await visibility();
      await info.attach("form-visibility-immediate", { body: JSON.stringify(immediate), contentType: "application/json" });
      await page.screenshot({ path: info.outputPath("form-visibility-immediate.png"), fullPage: false });
      await expect.poll(async () => (await visibility()).every(item => item.visible), { message: "Form controls visible and uncovered after scrolling settles" }).toBe(true);
      await info.attach("form-visibility-settled", { body: JSON.stringify(await visibility()), contentType: "application/json" });
      await page.screenshot({ path: info.outputPath("list-creation-form-viewport.png"), fullPage: false });
    }
    if (info.project.name === "mobile") {
      const button = list.getByRole("button", { name: "Guardar", exact: true });
      await button.scrollIntoViewIfNeeded();
      const bounds = (await button.boundingBox())!;
      await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    }
    else await list.getByRole("button", { name: "Guardar", exact: true }).dblclick();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveCount(0);
    await expect(list.getByText("Prueba listas " + label, { exact: true })).toHaveCount(1);
    await expect(list.getByRole("button", { name: "Añadir", exact: true })).toBeVisible();
    await filters.getByRole("button", { name: "Todas", exact: true }).click();
    await expect(list.getByText("Prueba listas " + label, { exact: true })).toHaveCount(1);
  }
  // Creation from All selects a category, cancellation never commits.
  await list.getByRole("button", { name: "Añadir", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("No persistir");
  await list.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Descartar cambios" }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveCount(0);
  await list.getByRole("button", { name: "Añadir", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Prueba desde Todas");
  await page.getByLabel("Categoría", { exact: true }).selectOption("want_to_read");
  await list.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(list.getByText("Prueba desde Todas", { exact: true })).toHaveCount(1);
  const after = await backup(page);
  expect(after.brainDumpItems).toHaveLength(before.brainDumpItems.length + 8);
  expect(after.tasks).toEqual(before.tasks);
  for (const [label, type] of categories) {
    const items = after.brainDumpItems.filter(item => item.title === "Prueba listas " + label);
    expect(items).toHaveLength(1); expect(items[0].type).toBe(type);
    expect(items[0].tentativeDate).toBeUndefined(); expect(items[0].status).toBe("idea");
  }
  await page.goto("/app/life-hub?tab=lists"); await page.reload();
  for (const [label] of categories) {
    await filters.getByRole("button", { name: label, exact: true }).click();
    await expect(list.getByText("Prueba listas " + label, { exact: true })).toHaveCount(1);
  }
  await filters.getByRole("button", { name: "Todas", exact: true }).click();
  await expect(list.locator(".brain-item")).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("lists-reloaded.png"), fullPage: true });
  const reloaded = await backup(page);
  expect(reloaded.brainDumpItems).toEqual(after.brainDumpItems);
  expect(reloaded.tasks).toEqual(before.tasks);
  await info.attach("list-identities", { body: JSON.stringify({ environment: "isolated E2E; synthetic account and data", before: before.brainDumpItems, after: after.brainDumpItems, reloaded: reloaded.brainDumpItems }, null, 2), contentType: "application/json" });
});

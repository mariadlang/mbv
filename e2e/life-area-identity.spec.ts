import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const original = "Desarrollo personal / Crecimiento";
const renamed = "H09 Mi aprendizaje";

async function backup(page: Page) {
  await page.goto("/app/settings");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const download = await pending;
  const path = (await download.path())!;
  return { path, data: JSON.parse(await readFile(path, "utf8")).data };
}

test("H09 preserves area identity, ordering, selectors and backup after rename", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize(testInfo.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1448, height: 1086 });
  // Dedicated local E2E account; no real account, production access or planner seed.
  await page.goto("/app/dashboard");
  await page.getByRole("button", { name: "Solo necesarias" }).click();
  await page.getByRole("button", { name: "Crear mi primera acción" }).click();
  await page.getByRole("radio", { name: /Mi día/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Resultado").fill("Aprender con calma");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Primera acción").fill("Leer mi primer capítulo");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Ver mi primera acción/ }).click();
  await expect(page).toHaveURL(/app\/today/);
  const initial = await backup(page);
  expect(initial.data.lifeAreas).toHaveLength(8);
  const area = initial.data.lifeAreas.find((item: { name: string }) => item.name === original);

  await page.goto("/app/goals");
  await page.getByRole("button", { name: "Crear meta", exact: true }).click();
  const goal = page.getByRole("dialog", { name: "Crear una meta" });
  await goal.getByLabel("¿Qué quieres lograr?").fill("H09 Una meta vinculada");
  await goal.getByLabel("¿Por qué importa para ti?").fill("Aprender a mi propio ritmo");
  await goal.getByLabel("¿A qué área pertenece?").selectOption(area.id);
  await goal.getByRole("button", { name: "Crear meta", exact: true }).click();
  await page.getByRole("link", { name: /Planificar esta meta/ }).click();
  const month = page.locator(".month-create-form");
  await month.getByRole("checkbox", { name: original, exact: true }).check();
  await month.getByLabel(`Objetivo mensual de ${original}`).fill("H09 Avanzar mi lectura");
  await month.getByRole("button", { name: "Guardar plan", exact: true }).click();
  await expect(month).toBeHidden();
  const before = await backup(page);
  expect(before.data.goals[0].lifeAreaId).toBe(area.id);
  expect(before.data.cascadePlans.find((p: { horizon: string }) => p.horizon === "monthly").areaIds).toContain(area.id);
  await testInfo.attach("before", { body: JSON.stringify(before.data, null, 2), contentType: "application/json" });

  await page.getByRole("button", { name: `Subir ${original}`, exact: true }).click();
  await page.getByLabel(`Nombre de ${original}`, { exact: true }).fill(renamed);
  await page.getByLabel(`Nombre de ${original}`, { exact: true }).press("Tab");
  await expect(page.getByLabel(`Nombre de ${renamed}`, { exact: true })).toHaveValue(renamed);
  // The save indicator is visually hidden on mobile, but its state is still rendered.
  await expect(page.getByText("Guardado", { exact: true })).toBeAttached();
  for (let n = 0; n < 3; n++) {
    await page.reload();
    await expect(page.locator('.area-settings input[type="text"], .area-settings input:not([type])')).toHaveCount(8);
    await expect(page.getByLabel(`Nombre de ${original}`, { exact: true })).toHaveCount(0);
    await expect(page.getByLabel(`Nombre de ${renamed}`, { exact: true })).toHaveValue(renamed);
  }
  const after = await backup(page);
  const expected = [...before.data.lifeAreas];
  [expected[2], expected[3]] = [expected[3], expected[2]];
  expect(after.data.lifeAreas.map((a: { id: string }) => a.id)).toEqual(expected.map(a => a.id));
  expect(after.data.lifeAreas.map((a: { order: number }) => a.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(after.data.lifeAreas.find((a: { id: string }) => a.id === area.id)).toMatchObject({ name: renamed, active: area.active, createdAt: area.createdAt });
  expect(after.data.goals).toEqual(before.data.goals);
  expect(after.data.cascadePlans).toEqual(before.data.cascadePlans);
  await testInfo.attach("after", { body: JSON.stringify(after.data, null, 2), contentType: "application/json" });
  await page.locator(".area-settings").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("h09-areas.png") });

  await page.goto("/app/goals");
  await page.getByRole("button", { name: "Crear meta", exact: true }).click();
  await expect(goal.getByLabel("¿A qué área pertenece?").locator(`option[value="${area.id}"]`)).toHaveText(renamed);
  await expect(goal.getByLabel("¿A qué área pertenece?").locator("option")).toHaveCount(9);
  await goal.getByRole("button", { name: "Cancelar", exact: true }).click();
  const plan = after.data.cascadePlans.find((p: { horizon: string }) => p.horizon === "monthly");
  await page.goto(`/app/planning?view=year&create=month&month=${plan.periodKey}`);
  await expect(month.getByRole("checkbox", { name: renamed, exact: true })).toBeChecked();
  await expect(month.getByLabel(`Objetivo mensual de ${renamed}`)).toHaveValue("H09 Avanzar mi lectura");
  await month.getByRole("checkbox", { name: renamed, exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("h09-month-selector.png") });
  await month.getByRole("button", { name: "Cancelar", exact: true }).click();

  await page.goto("/app/settings");
  await page.locator('input[type="file"][accept="application/json"]').setInputFiles(after.path);
  await page.getByRole("dialog", { name: "Revisar respaldo antes de importar" }).getByRole("button", { name: "Importar y reemplazar" }).click();
  await expect(page.getByRole("dialog", { name: "Revisar respaldo antes de importar" })).toBeHidden();
  await page.reload();
  const restored = await backup(page);
  expect(restored.data.lifeAreas).toEqual(after.data.lifeAreas);
  expect(restored.data.goals).toEqual(after.data.goals);
  expect(restored.data.cascadePlans).toEqual(after.data.cascadePlans);
});

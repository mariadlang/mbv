import { expect, test } from "@playwright/test";
import { setupHealth, healthRecords } from "./helpers/health-fixture";

test.use({ timezoneId: "America/Bogota" });

test("meal cards persist one shared daily plan across week, Mi día and reload", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const mobile = testInfo.project.name === "mobile";
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1448, height: 1086 });
  await setupHealth(page);
  await page.goto("/app/health?date=2026-10-02");
  const health = page.locator(".prep-health");
  const selected = health.locator('.meal-day-card[data-date="2026-10-02"]');
  await expect(health.locator(".meal-day-card")).toHaveCount(7);
  if (mobile) await expect(health.locator(".meal-day-selector button")).toHaveCount(7);
  for (const [slot, name] of [["Desayuno", "PRUEBA Huevos y pan"], ["Almuerzo", "PRUEBA Pollo y arroz"], ["Cena", "PRUEBA Crema de zanahoria"], ["Snacks", "PRUEBA Manzana"], ["Snacks", "PRUEBA Nueces"]]) {
    await selected.getByRole("button", { name: new RegExp(`^Añadir ${slot}`) }).click();
    await selected.getByRole("textbox").fill(name);
    await selected.getByRole("button", { name: "Guardar", exact: true }).dblclick();
    await expect(selected.getByRole("textbox")).toBeHidden();
    await expect(selected.getByText(name, { exact: true })).toBeVisible();
  }
  const before = (await healthRecords(page)).nutrition.find((log) => log.date === "2026-10-02")!.meals;
  expect(before).toHaveLength(5);
  expect(before.every((meal) => meal.completed === false)).toBe(true);
  await page.reload();
  await expect(selected.getByText("PRUEBA Huevos y pan")).toBeVisible();
  expect((await healthRecords(page)).nutrition.find((log) => log.date === "2026-10-02")!.meals).toEqual(before);
  await expect(page.getByRole("button", { name: "Abrir editor detallado" })).toBeHidden();
  await health.screenshot({ path: testInfo.outputPath(`meals-week-${mobile ? "mobile" : "desktop"}.png`) });
  await health.getByRole("button", { name: "Semana siguiente" }).click();
  await expect(health.getByText("PRUEBA Huevos y pan")).toBeHidden();
  await health.getByRole("button", { name: "Semana anterior" }).click();
  await expect(selected.getByText("PRUEBA Huevos y pan")).toBeVisible();
  await page.goto("/app/today");
  const day = page.locator("#today-meals");
  await expect(day.getByText("PRUEBA Pollo y arroz")).toBeVisible();
  await day.getByRole("button", { name: /^Editar Almuerzo/ }).click();
  await day.getByRole("textbox").fill("PRUEBA Pollo y verduras");
  await day.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(day.getByText("PRUEBA Pollo y verduras")).toBeVisible();
  await page.reload();
  await expect(day.getByText("PRUEBA Pollo y verduras")).toBeVisible();
  await day.screenshot({ path: testInfo.outputPath(`meals-day-${mobile ? "mobile" : "desktop"}.png`) });
  const after = (await healthRecords(page)).nutrition.find((log) => log.date === "2026-10-02")!.meals;
  expect(after.map((meal) => meal.id)).toEqual(before.map((meal) => meal.id));
  expect(after.every((meal) => meal.completed === false)).toBe(true);
  await page.goto("/app/health?date=2026-10-02");
  await expect(selected.getByText("PRUEBA Pollo y verduras")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (mobile) {
    await health.locator(".meal-day-selector button").last().click();
    await expect(health.locator(".meal-day-card.is-selected")).not.toContainText("PRUEBA Pollo");
  }
});

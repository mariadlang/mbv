import { expect, test } from "@playwright/test";
import { setupEditorialFixture } from "./helpers/editorial-fixture";

test("Mi año opens all twelve exact periods and preserves saved data", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize(testInfo.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1448, height: 1086 });
  await setupEditorialFixture(page);
  const readPlans = () => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open("my-best-version-planner-v4:e2e-user"); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const rows = await new Promise<unknown[]>((resolve, reject) => { const r = db.transaction("cascadePlans").objectStore("cascadePlans").getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    db.close(); return rows;
  });
  const before = await readPlans();
  await page.goto("/app/planning?view=annual");
  await expect(page.getByRole("heading", { name: "Mi año 2026", exact: true })).toBeVisible();
  await expect(page.locator(".prep-year .prep-month-grid > button")).toHaveCount(12);
  await expect(page.locator(".prep-category-tabs, .prep-year-areas, .prep-legacy-plans, .planning-direction-grid")).toHaveCount(0);
  await expect(page.locator(".prep-year a")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Año", exact: true }).selectOption("2027");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Mi año 2027", exact: true })).toBeVisible();
  for (let index = 0; index < 12; index++) {
    const key = `2027-${String(index + 1).padStart(2, "0")}`;
    const month = new Intl.DateTimeFormat("es", { month: "long" }).format(new Date(2027, index, 1));
    await page.locator(`[data-period="${key}"]`).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".month-period-summary")).toHaveText(new RegExp(month + " 2027", "i"));
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mi-ano.png"), fullPage: true });
  await page.getByRole("combobox", { name: "Año", exact: true }).selectOption("2026");
  await page.locator('[data-period="2026-10"]').click();
  await expect(page).toHaveURL(/view=month&month=2026-10/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/octubre de 2026/i);
  expect(await readPlans()).toEqual(before);
  await page.goto("/app/planning");
  await expect(page.locator(".prep-month-grid > button")).toHaveCount(12);
  await page.locator('[data-period="2026-11"]').click();
  await expect(page.locator(".prep-featured-month h2")).toHaveText(/noviembre/i);
});

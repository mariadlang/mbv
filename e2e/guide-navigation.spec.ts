import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { setupEditorialFixture } from "./helpers/editorial-fixture";

async function exportPlanner(page: Page) {
  await page.goto("/app/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const path = await (await download).path();
  return JSON.parse(await readFile(path!, "utf8")).data;
}

test("Mi guia owns annual monthly and weekly navigation without changing saved plans", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const mobile = testInfo.project.name === "mobile";
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1448, height: 1086 });
  await setupEditorialFixture(page);
  const before = await exportPlanner(page);
  const primary = page.locator(mobile ? ".mobile-nav" : ".sidebar__nav");
  await expect(primary.getByRole("link", { name: /Mi año|Mi mes|Mi semana/ })).toHaveCount(0);
  if (mobile) {
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
    const drawer = page.locator(".mobile-drawer");
    await expect(drawer.getByRole("link", { name: /Mi año|Mi mes|Mi semana/ })).toHaveCount(0);
    await drawer.getByRole("link", { name: "Mi guía", exact: true }).click();
    await expect(drawer).toBeHidden();
  } else await primary.getByRole("link", { name: "Mi guía", exact: true }).click();
  await expect(page.locator(".prep-guide")).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Planificación de Mi guía", exact: true });
  await expect(navigation.getByRole("link")).toHaveText(["Mi guía", "Mi año", "Mi mes", "Mi semana"]);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("guide.png"), animations: "disabled" });

  const destinations = [
    ["Mi año", "/app/planning?view=annual", /Mi año 2026/, "year"],
    ["Mi mes", "/app/planning?view=month", /octubre de 2026/i, "month"],
    ["Mi semana", "/app/planning/weekly", /^Mi semana$/, "week"],
  ] as const;
  for (const [name, href, heading, capture] of destinations) {
    const link = navigation.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await link.click();
    await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(primary.getByRole("link", { name: "Mi guía", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
    await page.reload();
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(capture + ".png"), animations: "disabled" });
  }
  await navigation.getByRole("link", { name: "Mi guía", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".prep-guide")).toBeVisible();
  const after = await exportPlanner(page);
  for (const key of ["cascadePlans", "tasks", "goals", "lifeAreas"]) {
    const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
    expect([...after[key]].sort(byId), key).toEqual([...before[key]].sort(byId));
  }
});

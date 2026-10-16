import { expect, test } from "@playwright/test";
import { discardEditorialDraft, setupEditorialFixture } from "./helpers/editorial-fixture";

test("approved notebook and type roles survive routes, breakpoints, editors and theme", async ({ page }, info) => {
  test.setTimeout(180_000);
  await setupEditorialFixture(page);
  const sizes = info.project.name === "mobile" ? [[390, 844], [430, 932]] : [[1448, 1086], [1440, 900], [1024, 768]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const route of ["/app/dashboard", "/app/guide", "/app/planning", "/app/planning/weekly", "/app/today", "/app/habits", "/app/health?section=training"]) {
      await page.goto(route);
      await expect(page.locator(".app-shell")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const logo = page.locator(width <= 900 ? ".topbar__mobile-brand .brand-mark" : ".sidebar__brand .brand-mark");
      await expect(logo.locator("img")).toBeVisible();
      await expect(logo.locator("img")).toHaveAttribute("src", "/brand-icon.svg");
      await expect(logo.locator("strong")).toHaveCSS("font-family", /Inter/);
      await expect(page.locator("body")).toHaveCSS("font-family", /Inter/);
      await expect(page.locator("h1").first()).toHaveCSS("font-family", /Playfair/);
      await expect(page.locator(".prep-brand")).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect(await logo.evaluate(e => {
        const clip = e.closest(".sidebar__brand,.topbar__mobile-brand")!.getBoundingClientRect();
        return [...e.querySelectorAll("img,strong,small")].every(n => { const r = n.getBoundingClientRect(); return r.left >= clip.left - 1 && r.right <= clip.right + 1; });
      })).toBe(true);
      if (route === "/app/planning") {
        await expect(page.locator(".prep-month-grid > button")).toHaveCount(12);
        const columns = await page.locator(".prep-month-grid").evaluate(e => getComputedStyle(e).gridTemplateColumns.split(" ").length);
        expect(columns).toBe(width <= 800 ? 3 : 4);
      }
    }
  }
  await page.goto("/app/planning");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByRole("dialog").locator("h2")).toHaveCSS("font-family", /Playfair/);
  await expect(page.getByRole("dialog").locator("input").first()).toHaveCSS("font-family", /Inter/);
  await page.keyboard.press("Escape");
  await discardEditorialDraft(page);
  if (info.project.name === "desktop") {
    await page.getByRole("button", { name: "Activar modo oscuro" }).click();
    await expect(page.locator(".app-shell")).toHaveAttribute("data-color-mode", "dark");
    await expect(page.locator(".sidebar__brand img")).toBeVisible();
    await expect(page.locator("h1")).toHaveCSS("font-family", /Playfair/);
  } else {
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
    await expect(page.locator(".mobile-drawer .brand-mark__icon img")).toBeVisible();
  }
});

import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`platform summary keeps metric text inside the page at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto("/platform?e2e-admin=1");
    await expect(page.getByRole("heading", { name: "Growth · Etapa 1", exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath("platform-summary.png"), fullPage: true });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const metrics = page.locator(".platform-metrics .card");
    expect(await metrics.count()).toBeGreaterThan(20);
    for (const metric of await metrics.all()) {
      const size = await metric.evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
      expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
    }
  });
}

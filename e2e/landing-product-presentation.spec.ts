import { expect, test, type Locator, type Page } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const;

async function dismissLandingOverlays(page: Page) {
  const launchDialog = page.getByRole("dialog", { name: "Sé parte del lanzamiento." });
  if (await launchDialog.waitFor({ state: "visible", timeout: 4_000 }).then(() => true).catch(() => false)) {
    await launchDialog.getByRole("button", { name: "Cerrar" }).click();
    await expect(launchDialog).toBeHidden();
  }

  const cookieButton = page.getByRole("button", { name: "Solo necesarias" });
  if (await cookieButton.waitFor({ state: "visible", timeout: 2_000 }).then(() => true).catch(() => false)) await cookieButton.click();
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function expectLoadedCapture(image: Locator, fileFragment: string) {
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const currentSrc = await image.evaluate((element: HTMLImageElement) => decodeURIComponent(element.currentSrc));
  expect(currentSrc).toContain(fileFragment);
  return currentSrc;
}

test("presents authentic product moments without overflow", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "This test controls the required responsive viewports.");
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await dismissLandingOverlays(page);
    await page.evaluate(() => document.fonts.ready);

    const hero = page.locator(".landing-hero");
    const showcase = page.locator(".landing-section--showcase");
    const heroCapture = hero.getByRole("img", { name: /Mi día con tres prioridades/i });
    await expectLoadedCapture(heroCapture, viewport.width <= 640 ? "today-mobile" : "today-desktop");
    await expect(heroCapture).toHaveAttribute("loading", "eager");
    await expect(hero.locator(".landing-device")).toHaveCount(0);
    await expect(showcase.locator(".landing-showcase")).toHaveCount(0);

    await showcase.scrollIntoViewIfNeeded();
    const tabs = showcase.getByRole("tab");
    const urlBeforeSelection = page.url();
    await expect(tabs).toHaveCount(4);
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(showcase.locator('[role="tabpanel"]')).toHaveCount(1);
    await expect(showcase.locator(".landing-product-selector__panel img")).toHaveCount(1);

    const moments = [
      { index: 0, name: /Mi día con tres prioridades/i, file: "today" },
      { index: 1, name: /planificación semanal/i, file: "planning" },
      { index: 2, name: /ánimo y energía/i, file: "wellbeing" },
      { index: 3, name: /tareas completadas y registros de hábitos/i, file: "progress" },
    ] as const;
    const currentSources = new Set<string>();
    for (const moment of moments) {
      await tabs.nth(moment.index).click();
      const capture = showcase.getByRole("img", { name: moment.name });
      await expect(capture).toHaveAttribute("loading", "lazy");
      currentSources.add(await expectLoadedCapture(capture, `${moment.file}-${viewport.width <= 640 ? "mobile" : "desktop"}`));
      await expect(showcase.locator('[role="tabpanel"]')).toHaveCount(1);
      await expect(showcase.locator(".landing-product-selector__panel img")).toHaveCount(1);
      await expectNoHorizontalOverflow(page);
      expect(page.url()).toBe(urlBeforeSelection);
    }
    expect(currentSources.size).toBe(4);

    await tabs.nth(0).click();
    await page.waitForTimeout(750);
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    expect(page.url()).toBe(urlBeforeSelection);

    await tabs.nth(0).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(tabs.nth(3)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(tabs.nth(0)).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.nth(3)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(tabs.nth(3)).toBeFocused();

    const panel = showcase.getByRole("tabpanel");
    await expect(panel).toHaveAttribute("tabindex", "0");
    await expect(tabs.nth(3)).toHaveAttribute("aria-controls", await panel.getAttribute("id") ?? "");
    await expect(panel).toHaveAttribute("aria-labelledby", await tabs.nth(3).getAttribute("id") ?? "");

    if (viewport.width <= 640) {
      const source = hero.locator('source[media="(max-width: 640px)"]');
      const sourceWidth = Number(await source.getAttribute("width"));
      const sourceHeight = Number(await source.getAttribute("height"));
      const box = await heroCapture.boundingBox();
      expect(sourceWidth).toBeGreaterThanOrEqual(780);
      expect(sourceHeight).toBeGreaterThan(0);
      expect(box).not.toBeNull();
      expect(Math.abs((box!.width / box!.height) - (sourceWidth / sourceHeight))).toBeLessThan(0.02);
    }

    await expectNoHorizontalOverflow(page);

    if (process.env.MBV_CAPTURE_LANDING_PRESENTATION === "1" && (viewport.width === 390 || viewport.width === 1440)) {
      await tabs.nth(0).click();
      const captureStyle = ".landing-header, .landing-skip-link, .skip-link, nextjs-portal { display: none !important; visibility: hidden !important; opacity: 0 !important; }";
      await hero.screenshot({ path: `docs/qa/screenshots/landing-product-hero-${viewport.width}.png`, animations: "disabled", caret: "hide", style: captureStyle });
      await showcase.screenshot({ path: `docs/qa/screenshots/landing-product-showcase-${viewport.width}.png`, animations: "disabled", caret: "hide", style: captureStyle });
    }
  }
});

test("keeps the product presentation fully localized in English", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "This test controls its responsive viewport.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await dismissLandingOverlays(page);
  await page.getByRole("button", { name: "Inglés, Beta", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeAttached();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();

  const heroImage = page.locator(".landing-hero").getByRole("img", { name: /Example My Day view/i });
  await expectLoadedCapture(heroImage, "today-desktop-en");
  const showcase = page.locator(".landing-section--showcase");
  await showcase.scrollIntoViewIfNeeded();
  const englishMoments = [
    { label: "Choose what to do today", alt: /Example My Day view/i, file: "today-desktop-en" },
    { label: "Give your plans a place", alt: /Example weekly planning view/i, file: "planning-desktop-en" },
    { label: "Organize with how you feel in mind", alt: /daily mood and energy/i, file: "wellbeing-desktop-en" },
    { label: "Recognize what moved forward", alt: /completed tasks and habit records/i, file: "progress-desktop-en" },
  ] as const;
  for (const moment of englishMoments) {
    await showcase.getByRole("tab", { name: moment.label }).click();
    await expectLoadedCapture(showcase.getByRole("img", { name: moment.alt }), moment.file);
  }
  await expect(showcase.getByText("Example view", { exact: true })).toBeVisible();
  await expect(showcase.getByText("Vista de ejemplo", { exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await dismissLandingOverlays(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expectLoadedCapture(page.locator(".landing-hero").getByRole("img", { name: /Example My Day view/i }), "today-mobile-en");
  await expectNoHorizontalOverflow(page);
});

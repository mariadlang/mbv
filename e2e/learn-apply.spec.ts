import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { PlannerSnapshot } from "../src/domain/planner";

test.use({ timezoneId: "America/Bogota" });
const title = "Elegir mis tres prioridades";

async function backup(page: Page): Promise<PlannerSnapshot> {
  await page.goto("/app/settings");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, "utf8")).data;
}

async function start(page: Page, info: TestInfo) {
  await page.setViewportSize(info.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1448, height: 1086 });
  await page.goto("/app/dashboard");
  await page.getByRole("button", { name: "Solo necesarias" }).click();
  await page.getByRole("button", { name: "Crear mi primera acción" }).click();
  await page.getByRole("radio", { name: /Mi día/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Resultado").fill("H08 objetivo sintético");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Primera acción").fill("H08 tarea anterior conservada");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Ver mi primera acción/ }).click();
  await expect(page).toHaveURL(/app\/today/);
  const before = await backup(page);
  await page.goto("/app/learn");
  await expect(page.locator(".learn-card")).toHaveCount(6);
  return before;
}

async function evidence(page: Page, info: TestInfo, before: PlannerSnapshot, count: number) {
  const after = await backup(page);
  await page.goto("/app/today");
  await page.reload();
  await expect(page.locator(".day-timeline-list").getByText(title, { exact: true })).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("h08-today-reloaded.png"), fullPage: true });
  const reloaded = await backup(page);
  expect(after.tasks).toHaveLength(before.tasks.length + count);
  expect(reloaded.tasks).toEqual(after.tasks);
  for (const task of before.tasks) expect(reloaded.tasks.find(t => t.id === task.id)).toEqual(task);
  const newTasks = after.tasks.filter(t => !before.tasks.some(old => old.id === t.id));
  const localDate = await page.evaluate(() => new Intl.DateTimeFormat("en-CA").format(new Date()));
  for (const task of newTasks) { expect(task.date).toBe(localDate); expect(task.focusPriority).toBeUndefined(); }
  expect(new Set(newTasks.map(t => t.id)).size).toBe(count);
  expect(newTasks.filter(t => t.title === title)).toHaveLength(1);
  await info.attach("h08-counts-identities-persistence", { body: JSON.stringify({ environment: "local isolated E2E_ACCESS=1; synthetic onboarding; real IndexedDB, not production", localDate, viewport: page.viewportSize(), before: before.tasks, after: after.tasks, reloaded: reloaded.tasks }, null, 2), contentType: "application/json" });
}

test("H08 fast double activation, Enter and independent suggestions persist one ID each", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  const before = await start(page, info);
  const cards = page.locator(".learn-card");
  const first = cards.nth(0).getByRole("button");
  if (info.project.name === "mobile") {
    await first.scrollIntoViewIfNeeded();
    const box = (await first.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  } else await first.dblclick();
  await expect(first).toHaveText("Añadido a Mi día");
  await expect(first).toBeDisabled();
  const second = cards.nth(1).getByRole("button");
  await second.focus();
  await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
  await expect(second).toBeFocused();
  const outline = await second.evaluate(el => ({ style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }));
  expect(outline.style).not.toBe("none"); expect(outline.width).toBeGreaterThanOrEqual(2);
  await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); await page.keyboard.press("Enter");
  await expect(second).toHaveText("Añadido a Mi día");
  await expect(first).toBeDisabled();
  await cards.nth(2).getByRole("button").click(); // ordinary single click
  await expect(cards.nth(2).getByRole("button")).toHaveText("Añadido a Mi día");
  await expect(cards.getByRole("status").filter({ hasText: "como tarea no prioritaria" })).toHaveCount(3);
  await first.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("h08-added-viewport.png") });
  await page.screenshot({ path: info.outputPath("h08-added.png"), fullPage: true });
  await page.getByRole("link", { name: "Ver mi día", exact: true }).click();
  await expect(page).toHaveURL(/app\/today/);
  await evidence(page, info, before, 3);
  await page.goto("/app/tasks");
  for (let index = 0; index < 2; index++) {
    await page.getByRole("button", { name: "Nueva tarea" }).click();
    await page.getByLabel("Tarea", { exact: true }).fill("H08 título manual repetido");
    await page.getByRole("button", { name: "Guardar tarea" }).click();
    await expect(page.getByRole("button", { name: "Guardar tarea" })).toBeHidden();
  }
  const manual = (await backup(page)).tasks.filter(task => task.title === "H08 título manual repetido");
  expect(manual).toHaveLength(2);
  expect(manual[0].id).not.toBe(manual[1].id);
  await info.attach("manual-duplicates-allowed", { body: JSON.stringify(manual), contentType: "application/json" });
  expect(errors).toEqual([]);
});

test("H08 delayed persistence and failed write allow safe retry without false success", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  const before = await start(page, info);
  const first = page.locator(".learn-card").nth(0).getByRole("button");
  // Test-only contention: hold an actual IDB transaction, without changing any data.
  await page.evaluate(async () => {
    const names = await indexedDB.databases();
    const name = names.find(db => db.name?.startsWith("my-best-version-planner-v4:"))?.name;
    if (!name) throw new Error("No planner database for synthetic session");
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(name);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        try {
        const db = open.result;
        const tx = db.transaction("tasks", "readwrite");
        const store = tx.objectStore("tasks");
        let released = false;
        const end = Date.now() + 15_000;
        Object.assign(window, { releaseH08Lock: () => { released = true; } });
        const keep = () => { if (!released && Date.now() < end) store.get("h08-read-only-lock").onsuccess = keep; };
        tx.oncomplete = () => db.close();
        keep(); resolve();
        } catch (error) { reject(error); }
      };
    });
  });
  await first.click();
  await expect(first).toHaveText("Añadiendo…");
  await expect(first).toBeDisabled();
  await expect(first).toHaveAttribute("aria-busy", "true");
  await expect(first.locator(".button__spinner")).toHaveCount(1);
  await expect(first.locator(".lucide-chevron-right")).toHaveCount(0);
  await expect(page.locator(".learn-card").first().getByRole("status")).toHaveClass("sr-only");
  await page.waitForTimeout(750); // Deliberately hold storage latency, not a readiness heuristic.
  await expect(first).toHaveText("Añadiendo…");
  await page.keyboard.press("Enter"); await page.keyboard.press("Enter");
  await expect(page.getByText("Añadido a Mi día como tarea no prioritaria.", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("h08-adding-viewport.png") });
  await page.screenshot({ path: info.outputPath("h08-adding.png"), fullPage: true });
  await page.evaluate(() => (window as unknown as { releaseH08Lock(): void }).releaseH08Lock());
  await expect(first).toHaveText("Añadido a Mi día");

  // Fail the next task-store write BEFORE it commits. No mock success response.
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args: Parameters<IDBObjectStore["add"]>) {
      if (this.name === "tasks") {
        IDBObjectStore.prototype.add = original;
        throw new DOMException("H08 synthetic write failure", "QuotaExceededError");
      }
      return original.apply(this, args);
    };
  });
  const second = page.locator(".learn-card").nth(1).getByRole("button");
  await second.click();
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(1);
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText("No pudimos guardar este cambio. Inténtalo de nuevo.");
  await expect(second).toBeEnabled();
  await expect(second).toHaveText("Aplicar a Mi día");
  await expect(first).toBeDisabled();
  await expect(page.locator(".learn-card").nth(1).getByRole("status")).toBeEmpty();
  await page.screenshot({ path: info.outputPath("h08-error-retry-viewport.png") });
  await page.screenshot({ path: info.outputPath("h08-error-retry.png"), fullPage: true });
  await second.click();
  await expect(second).toHaveText("Añadido a Mi día");
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
  await expect(first).toBeDisabled();
  await evidence(page, info, before, 2);
  expect(errors).toEqual([]);
});

test("H08 editorial spacing, visible states, themes and keyboard at desktop, 390 and 360", async ({ page }, info) => {
  test.setTimeout(120_000);
  await start(page, info);
  const measurements: unknown[] = [];
  for (const width of info.project.name === "mobile" ? [390, 360] : [1448]) {
    await page.setViewportSize({ width, height: width === 1448 ? 1086 : 844 });
    for (const dark of [false, true]) {
      await page.goto("/app/settings");
      await page.locator(".color-mode-setting").getByRole("button", { name: dark ? "Oscuro" : "Claro", exact: true }).click();
      await page.goto("/app/learn");
      await expect(page.locator("html")).toHaveAttribute("data-theme", dark ? "dark" : "light");
      await expect(page.locator(".learn-card")).toHaveCount(6);
      await page.evaluate(() => document.fonts.ready);
      const measurementsForViewport = await page.locator(".learn-card").evaluateAll(cards => cards.map(card => {
        const c = getComputedStyle(card), title = getComputedStyle(card.querySelector("h2")!);
        return { padding: c.padding, height: card.getBoundingClientRect().height, font: title.fontFamily, size: title.fontSize, weight: title.fontWeight, lineHeight: title.lineHeight, overflow: card.scrollWidth > card.clientWidth };
      }));
      for (const measured of measurementsForViewport) {
        expect(measured.padding).toBe(width === 1448 ? "24px" : "20px");
        expect(measured.size).toBe(width === 1448 ? "20px" : "18px");
        expect(measured.weight).toBe("400");
        expect(measured.font).toContain("Playfair");
        expect(measured.overflow).toBe(false);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const card of await page.locator(".learn-card").all()) {
        await card.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
        expect(await card.getByRole("button").evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
      }
      const first = page.locator(".learn-card").first();
      await first.getByRole("button").focus();
      await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
      await expect(first.getByRole("button")).toBeFocused();
      await expect(first.getByRole("button")).toHaveCSS("outline-style", "solid");
      await page.keyboard.press("Enter");
      await expect(first.getByRole("button")).toHaveText("Añadido a Mi día");
      await expect(first.getByRole("button")).toBeDisabled();
      await expect(first.getByRole("button")).toHaveCSS("opacity", "1");
      await expect(first.locator(".lucide-check")).toHaveCount(1);
      await expect(first.locator(".lucide-chevron-right")).toHaveCount(0);
      await expect(first.getByRole("status")).toHaveText("Añadido a Mi día como tarea no prioritaria.");
      await first.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
      await page.screenshot({ path: info.outputPath(`h08-${width}-${dark ? "dark" : "light"}.png`) });
      measurements.push({ width, dark, cards: measurementsForViewport });
    }
  }
  await page.goto("/app/settings");
  await page.locator(".language-switcher button").last().click();
  await page.goto("/app/learn");
  const englishCard = page.locator(".learn-card").first();
  await expect(englishCard.getByRole("button")).toHaveText("Apply to My day");
  await englishCard.getByRole("button").click();
  await expect(englishCard.getByRole("button")).toHaveText("Added to My day");
  await expect(englishCard.getByRole("status")).toHaveText("Added to My day as a non-priority task.");
  await englishCard.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.screenshot({ path: info.outputPath("h08-english-dark.png") });
  await info.attach("h08-computed-layout", { body: JSON.stringify(measurements, null, 2), contentType: "application/json" });
});

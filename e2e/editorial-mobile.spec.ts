import { test, expect } from "@playwright/test";
import { discardEditorialDraft, editorialCapture, longEditorialText, setupEditorialFixture } from "./helpers/editorial-fixture";

test.use({ timezoneId: "America/Bogota", actionTimeout: 20_000 });

for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }]) {
  test.describe(`editorial mobile ${viewport.width}x${viewport.height}`, () => {
    test.setTimeout(240_000);
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(viewport);
      await setupEditorialFixture(page);
    });

    test("R1 checklist, home and every guide stage", async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/app/dashboard");
      await expect(page.locator(".home-ready-count")).toHaveText("3 de 5 preparados");
      await editorialCapture(page, testInfo, "r1-home");
      // Inicio keeps the five canonical rows; personalisation remains in Mi guía.
      await page.goto("/app/guide?week=2026-09-28");
      await page.locator(".prep-mobile-entry").getByRole("button", { name: "Comenzar", exact: true }).click();
      await page.locator(".prep-stepper").getByRole("button", { name: "Preparar la semana", exact: true }).click();
      await page.getByRole("button", { name: "Personalizar checklist", exact: true }).click();
      const preferences = page.getByRole("dialog", { name: "¿Qué quieres incluir en tu checklist semanal?" });
      await expect(preferences.getByRole("checkbox")).toHaveCount(9);
      await editorialCapture(page, testInfo, "r1-checklist-personalization", false);
      const custom = preferences.getByRole("textbox", { name: "Otro", exact: true });
      await custom.fill("Tiempo para proyectos personales y aprendizaje sin dejar de descansar");
      // A reduced visual viewport exercises scroll/focus; it is not an OS keyboard screenshot.
      await page.setViewportSize({ width: viewport.width, height: 460 });
      await custom.focus();
      await custom.scrollIntoViewIfNeeded();
      await expect(custom).toBeFocused();
      await editorialCapture(page, testInfo, "r1-form-simulated-keyboard-viewport", false);
      await page.setViewportSize(viewport);
      await preferences.getByRole("button", { name: "Cerrar", exact: true }).click();
      await discardEditorialDraft(page);
      await page.goto("/app/guide?week=2026-09-28");
      await expect(page.locator(".prep-mobile-entry")).toBeVisible();
      await editorialCapture(page, testInfo, "r1-guide-entry");
      await page.locator(".prep-mobile-entry").getByRole("button", { name: "Comenzar", exact: true }).click();
      await expect(page.locator(".prep-review-invitation")).toBeVisible();
      await editorialCapture(page, testInfo, "r1-review-invitation");
      await page.locator(".prep-review-invitation").getByRole("button", { name: "Revisar semana anterior", exact: true }).click();
      const review = page.getByRole("dialog", { name: "Revisar semana anterior", exact: true });
      await expect(review.getByText("Pendiente sin mover", { exact: true })).toBeVisible();
      await editorialCapture(page, testInfo, "r1-review-pending", false);
      await review.getByRole("button", { name: "Mover", exact: true }).click();
      await review.getByLabel("Fecha", { exact: true }).fill("2026-10-03");
      await editorialCapture(page, testInfo, "r1-review-reschedule-draft", false);
      await review.getByRole("button", { name: "Cerrar", exact: true }).click();
      await discardEditorialDraft(page);
      await page.locator(".prep-review-invitation").getByRole("button", { name: "Omitir y planificar", exact: true }).click();
      await expect(page.locator(".prep-guide")).toHaveClass(/prep-mobile-step-prepare/);
      await editorialCapture(page, testInfo, "r1-guide-preparation");
      await page.locator(".prep-stepper").getByRole("button", { name: "Recordar el mes", exact: true }).click();
      const context = page.getByRole("dialog", { name: "Recordar el mes", exact: true });
      await expect(context).toContainText("Disciplina tranquila");
      await editorialCapture(page, testInfo, "r1-guide-month-context", false);
      await context.getByRole("button", { name: "Cerrar", exact: true }).click();
      await page.locator(".prep-guide-continue").click();
      await expect(page).toHaveURL(/planning\/weekly/);
      await page.goBack();
      await expect(page).toHaveURL(/guide\?week=2026-09-28/);
      await expect(page.locator(".prep-guide")).toHaveClass(/prep-mobile-step-prepare/);
      expect(errors).toEqual([]);
    });

    test("R2 vision, annual months, twelve months and all monthly tabs", async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/app/vision");
      await expect(page.getByRole("heading", { name: "Mi vida soñada", exact: true })).toBeVisible();
      const areas = page.locator(".vision-card-grid .vision-card:not(.vision-card--create)");
      expect(await areas.count()).toBeGreaterThan(5);
      expect(await areas.first().evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(120);
      await expect(areas.filter({ hasText: "Aprendizaje y proyectos que me ilusionan" })).toHaveCount(1);
      await editorialCapture(page, testInfo, "r2-vision");
      await areas.filter({ hasText: "Aprendizaje y proyectos que me ilusionan" }).click();
      const vision = page.getByRole("textbox", { name: "Visión del área", exact: true });
      await expect(vision).toHaveValue(longEditorialText);
      await vision.fill(longEditorialText + " Este borrador permanece hasta que yo decida.");
      await editorialCapture(page, testInfo, "r2-vision-editor-long-text");
      await page.getByRole("button", { name: "Volver a mis áreas", exact: true }).click();
      const guard = page.getByRole("dialog", { name: "Tienes cambios sin guardar" });
      await guard.getByRole("button", { name: "Seguir editando", exact: true }).click();
      await expect(vision).toHaveValue(longEditorialText + " Este borrador permanece hasta que yo decida.");
      await page.getByRole("button", { name: "Volver a mis áreas", exact: true }).click();
      await discardEditorialDraft(page);
      await page.locator(".editorial-vision-year").click();
      await expect(page.locator(".prep-year")).toBeVisible();
      await expect(page.locator(".prep-year .prep-month-grid > button")).toHaveCount(12);
      await expect(page.locator(".prep-year-areas, .prep-legacy-plans")).toHaveCount(0);
      await editorialCapture(page, testInfo, "r2-year-months");
      await page.goto("/app/planning");
      await expect(page.locator(".prep-month-grid > button")).toHaveCount(12);
      expect(await page.locator(".prep-area-grid > a").count()).toBeGreaterThan(5);
      expect(await page.locator(".prep-month-grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(3);
      await editorialCapture(page, testInfo, "r2-twelve-months");
      await page.locator(".prep-month-detail").scrollIntoViewIfNeeded();
      await expect(page.locator(".prep-month-detail")).toContainText("Disciplina tranquila");
      await editorialCapture(page, testInfo, "r2-selected-month-detail", false);
      await page.goto("/app/planning?view=month&month=2026-10");
      const month = page.locator(".prep-month-view");
      await expect(month).toBeVisible();
      for (const [tab, id] of [["Resumen", "summary"], ["Plan", "plan"], ["Listas opcionales", "lists"], ["Notas", "notes"]]) {
        await month.locator(":scope > .prep-category-tabs").getByRole("button", { name: tab, exact: true }).click();
        await expect(month).toHaveAttribute("data-tab", id);
        await editorialCapture(page, testInfo, `r2-month-${id}`);
      }
      const note = month.locator(".month-reflection-card textarea").first();
      await note.fill(longEditorialText);
      await page.setViewportSize({ width: viewport.width, height: 460 });
      await note.focus();
      await note.scrollIntoViewIfNeeded();
      await expect(note).toBeFocused();
      await editorialCapture(page, testInfo, "r2-month-notes-simulated-keyboard-viewport", false);
      await page.setViewportSize(viewport);
      await month.locator(":scope > .prep-category-tabs").getByRole("button", { name: "Resumen", exact: true }).click();
      await discardEditorialDraft(page);
      await expect(month).toHaveAttribute("data-tab", "summary");
      expect(errors).toEqual([]);
    });

    test("R3 health choices, detail editors, proportional day/week and today", async ({ page }, testInfo) => {
      test.setTimeout(240_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const section of ["nutrition", "training"]) {
        await page.goto(`/app/health?date=2026-10-02&section=${section}`);
        const health = page.locator(".prep-health");
        await expect(health).toBeVisible();
        await expect(health.locator(".prep-health-choices > button")).toHaveCount(3);
        await expect(health.locator(".prep-health-days > button")).toHaveCount(7);
        await editorialCapture(page, testInfo, `r3-${section}-weekly-choice`);
        await health.getByRole("button", { name: "Mes", exact: true }).click();
        await expect(health.locator(".prep-health-days > button")).toHaveCount(31);
        await editorialCapture(page, testInfo, `r3-${section}-monthly`);
        await health.getByRole("button", { name: "Biblioteca", exact: true }).click();
        await expect(health.locator(".health-library-records > article")).toHaveCount(1);
        await editorialCapture(page, testInfo, `r3-${section}-library`);
        await health.getByRole("button", { name: "Ver detalle", exact: true }).click();
        const detail = page.getByRole("dialog", { name: "Ver detalle", exact: true });
        await expect(detail).toContainText(section === "nutrition" ? "450" : "Sentadilla");
        await editorialCapture(page, testInfo, `r3-${section}-library-detail`, false);
        await detail.getByRole("button", { name: "Abrir editor detallado", exact: true }).click();
        const editor = page.getByRole("dialog", { name: section === "nutrition" ? "Editar comida" : "Editar entrenamiento", exact: true });
        await expect(editor).toBeVisible();
        if (section === "nutrition") {
          await expect(editor.getByLabel("Calorías", { exact: true })).toHaveValue("450");
          await editor.getByRole("textbox", { name: "Notas opcionales", exact: true }).fill(longEditorialText);
          await expect(editor.getByRole("textbox", { name: "Notas opcionales", exact: true })).toHaveValue(longEditorialText);
        } else {
          await expect(editor.getByLabel("Nombre del ejercicio", { exact: true })).toHaveValue("Sentadilla");
          await expect(editor.getByLabel("Peso kg", { exact: true }).nth(1)).toHaveValue("12");
          await editor.getByLabel("Nombre del entrenamiento", { exact: true }).fill("Entrenamiento largo que puedo ajustar a mi ritmo sin perder las series guardadas");
          await expect(editor.getByLabel("Nombre del entrenamiento", { exact: true })).toHaveValue("Entrenamiento largo que puedo ajustar a mi ritmo sin perder las series guardadas");
        }
        await editorialCapture(page, testInfo, `r3-${section}-detailed-editor`, false);
        await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
        await discardEditorialDraft(page);
      }
      await page.goto("/app/planning?view=day&date=2026-10-02");
      const day = page.locator(".prep-day");
      const blocks = day.locator(".editorial-agenda-block");
      await expect(blocks).toHaveCount(6);
      const point = day.locator('.editorial-agenda-point[data-record-id="task-editorial-duration-unknown"]');
      await expect(point).toHaveCount(1);
      await expect(point).toContainText("Llamada sin duración definida");
      await expect(point).toContainText("14:00");
      await expect(point).toContainText("Sin duración");
      await expect(point).toHaveCSS("top", "720px");
      await expect(day.locator(".editorial-agenda-unplaced")).not.toContainText("Llamada sin duración definida");
      await expect(day.locator(".editorial-agenda-unplaced")).toContainText("Una tarea sin hora que también cuenta");
      await expect(day.locator(".editorial-agenda-unplaced")).toContainText("Recordatorio de todo el día");
      const overlap = await Promise.all(["a", "b", "c"].map((id) => day.locator(`[data-record-id="task-editorial-overlap-${id}"]`).evaluate((element) => ({ left: (element as HTMLElement).style.left, width: (element as HTMLElement).style.width, height: (element as HTMLElement).style.height }))));
      expect(new Set(overlap.map((item) => item.left)).size).toBe(3);
      for (const item of overlap) expect(parseFloat(item.width)).toBeCloseTo(100 / 3, 3);
      expect(overlap.map((item) => item.height)).toEqual(["180px", "90px", "180px"]);
      await editorialCapture(page, testInfo, "r3-agenda-day");
      const scroll = day.getByRole("region", { name: "Agenda horaria", exact: true });
      await scroll.focus();
      await scroll.press("PageDown");
      await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await expect(scroll).toBeFocused();
      await editorialCapture(page, testInfo, "r3-agenda-day-keyboard-scroll", false);
      await day.locator(".prep-week-strip button").nth(5).click();
      await expect(page).toHaveURL(/date=2026-10-03/);
      await page.reload();
      await expect(page.locator('[data-record-id="task-editorial-midnight"]')).toHaveCount(1);
      await expect(page.locator('[data-record-id="task-editorial-midnight"]')).toHaveCSS("height", "90px");
      await editorialCapture(page, testInfo, "r3-agenda-midnight-continuation");
      await page.goto("/app/planning/weekly?date=2026-10-02");
      await expect(page.locator(".prep-day-switch [aria-current=page]")).toHaveText("Semana");
      await expect(page.locator(".weekly-day-group")).toHaveCount(7);
      await expect(page.locator(".editorial-agenda-scroll")).toHaveCount(0);
      await expect(page.locator('[data-record-id="task-editorial-duration-unknown"]')).toContainText("14:00");
      await editorialCapture(page, testInfo, "r3-agenda-week");
      await page.goto("/app/today");
      await expect(page.getByRole("heading", { name: "Hoy", exact: true })).toBeVisible();
      await editorialCapture(page, testInfo, "r3-today-tasks");
      await page.locator(".editorial-today-mobile-tabs").getByRole("tab", { name: "Hábitos", exact: true }).click();
      await expect(page.locator(".today-habit-row").filter({ hasText: "Leer con calma" })).toBeVisible();
      await editorialCapture(page, testInfo, "r3-today-habits");
      await page.getByRole("button", { name: "Editar Leer con calma", exact: true }).click();
      await expect(page.locator(".editorial-today")).toHaveAttribute("data-mobile-tab", "tasks");
      await expect(page.locator(".day-inline-composer")).toBeVisible();
      await expect(page.locator(".day-inline-composer input").first()).toHaveValue("Leer con calma");
      await editorialCapture(page, testInfo, "r3-today-mobile-habit-editor", false);
      await page.locator(".day-inline-composer header button").click();
      await page.locator(".editorial-mobile-focus-button").click();
      await editorialCapture(page, testInfo, "r3-today-priorities");
      expect(errors).toEqual([]);
    });
  });
}

test("editorial desktop dark appearance and simulated 200 percent zoom reflow", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupEditorialFixture(page);
  await page.goto("/app/dashboard");
  await page.getByRole("button", { name: "Activar modo oscuro", exact: true }).click();
  await expect(page.getByRole("button", { name: "Activar modo claro", exact: true })).toHaveAttribute("aria-pressed", "true");
  await editorialCapture(page, testInfo, "desktop-dark-r7");
  // A half-sized CSS viewport at DPR 2 reproduces 200% layout reflow at 1440×900.
  // This is an explicit emulation, not a native browser zoom or OS magnification claim.
  await page.setViewportSize({ width: 720, height: 450 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 720, height: 450, deviceScaleFactor: 2, mobile: false });
  expect(await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }))).toEqual({ width: 720, height: 450, dpr: 2 });
  await editorialCapture(page, testInfo, "dark-reflow-equivalent-200-percent");
  await page.goto("/app/guide?week=2026-09-28");
  await page.locator(".prep-mobile-entry").getByRole("button", { name: "Comenzar", exact: true }).click();
  await page.locator(".prep-stepper").getByRole("button", { name: "Preparar la semana", exact: true }).click();
  await page.getByRole("button", { name: "Personalizar checklist", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "¿Qué quieres incluir en tu checklist semanal?" });
  const custom = dialog.getByRole("textbox", { name: "Otro", exact: true });
  await custom.focus();
  await custom.scrollIntoViewIfNeeded();
  await expect(custom).toBeFocused();
  await editorialCapture(page, testInfo, "dark-reflow-equivalent-200-percent-dialog", false);
  await cdp.detach();
});

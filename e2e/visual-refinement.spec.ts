import { test, expect, type Page, type TestInfo } from "@playwright/test";
import type { BrainDumpItem, CascadePlan, LifeArea } from "../src/domain/planner";
import { setupEditorialFixture } from "./helpers/editorial-fixture";

test.use({ timezoneId: "America/Bogota", actionTimeout: 20_000 });

const screens = [
  { id: "r7", route: "/app/dashboard", heading: "Tu semana en orden" },
  { id: "r5", route: "/app/guide?week=2026-09-28", heading: "Preparemos tu semana" },
  { id: "r6", route: "/app/planning", heading: "Tu mapa de 12 meses" },
] as const;

/** Add synthetic visual-review content only to a fresh local E2E context.
 * The historical helper, its tasks/areas/health data and October's fourth priority stay intact.
 * Auth/Premium are simulated. The helper intercepts consent/privacy reads: not live-service QA.
 */
async function enrichReviewFixture(page: Page) {
  return page.evaluate(async () => {
    if (location.origin !== "http://127.0.0.1:3100") throw new Error("Visual fixture is restricted to the local E2E origin");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("my-best-version-planner-v4:e2e-user");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const read = db.transaction(["cascadePlans", "lifeAreas", "tasks"], "readonly");
      const all = <T,>(store: string) => new Promise<T[]>((resolve, reject) => {
        const request = read.objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      });
      const [plans, areas, tasks] = await Promise.all([all<CascadePlan>("cascadePlans"), all<LifeArea>("lifeAreas"), all<{ id: string }>("tasks")]);
      const october = plans.find((plan) => plan.id === "editorial-month");
      if (!october || !areas.some((area) => area.id === "editorial-custom-area")) throw new Error("Historical editorial fixture must be present first");
      const stamp = "2026-10-02T20:00:00.000Z";
      const monthCopy = [
        ["Organización", "Crear bases sólidas", "Reservar tiempo para lo importante", "Ordenar un rincón de mi casa"],
        ["Salud", "Cuidar mi energía", "Preparar comidas con calma", "Dejar espacio para descansar"],
        ["Aprendizaje", "Explorar algo nuevo", "Leer a mi ritmo", "Practicar una habilidad creativa"],
        ["Bienestar", "Vivir con más presencia", "Hacer pausas durante el día", "Disfrutar una caminata tranquila"],
        ["Trabajo", "Avanzar con propósito", "Elegir un proyecto importante", "Reconocer lo que ya logré"],
        ["Relaciones", "Cultivar vínculos cercanos", "Compartir tiempo de calidad", "Retomar una conversación pendiente"],
        ["Creatividad", "Dar espacio a mis ideas", "Probar una actividad diferente", "Guardar momentos que me inspiran"],
        ["Finanzas", "Ordenar y cuidar mis recursos", "Revisar mis gastos con calma", "Definir una meta de ahorro"],
        ["Hábitos", "Consolidar lo aprendido", "Elegir una rutina sostenible", "Adaptar lo que ya no funciona"],
        ["Disciplina tranquila", "Ser constante con mi alimentación", "Mantener 4 entrenamientos por semana", "Avanzar en mi proyecto personal"],
        ["Equilibrio", "Simplificar y soltar", "Revisar mis compromisos", "Reservar tiempo sin pendientes"],
        ["Celebración", "Reconocer y agradecer", "Compartir mis aprendizajes", "Cerrar el año a mi ritmo"],
      ];
      // Explicit fixture metadata, resolved to real existing area IDs (never inferred by the UI).
      const monthAreas = [
        "Ambiente físico / Entorno", "Salud y bienestar", "Desarrollo personal / Crecimiento",
        "Salud y bienestar", "Carrera profesional o trabajo", "Familia y amigos",
        "Diversión y ocio", "Finanzas", "Desarrollo personal / Crecimiento",
        "Salud y bienestar", "Salud y bienestar", "Diversión y ocio",
      ];
      const annualFocus: Record<string, string> = {
        "Salud y bienestar": "Más energía y equilibrio",
        "Finanzas": "Estabilidad y libertad",
        "Carrera profesional o trabajo": "Crecer con propósito",
        "Desarrollo personal / Crecimiento": "Aprender a mi ritmo",
        "Familia y amigos": "Conexiones más profundas",
        "Amor / Pareja": "Tiempo de calidad",
        "Diversión y ocio": "Disfrutar lo cotidiano",
        "Ambiente físico / Entorno": "Un hogar que me dé calma",
        "Aprendizaje y proyectos que me ilusionan": "Dar forma a mis ideas",
      };
      const annual = plans.find((plan) => plan.horizon === "annual" && plan.periodKey === "2026");
      const activeAreas = areas.filter((area) => area.active);
      const areaGoals = Object.fromEntries(activeAreas.map((area) => [area.id, annualFocus[area.name] || "Avanzar con calma en esta área"]));
      const books = ["Lecturas para una vida tranquila", "Una novela pendiente", "Notas sobre hábitos"];
      const learning = ["Fotografía cotidiana", "Cocina sencilla", "Escritura creativa"];
      const experiences = ["Visitar un museo", "Caminar por el parque", "Compartir un café"];
      await new Promise<void>((resolve, reject) => {
        const write = db.transaction(["cascadePlans", "brainDumpItems"], "readwrite");
        const planStore = write.objectStore("cascadePlans");
        for (const [index, copy] of monthCopy.entries()) {
          const periodKey = `2026-${String(index + 1).padStart(2, "0")}`;
          // October is deliberately untouched, including its fourth priority and all historical details.
          if (periodKey === "2026-10") continue;
          const existing = plans.find((plan) => plan.horizon === "monthly" && plan.periodKey === periodKey);
          if (existing) continue;
          const areaName = monthAreas[index];
          const area = activeAreas.find((item) => item.name === areaName) || activeAreas.find((item) => item.category === areaName);
          if (!area) { write.abort(); reject(new Error(`Missing existing area for synthetic month ${periodKey}: ${areaName}`)); return; }
          const plan: CascadePlan = {
            id: `refinement-month-${periodKey}`,
            horizon: "monthly", periodKey, intention: copy[0], priority: copy[1],
            objectives: copy.slice(1), activities: [], areaIds: [area.id], createdAt: stamp, updatedAt: stamp,
          };
          planStore.put(plan);
        }
        const annualPlan: CascadePlan = {
          id: annual?.id || "refinement-annual-2026", horizon: "annual", periodKey: "2026",
          intention: "Un año intencional, una vida más mía", priority: "Avanzar con calma",
          objectives: ["Cuidar mi bienestar", "Aprender y crear", "Disfrutar mis relaciones"],
          activities: [], createdAt: stamp, updatedAt: stamp, ...annual,
          areaIds: Array.from(new Set([...(annual?.areaIds || []), ...activeAreas.map((area) => area.id)])),
          details: { ...annual?.details, areaGoals: JSON.stringify(areaGoals) },
        };
        if (!annual) planStore.put(annualPlan);
        for (const [type, titles] of [["want_to_read", books], ["want_to_learn", learning], ["want_to_do", experiences]] as const) {
          for (const [index, title] of titles.entries()) {
            const item: BrainDumpItem = {
              id: `refinement-${type}-${index}`, title, type, tentativeDate: "2026-10-01",
              periodPlanId: october.id, priority: "medium", status: index === 0 && type === "want_to_read" ? "completed" : "idea",
              createdAt: stamp, updatedAt: stamp,
            };
            write.objectStore("brainDumpItems").put(item);
          }
        }
        write.oncomplete = () => resolve();
        write.onerror = () => reject(write.error);
        write.onabort = () => reject(write.error);
      });
      return { areaCount: activeAreas.length, taskCount: tasks.length, octoberPriorityCount: october.objectives.length };
    } finally { db.close(); }
  });
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), { message: `${name}: no page overflow` }).toBeTruthy();
  const { width, height } = page.viewportSize()!;
  for (const fullPage of [false, true]) {
    const path = testInfo.outputPath(`refinement-${name}-${width}x${height}${fullPage ? "" : "-viewport"}.png`);
    await page.screenshot({ path, fullPage, animations: "disabled" });
    await testInfo.attach(`${name}-${fullPage ? "full" : "viewport"}`, { path, contentType: "image/png" });
  }
}

test.describe("local visual refinement with explicitly synthetic content", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "This matrix sets both desktop and mobile CSS viewports in isolated Desktop Chrome contexts.");
    expect(testInfo.project.use.baseURL, "Never run the onboarding or visual fixture against a remote origin").toBe("http://127.0.0.1:3100");
    await page.setViewportSize({ width: 1448, height: 1086 });
    await setupEditorialFixture(page);
  });

  test("capture existing fixture and enriched R7 R5 R6 without hiding controls", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const screen of screens) {
      await page.goto(screen.route);
      await expect(page.getByRole("heading", { name: screen.heading, exact: true })).toBeVisible();
      await capture(page, testInfo, `baseline-editorial-${screen.id}`);
    }
    const fixture = await enrichReviewFixture(page);
    expect(fixture.areaCount).toBe(9);
    expect(fixture.octoberPriorityCount).toBe(4);
    for (const screen of screens) {
      await page.goto(screen.route);
      await expect(page.getByRole("heading", { name: screen.heading, exact: true })).toBeVisible();
      if (screen.id === "r6") {
        await expect(page.locator(".prep-month-grid > button")).toHaveCount(12);
        await expect(page.locator(".prep-area-grid > a")).toHaveCount(fixture.areaCount);
        await expect(page.locator(".prep-list-item")).toHaveCount(9);
        await expect(page.locator(".prep-month-grid")).toContainText("Celebración");
      }
      await capture(page, testInfo, screen.id);
      await expect(page.getByRole("heading", { name: screen.heading, exact: true })).toHaveCSS("font-family", /Playfair/);
      const primarySelector = screen.id === "r7" ? ".home-direction .prep-primary" : screen.id === "r5" ? ".prep-review-buttons .prep-primary" : ".prep-week-bridge .prep-primary";
      await expect(page.locator(primarySelector)).toHaveCSS("font-family", /Inter/);
      if (screen.id === "r7") {
        const next = page.locator(".home-direction");
        await expect(next.locator(".home-stationery")).toHaveCSS("font-style", "normal");
        const overlaps = await next.evaluate((element) => {
          const note = element.querySelector(".home-stationery")!.getBoundingClientRect();
          return Array.from(element.querySelectorAll(".home-direction-body > div:first-child")).map((text) => {
            const bounds = text.getBoundingClientRect();
            return { element: text.tagName, intersects: Math.max(bounds.left, note.left) < Math.min(bounds.right, note.right) && Math.max(bounds.top, note.top) < Math.min(bounds.bottom, note.bottom) };
          });
        });
        expect(overlaps).toHaveLength(1);
        expect(overlaps.every((item) => !item.intersects), "The decorative note must not overlap the next-step heading or paragraph").toBeTruthy();
        const path = testInfo.outputPath("inicio-stationery-detail.png");
        await next.screenshot({ path, animations: "disabled" });
        await testInfo.attach("next-step-detail-native-locator", { path, contentType: "image/png" });
      }
      if (screen.id === "r5") {
        const path = "docs/qa/screenshots/refinement-guide-photo-detail.png";
        await page.locator(".prep-guide-photo").screenshot({ path, animations: "disabled" });
        await testInfo.attach("guide-photo-detail-native-locator", { path, contentType: "image/png" });
      }
    }
    // This intentionally runs after every initial capture, so the review images keep the initial scroll position.
    const lastArea = page.locator(".prep-area-grid > a").last();
    await lastArea.focus();
    await lastArea.scrollIntoViewIfNeeded();
    await expect(lastArea).toBeFocused();
    await expect(lastArea).toContainText("Aprendizaje y proyectos que me ilusionan");
    await expect.poll(() => lastArea.evaluate((element) => {
      const item = element.getBoundingClientRect();
      const row = element.parentElement!.getBoundingClientRect();
      return item.left >= row.left - 1 && item.right <= row.right + 1;
    }), { message: "The ninth area stays keyboard-accessible inside the horizontal row" }).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test("month selection, optional lists and optional review persist through UI navigation", async ({ page }) => {
    test.setTimeout(120_000);
    await enrichReviewFixture(page);
    await page.goto("/app/planning");
    const months = page.locator(".prep-month-grid > button");
    await expect(months).toHaveCount(12);
    await months.nth(3).click();
    await expect(months.nth(3)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".prep-month-detail")).toContainText("Vivir con más presencia");
    await months.nth(9).click();
    await expect(page.locator(".prep-month-detail")).toContainText("Disciplina tranquila");
    const book = page.locator(".prep-list-item").filter({ hasText: "Una novela pendiente" });
    await book.locator("button[aria-pressed]").click();
    await expect(book.locator("button[aria-pressed]")).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(book.locator("button[aria-pressed]")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".prep-list-item")).toHaveCount(9);
    await page.locator(".prep-annual").getByRole("link", { name: "Ver mi año completo", exact: true }).click();
    await expect(page).toHaveURL(/view=annual/);
    await expect(page.locator(".prep-year .prep-month-grid > button")).toHaveCount(12);
    await expect(page.locator(".prep-year-areas, .prep-legacy-plans")).toHaveCount(0);
    await page.goto("/app/guide?week=2026-09-28");
    await page.locator(".prep-review-invitation").getByRole("button", { name: "Omitir y planificar", exact: true }).click();
    await expect(page.locator(".prep-review-summary")).toContainText("Revisión omitida");
    await page.reload();
    await expect(page.locator(".prep-review-summary")).toContainText("Revisión omitida");
    await page.locator(".prep-review-summary").getByRole("button", { name: "Reabrir revisión", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Revisar semana anterior", exact: true });
    await expect(review).toContainText("Pendiente sin mover");
    await review.getByRole("button", { name: "Terminar revisión", exact: true }).click();
    await expect(review).toBeHidden();
    await expect(page.locator(".prep-review-summary")).toContainText("Revisión guardada");
    await page.reload();
    await expect(page.locator(".prep-review-summary")).toContainText("Revisión guardada");
    await page.locator(".prep-stepper").getByRole("link", { name: "4 Ver mi semana", exact: true }).click();
    await expect(page).toHaveURL(/planning\/weekly/);
    await expect(page.locator(".weekly-days-panel")).toBeVisible();
  });

  test("mobile 390 layout preserves navigation, review and prepared-week access", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await enrichReviewFixture(page);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const screen of screens) {
      await page.goto(screen.route);
      await expect(page.locator(screen.id === "r7" ? ".home-overview" : ".prep-page")).toBeVisible();
      await expect(page.locator(".mobile-nav")).toBeVisible();
      await capture(page, testInfo, screen.id);
    }
    await page.goto("/app/guide?week=2026-09-28");
    await page.locator(".prep-mobile-entry").getByRole("button", { name: "Comenzar", exact: true }).click();
    await expect(page.locator(".prep-review-invitation")).toBeVisible();
    await capture(page, testInfo, "review-mobile");
    await page.locator(".prep-review-invitation").getByRole("button", { name: "Omitir y planificar", exact: true }).click();
    await expect(page.locator(".prep-guide")).toHaveClass(/prep-mobile-step-prepare/);
    await page.reload();
    await expect(page.locator(".prep-guide")).toHaveClass(/prep-mobile-step-prepare/);
    await capture(page, testInfo, "preparation-mobile");
    await page.locator(".prep-guide-continue").click();
    await expect(page).toHaveURL(/planning\/weekly/);
    await expect(page.locator(".weekly-days-panel")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    expect(errors).toEqual([]);
  });
});

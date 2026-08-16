import { expect, test, type Page } from "@playwright/test";

async function completeOnboarding(page: Page, name = "María") {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Diseña tu mejor versión/ })).toBeVisible();
  await page.getByRole("button", { name: /Comenzar/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("Tu nombre").fill(name);
  await page.getByPlaceholder("Mi salud física y mental").fill("Moverme con energía");
  await page.getByPlaceholder("Hacer crecer mi carrera").fill("Avanzar en mi proyecto");
  await page.getByPlaceholder("Tener tiempo de calidad").fill("Cuidar mis relaciones");
  await page.getByRole("button", { name: /Crear mi planner/ }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`Buenos días, ${name}`) })).toBeVisible();
}

test("onboarding creates an empty local planner", async ({ page }) => {
  await completeOnboarding(page);
  await expect(page.getByRole("heading", { name: "Metas prioritarias" })).toBeVisible();
  await expect(page.getByText("Completar 21K")).toHaveCount(0);
  await page.goto("/app/habits");
  await expect(page.getByRole("heading", { name: "Hábitos", exact: true })).toBeVisible();
});

test("creates and completes a task, then creates and records a habit", async ({ page }) => {
  await completeOnboarding(page);

  await page.goto("/app/tasks");
  await page.getByLabel("Nueva tarea en el gestor").fill("Preparar propuesta beta");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  const task = page.getByRole("button", { name: /Preparar propuesta beta/ });
  await expect(task).toBeVisible();
  await task.click();
  await page.getByRole("tab", { name: "Completadas" }).click();
  await expect(page.getByRole("button", { name: /Preparar propuesta beta/ })).toBeVisible();

  await page.goto("/app/habits");
  await page.getByRole("button", { name: "Crear hábito" }).click();
  await page.getByLabel("Nombre del hábito").fill("Leer con calma");
  await page.getByLabel("Unidad").fill("min");
  await page.getByRole("button", { name: "Guardar hábito" }).click();
  await expect(page.getByRole("heading", { name: "Leer con calma" })).toBeVisible();
  const firstScheduledCheck = page.locator(".habit-matrix__row .matrix-check:not([disabled])").first();
  await firstScheduledCheck.click();
  await expect(firstScheduledCheck).toHaveAttribute("aria-pressed", "true");
});

test("creates a goal with manual progress and writes a journal entry", async ({ page }) => {
  await completeOnboarding(page);

  await page.goto("/app/goals");
  await page.getByRole("button", { name: "Crear meta" }).click();
  await page.getByLabel("Título de la meta").fill("Publicar la versión beta");
  await page.getByLabel("Método de progreso").selectOption("manual");
  await page.getByLabel("¿Por qué es importante para ti?").fill("Quiero validar una experiencia útil y serena.");
  await page.getByLabel("Avance inicial (%)").fill("35");
  await page.getByRole("dialog", { name: "Crear nueva meta" }).getByRole("button", { name: "Crear meta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Publicar la versión beta" })).toBeVisible();
  await expect(page.getByText("35%").first()).toBeVisible();

  await page.goto("/app/journal");
  await page.getByPlaceholder("Título opcional").fill("Decisión de producto");
  await page.getByLabel("Nueva entrada de journal").fill("Mantener la experiencia simple y local-first.");
  await page.getByRole("button", { name: "Guardar entrada" }).click();
  await expect(page.getByRole("heading", { name: "Decisión de producto" })).toBeVisible();
});

test("budget, savings fund and movement update the finance summary", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/finance");
  await expect(page.getByRole("heading", { name: "Finanzas", exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Presupuesto" }).click();
  await page.getByLabel("Ingreso planeado").fill("5000000");
  await page.getByRole("button", { name: "Guardar presupuesto" }).click();
  await expect(page.getByText("Presupuesto guardado para este mes.")).toBeVisible();

  await page.getByRole("tab", { name: "Fondos" }).click();
  await page.getByLabel("Nombre").fill("Fondo de tranquilidad");
  await page.getByLabel("Meta").fill("2000000");
  await page.getByRole("button", { name: "Crear fondo" }).click();
  await expect(page.getByRole("heading", { name: "Fondo de tranquilidad" })).toBeVisible();

  await page.getByRole("tab", { name: "Movimientos" }).click();
  await page.getByLabel("Tipo").selectOption("contribution");
  await page.getByLabel("Valor").fill("250000");
  await page.getByLabel("Fondo de ahorro").selectOption({ label: "Fondo de tranquilidad" });
  await page.getByLabel("Nota").fill("Primer aporte");
  await page.getByRole("button", { name: "Guardar movimiento" }).click();
  await expect(page.getByText("Movimiento guardado. Los totales ya fueron actualizados.")).toBeVisible();
  await expect(page.getByText("Primer aporte")).toBeVisible();
});

test("cascade planning and optional life modules persist locally", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/planning");
  await expect(page.getByRole("heading", { name: "Planeación cascada" })).toBeVisible();
  await page.getByLabel("Intención de este nivel").fill("Construir una base serena y sostenible");
  await page.getByLabel("Prioridad principal").fill("Publicar la primera versión");
  await page.getByLabel(/Objetivos/).fill("Validar el producto\nCuidar mi energía");
  await page.getByRole("button", { name: /Guardar 1 año/ }).click();
  await expect(page.getByText("Nivel guardado y conectado")).toBeVisible();

  await page.goto("/app/life-hub");
  await expect(page.getByRole("heading", { name: "Mi espacio" })).toBeVisible();
  await page.getByLabel("Pensamiento").fill("Aprender fotografía");
  await page.getByRole("button", { name: "Capturar" }).click();
  await expect(page.getByText("Aprender fotografía")).toBeVisible();
  await page.getByRole("button", { name: "Fitness Hub" }).click();
  await page.getByRole("button", { name: "Activar Fitness Hub" }).click();
  await expect(page.getByRole("heading", { name: "Ejercicios" })).toBeVisible();
});

test("exports, deletes and restores a validated local backup", async ({ page }) => {
  await completeOnboarding(page, "Valeria");
  await page.goto("/app/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();

  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page.getByLabel("Confirmación para eliminar todos los datos").fill("ELIMINAR");
  await page.getByRole("button", { name: "Eliminar todo" }).click();
  await expect(page.getByRole("heading", { name: /Diseña tu mejor versión/ })).toBeVisible();

  await page.locator('input[type="file"][accept="application/json"]').setInputFiles(backupPath!);
  await expect(page.getByLabel("Nombre del perfil")).toHaveValue("Valeria");
  await page.goto("/app/dashboard");
  await expect(page.getByRole("heading", { name: /Buenos días, Valeria/ })).toBeVisible();
});

test("deep links, refresh and browser history work in the production runtime", async ({ page }) => {
  await completeOnboarding(page);
  const routes = [
    ["/app", /Buenos días/],
    ["/app/dashboard", /Buenos días/],
    ["/app/today", /^Hoy$/],
    ["/app/tasks", /Tareas y proyectos/],
    ["/app/habits", /^Hábitos$/],
    ["/app/finance", /^Finanzas$/],
    ["/app/life-hub", /^Mi espacio$/],
    ["/app/goals", /Metas anuales/],
    ["/app/progress", /Tu progreso/],
    ["/app/journal", /^Mi diario$/],
    ["/app/settings", /Ajustes y datos/],
  ] as const;

  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: /Ajustes y datos/ })).toBeVisible();

  await page.goto("/app/tasks");
  await page.goto("/app/journal");
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/tasks$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/app\/journal$/);

  if (test.info().project.name === "mobile") {
    await page.getByRole("link", { name: "Más", exact: true }).click();
    await page.getByRole("link", { name: /Tareas/ }).click();
  } else {
    await page.getByRole("link", { name: "Tareas" }).click();
  }
  await expect(page.getByRole("heading", { name: "Tareas y proyectos" })).toBeVisible();
});

test("help routes expose the configured support resources", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/help");
  await expect(page.getByRole("heading", { name: "Apoyo psicológico · Línea 106" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Línea Púrpura" })).toBeVisible();
});

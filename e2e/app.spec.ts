import { expect, test, type Page } from "@playwright/test";

async function completeOnboarding(page: Page, name = "María") {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Life, but more you/ })).toBeVisible();
  await page.getByRole("button", { name: /Crear mi espacio/ }).click();
  await page.getByRole("button", { name: "Salud y bienestar" }).click();
  await page.getByRole("button", { name: "Carrera / profesional" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder(/Quiero sentir que mi semana/).fill("Moverme con energía y avanzar mi proyecto con calma.");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("Ej. María").fill(name);
  await page.getByRole("button", { name: /Crear mi espacio/ }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`Buenos días, ${name}`) })).toBeVisible();
}

test("onboarding creates an empty planner and activation journey", async ({ page }) => {
  await completeOnboarding(page);
  await expect(page.getByRole("heading", { name: "Construyamos solo lo necesario" })).toBeVisible();
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
  await page.getByLabel("¿Qué quieres lograr?").fill("Publicar la versión beta");
  await page.getByLabel("¿Por qué importa para ti?").fill("Quiero validar una experiencia útil y serena.");
  await page.getByRole("radio", { name: "Fecha exacta" }).click();
  await page.getByLabel("Fecha exacta").fill("2027-06-15");
  await page.getByPlaceholder("Hito 1").fill("Publicar la portada");
  await page.getByRole("dialog", { name: "Crear una meta" }).getByRole("button", { name: "Crear meta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "¿Qué significaría avanzar este mes?" })).toBeVisible();
  await page.getByRole("button", { name: "Ahora no" }).click();
  await expect(page.getByRole("heading", { name: "Publicar la versión beta" })).toBeVisible();

  await page.goto("/app/journal");
  await page.getByPlaceholder("Título opcional").fill("Decisión de producto");
  await page.getByLabel("Nueva página del diario").fill("Mantener la experiencia simple y local-first.");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
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
  await expect(page.getByRole("heading", { name: "Planificación" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aún no has creado ningún mes para este año" })).toBeVisible();
  await page.getByRole("button", { name: "Definir visión" }).click();
  const longTermDialog = page.getByRole("dialog", { name: "Mi vida en 5 años" });
  await longTermDialog.getByLabel("¿Cómo se ve y se siente esa vida?").fill("Vivo con energía, estabilidad y tiempo para las personas que amo.");
  await longTermDialog.getByPlaceholder("Prioridad 1").fill("Cuidar mi bienestar");
  await longTermDialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Vivo con energía, estabilidad y tiempo para las personas que amo.")).toBeVisible();

  await page.getByRole("button", { name: /Agregar mes/ }).first().click();
  const monthDialog = page.getByRole("dialog", { name: "Agregar mes" });
  await monthDialog.getByLabel("Enfoque del mes (opcional)").fill("Construir una base serena y sostenible");
  await monthDialog.getByPlaceholder("Prioridad 1").fill("Publicar la primera versión");
  await monthDialog.getByPlaceholder("Prioridad 2").fill("Cuidar mi energía");
  await monthDialog.getByRole("button", { name: "Crear mes" }).click();
  await expect(page.getByRole("heading", { name: "Construir una base serena y sostenible" })).toBeVisible();
  await page.getByRole("button", { name: /Ver mes/ }).click();
  await expect(page.getByRole("heading", { name: "Lo que importa en este mes" })).toBeVisible();
  await page.getByRole("button", { name: "Publicar la primera versión" }).click();
  await expect(page.getByRole("progressbar", { name: "Avance del mes" })).toHaveAttribute("aria-valuenow", "50");

  await page.goto("/app/life-hub");
  await expect(page.getByRole("heading", { name: "Mi espacio" })).toBeVisible();
  await page.getByLabel("Pensamiento").fill("Aprender fotografía");
  await page.getByRole("button", { name: "Capturar" }).click();
  await expect(page.getByText("Aprender fotografía")).toBeVisible();
  await page.getByRole("button", { name: "Fitness Hub" }).click();
  await page.getByRole("button", { name: "Quiero usar Fitness Hub" }).click();
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
  await expect(page.getByRole("heading", { name: /Life, but more you/ })).toBeVisible();

  await page.locator('input[type="file"][accept="application/json"]').setInputFiles(backupPath!);
  await expect(page.getByLabel("Nombre del perfil")).toHaveValue("Valeria");
  await page.goto("/app/dashboard");
  await expect(page.getByRole("heading", { name: /Buenos días, Valeria/ })).toBeVisible();
});

test("deep links and refresh work in the production runtime", async ({ page }) => {
  test.setTimeout(90_000);
  await completeOnboarding(page);
  const routes = [
    ["/app", /Buenos días/],
    ["/app/dashboard", /Buenos días/],
    ["/app/today", /^Hoy$/],
    ["/app/tasks", /Tareas y proyectos/],
    ["/app/habits", /^Hábitos$/],
    ["/app/challenges", /^Retos$/],
    ["/app/finance", /^Finanzas$/],
    ["/app/life-hub", /^Mi espacio$/],
    ["/app/goals", /^Metas$/],
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
});

test("browser history and responsive navigation work in the production runtime", async ({ page }) => {
  test.setTimeout(60_000);
  await completeOnboarding(page);
  const isMobile = test.info().project.name === "mobile";

  if (isMobile) {
    await page.getByRole("link", { name: "Más", exact: true }).click();
    await page.getByRole("link", { name: /Tareas y proyectos/ }).click();
  } else {
    await page.getByRole("link", { name: "Tareas", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Tareas y proyectos" })).toBeVisible();

  if (isMobile) {
    await page.getByRole("link", { name: "Más", exact: true }).click();
    await page.getByRole("link", { name: /Mi diario/ }).click();
  } else {
    await page.getByRole("link", { name: "Mi diario", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Mi diario" })).toBeVisible();

  const historySteps = isMobile ? 2 : 1;
  for (let step = 0; step < historySteps; step += 1) await page.goBack();
  await expect(page).toHaveURL(/\/app\/tasks$/);
  await expect(page.getByRole("heading", { name: "Tareas y proyectos" })).toBeVisible();
  for (let step = 0; step < historySteps; step += 1) await page.goForward();
  await expect(page).toHaveURL(/\/app\/journal$/);
  await expect(page.getByRole("heading", { name: "Mi diario" })).toBeVisible();

  if (isMobile) {
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

test("creates a gentle challenge and records today", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/challenges");
  await page.getByRole("button", { name: "Elegir este reto" }).first().click();
  await page.getByLabel("Nombre del reto").fill("Dar un paso valiente");
  await page.getByRole("button", { name: "Guardar reto" }).click();
  await expect(page.getByRole("heading", { name: "Dar un paso valiente" })).toBeVisible();
  await page.getByRole("button", { name: "Registrar hoy" }).click();
  await expect(page.getByRole("button", { name: "Quitar registro de hoy" })).toHaveAttribute("aria-pressed", "true");
});

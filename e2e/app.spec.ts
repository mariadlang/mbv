import { expect, test, type Page } from "@playwright/test";

async function completeOnboarding(page: Page, name = "María", startChoice: RegExp = /Diseña tu mes/, stayAtDestination = false) {
  await page.goto("/app/dashboard");
  const necessaryCookies = page.getByRole("button", { name: "Solo necesarias" });
  if (await necessaryCookies.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false)) await necessaryCookies.click();
  await expect(page.getByRole("heading", { name: /Una vida más tuya/ })).toBeVisible();
  await page.getByRole("button", { name: /Crear mi espacio/ }).click();
  await page.getByRole("radio", { name: startChoice }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Salud y bienestar" }).click();
  await page.getByRole("button", { name: "Carrera / profesional" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder(/Quiero sentir que mi semana/).fill("Moverme con energía y avanzar mi proyecto con calma.");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("Ej. María").fill(name);
  await page.getByRole("button", { name: /Crear mi espacio/ }).click();
  if (stayAtDestination) return;
  await page.goto("/app/dashboard");
  await expect(page.getByRole("heading", { name: new RegExp(`Buenos días, ${name}`) })).toBeVisible();
}

async function authorizeFitnessIfNeeded(page: Page) {
  const authorize = page.getByRole("button", { name: "Autorizar y continuar" });
  if (await authorize.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false)) await authorize.click();
}

test("onboarding creates an empty planner and activation journey", async ({ page }) => {
  await completeOnboarding(page);
  await expect(page.getByRole("heading", { name: "Construyamos solo lo necesario" })).toBeVisible();
  await expect(page.getByText("Completar 21K")).toHaveCount(0);
  await page.goto("/app/habits");
  await expect(page.getByRole("heading", { name: "Hábitos", exact: true })).toBeVisible();
});

test("each onboarding starting point opens a distinct existing flow", async ({ browser }) => {
  const choices = [
    { label: /Diseña tu mes/, url: /\/app\/planning\?view=year&create=month/, heading: /Planificar/ },
    { label: /Diseña tu año/, url: /\/app\/planning\?view=year$/, heading: /^Planificación$/ },
    { label: /Diseña tu plan de vida con acompañamiento/, url: /\/app\/vision\?guided=1$/, heading: /Diseña primero una imagen/ },
  ];
  for (const [index, choice] of choices.entries()) {
    const context = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
    const page = await context.newPage();
    await completeOnboarding(page, `Inicio ${index + 1}`, choice.label, true);
    await expect(page).toHaveURL(choice.url);
    await expect(page.getByRole("heading", { name: choice.heading }).first()).toBeVisible();
    await context.close();
  }
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

test("projects come before tasks and detailed task fields stay progressive", async ({ page }) => {
  test.setTimeout(60_000);
  await completeOnboarding(page);
  await page.goto("/app/tasks");
  const projectsHeading = page.getByRole("heading", { name: "Proyectos", exact: true });
  const tasksHeading = page.getByRole("heading", { name: "Tareas", exact: true });
  await expect(projectsHeading).toBeVisible();
  await expect(tasksHeading).toBeVisible();
  expect((await projectsHeading.boundingBox())!.y).toBeLessThan((await tasksHeading.boundingBox())!.y);

  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.getByLabel("Nombre del proyecto").fill("Lanzamiento sereno");
  await page.getByLabel("Resultado esperado").fill("Publicar una primera versión clara");
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await expect(page.getByRole("heading", { name: "Lanzamiento sereno" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Nueva tarea" }).click();
  await page.getByLabel("Tarea", { exact: true }).fill("Revisar portada");
  await expect(page.getByLabel("Proyecto", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Añadir hora, duración y conexiones/ }).click();
  await page.locator(".advanced-task-form label", { hasText: /^Proyecto/ }).locator("select").selectOption({ label: "Lanzamiento sereno" });
  await page.getByRole("button", { name: "Guardar tarea" }).click();
  await expect(page.getByRole("button", { name: /Revisar portada.*Lanzamiento sereno/ })).toBeVisible();
});

test("custom Dream Life cards reuse and can change Wheel of Life areas", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/vision");
  await page.getByRole("button", { name: /Crear una tarjeta personalizada/ }).click();
  const dialog = page.getByRole("dialog", { name: "Crear tarjeta personalizada" });
  await dialog.getByLabel("Nombre").fill("Mi proyecto de escritura");
  await dialog.getByLabel("Área de vida").selectOption({ label: "Salud y bienestar" });
  await dialog.getByRole("button", { name: "Guardar tarjeta" }).click();
  await expect(page.getByText(/conectada con Salud y bienestar/)).toBeVisible();
  await page.getByRole("button", { name: "Ahora no" }).click();
  await page.getByLabel("Área de vida").selectOption({ label: "Carrera / profesional" });
  await page.getByRole("button", { name: "Guardar mi visión" }).click();
  await expect(page.getByRole("button", { name: /Carrera \/ profesional.*mi proyecto de escritura/i })).toBeVisible();
});

test("creates a goal with manual progress and writes a journal entry", async ({ page }) => {
  await completeOnboarding(page);

  await page.goto("/app/goals");
  await page.getByRole("button", { name: "Crear meta" }).click();
  await page.getByLabel("¿Qué quieres lograr?").fill("Publicar la versión beta");
  await page.getByLabel("¿Por qué importa para ti?").fill("Quiero validar una experiencia útil y serena.");
  await page.getByRole("radio", { name: "Fecha exacta" }).click();
  await page.getByLabel("Fecha exacta").fill("2027-06-15");
  await page.getByRole("button", { name: /Cómo mediremos el avance/ }).click();
  await page.getByLabel("Método").selectOption("manual");
  await page.getByLabel("Método").selectOption("milestones");
  await page.getByPlaceholder("Hito 1").fill("Publicar la portada");
  await page.getByRole("dialog", { name: "Crear una meta" }).getByRole("button", { name: "Crear meta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tu meta ya tiene un camino" })).toBeVisible();
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
  test.setTimeout(60_000);
  await completeOnboarding(page);
  await page.goto("/app/planning");
  await expect(page.getByRole("heading", { name: "Planificación" })).toBeVisible();
  await expect(page.locator(".created-month-card")).toHaveCount(12);
  await expect(page.getByText("Organiza tu año, mes a mes.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Agregar mes/ })).toHaveCount(0);
  await expect(page.getByText("Mes actual", { exact: true })).toHaveCount(1);
  const nextYear = new Date().getFullYear() + 1;
  await page.getByLabel("Año").selectOption(String(nextYear));
  await expect(page.locator(".created-month-card")).toHaveCount(12);
  await expect(page.getByText("Mes actual", { exact: true })).toHaveCount(0);
  await page.getByLabel("Año").selectOption(String(new Date().getFullYear()));
  await page.getByRole("button", { name: "Definir visión" }).click();
  const longTermDialog = page.getByRole("dialog", { name: "Mi vida en 5 años" });
  await longTermDialog.getByLabel("¿Cómo se ve y se siente esa vida?").fill("Vivo con energía, estabilidad y tiempo para las personas que amo.");
  await longTermDialog.getByPlaceholder("Prioridad 1").fill("Cuidar mi bienestar");
  await longTermDialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Vivo con energía, estabilidad y tiempo para las personas que amo.")).toBeVisible();

  await page.getByRole("button", { name: /Añadir plan para/ }).first().click();
  const monthDialog = page.getByRole("dialog", { name: /Planificar/ });
  await monthDialog.getByLabel("¿Qué es lo más importante que quieres avanzar?").fill("Construir una base serena y sostenible");
  await monthDialog.getByPlaceholder("Prioridad 1").fill("Publicar la primera versión");
  await monthDialog.getByPlaceholder("Prioridad 2").fill("Cuidar mi energía");
  await monthDialog.getByRole("button", { name: "Guardar plan" }).click();
  await expect(page.getByRole("heading", { name: "Construir una base serena y sostenible" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Construir una base serena y sostenible" })).toBeVisible();
  await expect(page.locator(".created-month-card")).toHaveCount(12);
  await page.getByRole("button", { name: "Ver mes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Lo que importa en este mes" })).toBeVisible();
  await page.getByRole("button", { name: "Publicar la primera versión" }).click();
  await expect(page.getByRole("progressbar", { name: "Avance del mes" })).toHaveAttribute("aria-valuenow", "50");

  await page.goto("/app/life-hub");
  await expect(page.getByRole("heading", { name: "Mi espacio" })).toBeVisible();
  await page.getByLabel("Pensamiento").fill("Aprender fotografía");
  await page.getByRole("button", { name: "Capturar" }).click();
  await expect(page.getByText("Aprender fotografía")).toBeVisible();
  await page.getByLabel("Añadir a Quiero leer").fill("El camino del artista");
  await page.getByLabel("Añadir a Quiero leer").press("Enter");
  await expect(page.getByText("El camino del artista")).toBeVisible();
  await page.goto("/app/health");
  await expect(page).toHaveURL(/\/app\/health/);
  await authorizeFitnessIfNeeded(page);
  await expect(page.getByRole("heading", { name: "Alimentación", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Entrenamiento" }).click();
  await page.getByRole("button", { name: "Añadir entrenamiento" }).first().click();
  const workoutDialog = page.getByRole("dialog", { name: "Añadir entrenamiento" });
  await workoutDialog.getByLabel("Nombre del entrenamiento").fill("Glúteos");
  await workoutDialog.getByRole("button", { name: "Añadir ejercicio opcional" }).click();
  await workoutDialog.getByLabel("Nombre del ejercicio").fill("Hip Thrust");
  await workoutDialog.getByLabel("Número de series").fill("2");
  await workoutDialog.getByLabel("Repeticiones").nth(0).fill("12");
  await workoutDialog.getByLabel("Peso kg").nth(0).fill("70");
  await workoutDialog.getByLabel("Repeticiones").nth(1).fill("8");
  await workoutDialog.getByLabel("Peso kg").nth(1).fill("80");
  await workoutDialog.getByRole("button", { name: "Guardar entrenamiento" }).click();
  await expect(page.getByRole("heading", { name: "Glúteos" })).toBeVisible();
  await expect(page.getByText("70 kg")).toBeVisible();
  await expect(page.getByText("80 kg")).toBeVisible();
  await page.getByRole("button", { name: "Guardar sesión realizada" }).click();
  await page.getByRole("button", { name: "Ver historial de pesos" }).click();
  await expect(page.getByRole("dialog", { name: "Historial de pesos" }).getByText(/70 kg × 12.*80 kg × 8/)).toBeVisible();
  await page.getByRole("dialog", { name: "Historial de pesos" }).getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.goto("/app/life-hub?tab=challenges");
  await expect(page).toHaveURL(/\/app\/life-hub\?tab=challenges$/);
  await expect(page.getByRole("heading", { name: "Retos", exact: true })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /Una vida más tuya/ })).toBeVisible();

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
    ["/app/today", /Buenos días/],
    ["/app/tasks", /Proyectos y tareas/],
    ["/app/habits", /^Hábitos$/],
    ["/app/challenges", /^Retos$/],
    ["/app/finance", /^Finanzas$/],
    ["/app/life-hub", /^Mi espacio$/],
    ["/app/health", /^Alimentación$/],
    ["/app/goals", /^Metas$/],
    ["/app/progress", /Tu progreso/],
    ["/app/journal", /^Mi diario$/],
    ["/app/settings", /Ajustes y datos/],
    ["/app/legal", /Legal y privacidad/],
    ["/app/privacy-center", /Centro de Privacidad/],
  ] as const;

  for (const [route, heading] of routes) {
    await page.goto(route);
    if (route === "/app/health") await authorizeFitnessIfNeeded(page);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: /Centro de Privacidad/ })).toBeVisible();
});

test("information architecture separates overview from daily execution", async ({ page }) => {
  await completeOnboarding(page);
  const navigation = test.info().project.name === "mobile" ? page.locator(".mobile-nav") : page.locator(".sidebar__nav");
  await expect(navigation.getByRole("link")).toHaveCount(test.info().project.name === "mobile" ? 5 : 7);
  await expect(navigation).toContainText("Inicio");
  await expect(navigation).toContainText("Hoy");
  await expect(navigation).toContainText("Plan");
  await expect(navigation).toContainText("Progreso");
  await expect(navigation).toContainText("Mi espacio");
  if (test.info().project.name !== "mobile") {
    await expect(navigation).toContainText("Salud");
    await expect(navigation).toContainText("Finanzas");
  }
  await expect(page.getByRole("heading", { name: "Lo más importante" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Próximos eventos" })).toBeVisible();

  await navigation.getByRole("link", { name: "Hoy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Qué hago ahora" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Tareas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cierre del día" })).toBeVisible();
});

test("browser history and responsive navigation work in the production runtime", async ({ page }) => {
  test.setTimeout(60_000);
  await completeOnboarding(page);
  await page.getByRole("link", { name: "Mi espacio", exact: true }).click();
  await page.getByRole("link", { name: "Proyectos y tareas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Proyectos y tareas" })).toBeVisible();

  await page.getByRole("link", { name: "Mi espacio", exact: true }).click();
  await page.getByRole("link", { name: "Diario y notas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mi diario" })).toBeVisible();

  const historySteps = 2;
  for (let step = 0; step < historySteps; step += 1) await page.goBack();
  await expect(page).toHaveURL(/\/app\/tasks$/);
  await expect(page.getByRole("heading", { name: "Proyectos y tareas" })).toBeVisible();
  for (let step = 0; step < historySteps; step += 1) await page.goForward();
  await expect(page).toHaveURL(/\/app\/journal$/);
  await expect(page.getByRole("heading", { name: "Mi diario" })).toBeVisible();

  await page.getByRole("link", { name: "Mi espacio", exact: true }).click();
  await page.getByRole("link", { name: "Proyectos y tareas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Proyectos y tareas" })).toBeVisible();
});

test("help routes expose the configured support resources", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/help");
  await expect(page.getByRole("heading", { name: "Apoyo psicológico · Línea 106" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Línea Púrpura" })).toBeVisible();
});

test("public legal resources and signup consent are available", async ({ page }) => {
  await page.goto("/legal");
  await expect(page.getByRole("heading", { name: "Centro Legal y de Privacidad" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Política de Tratamiento de Datos/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Términos y Condiciones/ })).toBeVisible();

  await page.goto("/cookies");
  await expect(page.getByRole("heading", { name: "Política de Cookies y tecnologías similares" })).toBeVisible();
  await page.goto("/data-deletion");
  await expect(page.getByRole("heading", { name: "Exportación y eliminación de datos" })).toBeVisible();
  await page.goto("/legal-notices");
  await expect(page.getByRole("heading", { name: "Centro Legal y de Privacidad" })).toBeVisible();
  await page.goto("/data-policy");
  await expect(page.getByRole("heading", { name: "Política de Tratamiento de Datos Personales" })).toBeVisible();
  await page.goto("/pqr");
  await expect(page.getByRole("heading", { name: "Peticiones, quejas y reclamos" })).toBeVisible();
});

test("creates a gentle challenge and records today", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/challenges");
  await expect(page).toHaveURL(/\/app\/life-hub\?tab=challenges$/);
  await expect(page.getByRole("heading", { name: "Mi espacio" })).toBeVisible();
  await page.getByRole("button", { name: "Elegir este reto" }).first().click();
  await page.getByLabel("Nombre del reto").fill("Dar un paso valiente");
  await page.getByRole("button", { name: "Guardar reto" }).click();
  await expect(page.getByRole("heading", { name: "Dar un paso valiente" })).toBeVisible();
  await page.getByRole("button", { name: "Registrar hoy" }).click();
  await expect(page.getByRole("button", { name: "Quitar registro de hoy" })).toHaveAttribute("aria-pressed", "true");
});

test("support accepts suggestions, bug reports and account messages", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/support");
  await expect(page.getByRole("heading", { name: "Ayuda y soporte" })).toBeVisible();

  await page.getByLabel("Categoría").selectOption({ label: "Diseño y experiencia" });
  await page.getByLabel("Título").fill("Mejorar la lectura semanal");
  await page.getByLabel("Descripción de la sugerencia").fill("Sería útil ver una síntesis más compacta al terminar la semana.");
  await page.getByRole("button", { name: "Enviar sugerencia" }).click();
  await expect(page.getByText(/Tu sugerencia fue enviada correctamente/)).toBeVisible();

  await page.getByRole("tab", { name: /Reportar un problema/ }).click();
  await page.getByLabel("Sección donde ocurrió").fill("Planificación");
  await page.getByLabel("¿Qué estabas intentando hacer?").fill("Guardar mi semana");
  await page.getByLabel("Descripción del problema").fill("El botón no respondió después de organizar las tareas.");
  await page.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(page.getByText(/Recibimos tu reporte/)).toBeVisible();

  await page.getByRole("tab", { name: /Contactar a soporte/ }).click();
  await page.getByLabel("Asunto").fill("Consulta de mi cuenta");
  await page.getByLabel("Mensaje").fill("Necesito orientación para actualizar una preferencia de mi cuenta.");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByText(/Te responderemos lo antes posible/)).toBeVisible();
});

test("marketing consent can be granted and withdrawn", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/settings");
  const consent = page.getByLabel(/Quiero recibir novedades, recursos y ofertas/);
  await consent.check();
  await expect(page.getByText("Preferencia guardada.")).toBeVisible();
  await consent.uncheck();
  await expect(page.getByText(/Dejaste de recibir comunicaciones comerciales/)).toBeVisible();
});

test("platform rejects a normal user and allows an authenticated superadmin", async ({ page }) => {
  await page.goto("/platform");
  await expect(page).toHaveURL(/\/app\/dashboard/);

  await page.goto("/platform?e2e-admin=1");
  await expect(page.getByText("PLATAFORMA PRIVADA")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible();
  await expect(page.getByText("Acceso protegido")).toBeVisible();
});

test("fitness saves cardio without individual exercises", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/health?section=training");
  await authorizeFitnessIfNeeded(page);
  await page.getByRole("tab", { name: "Entrenamiento" }).click();
  await page.getByRole("button", { name: "Añadir entrenamiento" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Añadir entrenamiento" });
  await dialog.getByLabel("Nombre del entrenamiento").fill("Cardio caminata");
  await dialog.getByLabel("Duración estimada (min)").fill("45");
  await dialog.getByRole("button", { name: "Guardar entrenamiento" }).click();
  await expect(page.getByRole("heading", { name: "Cardio caminata" })).toBeVisible();
  await expect(page.getByText("0 ejercicios")).toBeVisible();
  await expect(page.getByText("Actividad sin series ni repeticiones")).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  const editDialog = page.getByRole("dialog", { name: "Editar entrenamiento" });
  await editDialog.getByLabel("Nombre del entrenamiento").fill("Cardio caminata suave");
  await editDialog.getByLabel("Duración estimada (min)").fill("35");
  await editDialog.getByRole("button", { name: "Guardar entrenamiento" }).click();
  await expect(page.getByRole("heading", { name: "Cardio caminata suave" })).toBeVisible();
  await expect(page.getByText("35 min")).toBeVisible();
  await page.getByRole("button", { name: "Guardar sesión realizada" }).click();
  await expect(page.getByText("Sesión realizada guardada en tu historial.")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByText("Entrenamiento eliminado.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cardio caminata suave" })).toHaveCount(0);
});

test("quick actions close with Escape and outside click", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/health");
  await authorizeFitnessIfNeeded(page);
  const opener = page.getByRole("button", { name: "Abrir acciones rápidas" });
  await opener.click();
  await expect(page.getByRole("link", { name: "Chat de soporte" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "Chat de soporte" })).toBeHidden();
  await opener.click();
  await page.getByRole("heading", { name: "Alimentación", exact: true }).click();
  await expect(page.getByRole("link", { name: "Chat de soporte" })).toBeHidden();
});

test("updated experiences remain usable across supported mobile widths", async ({ page }) => {
  test.setTimeout(300_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await completeOnboarding(page);

  const screens = [
    { path: "/app/tasks", locator: () => page.getByRole("button", { name: "Nuevo proyecto" }) },
    { path: "/app/life-hub", locator: () => page.getByLabel("Pensamiento") },
    { path: "/app/planning?view=year&create=month", locator: () => page.getByRole("dialog", { name: /Planificar/ }).getByRole("button", { name: "Guardar plan" }) },
    { path: "/app/vision?guided=1", locator: () => page.getByRole("button", { name: /Crear una tarjeta personalizada/ }) },
    { path: "/app/health", locator: () => page.getByRole("button", { name: "Autorizar y continuar" }) },
    { path: "/app/challenges", locator: () => page.getByRole("button", { name: "Elegir este reto" }).first() },
  ];

  for (const width of [320, 360, 375, 390, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const screen of screens) {
      await page.goto(screen.path);
      await expect(screen.locator()).toBeVisible();
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        taskSection: (() => {
          const section = document.querySelector<HTMLElement>(".tasks-section");
          const header = section?.querySelector<HTMLElement>(":scope > header");
          return { section: section?.getBoundingClientRect().toJSON(), sectionCss: section ? getComputedStyle(section).cssText : "", header: header?.getBoundingClientRect().toJSON(), headerWidth: header ? getComputedStyle(header).width : "" };
        })(),
        offenders: [...document.querySelectorAll<HTMLElement>("body *")]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1;
          })
          .slice(0, 8)
          .map((element) => ({ className: element.className, parentClass: element.parentElement?.className, tag: element.tagName, text: element.textContent?.trim().slice(0, 36), width: Math.round(element.getBoundingClientRect().width) })),
      }));
      expect(layout.scrollWidth, `${screen.path} at ${width}px: ${JSON.stringify({ offenders: layout.offenders, taskSection: layout.taskSection })}`).toBeLessThanOrEqual(layout.clientWidth + 1);
    }
  }

  await page.goto("/app/health?section=training");
  await authorizeFitnessIfNeeded(page);
  for (const [index, width] of [320, 360, 375, 390, 414, 430].entries()) {
    await page.setViewportSize({ width, height: 844 });

    await page.goto("/app/health?section=training");
    await page.getByRole("button", { name: "Añadir entrenamiento" }).first().click();
    const workoutDialog = page.getByRole("dialog", { name: "Añadir entrenamiento" });
    const saveWorkout = workoutDialog.getByRole("button", { name: "Guardar entrenamiento" });
    await saveWorkout.scrollIntoViewIfNeeded();
    await expect(saveWorkout).toBeInViewport();

    await page.goto("/app/goals");
    await page.getByRole("button", { name: "Crear meta" }).click();
    const goalDialog = page.getByRole("dialog", { name: "Crear una meta" });
    const createGoal = goalDialog.getByRole("button", { name: "Crear meta", exact: true });
    await createGoal.scrollIntoViewIfNeeded();
    await expect(createGoal).toBeInViewport();
    await goalDialog.getByLabel("¿Qué quieres lograr?").fill(`Meta móvil ${index + 1}`);
    await goalDialog.getByLabel("¿Por qué importa para ti?").fill("Para verificar el flujo completo en pantallas pequeñas.");
    await goalDialog.getByRole("button", { name: "Crear meta", exact: true }).click();
    const successDialog = page.getByRole("dialog", { name: "Meta creada" });
    const planGoal = successDialog.getByRole("link", { name: /Planificar esta meta/ });
    await planGoal.scrollIntoViewIfNeeded();
    await expect(planGoal).toBeInViewport();

    await page.goto("/app/challenges");
    await page.getByRole("button", { name: "Crear reto personal" }).click();
    const challengeDialog = page.getByRole("dialog", { name: "Crear un reto" });
    const saveChallenge = challengeDialog.getByRole("button", { name: "Guardar reto" });
    await saveChallenge.scrollIntoViewIfNeeded();
    await expect(saveChallenge).toBeInViewport();
  }

  expect(consoleErrors).toEqual([]);
});

test("English mode covers the updated product flows", async ({ page }) => {
  test.setTimeout(90_000);
  await completeOnboarding(page);
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/app/tasks");
  await expect(page.getByText("First, the outcome", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "New task" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Inbox" })).toBeVisible();
  await expect(page.getByText("Primero, el resultado", { exact: true })).toHaveCount(0);

  await page.goto("/app/life-hub");
  await expect(page.getByText("Capture first. Decide later.", { exact: true })).toBeVisible();

  await page.goto("/app/planning?view=week");
  await expect(page.getByText("What comes from the month", { exact: true })).toBeVisible();

  await page.goto("/app/vision?guided=1");
  await expect(page.getByRole("heading", { name: "First, picture the life you want" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dream Life" })).toBeVisible();

  await page.goto("/app/health");
  await expect(page.getByRole("heading", { name: "Before using Nutrition and Training" })).toBeVisible();

  await page.goto("/app/challenges");
  await expect(page.getByText("Curiosity before pressure", { exact: true })).toBeVisible();

  for (const [path, heading] of [
    ["/app/habits", "Habits"],
    ["/app/journal", "My journal"],
    ["/app/finance", "Finances"],
    ["/app/progress", "Your progress"],
    ["/app/settings", "Settings and data"],
    ["/app/goals", "Goals"],
    ["/app/help", "Get unstuck"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
  }
});

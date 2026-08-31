import { expect, test, type Page } from "@playwright/test";

async function completeOnboarding(page: Page, name = "María") {
  await page.goto("/app/dashboard");
  const necessaryCookies = page.getByRole("button", { name: "Solo necesarias" });
  if (await necessaryCookies.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false)) await necessaryCookies.click();
  await expect(page.getByRole("heading", { name: /Una vida más tuya/ })).toBeVisible();
  await page.getByRole("button", { name: /Crear mi espacio/ }).click();
  await page.getByRole("radio", { name: /Diseñar mi mes/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Salud y bienestar" }).click();
  await page.getByRole("button", { name: "Carrera / profesional" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder(/Quiero sentir que mi semana/).fill("Moverme con energía y avanzar mi proyecto con calma.");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("Ej. María").fill(name);
  await page.getByRole("button", { name: /Crear mi espacio/ }).click();
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
  await workoutDialog.getByLabel("Reps").nth(0).fill("12");
  await workoutDialog.getByLabel("Peso kg").nth(0).fill("70");
  await workoutDialog.getByLabel("Reps").nth(1).fill("8");
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
  await page.getByRole("button", { name: "Guardar sesión realizada" }).click();
  await expect(page.getByText("Sesión realizada guardada en tu historial.")).toBeVisible();
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

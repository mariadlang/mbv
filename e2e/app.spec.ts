import { expect, test, type Locator, type Page } from "@playwright/test";

const p1Viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

function signedOutPath(path: string) {
  return `${path}${path.includes("?") ? "&" : "?"}e2e-auth=signed-out`;
}

function formatSpanishAssignmentDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

async function dismissCookieBanner(page: Page) {
  const necessaryCookies = page.getByRole("button", { name: "Solo necesarias" });
  if (await necessaryCookies.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false)) {
    await necessaryCookies.click();
  }
}

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    offenders: [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1;
      })
      .slice(0, 8)
      .map((element) => ({
        className: typeof element.className === "string" ? element.className : "",
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 44),
        width: Math.round(element.getBoundingClientRect().width),
      })),
  }));
  expect(
    layout.scrollWidth,
    `${context}: ${JSON.stringify({ clientWidth: layout.clientWidth, offenders: layout.offenders })}`,
  ).toBeLessThanOrEqual(layout.clientWidth + 1);
}

async function expectVisibleKeyboardFocus(locator: Locator) {
  await expect(locator).toBeFocused();
  const focusStyle = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
  });
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);
}

async function expectMinimumTouchTarget(locator: Locator, label: string) {
  const box = await locator.boundingBox();
  expect(box, `${label} debe estar visible`).not.toBeNull();
  expect(box!.width, `${label} debe medir al menos 44 px de ancho`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${label} debe medir al menos 44 px de alto`).toBeGreaterThanOrEqual(44);
}

async function captureP0Reference(page: Page, fileName: string, ready: Locator, viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport);
  await expect(ready).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `docs/qa/screenshots/p0-${fileName}-${viewport.width}x${viewport.height}.png`,
    animations: "disabled",
    caret: "hide",
    style: "nextjs-portal { display: none !important; }",
  });
}

async function completeOnboarding(page: Page, name = "María", startChoice: RegExp = /Mi día/, stayAtDestination = false, initialPath = "/app/dashboard") {
  await page.goto(initialPath);
  await dismissCookieBanner(page);
  await expect(page.getByRole("heading", { name: /Una vida más tuya/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Crear mi primera acción/ }).click();
  await page.getByRole("radio", { name: startChoice }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Resultado").fill("Preparar una semana con dirección");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Primera acción").fill("Escribir mi primer paso");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: /Todo listo/ })).toBeVisible();
  await page.getByRole("button", { name: /Ver mi primera acción/ }).click();
  await expect(page).toHaveURL(/\/app\/today/);
  await expect(page.getByText("Escribir mi primer paso").first()).toBeVisible();
  if (name !== "María") {
    await page.goto("/app/settings");
    await page.getByLabel("Nombre del perfil").fill(name);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Tus preferencias quedaron guardadas.")).toBeVisible();
  }
  if (stayAtDestination) return;
  await page.goto("/app/dashboard");
  await expect(page.getByRole("heading", { name: new RegExp(`Buenos días, ${name}`) })).toBeVisible();
}

async function authorizeFitnessIfNeeded(page: Page) {
  const authorize = page.getByRole("button", { name: "Autorizar y continuar" });
  if (await authorize.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false)) await authorize.click();
}

test("onboarding creates a real first action and activation journey", async ({ page }) => {
  await completeOnboarding(page);
  await expect(page.getByRole("heading", { name: "Construyamos solo lo necesario" })).toBeVisible();
  await expect(page.getByText("Completar 21K")).toHaveCount(0);
  await page.getByRole("link", { name: "Ir a Mi día" }).click();
  await expect(page.getByText("Escribir mi primer paso").first()).toBeVisible();
  await page.goto("/app/habits");
  await expect(page.getByRole("heading", { name: "Hábitos", exact: true })).toBeVisible();
});

test.fixme("keeps local planner content isolated while switching between two authenticated accounts", async () => {
  // Requires the E2E auth repository to model two independent users in one browser session.
  // Cover: seed an A-only canary, switch to B without a cross-account frame, clear B, then return to A.
});

test("a returning account opens its existing space without repeating onboarding", async ({ page }) => {
  test.setTimeout(60_000);
  await completeOnboarding(page);
  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "Ajustes y datos" })).toBeVisible();

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("my-best-version-planner-v4:e2e-user");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("profiles", "readwrite");
      transaction.objectStore("profiles").clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  await page.getByRole("button", { name: "Cerrar sesión" }).last().click();
  const logoutDialog = page.getByRole("dialog", { name: "¿Quieres cerrar tu sesión?" });
  await logoutDialog.getByRole("button", { name: "Cerrar sesión" }).click();

  await page.getByLabel("Correo").fill("e2e@mybestversion.test");
  await page.getByLabel("Contraseña").fill("prueba-segura-123");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();

  await expect(page).toHaveURL(/\/app\/dashboard/);
  await expect(page.getByRole("heading", { name: /Buenos días, María/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Crear mi espacio/ })).toHaveCount(0);
  await page.goto("/app/today");
  await expect(page.getByText("Escribir mi primer paso").first()).toBeVisible();
});

test("each onboarding starting point creates a first action in Mi día", async ({ browser }) => {
  const choices = [
    /Mi día/,
    /Una meta/,
    /Mi semana/,
    /Un hábito/,
  ];
  for (const choice of choices) {
    const context = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
    const page = await context.newPage();
    await completeOnboarding(page, "María", choice, true);
    await expect(page).toHaveURL(/\/app\/today/);
    await expect(page.getByText("Escribir mi primer paso").first()).toBeVisible();
    await context.close();
  }
});

test("creates and completes a task, then creates and records a habit", async ({ page }) => {
  await completeOnboarding(page);

  await page.goto("/app/tasks");
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  await page.getByLabel("Tarea", { exact: true }).fill("Preparar propuesta beta");
  await page.getByRole("button", { name: "Guardar tarea" }).click();
  const task = page.getByRole("button", { name: "Completar Preparar propuesta beta", exact: true });
  await expect(task).toBeVisible();
  if (test.info().project.name === "mobile") {
    await task.focus();
    await page.keyboard.press("Enter");
  } else {
    await task.click();
  }
  await expect(page.getByRole("button", { name: "Reabrir Preparar propuesta beta", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Completadas" }).click();
  await expect(page.locator(".managed-task__content").filter({ hasText: "Preparar propuesta beta" })).toBeVisible();

  await page.goto("/app/habits");
  await page.getByRole("button", { name: "Crear hábito" }).click();
  await page.getByLabel("Nombre del hábito").fill("Leer con calma");
  const saveHabitButton = page.getByRole("button", { name: "Guardar hábito" });
  if (test.info().project.name === "mobile") {
    await saveHabitButton.focus();
    await page.keyboard.press("Enter");
  } else {
    await saveHabitButton.click();
  }
  const todayHabit = page.locator(".habit-today-row").filter({ hasText: "Leer con calma" });
  await expect(todayHabit).toBeVisible();
  await todayHabit.getByRole("button", { name: "Marcar" }).click();
  await expect(todayHabit.getByText("Completado")).toBeVisible();
  await expect(todayHabit.getByRole("button", { name: "Desmarcar Leer con calma" })).toBeVisible();
  await expect(page.getByText("Mayor continuidad", { exact: true })).toBeVisible();
  await expect(page.getByText("Mejor racha", { exact: true })).toHaveCount(0);
  await expect(page.locator(".habit-not-scheduled").first()).toHaveAccessibleName("No programado");
});

test("habits dashboard records measured progress, edits habits and updates one wellbeing log", async ({ page }) => {
  test.setTimeout(90_000);
  await completeOnboarding(page);
  await page.goto("/app/habits");

  await page.getByRole("button", { name: "Crear hábito", exact: true }).click();
  const createDialog = page.getByRole("dialog", { name: "Crear un hábito" });
  await createDialog.getByLabel("Nombre del hábito").fill("Beber agua con calma");
  for (const day of await createDialog.locator(".day-picker button").all()) {
    if (await day.getAttribute("aria-pressed") === "false") await day.click();
  }
  await createDialog.getByRole("button", { name: /Personalizar/ }).click();
  await createDialog.getByLabel("Tipo de registro").selectOption("quantity");
  await createDialog.getByLabel("Objetivo").fill("8");
  await createDialog.getByLabel("Unidad").fill("vasos");
  await createDialog.getByRole("button", { name: "Guardar hábito" }).click();

  const habitRow = page.locator(".habit-today-row").filter({ hasText: "Beber agua con calma" });
  await expect(habitRow).toBeVisible();
  await habitRow.getByRole("button", { name: "Registrar" }).click();
  let progressDialog = page.getByRole("dialog", { name: "Registrar Beber agua con calma" });
  await progressDialog.getByLabel("Progreso de hoy (vasos)").fill("5");
  await progressDialog.getByRole("button", { name: "Guardar progreso" }).click();
  await expect(habitRow.getByText("5/8 vasos")).toBeVisible();

  await habitRow.getByRole("button", { name: "Registrar" }).click();
  progressDialog = page.getByRole("dialog", { name: "Registrar Beber agua con calma" });
  await progressDialog.getByLabel("Progreso de hoy (vasos)").fill("8");
  await progressDialog.getByRole("button", { name: "Guardar progreso" }).click();
  await expect(habitRow.getByText("Completado")).toBeVisible();

  await habitRow.getByRole("button", { name: "Más opciones para Beber agua con calma" }).click();
  await page.getByRole("menuitem", { name: "Editar hábito" }).click();
  const editDialog = page.getByRole("dialog", { name: "Editar hábito" });
  await editDialog.getByLabel("Nombre del hábito").fill("Beber agua");
  await editDialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator(".habit-today-row").filter({ hasText: "Beber agua" })).toBeVisible();

  const moodCard = page.locator(".habit-mood-panel .today-mood-card");
  await moodCard.getByRole("radio", { name: "Excelente" }).click();
  await moodCard.getByRole("button", { name: "Energía 9 de 10" }).click();
  await moodCard.getByLabel("Nota breve sobre tu estado").fill("Con energía y gratitud.");
  await moodCard.getByRole("button", { name: "Guardar registro" }).click();
  await expect(moodCard.getByText("Registro guardado")).toBeVisible();
  await page.reload();
  await expect(moodCard.getByRole("radio", { name: "Excelente" })).toHaveAttribute("aria-checked", "true");
  await expect(moodCard.getByRole("button", { name: "Energía 9 de 10" })).toHaveAttribute("aria-pressed", "true");
  await expect(moodCard.getByLabel("Nota breve sobre tu estado")).toHaveValue("Con energía y gratitud.");

  const todayMoodCount = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("my-best-version-planner-v4:e2e-user");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const moodLogs = await new Promise<Array<{ date: string }>>((resolve, reject) => {
      const request = database.transaction("moodLogs", "readonly").objectStore("moodLogs").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return moodLogs.filter((log) => log.date === key).length;
  });
  expect(todayMoodCount).toBe(1);
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
  await page.getByRole("button", { name: /Añadir duración y conexiones/ }).click();
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
  await page.getByLabel("Área de vida").selectOption({ label: "Carrera profesional o trabajo" });
  await page.getByRole("button", { name: "Guardar mi visión" }).click();
  await expect(page.getByRole("button", { name: /Carrera profesional o trabajo.*mi proyecto de escritura/i })).toBeVisible();
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

  await page.getByRole("tab", { name: "Ingreso o gasto" }).click();
  await page.getByLabel("Tipo").selectOption("contribution");
  await page.getByLabel("Valor").fill("250000");
  await page.getByLabel("Fondo de ahorro").selectOption({ label: "Fondo de tranquilidad" });
  await page.getByLabel("Nota").fill("Primer aporte");
  await page.getByRole("button", { name: "Guardar movimiento" }).click();
  await expect(page.getByText("Ingreso o gasto guardado. Tu resumen ya está actualizado.")).toBeVisible();
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
  await monthDialog.getByLabel("Resultado concreto del mes").fill("Construir una base serena y sostenible");
  await monthDialog.getByLabel("Acción 1", { exact: true }).fill("Definir el alcance de la primera versión");
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
  await expect(page.getByRole("heading", { name: "Mi espacio", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Captura rápida" }).click();
  await expect(page).toHaveURL(/\/app\/life-hub\?tab=lists$/);
  await expect(page.getByRole("heading", { name: "Bandeja", exact: true })).toBeVisible();
  await page.getByLabel("Nombre").fill("Aprender fotografía");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".brain-inbox-list").getByText("Aprender fotografía")).toBeVisible();
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
  const importDialog = page.getByRole("dialog", { name: "Revisar respaldo antes de importar" });
  if (await importDialog.isVisible()) {
    await expect(importDialog.getByText("Valeria", { exact: true })).toBeVisible();
    await importDialog.getByRole("button", { name: "Importar y reemplazar" }).click();
  }
  await expect(page.getByRole("heading", { name: "Ajustes y datos" })).toBeVisible();
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
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 15_000 });
    if (route === "/app/habits") {
      await expect(page.getByText("Mayor continuidad", { exact: true })).toBeVisible();
      await expect(page.getByText("Mejor racha", { exact: true })).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole("heading", { name: "Hábitos", exact: true })).toBeVisible();
    }
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: /Centro de Privacidad/ })).toBeVisible();

  await page.goto("/app/life-hub?tab=calendar");
  await expect(page).toHaveURL(/\/app\/life-hub\?tab=events$/);
  await expect(page.getByRole("button", { name: "Calendario", exact: true })).toHaveAttribute("aria-current", "page");

  await page.goto("/app/progress#statistics");
  await expect(page.locator("#statistics")).toBeVisible();
});

test("information architecture separates overview from daily execution", async ({ page }) => {
  await completeOnboarding(page);
  const navigation = test.info().project.name === "mobile" ? page.locator(".mobile-nav") : page.locator(".sidebar__nav");
  await expect(navigation.getByRole("link")).toHaveCount(5);
  await expect(navigation).toContainText("Inicio");
  await expect(navigation).toContainText("Mi día");
  await expect(navigation).toContainText("Planificar");
  await expect(navigation).toContainText("Progreso");
  await expect(navigation).toContainText("Mi espacio");
  await expect(navigation).not.toContainText("Bienestar");
  await expect(navigation).not.toContainText("Finanzas");
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Lo más importante" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Próximos eventos" })).toBeVisible();

  if (test.info().project.name === "desktop") {
    const shortcuts = page.locator(".sidebar__space-shortcuts");
    await expect(shortcuts).toContainText("En Mi espacio");
    const wellbeingLink = shortcuts.getByRole("link", { name: /Bienestar/ });
    await wellbeingLink.click();
    await expect(page).toHaveURL(/\/app\/health/);
    await expect(navigation.getByRole("link", { name: "Mi espacio", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(wellbeingLink).not.toHaveAttribute("aria-current");
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);

    const financeLink = shortcuts.getByRole("link", { name: /Finanzas/ });
    await financeLink.click();
    await expect(page).toHaveURL(/\/app\/finance/);
    await expect(navigation.getByRole("link", { name: "Mi espacio", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(financeLink).not.toHaveAttribute("aria-current");
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
  } else {
    await navigation.getByRole("link", { name: "Mi espacio", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Mi espacio", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Bienestar/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Finanzas/ }).first()).toBeVisible();
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
    const drawer = page.locator(".mobile-drawer");
    await expect(drawer.getByRole("link", { name: /Bienestar/ })).toBeVisible();
    await expect(drawer.getByRole("link", { name: /Finanzas/ })).toBeVisible();
    await drawer.getByRole("link", { name: /Bienestar/ }).click();
    await expect(page).toHaveURL(/\/app\/health/);
    await expect(navigation.getByRole("link", { name: "Mi espacio", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
  }

  await navigation.getByRole("link", { name: "Mi día", exact: true }).click();
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

  await page.evaluate(() => {
    document.body.style.minHeight = "3000px";
    window.scrollTo(0, 900);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const primaryNavigation = test.info().project.name === "mobile" ? page.locator(".mobile-nav") : page.locator(".sidebar__nav");
  await primaryNavigation.getByRole("link", { name: "Mi día", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
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
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Política de Privacidad de My Best Version" })).toBeVisible();
  const googleCalendarPrivacy = page.locator("#google-calendar");
  await expect(googleCalendarPrivacy).toContainText("Uso Limitado");
  await expect(googleCalendarPrivacy.getByRole("link", { name: /Política de Datos del Usuario/ })).toHaveAttribute("href", "https://developers.google.com/terms/api-services-user-data-policy");
  await expect(page.getByRole("link", { name: "exportar, desconectar o eliminar tus datos" })).toHaveAttribute("href", "/data-deletion");
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Términos y Condiciones" })).toBeVisible();
  await page.goto("/pqr");
  await expect(page.getByRole("heading", { name: "Peticiones, quejas y reclamos" })).toBeVisible();
});

test("privacy and crawler resources are server-readable", async ({ request }) => {
  const privacy = await request.get("/privacy");
  expect(privacy.status()).toBe(200);
  expect(privacy.headers()["content-type"]).toContain("text/html");

  const privacyHtml = await privacy.text();
  expect(privacyHtml).toContain("Política de Privacidad de My Best Version");
  expect(privacyHtml).toContain("Google Calendar");
  expect(privacyHtml).toContain("Uso Limitado");
  expect(privacyHtml).toContain("/data-deletion");
  expect(privacyHtml).toContain("https://mybestversion.life/privacy");
  expect(privacyHtml).toContain("https://developers.google.com/terms/api-services-user-data-policy");
  expect(privacyHtml).not.toContain("Documento en preparación");

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(robots.headers()["content-type"]).toContain("text/plain");
  expect(await robots.text()).toContain("Sitemap: https://mybestversion.life/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toMatch(/xml/);
  const sitemapXml = await sitemap.text();
  expect(sitemapXml).toContain("<loc>https://mybestversion.life/privacy</loc>");
  expect(sitemapXml).toContain("<loc>https://mybestversion.life/data-deletion</loc>");
});

test("Google Calendar stays unavailable while the integration is paused", async ({ request }) => {
  const status = await request.get("/api/integrations/google-calendar/status");
  expect(status.status()).toBe(404);
  await expect(status.json()).resolves.toEqual({ error: "CALENDAR_DISABLED" });

  const connect = await request.post("/api/integrations/google-calendar/connect", { data: {} });
  expect(connect.status()).toBe(404);
  await expect(connect.json()).resolves.toEqual({ error: "CALENDAR_DISABLED" });

  const webhook = await request.post("/api/integrations/google-calendar/webhook");
  expect(webhook.status()).toBe(204);
});

test("creates a gentle challenge and records today", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/challenges");
  await expect(page).toHaveURL(/\/app\/life-hub\?tab=challenges$/);
  await expect(page.getByRole("heading", { name: "Organiza a tu manera" })).toBeVisible();
  await page.getByRole("button", { name: "Elegir este reto" }).first().click();
  await page.getByLabel("Nombre del reto").fill("Dar un paso valiente");
  await page.getByRole("button", { name: "Guardar reto" }).click();
  await expect(page.getByRole("heading", { name: "Dar un paso valiente" })).toBeVisible();
  await page.getByRole("button", { name: "Registrar hoy" }).click();
  await expect(page.getByRole("button", { name: "Quitar registro de hoy" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Pausar" }).click();
  await expect(page.getByRole("heading", { name: "Retos en pausa" })).toBeVisible();
  await page.getByRole("button", { name: "Retomar" }).click();
  await expect(page.getByRole("heading", { name: "Dar un paso valiente" })).toBeVisible();
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

test("Mi día keeps the visual wellbeing check-in and its saved state", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/today");

  const moodCard = page.locator(".today-mood-card");
  await expect(moodCard.getByRole("heading", { name: "Mi estado hoy" })).toBeVisible();
  await expect(moodCard.getByText("Tu bienestar importa")).toBeVisible();
  await expect(moodCard.getByRole("radio")).toHaveCount(5);
  await expect(moodCard.getByRole("radio", { name: "Equilibrada" })).toHaveAttribute("aria-checked", "true");
  await expect(moodCard.getByRole("button", { name: "Energía 6 de 10" })).toHaveAttribute("aria-pressed", "true");

  const balancedMood = moodCard.getByRole("radio", { name: "Equilibrada" });
  await balancedMood.focus();
  await page.keyboard.press("ArrowRight");
  await expect(moodCard.getByRole("radio", { name: "Buena" })).toBeFocused();
  await expect(moodCard.getByRole("radio", { name: "Buena" })).toHaveAttribute("aria-checked", "true");
  await moodCard.getByRole("button", { name: "Energía 8 de 10" }).click();
  await moodCard.getByLabel("Nota breve sobre tu estado").fill("Hoy avanzo con calma.");
  await moodCard.getByRole("button", { name: "Guardar nota de bienestar" }).click();
  await page.reload();

  await expect(moodCard.getByRole("radio", { name: "Buena" })).toHaveAttribute("aria-checked", "true");
  await expect(moodCard.getByRole("button", { name: "Energía 8 de 10" })).toHaveAttribute("aria-pressed", "true");
  await expect(moodCard.getByLabel("Nota breve sobre tu estado")).toHaveValue("Hoy avanzo con calma.");
});

test("daily close updates one journal entry instead of creating duplicates", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/today");

  await page.getByLabel("¿Qué avancé hoy?").fill("Terminé la primera versión de una tarea importante.");
  await page.getByLabel("¿Qué quiero recordar de hoy?").fill("Avanzar con calma también cuenta.");
  await page.getByRole("button", { name: "Guardar mi cierre del día" }).click();
  await expect(page.getByText("Tu cierre quedó guardado en Mi diario.")).toBeVisible();

  await page.getByLabel("¿Qué avancé hoy?").fill("Terminé y revisé una tarea importante.");
  await page.getByRole("button", { name: "Actualizar mi cierre" }).click();
  await expect(page.getByText("Tu cierre quedó guardado en Mi diario.")).toBeVisible();

  await page.goto("/app/journal");
  const dailyCloseEntries = page.locator(".journal-entry").filter({ hasText: "Cierre del día" });
  await expect(dailyCloseEntries).toHaveCount(1);
  await expect(dailyCloseEntries).toContainText("Terminé y revisé una tarea importante.");
});

test("tasks stay date-only while calendar events support times and all-day mode", async ({ page }) => {
  test.setTimeout(90_000);
  const googleCalendarRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/integrations/google-calendar/")) googleCalendarRequests.push(request.url());
  });
  await completeOnboarding(page);

  await page.goto("/app/tasks");
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const taskForm = page.locator(".advanced-task-form");
  await expect(taskForm.locator('input[type="date"]')).toHaveCount(1);
  await expect(taskForm.locator('input[type="time"]')).toHaveCount(0);

  await page.goto("/app/planning?view=day");
  await expect(page.locator(".daily-date-plan").locator('input[type="date"]')).toHaveCount(1);
  await expect(page.locator(".daily-date-plan").locator('input[type="time"]')).toHaveCount(0);

  await page.goto("/app/life-hub?tab=events");
  const calendarForm = page.locator(".calendar-event-manager form");
  const calendarAllDay = calendarForm.getByRole("checkbox", { name: "Todo el día" });
  await expect(calendarForm.locator('input[type="time"]')).toHaveCount(2);
  await expect(calendarAllDay).not.toBeChecked();
  await calendarAllDay.check();
  await expect(calendarForm.locator('input[type="time"]')).toHaveCount(0);
  await calendarAllDay.uncheck();
  await expect(calendarForm.locator('input[type="time"]')).toHaveCount(2);

  await page.goto("/app/today");
  await page.locator(".today-timeline-add-menu").getByRole("button", { name: "Evento" }).click();
  const todayEventForm = page.locator(".day-inline-composer");
  const todayAllDay = todayEventForm.getByRole("checkbox", { name: "Todo el día" });
  await expect(todayAllDay).toBeChecked();
  await expect(todayEventForm.locator('input[type="time"]')).toHaveCount(0);
  await todayAllDay.uncheck();
  await expect(todayEventForm.locator('input[type="time"]')).toHaveCount(2);
  await todayAllDay.check();
  await expect(todayEventForm.locator('input[type="time"]')).toHaveCount(0);

  await page.goto("/app/settings");
  const calendarIntegration = page.locator(".google-calendar-integration");
  await expect(calendarIntegration).toHaveCount(0);

  await page.goto("/app/settings?calendar=error&reason=access_denied#integrations");
  await expect(calendarIntegration).toHaveCount(0);
  expect(googleCalendarRequests).toEqual([]);

  await page.goto("/app/today");
  await page.locator(".today-timeline-add-menu").getByRole("button", { name: "Hábito" }).click();
  const habitForm = page.locator(".day-inline-composer");
  await expect(habitForm.getByRole("button", { name: "Solo hoy" })).toHaveAttribute("aria-pressed", "true");
  await habitForm.getByPlaceholder("Nombre de hábito").fill("Estirar con calma");
  await habitForm.getByRole("button", { name: /Guardar en Mi día/ }).click();
  await expect(page.getByText("Estirar con calma", { exact: true })).toHaveCount(1);
  await page.getByLabel("Editar Estirar con calma").click();
  await page.locator(".day-inline-composer").getByRole("button", { name: "Todos los días" }).click();
  await page.locator(".day-inline-composer").getByRole("button", { name: /Guardar en Mi día/ }).click();
  await expect(page.getByText("Estirar con calma", { exact: true })).toHaveCount(1);

  await page.goto("/app/help");
  await page.getByRole("button", { name: /Aplicar/ }).first().click();
  const toolkit = page.locator(".toolkit-form");
  await toolkit.locator("textarea").fill("Preparar una salida en bicicleta");
  await toolkit.getByLabel("¿Dónde quieres dejarlo?").selectOption("later");
  await toolkit.getByRole("button", { name: "Aplicar al planner" }).click();
  await page.goto("/app/life-hub?tab=lists");
  await page.getByLabel("Editar Preparar una salida en bicicleta").click();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  await page.getByRole("button", { name: "Mes", exact: true }).click();
  await page.getByLabel("Mes para Preparar una salida en bicicleta").fill(nextMonthKey);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.reload();
  await expect(page.getByText(`Mes: ${nextMonthKey}`, { exact: false })).toBeVisible();

  const readMatchingTaskIds = () => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("my-best-version-planner-v4:e2e-user");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tasks = await new Promise<Array<{ id: string; title: string }>>((resolve, reject) => {
      const request = database.transaction("tasks", "readonly").objectStore("tasks").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return tasks.filter((task) => task.title === "Preparar una salida en bicicleta").map((task) => task.id);
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.getByLabel("Convertir Preparar una salida en bicicleta en acción").click();
    await page.getByRole("button", { name: "Confirmar destino" }).click();
  }
  expect(await readMatchingTaskIds()).toHaveLength(1);
  await expect(page.getByText(/Convertido en Mi día/)).toBeVisible();
});

test("a calendar event stays consistent across Mi espacio, Semana and Mi día", async ({ page }) => {
  test.setTimeout(180_000);
  await page.clock.setFixedTime(new Date("2026-09-11T12:00:00-05:00"));
  await completeOnboarding(page);
  const dates = await page.evaluate(() => {
    const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: key(start), end: key(end) };
  });

  await page.goto("/app/life-hub?tab=events");
  const manager = page.locator(".calendar-event-manager");
  const form = manager.locator("form");
  await form.getByLabel("Evento", { exact: true }).fill("Revisión de calendario");
  await form.getByLabel("Fecha", { exact: true }).fill(dates.start);
  await form.getByLabel("Fecha final", { exact: true }).fill(dates.end);
  await form.getByLabel("Hora inicial", { exact: true }).fill("23:00");
  await form.getByLabel("Hora final", { exact: true }).fill("01:00");
  await form.locator("select").first().selectOption("work");
  await form.getByRole("button", { name: "Guardar evento", exact: true }).click();
  await expect(manager.getByText("Revisión de calendario", { exact: true })).toHaveCount(1);

  await page.goto("/app/planning/weekly");
  await expect(page.getByText("Revisión de calendario", { exact: true })).toHaveCount(2);

  await page.goto("/app/today");
  await expect(page.getByText("Revisión de calendario", { exact: true })).toBeVisible();
  await page.getByLabel("Editar Revisión de calendario", { exact: true }).click();
  const todayForm = page.locator(".day-inline-composer");
  await todayForm.getByLabel("Nombre", { exact: true }).fill("Revisión actualizada");
  await todayForm.getByRole("button", { name: "Guardar en Mi día", exact: true }).click();
  await expect(page.getByText("Revisión actualizada", { exact: true })).toBeVisible();

  const stored = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("my-best-version-planner-v4:e2e-user");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("events", "readonly");
    const events = await new Promise<Array<{ title: string; startDate: string; endDate?: string; category: string }>>((resolve, reject) => {
      const request = transaction.objectStore("events").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return events.find((event) => event.title === "Revisión actualizada");
  });
  expect(stored).toMatchObject({ startDate: dates.start, endDate: dates.end, category: "work" });

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("my-best-version-planner-v4:e2e-user");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("events", "readwrite");
    const store = transaction.objectStore("events");
    const events = await new Promise<Array<{ id: string; title: string; timezone?: string }>>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const saved = events.find((event) => event.title === "Revisión actualizada");
    if (!saved) throw new Error("Expected calendar event");
    store.put({ ...saved, timezone: "Pacific/Honolulu" });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });

  await page.goto("/app/life-hub?tab=events");
  const eventRow = page.locator(".calendar-event-list-item").filter({ hasText: "Revisión actualizada" });
  await eventRow.getByLabel("Editar Revisión actualizada", { exact: true }).click();
  await page.locator(".calendar-event-manager form").getByRole("button", { name: "Guardar evento", exact: true }).click();
  const preservedTimezone = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("my-best-version-planner-v4:e2e-user");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const events = await new Promise<Array<{ title: string; timezone?: string }>>((resolve, reject) => {
      const request = database.transaction("events", "readonly").objectStore("events").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return events.find((event) => event.title === "Revisión actualizada")?.timezone;
  });
  expect(preservedTimezone).toBe("Pacific/Honolulu");
  page.once("dialog", (dialog) => dialog.accept());
  await eventRow.getByRole("button", { name: "Eliminar evento", exact: true }).click();
  await expect(eventRow).toHaveCount(0);
});

test("weekly plan option B creates, assigns and preserves the same task across Mi día", async ({ page }) => {
  test.setTimeout(90_000);
  await completeOnboarding(page);
  await page.goto("/app/planning/weekly");

  await expect(page.locator(".weekly-day-group")).toHaveCount(7);
  await expect(page.getByRole("heading", { name: "Pendientes sin fecha" })).toBeVisible();

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayGroup = page.locator(`#weekly-day-${todayKey}`);
  await todayGroup.getByRole("button", { name: "Añadir", exact: true }).click();
  await todayGroup.getByRole("button", { name: "Tarea", exact: true }).click();
  await todayGroup.getByPlaceholder("Título de la tarea").fill("Tarea semanal de prueba");
  await todayGroup.getByRole("button", { name: "Guardar" }).click();
  await expect(todayGroup.getByText("Tarea semanal de prueba", { exact: true })).toBeVisible();

  await todayGroup.getByRole("button", { name: "Marcar prioridad: Tarea semanal de prueba" }).click();
  await expect(page.locator(".weekly-priority-chips").getByRole("button", { name: /Tarea semanal de prueba/ })).toBeVisible();

  await page.getByLabel("Añadir pendiente sin fecha").fill("Pendiente semanal de prueba");
  await page.getByRole("button", { name: "Guardar pendiente" }).click();
  let pending = page.locator(".weekly-pending-task").filter({ hasText: "Pendiente semanal de prueba" });
  await expect(pending).toBeVisible();
  await pending.getByText("Asignar día", { exact: true }).click();
  const todayAssignmentName = `Asignar Pendiente semanal de prueba al ${formatSpanishAssignmentDate(now)}`;
  await pending.getByRole("button", { name: todayAssignmentName }).click();
  await expect(pending).toHaveCount(0);

  let scheduled = todayGroup.locator(".weekly-task-row").filter({ hasText: "Pendiente semanal de prueba" });
  await expect(scheduled).toBeVisible();
  await scheduled.getByText("Cambiar día", { exact: true }).click();
  await scheduled.getByRole("button", { name: "Quitar fecha" }).click();
  pending = page.locator(".weekly-pending-task").filter({ hasText: "Pendiente semanal de prueba" });
  await expect(pending).toBeVisible();
  await pending.getByText("Asignar día", { exact: true }).click();
  await pending.getByRole("button", { name: todayAssignmentName }).click();

  await page.goto("/app/today");
  await expect(page.getByText("Pendiente semanal de prueba", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Completar Pendiente semanal de prueba").click();

  await page.goto("/app/planning/weekly");
  scheduled = page.locator(".weekly-task-row").filter({ hasText: "Pendiente semanal de prueba" });
  await expect(scheduled).toHaveClass(/is-complete/);
  await page.reload();
  await expect(page.locator(".weekly-task-row").filter({ hasText: "Pendiente semanal de prueba" })).toHaveClass(/is-complete/);

  const matchingTasks = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("my-best-version-planner-v4:e2e-user");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tasks = await new Promise<Array<{ id: string; title: string }>>((resolve, reject) => {
      const request = database.transaction("tasks", "readonly").objectStore("tasks").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return tasks.filter((task) => task.title === "Pendiente semanal de prueba").map((task) => task.id);
  });
  expect(matchingTasks).toHaveLength(1);
});

test("weekly recap uses evidence only through today and prepares the following week", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/app/planning/weekly");

  const range = page.locator(".weekly-period-navigation strong");
  const currentRange = await range.textContent();
  const reviewButton = page.getByRole("button", { name: "Revisión semanal" });
  await expect(reviewButton).toBeEnabled();
  await reviewButton.click();

  const dialog = page.getByRole("dialog", { name: "Revisión semanal" });
  await expect(dialog.getByText("Lo que realmente ocurrió")).toBeVisible();
  await expect(dialog.getByText("Metas con avance", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Hitos completados", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Acciones reprogramadas", { exact: true })).toBeVisible();
  const reviewedDays = ((new Date().getDay() + 6) % 7) + 1;
  await expect(dialog.getByText(`Evidencia disponible hasta hoy: ${reviewedDays} días de esta semana.`)).toBeVisible();

  await dialog.getByLabel("¿Qué sí avanzó?").fill("Mi primera acción quedó visible.");
  await dialog.getByLabel("¿Qué quieres conservar tal como está?").fill("Una prioridad clara.");
  await dialog.getByLabel("¿Qué quieres mover o cambiar?").fill("Mover un pendiente.");
  await dialog.getByLabel("¿Qué ya no importa?").fill("Soltar sin borrar.");
  await dialog.getByRole("button", { name: "Preparar mi semana" }).click();

  await expect(dialog).toHaveCount(0);
  await expect.poll(() => range.textContent()).not.toBe(currentRange);
  await expect(page.getByRole("button", { name: "Esta semana" })).toBeEnabled();
  await expect(reviewButton).toBeDisabled();
  await expect(reviewButton).toHaveAttribute("title", "Podrás revisar esta semana cuando haya comenzado.");
});

test("return experience is detected globally and leaves an open action without deleting it", async ({ page }) => {
  await completeOnboarding(page);
  await page.evaluate(() => {
    const lastSeenAt = new Date(Date.now() - 4 * 86_400_000).toISOString();
    localStorage.setItem("mbv-return-experience-v1:e2e-user", JSON.stringify({ lastSeenAt }));
    sessionStorage.removeItem("mbv-return-session-v1:e2e-user");
  });
  await page.goto("/app/today");
  await expect(page.getByRole("heading", { name: /Buenos días, María/ })).toBeVisible();
  await page.goto("/app/dashboard");

  const card = page.getByRole("region", { name: "Retoma con una sola decisión" });
  await expect(card).toBeVisible();
  await expect(card.getByText("Escribir mi primer paso", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Dejar atrás" }).click();
  await expect(card.getByText("La acción seguirá guardada como cancelada; no se borrará.")).toBeVisible();
  await card.getByRole("button", { name: "Sí, dejar atrás" }).click();
  await expect(card).toHaveCount(0);

  const storedTask = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("my-best-version-planner-v4:e2e-user");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tasks = await new Promise<Array<{ title: string; status: string }>>((resolve, reject) => {
      const request = database.transaction("tasks", "readonly").objectStore("tasks").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return tasks.find((task) => task.title === "Escribir mi primer paso") ?? null;
  });
  expect(storedTask).toMatchObject({ title: "Escribir mi primer paso", status: "cancelled" });
});

test("[P2-A] share cards keep private text out and export every supported format", async ({ page }) => {
  test.setTimeout(120_000);
  await completeOnboarding(page);
  await page.goto("/app/today");
  await page.getByLabel("Completar Escribir mi primer paso").click();

  await page.goto("/app/progress");
  await page.getByRole("button", { name: "Crear tarjeta", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Crea tu tarjeta de progreso" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radio", { name: "Mi semana" })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: "Mis hábitos" })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: "Mi progreso" })).toBeVisible();
  await expect(dialog).toContainText("Privacidad por diseño");
  await expect(dialog).not.toContainText("Escribir mi primer paso");

  const canvas = dialog.getByRole("img", { name: /Vista previa de la tarjeta de progreso/ });
  const formats = [
    { name: "Story", width: 1080, height: 1920 },
    { name: "Feed vertical", width: 1080, height: 1350 },
    { name: "Cuadrada", width: 1080, height: 1080 },
  ] as const;

  for (const format of formats) {
    await dialog.getByRole("radio", { name: format.name, exact: true }).check();
    await expect.poll(() => canvas.evaluate((element) => ({
      width: (element as HTMLCanvasElement).width,
      height: (element as HTMLCanvasElement).height,
    }))).toEqual({ width: format.width, height: format.height });
  }

  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descargar PNG", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("my-best-version-progreso-square.png");
  await expect(dialog.getByRole("status")).toContainText("La tarjeta se descargó en PNG.");
});

test("[P2-A] referrals stay opaque, support copy fallback and record a consented referral visit during signup", async ({ page }) => {
  test.setTimeout(120_000);
  await completeOnboarding(page);
  await page.goto("/app/today");
  await page.getByLabel("Completar Escribir mi primer paso").click();
  await page.goto("/app/progress");

  const referral = page.locator(".referral-prompt");
  await referral.getByRole("button", { name: "Crear enlace de invitación", exact: true }).click();
  const linkInput = referral.getByLabel("Tu enlace de invitación");
  const invitationLink = await linkInput.inputValue();
  const invitationUrl = new URL(invitationLink);
  const referralCode = invitationUrl.searchParams.get("ref");
  expect(invitationUrl.origin + invitationUrl.pathname).toBe("https://mybestversion.life/signup");
  expect([...invitationUrl.searchParams.keys()]).toEqual(["ref"]);
  expect(referralCode).toMatch(/^ref_[a-f0-9]{32,64}$/);
  expect(invitationLink).not.toContain("e2e-user");
  expect(invitationLink).not.toContain("e2e%40mybestversion.test");

  await page.evaluate(() => {
    const copied: string[] = [];
    (window as unknown as { __mbvCopiedLinks: string[] }).__mbvCopiedLinks = copied;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (value: string) => { copied.push(value); } },
    });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });

  await referral.getByRole("button", { name: "Copiar enlace", exact: true }).click();
  await expect(referral.getByRole("status")).toHaveText("El enlace quedó copiado.");
  await referral.getByRole("button", { name: "Compartir enlace", exact: true }).click();
  await expect(referral.getByRole("status")).toHaveText("No se abrió el menú para compartir; copiamos el enlace.");
  expect(await page.evaluate(() => (window as unknown as { __mbvCopiedLinks: string[] }).__mbvCopiedLinks)).toEqual([
    invitationLink,
    invitationLink,
  ]);

  await page.reload();
  const reloadedReferral = page.locator(".referral-prompt");
  await reloadedReferral.getByRole("button", { name: "Crear enlace de invitación", exact: true }).click();
  await expect(reloadedReferral.getByLabel("Tu enlace de invitación")).toHaveValue(invitationLink);

  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("mbv-legal-privacy-v1") ?? "{}") as Record<string, unknown>;
    state.cookies = {
      version: "2026-09-11.co-2",
      essential: true,
      functional: true,
      analytics: true,
      marketing: false,
      decidedAt: new Date().toISOString(),
    };
    localStorage.setItem("mbv-legal-privacy-v1", JSON.stringify(state));
  });

  const eventBodies: Array<{ eventName?: string; metadata?: Record<string, string> }> = [];
  await page.route("**/api/events", async (route) => {
    if (route.request().method() === "POST") {
      eventBodies.push(route.request().postDataJSON() as { eventName?: string; metadata?: Record<string, string> });
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto(signedOutPath(`/signup?ref=${encodeURIComponent(referralCode!)}`));
  await expect(page.getByRole("heading", { name: "Empieza una vida más tuya.", exact: true })).toBeVisible();
  await page.getByLabel("Nombre").fill("Invitada E2E");
  await page.getByLabel("Correo").fill("invitada@example.com");
  await page.getByLabel("Contraseña").fill("prueba-segura-123");
  const requiredConsents = page.locator(".signup-consents input[type='checkbox']");
  await requiredConsents.nth(0).check();
  await requiredConsents.nth(1).check();
  await requiredConsents.nth(2).check();
  await page.locator(".auth-card form").getByRole("button", { name: "Crear mi cuenta", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);

  await expect.poll(() => eventBodies.find((body) => body.eventName === "referral_visit_recorded") ?? null).toMatchObject({
    eventName: "referral_visit_recorded",
    metadata: { source: "referral_link", referral_id: referralCode, version: "2" },
  });
  expect(JSON.stringify(eventBodies.find((body) => body.eventName === "referral_visit_recorded"))).not.toContain("invitada@example.com");
  expect(await page.evaluate(() => localStorage.getItem("mbv-referral-attribution-v1"))).toBeNull();
});

test("[P2-A] Premium appears only at the relevant limitation and never interrupts navigation", async ({ page }) => {
  test.setTimeout(90_000);
  await completeOnboarding(page, "María", /Mi día/, false, "/app/dashboard?e2e-access=trial");
  await page.goto("/app/planning");

  await expect(page.getByRole("heading", { name: "Planificación", exact: true })).toBeVisible();
  const contextualGate = page.locator(".premium-gate");
  await expect(contextualGate).toHaveCount(1);
  await expect(contextualGate.getByRole("heading", { name: "Planificación a 5 años", exact: true })).toBeVisible();
  await expect(contextualGate).toContainText("No necesitas este horizonte para empezar. Premium lo abre cuando quieras planificar más allá de los próximos meses.");
  await expect(contextualGate.getByRole("link", { name: "Desbloquear Premium", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mis prioridades a 3 años", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  for (const path of ["/app/today", "/app/dashboard"] as const) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
    await expect(page.locator(".premium-gate")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

  await page.goto("/app/planning");
  await expect(page.locator(".premium-gate")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".premium-gate")).toHaveCount(1);
  await page.locator(".premium-gate").getByRole("link", { name: "Desbloquear Premium", exact: true }).click();
  await expect(page).toHaveURL(/\/upgrade$/);
});

test("[P2-QA] growth surfaces reflow in every required viewport and color mode", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "A single browser covers the complete viewport matrix.");
  test.setTimeout(900_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const captureP2Screenshots = process.env.MBV_CAPTURE_P2_SCREENSHOTS === "1";
  const viewports = [
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ];
  const locales = [
    {
      key: "es",
      light: "Claro",
      dark: "Oscuro",
      createCard: "Crear tarjeta",
      createReferral: "Crear enlace de invitación",
      shareDialog: "Crea tu tarjeta de progreso",
      weeklyReview: "Revisión semanal",
      weeklyEvidence: "Lo que realmente ocurrió",
      returnRegion: "Retoma con una sola decisión",
      close: "Cerrar",
    },
    {
      key: "en",
      light: "Light",
      dark: "Dark",
      createCard: "Create card",
      createReferral: "Create invitation link",
      shareDialog: "Create your progress card",
      weeklyReview: "Weekly review",
      weeklyEvidence: "What actually happened",
      returnRegion: "Come back with one decision",
      close: "Close",
    },
  ] as const;

  await completeOnboarding(page, "María", /Mi día/, false, "/app/dashboard?e2e-access=trial");
  await page.goto("/app/today");
  await page.getByLabel("Completar Escribir mi primer paso").click();

  for (const locale of locales) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/app/settings");
    if (locale.key === "en") {
      await page.getByRole("button", { name: "Inglés, Beta", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    }

    for (const colorMode of ["light", "dark"] as const) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/app/settings");
      const modeControl = page.locator(".color-mode-setting").getByRole("button", {
        name: colorMode === "dark" ? locale.dark : locale.light,
        exact: true,
      });
      if (await modeControl.getAttribute("aria-pressed") !== "true") await modeControl.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", colorMode);

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);

        await page.goto("/app/progress");
        await expect(page.getByRole("button", { name: locale.createCard, exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: locale.createReferral, exact: true })).toBeVisible();
        await expectNoHorizontalOverflow(page, `P2 progress ${locale.key} ${colorMode} ${viewport.width}x${viewport.height}`);
        await page.getByRole("button", { name: locale.createCard, exact: true }).click();
        const shareDialog = page.getByRole("dialog", { name: locale.shareDialog });
        await expect(shareDialog).toBeVisible();
        await expectNoHorizontalOverflow(page, `P2 share preview ${locale.key} ${colorMode} ${viewport.width}x${viewport.height}`);
        if (captureP2Screenshots && locale.key === "es" && colorMode === "light" && viewport.width === 390) {
          await page.screenshot({ path: "docs/qa/screenshots/p2-share-390x844-light.png" });
        }
        await shareDialog.getByRole("button", { name: locale.close, exact: true }).click();

        await page.goto("/app/planning/weekly");
        await page.getByRole("button", { name: locale.weeklyReview, exact: true }).click();
        const recapDialog = page.getByRole("dialog", { name: locale.weeklyReview });
        await expect(recapDialog.getByText(locale.weeklyEvidence)).toBeVisible();
        await expectNoHorizontalOverflow(page, `P2 weekly recap ${locale.key} ${colorMode} ${viewport.width}x${viewport.height}`);
        if (captureP2Screenshots && locale.key === "es" && colorMode === "dark" && viewport.width === 1440) {
          await page.screenshot({ path: "docs/qa/screenshots/p2-recap-1440x900-dark.png" });
        }
        await recapDialog.getByRole("button", { name: locale.close, exact: true }).click();

        await page.evaluate(() => {
          localStorage.setItem("mbv-return-experience-v1:e2e-user", JSON.stringify({ lastSeenAt: new Date(Date.now() - 4 * 86_400_000).toISOString() }));
          sessionStorage.removeItem("mbv-return-session-v1:e2e-user");
        });
        await page.goto("/app/dashboard");
        await expect(page.getByRole("region", { name: locale.returnRegion })).toBeVisible();
        await expectNoHorizontalOverflow(page, `P2 return ${locale.key} ${colorMode} ${viewport.width}x${viewport.height}`);
        if (captureP2Screenshots && locale.key === "es" && colorMode === "light" && viewport.width === 430) {
          await page.screenshot({ path: "docs/qa/screenshots/p2-return-430x932-light.png" });
        }

        await page.goto("/app/planning");
        await expect(page.locator(".premium-gate")).toHaveCount(1);
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expectNoHorizontalOverflow(page, `P2 premium ${locale.key} ${colorMode} ${viewport.width}x${viewport.height}`);
        if (captureP2Screenshots && locale.key === "es" && colorMode === "dark" && viewport.width === 1366) {
          await page.screenshot({ path: "docs/qa/screenshots/p2-premium-1366x768-dark.png" });
        }
      }
    }
  }

  expect(runtimeErrors).toEqual([]);
});

test("weekly plan option B remains legible across its responsive matrix", async ({ page }) => {
  await completeOnboarding(page);
  const viewports = [
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
    { width: 1488, height: 992 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/app/planning/weekly");
    await expect(page.locator(".weekly-day-group")).toHaveCount(7);
    await expect(page.getByRole("heading", { name: "Plan semanal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pendientes sin fecha" })).toBeVisible();
    const metrics = await page.evaluate(() => {
      const layout = document.querySelector<HTMLElement>(".weekly-plan-layout")!;
      const week = document.querySelector<HTMLElement>(".weekly-days-panel")!;
      const pending = document.querySelector<HTMLElement>(".weekly-pending-panel")!;
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        columns: getComputedStyle(layout).gridTemplateColumns,
        weekTop: Math.round(week.getBoundingClientRect().top),
        pendingTop: Math.round(pending.getBoundingClientRect().top),
      };
    });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    if (viewport.width > 920) {
      expect(metrics.columns.split(" ").length).toBeGreaterThan(1);
      expect(Math.abs(metrics.weekTop - metrics.pendingTop)).toBeLessThanOrEqual(1);
    } else {
      expect(metrics.pendingTop).toBeGreaterThan(metrics.weekTop);
      const toggle = page.getByRole("button", { name: "Ocultar pendientes sin fecha" });
      await toggle.click();
      await expect(page.locator("#weekly-pending-content")).toBeHidden();
      await page.getByRole("button", { name: "Mostrar pendientes sin fecha" }).click();
      await expect(page.locator("#weekly-pending-content")).toBeVisible();
    }
  }
});

test("P1 public routes remain clear across the required visual matrix", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "This test already covers every required viewport.");
  test.setTimeout(600_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const screens = [
    { path: "/", ready: () => page.getByRole("heading", { name: "Tu vida completa, organizada con claridad y sin culpa.", exact: true }) },
    { path: "/trial", ready: () => page.getByRole("heading", { name: "Explora lo esencial para convertir tu visión en acciones posibles.", exact: true }) },
    { path: "/signup", ready: () => page.getByRole("heading", { name: "Empieza una vida más tuya.", exact: true }) },
    { path: "/login", ready: () => page.getByRole("heading", { name: "Vuelve a tu planner.", exact: true }) },
    { path: "/verify-email", ready: () => page.getByRole("heading", { name: "Revisa tu correo.", exact: true }) },
    { path: "/forgot-password", ready: () => page.getByRole("heading", { name: "Recupera tu acceso.", exact: true }) },
    { path: "/upgrade", ready: () => page.getByRole("heading", { name: "Amplía tu horizonte cuando estés lista.", exact: true }) },
    { path: "/privacy", ready: () => page.getByRole("heading", { name: "Política de Privacidad de My Best Version", exact: true }) },
    { path: "/terms", ready: () => page.getByRole("heading", { name: "Términos y Condiciones", exact: true }) },
    { path: "/legal", ready: () => page.getByRole("heading", { name: "Centro Legal y de Privacidad", exact: true }) },
  ];

  for (const viewport of p1Viewports) {
    await page.setViewportSize(viewport);
    for (const screen of screens) {
      await page.goto(signedOutPath(screen.path));
      await dismissCookieBanner(page);
      await expect(screen.ready()).toBeVisible();
      await expectNoHorizontalOverflow(page, `${screen.path} at ${viewport.width}x${viewport.height}`);

      if (screen.path === "/") {
        await expect(page.getByRole("link", { name: "Comienza tu prueba gratis", exact: true })).toHaveCount(3);
        await expect(page.locator(".marketing-header").getByRole("link", { name: "Comienza tu prueba gratis", exact: true })).toBeVisible();
      }
      if (screen.path === "/trial") await expect(page.getByRole("link", { name: "Comienza tu prueba gratis", exact: true })).toBeVisible();
      if (screen.path === "/signup") await expect(page.locator(".auth-card form").getByRole("button", { name: "Crear mi cuenta", exact: true })).toBeVisible();
      if (screen.path === "/login") await expect(page.locator(".auth-card form").getByRole("button", { name: "Iniciar sesión", exact: true })).toBeVisible();
      if (screen.path === "/verify-email") await expect(page.getByRole("link", { name: "Ir a verificar mi correo", exact: true })).toBeVisible();
      if (screen.path === "/forgot-password") await expect(page.getByRole("link", { name: "Volver a mi espacio", exact: true })).toBeVisible();
      if (screen.path === "/upgrade") await expect(page.getByRole("link", { name: "Continuar en Mercado Pago", exact: true })).toBeVisible();
    }
  }

  expect(runtimeErrors).toEqual([]);
});

test("P1 product routes remain usable across the required visual matrix in light and dark mode", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "This test already covers every required viewport.");
  test.setTimeout(900_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await completeOnboarding(page);

  const screens = [
    { path: "/app/dashboard", ready: () => page.getByRole("heading", { name: /Buenos días, María/ }) },
    { path: "/app/today", ready: () => page.getByRole("heading", { name: /Buenos días, María/ }) },
    { path: "/app/vision", ready: () => page.getByRole("heading", { name: "Vida soñada", exact: true }) },
    { path: "/app/goals", ready: () => page.getByRole("heading", { name: "Metas", exact: true }) },
    { path: "/app/planning", ready: () => page.getByRole("heading", { name: "Planificación", exact: true }) },
    { path: "/app/planning/weekly", ready: () => page.getByRole("heading", { name: "Plan semanal", exact: true }) },
    { path: "/app/life-hub", ready: () => page.getByRole("heading", { name: "Mi espacio", exact: true }) },
    { path: "/app/tasks", ready: () => page.getByRole("heading", { name: "Proyectos y tareas", exact: true }) },
    { path: "/app/habits", ready: () => page.getByRole("heading", { name: "Hábitos", exact: true }) },
    { path: "/app/progress", ready: () => page.getByRole("heading", { name: "Tu progreso", exact: true }) },
    { path: "/app/journal", ready: () => page.getByRole("heading", { name: "Mi diario", exact: true }) },
    { path: "/app/finance", ready: () => page.getByRole("heading", { name: "Finanzas", exact: true }) },
    { path: "/app/health", ready: () => page.getByRole("heading", { name: /Antes de usar Alimentación y Entrenamiento|Alimentación/ }) },
    { path: "/app/settings", ready: () => page.getByRole("heading", { name: "Ajustes y datos", exact: true }) },
    { path: "/app/help", ready: () => page.getByRole("heading", { name: "Desbloquearme", exact: true }) },
    { path: "/app/support", ready: () => page.getByRole("heading", { name: "Ayuda y soporte", exact: true }) },
  ];

  for (const colorMode of ["light", "dark"] as const) {
    await page.goto("/app/settings");
    const modeControl = page.locator(".color-mode-setting").getByRole("button", { name: colorMode === "dark" ? "Oscuro" : "Claro", exact: true });
    if (await modeControl.getAttribute("aria-pressed") !== "true") await modeControl.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", colorMode);

    for (const viewport of p1Viewports) {
      await page.setViewportSize(viewport);
      for (const screen of screens) {
        await page.goto(screen.path);
        await expect(screen.ready()).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-theme", colorMode);
        await expectNoHorizontalOverflow(page, `${screen.path} in ${colorMode} at ${viewport.width}x${viewport.height}`);
      }
    }
  }

  expect(runtimeErrors).toEqual([]);
});

test("P0 keyboard focus, dark mode, reduced motion and 200% reflow remain usable", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "Desktop covers keyboard and reflow; touch targets have a mobile-specific test.");
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await completeOnboarding(page);

  await page.goto("/app/settings");
  const darkMode = page.getByRole("button", { name: "Oscuro", exact: true });
  await darkMode.click();
  await expect(darkMode).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.goto("/app/dashboard");
  await expect(page.getByRole("heading", { name: /Buenos días, María/ })).toBeVisible();
  const skipLink = page.locator(".skip-link");
  await skipLink.focus();
  await expectVisibleKeyboardFocus(skipLink);
  const reducedMotion = await page.locator(".page-content > *").first().evaluate((element) => {
    const toMilliseconds = (value: string) => value.trim().endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
    const style = getComputedStyle(element);
    return {
      matches: matchMedia("(prefers-reduced-motion: reduce)").matches,
      animation: Math.max(...style.animationDuration.split(",").map(toMilliseconds)),
      transition: Math.max(...style.transitionDuration.split(",").map(toMilliseconds)),
    };
  });
  expect(reducedMotion.matches).toBe(true);
  expect(reducedMotion.animation).toBeLessThanOrEqual(1);
  expect(reducedMotion.transition).toBeLessThanOrEqual(1);

  await page.locator(".access-chip").click();
  await expect(page).toHaveURL(/\/upgrade$/);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");

  await page.goto("/app/habits");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const createHabit = page.getByRole("button", { name: "Crear hábito", exact: true });
  await createHabit.focus();
  await page.keyboard.press("Enter");
  const habitDialog = page.getByRole("dialog", { name: "Crear un hábito" });
  const closeDialog = habitDialog.getByRole("button", { name: "Cerrar", exact: true });
  await expectVisibleKeyboardFocus(closeDialog);
  const lastDialogControl = habitDialog.locator("button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])").last();
  await page.keyboard.press("Shift+Tab");
  await expect(lastDialogControl).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeDialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(habitDialog).toHaveCount(0);
  await expect(createHabit).toBeFocused();

  await page.setViewportSize({ width: 720, height: 450 });
  for (const [path, heading] of [
    ["/app/today", /Buenos días, María/],
    ["/app/settings", /^Ajustes y datos$/],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page, `${path} at a 200% reflow equivalent`);
  }
  await page.goto(signedOutPath("/signup"));
  await expect(page.getByRole("heading", { name: "Empieza una vida más tuya.", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "/signup at a 200% reflow equivalent");
});

test("P0 mobile drawer traps focus and critical touch targets are at least 44px", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "Touch target media queries require the mobile project.");
  await completeOnboarding(page);
  await page.goto("/app/dashboard");

  const menuTrigger = page.getByRole("button", { name: "Abrir menú", exact: true });
  await expectMinimumTouchTarget(menuTrigger, "Abrir menú");
  await menuTrigger.focus();
  await page.keyboard.press("Enter");
  const drawer = page.locator(".mobile-drawer");
  await expect(drawer).toBeVisible();
  const closeMenu = drawer.getByRole("button", { name: "Cerrar menú", exact: true });
  await expectVisibleKeyboardFocus(closeMenu);
  await expectMinimumTouchTarget(closeMenu, "Cerrar menú");
  const lastDrawerControl = drawer.locator("button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])").last();
  await page.keyboard.press("Shift+Tab");
  await expect(lastDrawerControl).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeMenu).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(menuTrigger).toBeFocused();

  for (const link of await page.locator(".mobile-nav a").all()) await expectMinimumTouchTarget(link, "Destino de navegación móvil");

  await page.goto("/app/habits");
  await expectMinimumTouchTarget(page.getByRole("button", { name: "Crear hábito", exact: true }), "Crear hábito");
  await page.goto(signedOutPath("/"));
  await dismissCookieBanner(page);
  await expectMinimumTouchTarget(page.locator(".marketing-header").getByRole("link", { name: "Comienza tu prueba gratis", exact: true }), "CTA principal de adquisición");
});

test("the trial permits three local calendar months and blocks the fourth", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "The access rule is viewport-independent and already has unit coverage.");
  await completeOnboarding(page, "María", /Mi día/, false, "/app/dashboard?e2e-access=trial");
  await page.goto("/app/planning");

  const start = new Date();
  const periodAt = (offset: number) => {
    const date = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    return { year: date.getFullYear(), key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` };
  };
  const yearSelect = page.getByLabel("Año");
  for (const offset of [0, 1, 2]) {
    const period = periodAt(offset);
    await yearSelect.selectOption(String(period.year));
    const card = page.locator(`[id="month-${period.key}"]`);
    await expect(card).toBeVisible();
    await expect(card).not.toHaveClass(/month-card--locked/);
  }

  const blockedPeriod = periodAt(3);
  await yearSelect.selectOption(String(blockedPeriod.year));
  const blockedCard = page.locator(`[id="month-${blockedPeriod.key}"]`);
  await expect(blockedCard).toHaveClass(/month-card--locked/);
  await expect(blockedCard.getByRole("link", { name: "Desbloquear Premium", exact: true })).toBeVisible();
});

test("TasksPage rejects a trial date beyond its horizon without persistence", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "The access rule is viewport-independent.");
  const runtimeErrors = collectRuntimeErrors(page);
  await completeOnboarding(page, "María", /Mi día/, false, "/app/dashboard?e2e-access=trial");
  await page.goto("/app/tasks");

  const readTasks = () => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("my-best-version-planner-v4:e2e-user");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tasks = await new Promise<unknown[]>((resolve, reject) => {
      const request = database.transaction("tasks", "readonly").objectStore("tasks").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return tasks;
  });
  const tasksBefore = await readTasks();

  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const taskForm = page.locator(".advanced-task-form");
  await taskForm.getByLabel("Tarea", { exact: true }).fill("Tarea fuera del horizonte");
  const dateInput = taskForm.getByLabel("Fecha");
  const maxDate = await dateInput.getAttribute("max");
  expect(maxDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const blocked = new Date(`${maxDate}T12:00:00`);
  blocked.setDate(blocked.getDate() + 1);
  const blockedDate = `${blocked.getFullYear()}-${String(blocked.getMonth() + 1).padStart(2, "0")}-${String(blocked.getDate()).padStart(2, "0")}`;
  await taskForm.evaluate((form) => form.setAttribute("novalidate", ""));
  await dateInput.fill(blockedDate);
  await taskForm.getByRole("button", { name: "Guardar tarea", exact: true }).click();

  await expect(page.locator(".tasks-section").getByRole("alert")).toHaveText("Tu prueba permite planificar dentro de un horizonte de 3 meses. Puedes consultar lo que ya existe fuera de ese periodo, sin modificarlo.");
  await expect(taskForm).toBeVisible();
  expect(await readTasks()).toEqual(tasksBefore);
  expect(runtimeErrors).toEqual([]);
});

test("an existing month outside the trial horizon remains available in read-only mode", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "The preservation flow is viewport-independent.");
  await completeOnboarding(page);
  await page.goto("/app/planning");

  const start = new Date();
  const future = new Date(start.getFullYear(), start.getMonth() + 3, 1);
  const periodKey = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}`;
  await page.getByLabel("Año").selectOption(String(future.getFullYear()));
  const futureCard = page.locator(`[id="month-${periodKey}"]`);
  await futureCard.locator(".month-card-main").click();
  const monthDialog = page.getByRole("dialog", { name: /Planificar/ });
  await monthDialog.getByLabel("Resultado concreto del mes").fill("Preparar un resultado futuro");
  await monthDialog.getByRole("button", { name: "Guardar plan", exact: true }).click();
  await expect(monthDialog).toHaveCount(0);

  await page.evaluate(() => window.sessionStorage.setItem("mbv-e2e-access", "trial"));
  await page.reload();
  await page.getByLabel("Año").selectOption(String(future.getFullYear()));
  const preservedCard = page.locator(`[id="month-${periodKey}"]`);
  await expect(preservedCard).toContainText("Preparar un resultado futuro");
  await expect(preservedCard.getByText("Solo lectura", { exact: true })).toBeVisible();
  await preservedCard.getByRole("button", { name: "Ver mes", exact: true }).click();
  await expect(page.getByText("Preparar un resultado futuro", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Tu plan se conserva sin cambios", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar mes" })).toHaveCount(0);
});

test("captures the eight P0 visual references", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "Reference captures use the canonical desktop viewport.");
  test.skip(process.env.MBV_CAPTURE_P0_SCREENSHOTS !== "1", "Set MBV_CAPTURE_P0_SCREENSHOTS=1 to refresh committed references.");
  test.setTimeout(180_000);
  await page.clock.setFixedTime(new Date("2026-09-04T12:00:00-05:00"));
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/app/dashboard");
  await dismissCookieBanner(page);
  await captureP0Reference(page, "onboarding", page.getByRole("heading", { name: /Una vida más tuya/ }), { width: 390, height: 844 });
  await completeOnboarding(page);
  await captureP0Reference(page, "dashboard", page.getByRole("heading", { name: /Buenos días, María/ }));
  await page.goto("/app/today");
  await captureP0Reference(page, "today", page.getByRole("heading", { name: /Buenos días, María/ }), { width: 390, height: 844 });
  await page.goto("/app/habits");
  await captureP0Reference(page, "habits", page.getByRole("heading", { name: "Hábitos", exact: true }));

  await page.goto(signedOutPath("/"));
  await captureP0Reference(page, "landing", page.getByRole("heading", { name: "Tu vida completa, organizada con claridad y sin culpa.", exact: true }));
  await page.goto(signedOutPath("/trial"));
  await captureP0Reference(page, "trial", page.getByRole("heading", { name: "Explora lo esencial para convertir tu visión en acciones posibles.", exact: true }));
  await page.goto(signedOutPath("/signup"));
  await captureP0Reference(page, "signup", page.getByRole("heading", { name: "Empieza una vida más tuya.", exact: true }));
  await page.goto(signedOutPath("/upgrade"));
  await captureP0Reference(page, "upgrade", page.getByRole("heading", { name: "Amplía tu horizonte cuando estés lista.", exact: true }));
});

test("a goal connects its monthly result, weekly action, Mi día and Progress", async ({ page }) => {
  test.setTimeout(90_000);
  await completeOnboarding(page);
  await page.goto("/app/goals");
  await page.getByRole("button", { name: "Crear meta" }).click();
  const goalDialog = page.getByRole("dialog", { name: "Crear una meta" });
  await goalDialog.getByLabel("¿Qué quieres lograr?").fill("Publicar una guía útil");
  await goalDialog.getByLabel("¿Por qué importa para ti?").fill("Quiero convertir una idea valiosa en algo que otras personas puedan usar.");
  await goalDialog.getByRole("button", { name: /Cómo mediremos el avance/ }).click();
  await goalDialog.getByLabel("Método").selectOption("tasks");
  await goalDialog.getByRole("button", { name: "Crear meta", exact: true }).click();
  await page.getByRole("dialog", { name: "Meta creada" }).getByRole("link", { name: /Planificar esta meta/ }).click();

  const monthDialog = page.getByRole("dialog", { name: /Planificar/ });
  await expect(monthDialog.getByLabel("Meta activa (opcional)")).toHaveValue(/.+/);
  await monthDialog.getByLabel("Resultado concreto del mes").fill("Terminar el primer borrador de la guía");
  await monthDialog.getByLabel("Acción 1", { exact: true }).fill("Escribir el esquema de la guía");
  await monthDialog.getByRole("button", { name: "Guardar plan" }).click();
  await expect(page.getByRole("heading", { name: "Terminar el primer borrador de la guía" })).toBeVisible();

  await page.goto("/app/planning/weekly");
  const connectedAction = page.locator(".weekly-pending-task").filter({ hasText: "Escribir el esquema de la guía" });
  await expect(connectedAction).toContainText("Meta · Publicar una guía útil");
  await connectedAction.getByText("Asignar día", { exact: true }).click();
  const currentDate = new Date();
  await connectedAction.getByRole("button", { name: `Asignar Escribir el esquema de la guía al ${formatSpanishAssignmentDate(currentDate)}` }).click();

  await page.goto("/app/today");
  await expect(page.getByText("Escribir el esquema de la guía").first()).toBeVisible();
  await expect(page.getByText("Resultado mensual: Terminar el primer borrador de la guía")).toBeVisible();
  await page.getByLabel("Completar Escribir el esquema de la guía").click();

  await page.goto("/app/progress");
  const goalProgress = page.locator(".progress-goal-list article").filter({ hasText: "Publicar una guía útil" });
  await expect(goalProgress).toContainText("100%");
});

test("English mode covers the updated product flows", async ({ page }) => {
  test.setTimeout(90_000);
  await completeOnboarding(page);
  await page.goto("/app/today");
  await page.getByLabel("Completar Escribir mi primer paso").click();
  await page.goto("/app/tasks");
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  await page.getByLabel("Tarea", { exact: true }).fill("Hoy");
  await page.getByRole("button", { name: "Guardar tarea" }).click();
  await expect(page.getByText("Hoy", { exact: true }).first()).toBeVisible();
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Inglés, Beta", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.evaluate(() => {
    localStorage.setItem("mbv-return-experience-v1:e2e-user", JSON.stringify({ lastSeenAt: new Date(Date.now() - 4 * 86_400_000).toISOString() }));
    sessionStorage.removeItem("mbv-return-session-v1:e2e-user");
  });
  await page.goto("/app/dashboard");
  await expect(page.getByRole("heading", { name: /Good morning, María/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Come back with one decision" })).toBeVisible();
  const primaryNavigation = test.info().project.name === "mobile" ? page.locator(".mobile-nav") : page.locator(".sidebar__nav");
  await expect(primaryNavigation).toContainText("Home");
  await expect(primaryNavigation).toContainText("My day");
  await expect(primaryNavigation).toContainText("Plan");
  await expect(primaryNavigation).toContainText("My space");
  await expect(primaryNavigation).toContainText("Progress");

  await page.goto("/app/today");
  await expect(page.getByRole("heading", { name: /Good morning, María/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "My mood today", exact: true })).toBeVisible();

  await page.goto("/app/tasks");
  await expect(page.getByText("First, the outcome", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "New task" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Inbox" })).toBeVisible();
  await expect(page.getByText("Hoy", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Primero, el resultado", { exact: true })).toHaveCount(0);

  await page.goto("/app/life-hub");
  await expect(page.getByRole("heading", { name: "My space", exact: true })).toBeVisible();

  await page.goto("/app/planning/weekly");
  await expect(page.getByRole("heading", { name: "Pending without a date" })).toBeVisible();
  await page.getByRole("button", { name: "Weekly review", exact: true }).click();
  const weeklyReview = page.getByRole("dialog", { name: "Weekly review" });
  await expect(weeklyReview.getByText("What actually happened")).toBeVisible();
  await weeklyReview.getByRole("button", { name: "Close", exact: true }).click();

  await page.goto("/app/progress");
  await expect(page.getByRole("button", { name: "Create card", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create invitation link", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create card", exact: true }).click();
  const shareDialog = page.getByRole("dialog", { name: "Create your progress card" });
  await expect(shareDialog).toContainText("Private by design");
  await shareDialog.getByRole("button", { name: "Close", exact: true }).click();

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

  for (const [path, heading] of [
    ["/", "Your whole life, organized with clarity and without guilt."],
    ["/trial", "Explore the essentials for turning your vision into realistic actions."],
    ["/signup", "Start a life that feels more like yours."],
    ["/login", "Return to your planner."],
    ["/verify-email", "Check your email."],
    ["/forgot-password", "Recover your access."],
    ["/upgrade", "Expand your horizon when you are ready."],
  ] as const) {
    await page.goto(signedOutPath(path));
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
  }
  await page.goto(signedOutPath("/"));
  await expect(page.getByRole("link", { name: "Start your free trial", exact: true })).toHaveCount(3);
});

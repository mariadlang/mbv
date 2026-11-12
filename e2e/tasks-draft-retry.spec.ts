import { test, expect, type Page, type TestInfo } from "@playwright/test";

test.use({ timezoneId: "America/Bogota" });

async function stored(page: Page) {
  return page.evaluate(async () => {
    if (location.hostname !== "127.0.0.1") throw new Error("Synthetic local test only");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("my-best-version-planner-v4:e2e-user");
      open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
    });
    try {
      return await new Promise<Record<string, Record<string, unknown>[]>>((resolve, reject) => {
        const names = Array.from(db.objectStoreNames);
        const tx = db.transaction(names, "readonly");
        const result: Record<string, Record<string, unknown>[]> = {};
        for (const name of names) {
          const request = tx.objectStore(name).getAll();
          request.onsuccess = () => { result[name] = request.result; };
        }
        tx.oncomplete = () => resolve(result); tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  });
}

async function start(page: Page, info: TestInfo) {
  await page.setViewportSize(info.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1448, height: 1086 });
  await page.goto("/app/dashboard");
  await page.getByRole("button", { name: "Solo necesarias" }).click();
  await page.getByRole("button", { name: "Crear mi primera acción" }).click();
  await page.getByRole("radio", { name: /Mi día/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Resultado").fill("TasksPage objetivo sintético");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Primera acción").fill("TasksPage tarea anterior intacta");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Ver mi primera acción/ }).click();
  await expect(page).toHaveURL(/app\/today/);
  await page.goto("/app/tasks");
  await expect(page.getByRole("heading", { name: "Proyectos y tareas", exact: true })).toBeVisible();
}

async function projectDraft(page: Page, name: string) {
  if (!await page.getByLabel("Nombre del proyecto").isVisible()) await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.getByLabel("Nombre del proyecto").fill(name);
  await page.getByLabel("Resultado esperado").fill("Entregable sintético conservado");
}

async function holdStorage(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("my-best-version-planner-v4:e2e-user");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result, tx = db.transaction("projects", "readwrite"), store = tx.objectStore("projects");
        let released = false;
        const deadline = Date.now() + 30_000; // Safety release, not a readiness wait.
        Object.assign(window, { releaseTasksDraftLock: () => { released = true; } });
        const hold = () => { if (!released && Date.now() < deadline) store.get("synthetic-read-only-lock").onsuccess = hold; };
        tx.oncomplete = () => db.close(); hold(); resolve();
      };
    });
  });
}

async function releaseStorage(page: Page) {
  await page.evaluate(() => (window as unknown as { releaseTasksDraftLock(): void }).releaseTasksDraftLock());
}

async function failOnce(page: Page, store: string, field: string, value: string) {
  await page.evaluate(({ store, field, value }) => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (record, key) {
      if (this.name === store && record[field] === value) {
        IDBObjectStore.prototype.add = original;
        throw new DOMException("Controlled TasksPage pre-commit failure", "QuotaExceededError");
      }
      return key === undefined ? original.call(this, record) : original.call(this, record, key);
    };
  }, { store, field, value });
}

async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const path = info.outputPath(name + ".png");
  await page.screenshot({ path });
  await info.attach(name, { path, contentType: "image/png" });
}

for (const kind of ["project", "checklist"] as const) {
  test(`TasksPage ${kind}: delayed save, failure, retry, navigation and reload preserve IDs`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const uncaught: string[] = [];
    page.on("pageerror", error => uncaught.push(error.message));
    await start(page, info);
    if (kind === "checklist") {
      for (const name of ["Proyecto uno", "Proyecto dos"]) {
        await projectDraft(page, name);
        await page.getByRole("button", { name: "Crear proyecto", exact: true }).click();
        await expect(page.getByLabel("Nombre del proyecto")).toHaveValue("");
      }
    }
    const before = await stored(page);
    if (kind === "project") await projectDraft(page, "Proyecto pendiente");
    else {
      await page.getByRole("textbox", { name: "Añadir otra acción a Proyecto uno" }).fill("Paso uno");
      await page.getByRole("textbox", { name: "Añadir otra acción a Proyecto dos" }).fill("Paso dos");
    }
    await failOnce(page, kind === "project" ? "projects" : "projectChecklistItems", kind === "project" ? "name" : "title", kind === "project" ? "Proyecto pendiente" : "Paso dos");
    await page.locator(".section-navigation").getByRole("link", { name: "Hábitos", exact: true }).click();
    const guard = page.getByRole("dialog", { name: "Tienes cambios sin guardar" });
    await expect(guard).toBeVisible();
    await holdStorage(page);
    await guard.getByRole("button", { name: "Guardar y continuar" }).click();
    await expect(guard.getByRole("button", { name: "Guardando…" })).toBeDisabled();
    await expect(page).toHaveURL(/app\/tasks/);
    await capture(page, info, kind + "-saving");
    await releaseStorage(page);
    await expect(guard.getByRole("alert")).toContainText("tu borrador sigue aquí");
    await expect(guard.getByRole("button", { name: "Guardar y continuar" })).toBeEnabled();
    await expect(page).toHaveURL(/app\/tasks/);
    const partial = await stored(page);
    if (kind === "project") {
      expect(partial).toEqual(before);
      await expect(page.getByLabel("Nombre del proyecto")).toHaveValue("Proyecto pendiente");
      await expect(page.getByLabel("Resultado esperado")).toHaveValue("Entregable sintético conservado");
    } else {
      expect(partial.projectChecklistItems).toHaveLength(1);
      expect(partial.projectChecklistItems[0]).toMatchObject({ title: "Paso uno", projectId: before.projects.find(project => project.name === "Proyecto uno")!.id });
      await expect(page.getByRole("textbox", { name: "Añadir otra acción a Proyecto uno" })).toHaveValue("");
      await expect(page.getByRole("textbox", { name: "Añadir otra acción a Proyecto dos" })).toHaveValue("Paso dos");
    }
    await capture(page, info, kind + "-error-draft-kept");
    await holdStorage(page);
    await guard.getByRole("button", { name: "Guardar y continuar" }).click();
    await expect(guard.getByRole("button", { name: "Guardando…" })).toBeDisabled();
    await expect(page).toHaveURL(/app\/tasks/);
    await releaseStorage(page);
    await expect(page).toHaveURL(/app\/habits/);
    const after = await stored(page);
    for (const name of Object.keys(before)) if (!["projects", "projectChecklistItems", "metadata"].includes(name)) expect(after[name], name + " unchanged").toEqual(before[name]);
    if (kind === "project") {
      expect(after.projects).toHaveLength(before.projects.length + 1);
      for (const old of before.projects) expect(after.projects.find(project => project.id === old.id)).toEqual(old);
      expect(after.projects.filter(project => project.name === "Proyecto pendiente")).toHaveLength(1);
      expect(after.projectChecklistItems).toEqual(before.projectChecklistItems);
    } else {
      expect(after.projects).toEqual(before.projects);
      expect(after.projectChecklistItems).toHaveLength(2);
      expect(after.projectChecklistItems.find(item => item.id === partial.projectChecklistItems[0].id)).toEqual(partial.projectChecklistItems[0]);
      expect(after.projectChecklistItems.filter(item => item.title === "Paso dos")).toEqual([expect.objectContaining({ projectId: before.projects.find(project => project.name === "Proyecto dos")!.id })]);
    }
    expect(new Set(after.projects.map(project => project.id)).size).toBe(after.projects.length);
    expect(new Set(after.projectChecklistItems.map(item => item.id)).size).toBe(after.projectChecklistItems.length);
    await page.goBack();
    await expect(page).toHaveURL(/app\/tasks/);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Proyectos y tareas", exact: true })).toBeVisible();
    const reloaded = await stored(page);
    expect(reloaded).toEqual(after);
    if (kind === "project") await expect(page.locator(".project-card").getByText("Proyecto pendiente", { exact: true })).toHaveCount(1);
    else {
      await expect(page.locator(".project-checklist").getByText("Paso uno", { exact: true })).toHaveCount(1);
      await expect(page.locator(".project-checklist").getByText("Paso dos", { exact: true })).toHaveCount(1);
    }
    await capture(page, info, kind + "-reloaded");
    await info.attach("tasks-draft-identities", { body: JSON.stringify({ environment: "isolated local E2E_ACCESS=1; synthetic onboarding; real IndexedDB; controlled pre-commit failure; not production", localDate: await page.evaluate(() => new Intl.DateTimeFormat("en-CA").format(new Date())), viewport: page.viewportSize(), before, partial, after, reloaded }, null, 2), contentType: "application/json" });
    if (kind === "project") {
      for (let i = 0; i < 2; i++) {
        await page.getByRole("button", { name: "Nueva tarea" }).click();
        await page.getByLabel("Tarea", { exact: true }).fill("Título manual intencionalmente igual");
        await page.getByRole("button", { name: "Guardar tarea" }).click();
        await expect(page.getByRole("button", { name: "Guardar tarea" })).toBeHidden();
      }
      await page.reload();
      await expect(page.getByRole("heading", { name: "Proyectos y tareas", exact: true })).toBeVisible();
      const manual = (await stored(page)).tasks.filter(task => task.title === "Título manual intencionalmente igual");
      expect(manual).toHaveLength(2); expect(manual[0].id).not.toBe(manual[1].id);
      await info.attach("manual-equal-titles", { body: JSON.stringify(manual), contentType: "application/json" });
    }
    expect(uncaught).toEqual([]);
  });
}

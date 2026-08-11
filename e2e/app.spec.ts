import { expect, test } from "@playwright/test";

test("onboarding creates an empty local planner", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /My Best Version Planner/ })).toBeVisible();

  await page.getByRole("button", { name: /Comenzar/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("Tu nombre").fill("María");
  await page.getByPlaceholder("Mi salud física y mental").fill("Moverme con energía");
  await page.getByPlaceholder("Hacer crecer mi carrera").fill("Avanzar en mi proyecto");
  await page.getByPlaceholder("Tener tiempo de calidad").fill("Cuidar mis relaciones");
  await page.getByRole("button", { name: /Crear mi planner/ }).click();

  await expect(page.getByRole("heading", { name: /Buenos días, María/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Metas prioritarias" })).toBeVisible();
  await expect(page.getByText("Completar 21K")).toHaveCount(0);

  await page.getByRole("link", { name: "Hábitos" }).first().click();
  await expect(page.getByRole("heading", { name: "Hábitos", exact: true })).toBeVisible();
});

test("budget, savings fund and movement update the finance summary", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Comenzar/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByPlaceholder("Tu nombre").fill("María");
  await page.getByPlaceholder("Mi salud física y mental").fill("Moverme con energía");
  await page.getByPlaceholder("Hacer crecer mi carrera").fill("Avanzar en mi proyecto");
  await page.getByPlaceholder("Tener tiempo de calidad").fill("Cuidar mis relaciones");
  await page.getByRole("button", { name: /Crear mi planner/ }).click();

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

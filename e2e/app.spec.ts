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

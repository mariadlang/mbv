import { expect, test } from "@playwright/test";

test("onboarding creates an empty local planner", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Diseña la vida que quieres vivir." })).toBeVisible();

  await page.getByRole("button", { name: /Crear mi planner/ }).click();
  await page.getByLabel("¿Cómo quieres que te llamemos?").fill("María");
  await page.getByLabel("Tu intención inicial").fill("Avanzar con calma y claridad.");
  await page.getByRole("button", { name: /Elegir mis áreas/ }).click();
  await page.getByRole("button", { name: /Abrir mi planner/ }).click();

  await expect(page.getByRole("heading", { name: "Hola, María" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Un día con espacio" })).toBeVisible();
  await expect(page.getByText("Completar 21K")).toHaveCount(0);

  await page.getByRole("link", { name: "Hábitos" }).first().click();
  await expect(page.getByRole("heading", { name: "Hábitos", exact: true })).toBeVisible();
});

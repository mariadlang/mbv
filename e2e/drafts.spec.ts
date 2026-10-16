import { test, expect } from "@playwright/test";
import { setupEditorialFixture } from "./helpers/editorial-fixture";

test.use({ timezoneId: "America/Bogota", actionTimeout: 20_000 });
test("monthly drafts survive tab changes, route navigation and a cancelled native reload", async ({ page }) => {
  test.setTimeout(120_000);
  await setupEditorialFixture(page);
  await page.goto("/app/planning?view=month&month=2026-10");
  const tabs = page.locator(".prep-month-view > .prep-category-tabs");
  await tabs.getByRole("button", { name: "Notas", exact: true }).click();
  const note = page.getByRole("textbox", { name: "¿Qué avanzó?", exact: true });
  await note.fill("Un borrador importante que no debe perderse");
  await tabs.getByRole("button", { name: "Resumen", exact: true }).click();
  const guard = page.getByRole("dialog", { name: "Tienes cambios sin guardar" });
  await guard.getByRole("button", { name: "Seguir editando", exact: true }).click();
  await expect(note).toHaveValue("Un borrador importante que no debe perderse");
  const native = page.waitForEvent("dialog", { timeout: 10_000 });
  // A cancelled beforeunload never completes navigation; bound that promise.
  const reload = page.reload({ timeout: 10_000 }).catch(() => null);
  const dialog = await native;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await reload;
  await expect(note).toHaveValue("Un borrador importante que no debe perderse");
  await page.getByRole("button", { name: "Volver a Mis meses", exact: true }).click();
  await guard.getByRole("button", { name: "Guardar y continuar", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/planning$/);
  await expect(guard).toBeHidden();
  await page.goto("/app/planning?view=month&month=2026-10");
  await tabs.getByRole("button", { name: "Notas", exact: true }).click();
  await expect(note).toHaveValue("Un borrador importante que no debe perderse");
  await page.reload();
  await tabs.getByRole("button", { name: "Notas", exact: true }).click();
  await expect(note).toHaveValue("Un borrador importante que no debe perderse");
  await tabs.getByRole("button", { name: "Resumen", exact: true }).click();
  await expect(guard).toBeHidden();
});

import { describe, expect, it } from "vitest";
import { translate, translateLegacyText } from "@/src/i18n/translations";
import { enMessages, esMessages, formatMessage } from "@/src/i18n/messages";
import { formatCurrency, formatDate, formatNumber, formatPlural } from "@/src/i18n/formatters";

describe("internationalization", () => {
  it("keeps Spanish as the canonical default", () => {
    expect(translate("es", "Cerrar sesión")).toBe("Cerrar sesión");
  });

  it("interpolates translated tutorial and greeting copy", () => {
    expect(translate("en", "Paso {step} de {total}", { step: 2, total: 10 })).toBe("Step 2 of 10");
    expect(translate("en", "Buenos días, {name}", { name: "María" })).toBe("Good morning, María");
  });

  it("translates dynamic metrics and Spanish calendar labels", () => {
    expect(translateLegacyText("en", "2 de 4 hábitos")).toBe("2 of 4 habits");
    expect(translateLegacyText("en", "lunes, 24 de agosto")).toBe("Monday, August 24");
    expect(translateLegacyText("en", "0 tareas")).toBe("0 tasks");
    expect(translateLegacyText("en", "Añadir a Quiero leer")).toBe("Add to Want to read");
    expect(translateLegacyText("en", "Serie 2")).toBe("Set 2");
    expect(translateLegacyText("en", "12 repeticiones")).toBe("12 reps");
    expect(translateLegacyText("en", "Vida soñada")).toBe("Dream Life");
    expect(translateLegacyText("en", "Bandeja")).toBe("Inbox");
  });

  it("restores canonical Spanish copy without altering saved content", () => {
    expect(translateLegacyText("es", "Mi meta personal")).toBe("Mi meta personal");
  });

  it("keeps stable message keys in parity", () => {
    expect(Object.keys(enMessages).sort()).toEqual(Object.keys(esMessages).sort());
  });

  it("interpolates stable message keys", () => {
    expect(formatMessage("es", "onboarding.progress", { step: 2, total: 4 })).toBe("Paso 2 de 4");
    expect(formatMessage("en", "onboarding.progress", { step: 2, total: 4 })).toBe("Step 2 of 4");
  });

  it("preserves replacement tokens and placeholder-like text in user content", () => {
    expect(
      formatMessage("es", "today.habits.weekAria", {
        habitName: "Ahorro $& {total}",
        completed: 1,
        total: 7,
      }),
    ).toBe("Ahorro $& {total}: 1 de 7 registros esta semana");
  });

  it("formats dates, numbers, currency, and basic plurals by locale", () => {
    expect(formatDate("es", "2026-09-09", { day: "numeric", month: "long" })).toBe("9 de septiembre");
    expect(formatDate("en", "2026-09-09", { day: "numeric", month: "long" })).toBe("September 9");
    expect(formatNumber("es", 1234)).toBe("1.234");
    expect(formatNumber("en", 1234)).toBe("1,234");
    expect(formatCurrency("en", 1234, "USD", { maximumFractionDigits: 0 })).toContain("$1,234");
    expect(formatPlural("es", 1, { one: "{count} tarea", other: "{count} tareas" })).toBe("1 tarea");
    expect(formatPlural("en", 2, { one: "{count} task", other: "{count} tasks" })).toBe("2 tasks");
  });
});

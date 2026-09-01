import { describe, expect, it } from "vitest";
import { translate, translateLegacyText } from "@/src/i18n/translations";

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
});

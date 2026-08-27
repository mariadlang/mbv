import { describe, expect, it } from "vitest";
import { addBusinessDays } from "@/src/domain/legalRules";
import { cookiePreferencesSchema, consentInputSchema, privacyRequestInputSchema } from "@/src/lib/legalSchemas";

describe("reglas legales", () => {
  it("excluye fines de semana al calcular el plazo inicial", () => {
    const friday = new Date("2026-08-28T12:00:00-05:00");
    expect(addBusinessDays(friday, 1).toISOString().slice(0, 10)).toBe("2026-08-31");
    expect(addBusinessDays(friday, 10).toISOString().slice(0, 10)).toBe("2026-09-11");
  });

  it("acepta evidencia separada y versionada", () => {
    expect(consentInputSchema.parse({ consentType: "data_processing", documentVersion: "2026-08-27.co-1", method: "signup_checkbox", status: "granted" }).consentType).toBe("data_processing");
  });

  it("rechaza solicitudes incompletas", () => {
    expect(() => privacyRequestInputSchema.parse({ type: "data_claim", subject: "No", description: "Muy corto", contactEmail: "invalido" })).toThrow();
  });

  it("mantiene siempre activas las tecnologías esenciales", () => {
    expect(() => cookiePreferencesSchema.parse({ version: "v1", essential: false, functional: false, analytics: false, marketing: false, decidedAt: new Date().toISOString() })).toThrow();
  });
});

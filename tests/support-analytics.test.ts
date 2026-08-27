import { describe, expect, it } from "vitest";
import { ACTIVATION_DEFINITION, sanitizeProductMetadata } from "@/src/domain/productAnalytics";
import { feedbackTicketSchema, marketingPreferenceSchema } from "@/src/lib/supportSchemas";

describe("soporte y analítica minimizada", () => {
  it("acepta un ticket válido sin campos sensibles", () => {
    const parsed = feedbackTicketSchema.parse({ type:"bug", category:"Planificación", subject:"No guarda la semana", message:"Intenté guardar la semana y el botón no respondió.", pageUrl:"/app/planning" });
    expect(parsed.type).toBe("bug");
    expect(Object.keys(parsed)).not.toContain("password");
  });

  it("rechaza mensajes demasiado breves", () => {
    expect(feedbackTicketSchema.safeParse({ type:"support", category:"Cuenta", subject:"Ayuda", message:"No" }).success).toBe(false);
  });

  it("conserva sólo metadatos permitidos y elimina contenido privado", () => {
    expect(sanitizeProductMetadata({ route:"/app/journal", result:"created", journalText:"contenido privado", token:"secreto", email:"persona@example.com" })).toEqual({ route:"/app/journal", result:"created" });
  });

  it("mantiene el marketing desactivable y la activación centralizada", () => {
    expect(marketingPreferenceSchema.parse({ consent:false, source:"settings" }).consent).toBe(false);
    expect(ACTIVATION_DEFINITION).toEqual({ windowDays:7, requiresOnboarding:true, minimumGoals:1, minimumCompletedActions:1 });
  });
});

import { describe, expect, it } from "vitest";
import { monthImportantDateFormSchema, planActionsFormSchema, workoutPlanFormSchema } from "./schemas";

describe("workoutPlanFormSchema", () => {
  it("permite guardar cardio o deporte sin ejercicios detallados", () => {
    const result = workoutPlanFormSchema.parse({
      date: "2026-08-31",
      name: "Cardio caminata",
      durationMinutes: 45,
      exercises: [],
    });

    expect(result.exercises).toEqual([]);
  });

  it("sigue exigiendo un nombre claro para la actividad", () => {
    expect(() => workoutPlanFormSchema.parse({
      date: "2026-08-31",
      name: " ",
      exercises: [],
    })).toThrow();
  });
});

describe("monthly planning schemas", () => {
  it("requires a real calendar day for every titled important date", () => {
    expect(monthImportantDateFormSchema.safeParse({ title: "Cita importante", date: "" }).success).toBe(false);
    expect(monthImportantDateFormSchema.safeParse({ title: "Cita importante", date: "2026-02-30" }).success).toBe(false);
    expect(monthImportantDateFormSchema.safeParse({ title: "Cita importante", date: "2026-02-28" }).success).toBe(true);
  });

  it("requires a unique stable key for each monthly action without deduplicating equal titles", () => {
    expect(planActionsFormSchema.safeParse([
      { actionKey: "draft-a", title: "Preparar propuesta" },
      { actionKey: "draft-a", title: "Otra acción" },
    ]).success).toBe(false);
    expect(planActionsFormSchema.safeParse([
      { actionKey: "draft-a", title: "Preparar propuesta" },
      { actionKey: "draft-b", title: "Preparar propuesta" },
    ]).success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { workoutPlanFormSchema } from "./schemas";

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

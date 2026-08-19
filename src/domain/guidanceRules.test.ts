import { describe, expect, it } from "vitest";
import { applyDailyFocusPriority, getDailyTopThree, getNextStep, resistanceSuggestion } from "@/src/domain/guidanceRules";
import { createEmptySnapshot, type Task } from "@/src/domain/planner";

const task = (id: string, focusPriority?: 1 | 2 | 3): Task => ({ id, title: id, date: "2026-08-15", priority: "medium", focusPriority, status: "planned", createdAt: "now", updatedAt: "now" });

describe("guidance rules", () => {
  it("shows only explicitly selected daily priorities in their chosen order", () => {
    expect(getDailyTopThree([task("other"), task("third", 3), task("first", 1)], "2026-08-15").map((item) => item.id)).toEqual(["first", "third"]);
  });

  it("returns a concrete action for task resistance", () => {
    expect(resistanceSuggestion("perfectionism")).toContain("suficientemente bien");
  });

  it("keeps only one active task in each daily Top 3 position", () => {
    const replaced = applyDailyFocusPriority(
      [task("first", 1), task("replacement")],
      "replacement",
      "2026-08-15",
      1,
    );
    expect(replaced.find((item) => item.id === "first")?.focusPriority).toBeUndefined();
    expect(replaced.find((item) => item.id === "replacement")?.focusPriority).toBe(1);
  });

  it("selects a concrete goal task before a generic setup suggestion", () => {
    const snapshot = createEmptySnapshot();
    snapshot.goals = [{ id: "goal", title: "Publicar", reason: "Importa", progressType: "tasks", priority: "high", status: "active", createdAt: "now", updatedAt: "now" }];
    snapshot.tasks = [{ ...task("Revisar portada"), goalId: "goal", date: undefined }];
    expect(getNextStep(snapshot, "2026-08-15")).toEqual({ title: "Revisar portada", href: "/app/goals" });
  });
});

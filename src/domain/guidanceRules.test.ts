import { describe, expect, it } from "vitest";
import { getDailyTopThree, resistanceSuggestion } from "@/src/domain/guidanceRules";
import type { Task } from "@/src/domain/planner";

const task = (id: string, focusPriority?: 1 | 2 | 3): Task => ({ id, title: id, date: "2026-08-15", priority: "medium", focusPriority, status: "planned", createdAt: "now", updatedAt: "now" });

describe("guidance rules", () => {
  it("shows only explicitly selected daily priorities in their chosen order", () => {
    expect(getDailyTopThree([task("other"), task("third", 3), task("first", 1)], "2026-08-15").map((item) => item.id)).toEqual(["first", "third"]);
  });

  it("returns a concrete action for task resistance", () => {
    expect(resistanceSuggestion("perfectionism")).toContain("suficientemente bien");
  });
});

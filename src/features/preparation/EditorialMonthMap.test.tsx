import { describe, expect, it } from "vitest";
import { BriefcaseBusiness, CalendarDays, Coins, Heart, Leaf, Users } from "lucide-react";
import { getPlanningAreaVisual } from "./EditorialMonthMap";

describe("month map area presentation", () => {
  it("uses explicit saved icon metadata before category and name", () => {
    const area = { name: "Finanzas", category: "Salud", icon: "briefcase-business", color: "sage" as const };
    expect(getPlanningAreaVisual(area)).toEqual({ Icon: BriefcaseBusiness, tone: "sage" });
    expect(area).toEqual({ name: "Finanzas", category: "Salud", icon: "briefcase-business", color: "sage" });
  });

  it("uses known categories and canonical names without assuming list positions", () => {
    expect(getPlanningAreaVisual({ name: "Mi área", category: " Familia y amigos ", color: "blush" })).toEqual({ Icon: Users, tone: "blush" });
    expect(getPlanningAreaVisual({ name: "Finanzas", color: "taupe" })).toEqual({ Icon: Coins, tone: "taupe" });
    expect(getPlanningAreaVisual({ name: "SALUD Y BIENESTAR", color: "rose" })).toEqual({ Icon: Heart, tone: "rose" });
  });

  it("keeps unknown user categories neutral rather than guessing from their title", () => {
    expect(getPlanningAreaVisual({ name: "Mi año saludable", category: "Personal", color: "charcoal" })).toEqual({ Icon: Leaf, tone: "charcoal" });
    expect(getPlanningAreaVisual({ name: "constructor", icon: "__proto__", color: "sage" })).toEqual({ Icon: Leaf, tone: "sage" });
  });

  it("uses a neutral calendar when a month has no associated area", () => {
    expect(getPlanningAreaVisual()).toEqual({ Icon: CalendarDays, tone: "neutral" });
  });
});

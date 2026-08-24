import { describe, expect, it } from "vitest";
import { canAccessFeature, isTrialPlanningMonthAllowed, remainingTrialDays, type UserAccess } from "./access";

const trial: UserAccess = {
  userId: "user-1", email: "maria@example.com", displayName: "María", role: "user",
  accessStatus: "trial", subscriptionStatus: "none",
  trialStartedAt: "2026-08-23T12:00:00.000Z", trialEndsAt: "2026-09-07T12:00:00.000Z",
  serverNow: "2026-08-25T12:00:00.000Z",
};

describe("reglas de acceso", () => {
  it("calcula los días restantes con la hora autoritativa del servidor", () => {
    expect(remainingTrialDays(trial)).toBe(13);
  });

  it("limita la prueba a tres meses de planeación", () => {
    expect(isTrialPlanningMonthAllowed(trial, "2026-08")).toBe(true);
    expect(isTrialPlanningMonthAllowed(trial, "2026-10")).toBe(true);
    expect(isTrialPlanningMonthAllowed(trial, "2026-11")).toBe(false);
  });

  it("reserva Feed Hub y el plan a cinco años para Premium", () => {
    expect(canAccessFeature(trial, "feed_hub")).toBe(false);
    expect(canAccessFeature({ ...trial, accessStatus: "active", subscriptionStatus: "active" }, "five_year_planning")).toBe(true);
  });
});

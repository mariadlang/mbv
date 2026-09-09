import { describe, expect, it } from "vitest";
import { canAccessFeature, getTrialPlanningDateBounds, isTrialPlanningDateAllowed, isTrialPlanningMonthAllowed, remainingTrialDays, type UserAccess } from "./access";

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
    expect(isTrialPlanningMonthAllowed(trial, "2026-07")).toBe(false);
    expect(isTrialPlanningMonthAllowed(trial, "2026-08")).toBe(true);
    expect(isTrialPlanningMonthAllowed(trial, "2026-09")).toBe(true);
    expect(isTrialPlanningMonthAllowed(trial, "2026-10")).toBe(true);
    expect(isTrialPlanningMonthAllowed(trial, "2026-11")).toBe(false);
  });

  it("valida el periodo y cruza correctamente el cambio de año", () => {
    const decemberTrial = { ...trial, trialStartedAt: "2026-12-20T12:00:00.000Z" };
    expect(isTrialPlanningMonthAllowed(decemberTrial, "2026-12")).toBe(true);
    expect(isTrialPlanningMonthAllowed(decemberTrial, "2027-01")).toBe(true);
    expect(isTrialPlanningMonthAllowed(decemberTrial, "2027-02")).toBe(true);
    expect(isTrialPlanningMonthAllowed(decemberTrial, "2027-03")).toBe(false);
    for (const invalid of ["2026-00", "2026-13", "2026-1", "2026-01-extra", "texto"]) {
      expect(isTrialPlanningMonthAllowed(trial, invalid)).toBe(false);
    }
    expect(isTrialPlanningMonthAllowed({ ...trial, trialStartedAt: null }, "2026-08")).toBe(false);
    expect(isTrialPlanningMonthAllowed({ ...trial, trialStartedAt: "invalid" }, "2026-08")).toBe(false);
  });

  it("usa el mismo mes local del planner cerca de un cambio de mes", () => {
    const localStart = new Date(2026, 7, 31, 20, 0, 0);
    const localMonth = `${localStart.getFullYear()}-${String(localStart.getMonth() + 1).padStart(2, "0")}`;
    const fourthMonth = new Date(localStart.getFullYear(), localStart.getMonth() + 3, 1);
    const fourthMonthKey = `${fourthMonth.getFullYear()}-${String(fourthMonth.getMonth() + 1).padStart(2, "0")}`;
    const boundaryTrial = { ...trial, trialStartedAt: localStart.toISOString() };

    expect(isTrialPlanningMonthAllowed(boundaryTrial, localMonth)).toBe(true);
    expect(isTrialPlanningMonthAllowed(boundaryTrial, fourthMonthKey)).toBe(false);
  });

  it("aplica el mismo horizonte a fechas diarias y semanales", () => {
    expect(getTrialPlanningDateBounds(trial)).toEqual({ min: "2026-08-01", max: "2026-10-31" });
    expect(isTrialPlanningDateAllowed(trial, "2026-08-01")).toBe(true);
    expect(isTrialPlanningDateAllowed(trial, "2026-10-31")).toBe(true);
    expect(isTrialPlanningDateAllowed(trial, "2026-07-31")).toBe(false);
    expect(isTrialPlanningDateAllowed(trial, "2026-11-01")).toBe(false);
    expect(isTrialPlanningDateAllowed(trial, "2026-02-31")).toBe(false);
    expect(isTrialPlanningDateAllowed(trial, "2026-9-01")).toBe(false);
  });

  it("reserva Feed Hub y el plan a cinco años para Premium", () => {
    expect(canAccessFeature(trial, "feed_hub")).toBe(false);
    const premium = { ...trial, accessStatus: "active" as const, subscriptionStatus: "active" as const };
    expect(canAccessFeature(premium, "five_year_planning")).toBe(true);
    expect(isTrialPlanningMonthAllowed(premium, "2032-04")).toBe(true);
    expect(isTrialPlanningDateAllowed(premium, "2032-04-15")).toBe(true);
    expect(getTrialPlanningDateBounds(premium)).toBeNull();
    expect(isTrialPlanningMonthAllowed({ ...premium, role: "superadmin" }, "2032-04")).toBe(true);
    expect(isTrialPlanningMonthAllowed(premium, "2032-13")).toBe(false);
  });
});

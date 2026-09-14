import { describe, expect, it } from "vitest";
import { calendarAccessAllowedForProfile, calendarPlanningDateAllowedForProfile } from "@/src/server/calendar/access";

const now = new Date("2026-09-11T12:00:00.000Z").getTime();
const base = { account_status: "active", role: "user", access_status: "trial", subscription_status: "none", trial_started_at: "2026-09-01T12:00:00.000Z", trial_ends_at: "2026-09-12T12:00:00.000Z", timezone: "America/Bogota" };

describe("Google Calendar entitlement", () => {
  it("allows active accounts, superadmins and a trial that has not expired", () => {
    expect(calendarAccessAllowedForProfile(base, now)).toBe(true);
    expect(calendarAccessAllowedForProfile({ ...base, access_status: "active", trial_ends_at: null }, now)).toBe(true);
    expect(calendarAccessAllowedForProfile({ ...base, role: "superadmin", access_status: "active", trial_ends_at: null }, now)).toBe(true);
  });

  it("rejects missing, blocked and expired access", () => {
    expect(calendarAccessAllowedForProfile(null, now)).toBe(false);
    expect(calendarAccessAllowedForProfile({ ...base, access_status: "blocked" }, now)).toBe(false);
    expect(calendarAccessAllowedForProfile({ ...base, role: "superadmin", access_status: "blocked" }, now)).toBe(false);
    expect(calendarAccessAllowedForProfile({ ...base, trial_ends_at: "2026-09-11T12:00:00.000Z" }, now)).toBe(false);
    expect(calendarAccessAllowedForProfile({ ...base, access_status: "expired", trial_ends_at: null }, now)).toBe(false);
    expect(calendarAccessAllowedForProfile({ ...base, account_status: "suspended", access_status: "active" }, now)).toBe(false);
    expect(calendarAccessAllowedForProfile({ ...base, account_status: "deletion_requested", access_status: "active" }, now)).toBe(false);
    expect(calendarAccessAllowedForProfile({ ...base, account_status: "deleted", role: "superadmin", access_status: "active" }, now)).toBe(false);
  });
});

describe("Google Calendar trial planning window", () => {
  it("allows exactly the first three calendar months in the profile timezone", () => {
    const trial = { ...base, trial_started_at: "2026-08-31T23:30:00.000Z" };
    expect(calendarPlanningDateAllowedForProfile(trial, "2026-08-01")).toBe(true);
    expect(calendarPlanningDateAllowedForProfile(trial, "2026-10-31")).toBe(true);
    expect(calendarPlanningDateAllowedForProfile(trial, "2026-11-01")).toBe(false);
    expect(calendarPlanningDateAllowedForProfile(trial, "2026-07-31")).toBe(false);
  });

  it("does not limit active subscriptions and rejects invalid dates", () => {
    expect(calendarPlanningDateAllowedForProfile({ ...base, subscription_status: "active" }, "2030-12-31")).toBe(true);
    expect(calendarPlanningDateAllowedForProfile(base, "2026-02-31")).toBe(false);
  });
});

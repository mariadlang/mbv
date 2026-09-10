import { describe, expect, it } from "vitest";
import { getAccessMessageDescriptor, isPrimaryActive, primaryItems } from "@/src/components/layout/AppShell";

describe("conceptual primary navigation", () => {
  it("exposes exactly the five agreed primary destinations", () => {
    expect(primaryItems.map(([href]) => href)).toEqual(["/app/dashboard", "/app/today", "/app/planning", "/app/life-hub", "/app/progress"]);
  });

  it.each([
    ["/app/dashboard", "/app/dashboard"],
    ["/app/today", "/app/today"],
    ["/app/vision", "/app/planning"],
    ["/app/goals", "/app/planning"],
    ["/app/planning/weekly", "/app/planning"],
    ["/app/life-hub", "/app/life-hub"],
    ["/app/tasks", "/app/life-hub"],
    ["/app/habits", "/app/life-hub"],
    ["/app/journal", "/app/life-hub"],
    ["/app/health", "/app/life-hub"],
    ["/app/finance", "/app/life-hub"],
    ["/app/progress", "/app/progress"],
  ])("maps %s to one primary destination", (pathname, expectedHref) => {
    const active = primaryItems.filter(([href]) => isPrimaryActive(href, pathname)).map(([href]) => href);
    expect(active).toEqual([expectedHref]);
  });

  it.each([
    ["Superadmin", { key: "navigation.access.superadmin" }],
    ["Premium", { key: "navigation.access.premium" }],
    ["Prueba", { key: "navigation.access.trial" }],
    ["Prueba · 1 día", { key: "navigation.access.trialDay", params: { count: 1 } }],
    ["Prueba · 8 días", { key: "navigation.access.trialDays", params: { count: 8 } }],
    ["Acceso bloqueado", { key: "navigation.access.blocked" }],
    ["Prueba finalizada", { key: "navigation.access.expired" }],
  ])("maps the access label %s to a stable message", (accessText, expected) => {
    expect(getAccessMessageDescriptor(accessText)).toEqual(expected);
  });
});

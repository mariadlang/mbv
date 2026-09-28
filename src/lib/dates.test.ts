import { describe, expect, it } from "vitest";
import { toLocalDateKeyFromValue } from "./dates";

describe("toLocalDateKeyFromValue", () => {
  it("preserves calendar-only values without applying a timezone", () => {
    expect(toLocalDateKeyFromValue("2026-09-17", "America/Bogota")).toBe("2026-09-17");
  });

  it("converts UTC instants to the user's local calendar day", () => {
    expect(toLocalDateKeyFromValue("2026-09-18T02:30:00.000Z", "America/Bogota")).toBe("2026-09-17");
  });

  it("keeps the prior local month and year across a UTC year boundary", () => {
    expect(toLocalDateKeyFromValue("2027-01-01T03:30:00.000Z", "America/Bogota")).toBe("2026-12-31");
  });

  it("returns an empty key for corrupt legacy values", () => {
    expect(toLocalDateKeyFromValue("not-a-date", "America/Bogota")).toBe("");
    expect(toLocalDateKeyFromValue("2026-02-30", "America/Bogota")).toBe("");
  });
});

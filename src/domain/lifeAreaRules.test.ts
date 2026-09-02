import { describe, expect, it } from "vitest";
import { defaultLifeAreaNames, mergeDefaultLifeAreas } from "./lifeAreaRules";

describe("mergeDefaultLifeAreas", () => {
  it("adds the eight default areas without duplicates", () => {
    let nextId = 0;
    const merged = mergeDefaultLifeAreas([], () => `area-${++nextId}`, "2026-09-01T00:00:00.000Z");
    const repeated = mergeDefaultLifeAreas(merged, () => `area-${++nextId}`, "2026-09-01T00:00:00.000Z");
    expect(merged.map((area) => area.name)).toEqual(defaultLifeAreaNames);
    expect(repeated).toEqual(merged);
    expect(nextId).toBe(8);
  });

  it("preserves existing areas and adds only missing defaults", () => {
    const existing = mergeDefaultLifeAreas([], () => crypto.randomUUID(), "2026-09-01T00:00:00.000Z")[0];
    const merged = mergeDefaultLifeAreas([{ ...existing, name: "  SALUD Y BIENESTAR  " }], () => crypto.randomUUID(), "2026-09-01T00:00:00.000Z");
    expect(merged).toHaveLength(8);
    expect(merged[0].name).toBe("  SALUD Y BIENESTAR  ");
  });

  it("normalizes legacy area names instead of duplicating their meaning", () => {
    const legacy = mergeDefaultLifeAreas([], () => crypto.randomUUID(), "2026-09-01T00:00:00.000Z")[0];
    const merged = mergeDefaultLifeAreas([{ ...legacy, name: "Carrera" }], () => crypto.randomUUID(), "2026-09-02T00:00:00.000Z");
    expect(merged.filter((area) => area.name === "Carrera profesional o trabajo")).toHaveLength(1);
    expect(merged).toHaveLength(8);
  });
});

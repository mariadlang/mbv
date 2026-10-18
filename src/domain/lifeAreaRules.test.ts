import { describe, expect, it, vi } from "vitest";
import { defaultLifeAreaNames, initializeLifeAreasIfEmpty } from "./lifeAreaRules";

const timestamp = "2026-09-01T00:00:00.000Z";

describe("initializeLifeAreasIfEmpty", () => {
  it("initializes eight unique areas once, without manufacturing ratings", () => {
    let nextId = 0;
    const id = () => `area-${++nextId}`;
    const initialized = initializeLifeAreasIfEmpty([], id, timestamp);
    expect(initialized.map((area) => area.name)).toEqual(defaultLifeAreaNames);
    expect(initialized.map((area) => area.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(initializeLifeAreasIfEmpty(initialized, id, timestamp)).toBe(initialized);
    expect(nextId).toBe(8);
    expect(initialized.every((area) => area.currentScore === undefined && area.desiredScore === undefined)).toBe(true);
  });

  it.each(["Carrera", "  SALUD Y BIENESTAR  ", "AUD18 Área de prueba"])("preserves a partial legacy collection named %s verbatim", (name) => {
    const current = [{ ...initializeLifeAreasIfEmpty([], () => "area", timestamp)[0], name, order: 17, active: false, currentScore: 6, desiredScore: 8 }];
    const createId = vi.fn();
    expect(initializeLifeAreasIfEmpty(current, createId, "2026-10-18T12:00:00Z")).toBe(current);
    expect(current[0].scoresConfirmedAt).toBeUndefined();
    expect(createId).not.toHaveBeenCalled();
  });

  it("does not merge apparent duplicates, reactivate, rename or sort existing records", () => {
    const defaults = initializeLifeAreasIfEmpty([], () => crypto.randomUUID(), timestamp);
    const existing = [...defaults.toReversed(), { ...defaults[0], id: "custom", name: defaults[3].name, custom: true, active: false, order: 100 }];
    const before = structuredClone(existing);
    const createId = vi.fn();
    expect(initializeLifeAreasIfEmpty(existing, createId, timestamp)).toBe(existing);
    expect(existing).toEqual(before);
    expect(createId).not.toHaveBeenCalled();
  });
});

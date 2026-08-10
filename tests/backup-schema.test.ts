import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "@/src/domain/planner";
import { backupEnvelopeSchema } from "@/src/lib/schemas";

describe("backup validation", () => {
  it("accepts the current versioned backup shape", () => {
    const backup = { schemaVersion: 1, exportedAt: "2026-08-10T12:00:00.000Z", data: createEmptySnapshot() };
    expect(backupEnvelopeSchema.parse(backup)).toEqual(backup);
  });

  it("rejects incompatible or partial backups", () => {
    expect(() => backupEnvelopeSchema.parse({ schemaVersion: 99, data: {} })).toThrow();
  });
});

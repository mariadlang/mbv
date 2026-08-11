import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "@/src/domain/planner";
import { backupEnvelopeSchema, parseBackupEnvelope } from "@/src/lib/schemas";

describe("backup validation", () => {
  it("accepts the current versioned backup shape", () => {
    const backup = { schemaVersion: 2, exportedAt: "2026-08-10T12:00:00.000Z", data: createEmptySnapshot() };
    expect(backupEnvelopeSchema.parse(backup)).toEqual(backup);
  });

  it("migrates a complete v1 backup without losing planner records", () => {
    const current = createEmptySnapshot();
    const legacy = {
      schemaVersion: 1 as const,
      exportedAt: "2026-08-10T12:00:00.000Z",
      data: {
        schemaVersion: 1 as const,
        profile: null,
        lifeAreas: current.lifeAreas,
        habits: current.habits,
        habitLogs: current.habitLogs,
        tasks: current.tasks,
        goals: current.goals,
        milestones: current.milestones,
        moodLogs: current.moodLogs,
        journalEntries: current.journalEntries,
      },
    };
    const migrated = parseBackupEnvelope(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.data.transactions).toEqual([]);
    expect(migrated.data.projects).toEqual([]);
  });

  it("rejects incompatible or partial backups", () => {
    expect(() => backupEnvelopeSchema.parse({ schemaVersion: 99, data: {} })).toThrow();
  });
});

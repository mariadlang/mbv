import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "@/src/domain/planner";
import { backupEnvelopeSchema, imageUploadSchema, parseBackupEnvelope } from "@/src/lib/schemas";

describe("backup validation", () => {
  it("accepts the current versioned backup shape", () => {
    const backup = { schemaVersion: 3, exportedAt: "2026-08-10T12:00:00.000Z", data: createEmptySnapshot() };
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
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.data.transactions).toEqual([]);
    expect(migrated.data.projects).toEqual([]);
    expect(migrated.data.cascadePlans).toEqual([]);
    expect(migrated.data.visionBoardItems).toEqual([]);
  });

  it("rejects incompatible or partial backups", () => {
    expect(() => backupEnvelopeSchema.parse({ schemaVersion: 99, data: {} })).toThrow();
  });

  it("migrates a v2 backup and supplies every v3 collection", () => {
    const snapshot = createEmptySnapshot();
    const v2Data = {
      profile: snapshot.profile,
      lifeAreas: snapshot.lifeAreas,
      habits: snapshot.habits,
      habitLogs: snapshot.habitLogs,
      tasks: snapshot.tasks,
      goals: snapshot.goals,
      milestones: snapshot.milestones,
      moodLogs: snapshot.moodLogs,
      journalEntries: snapshot.journalEntries,
      projects: snapshot.projects,
      periodPlans: snapshot.periodPlans,
      reviews: snapshot.reviews,
      financialProfiles: snapshot.financialProfiles,
      financialAccounts: snapshot.financialAccounts,
      financeCategories: snapshot.financeCategories,
      monthlyBudgets: snapshot.monthlyBudgets,
      budgetLines: snapshot.budgetLines,
      transactions: snapshot.transactions,
      savingsFunds: snapshot.savingsFunds,
      debts: snapshot.debts,
      recurringItems: snapshot.recurringItems,
      financialReviews: snapshot.financialReviews,
    };
    const migrated = parseBackupEnvelope({
      schemaVersion: 2,
      exportedAt: "2026-08-10T12:00:00.000Z",
      data: { ...v2Data, schemaVersion: 2 },
    });

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.data.cascadePlans).toEqual([]);
    expect(migrated.data.bodyCheckIns).toEqual([]);
    expect(migrated.data.pendingPurchases).toEqual([]);
  });

  it("keeps a valid v3 backup unchanged", () => {
    const backup = { schemaVersion: 3 as const, exportedAt: "2026-08-10T12:00:00.000Z", data: createEmptySnapshot() };
    expect(parseBackupEnvelope(backup)).toEqual(backup);
  });

  it("accepts only small PNG, JPEG or WebP uploads", () => {
    expect(imageUploadSchema.safeParse({ type: "image/png", size: 1_000 }).success).toBe(true);
    expect(imageUploadSchema.safeParse({ type: "image/svg+xml", size: 1_000 }).success).toBe(false);
    expect(imageUploadSchema.safeParse({ type: "image/jpeg", size: 2_000_000 }).success).toBe(false);
  });

  it("preserves the extended monthly planning fields in a backup", () => {
    const snapshot = createEmptySnapshot();
    snapshot.cascadePlans.push({
      id: "month-2026-09",
      horizon: "monthly",
      periodKey: "2026-09",
      parentPlanId: "three-year-plan",
      intention: "Construir una base sostenible",
      priority: "Preparar el lanzamiento",
      objectives: ["Preparar el lanzamiento", "Cuidar mi energía"],
      activities: [{ id: "activity-1", title: "Revisar la propuesta", type: "activity" }],
      areaIds: ["career"],
      details: { linkedThreeYearPriority: "Consolidar mi proyecto" },
      reflection: { advanced: "Validé el alcance", pending: "Ordenar fechas", next: "Planificar la primera semana" },
      completedObjectiveIndexes: [0],
      status: "active",
      createdAt: "2026-08-22T12:00:00.000Z",
      updatedAt: "2026-08-22T12:00:00.000Z",
    });

    const parsed = backupEnvelopeSchema.parse({ schemaVersion: 3, exportedAt: "2026-08-22T12:00:00.000Z", data: snapshot });
    if (parsed.schemaVersion !== 3) throw new Error("Expected a version 3 backup");
    expect(parsed.data.cascadePlans[0]).toMatchObject({
      areaIds: ["career"],
      completedObjectiveIndexes: [0],
      status: "active",
      reflection: { advanced: "Validé el alcance" },
    });
  });

  it("preserves Brain Dump organization and conversion traceability", () => {
    const snapshot = createEmptySnapshot();
    snapshot.brainDumpItems.push({
      id: "idea-1",
      title: "Preparar una carrera",
      type: "want_to_do",
      tentativeDate: "2026-10",
      goalId: "goal-1",
      projectId: "project-1",
      periodPlanId: "month-2026-10",
      convertedTaskId: "task-1",
      destination: "monthly",
      priority: "medium",
      status: "planned",
      createdAt: "2026-09-03T12:00:00.000Z",
      updatedAt: "2026-09-03T12:00:00.000Z",
    });

    const parsed = backupEnvelopeSchema.parse({ schemaVersion: 3, exportedAt: "2026-09-03T12:00:00.000Z", data: snapshot });
    if (parsed.schemaVersion !== 3) throw new Error("Expected a version 3 backup");
    expect(parsed.data.brainDumpItems[0]).toMatchObject({
      tentativeDate: "2026-10",
      goalId: "goal-1",
      projectId: "project-1",
      convertedTaskId: "task-1",
      destination: "monthly",
    });
  });
});

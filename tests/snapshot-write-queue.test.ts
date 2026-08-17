import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { PlannerSnapshot } from "@/src/domain/planner";
import { createSnapshotWriteQueue } from "@/src/services/snapshotWriteQueue";

const now = "2026-08-16T12:00:00.000Z";
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

describe("snapshot write queue", () => {
  it("serializes read-modify-replace operations so concurrent changes are preserved", async () => {
    let stored = createEmptySnapshot();
    const repository = {
      async load() {
        const snapshot = structuredClone(stored);
        await pause();
        return snapshot;
      },
      async replace(snapshot: PlannerSnapshot) {
        await pause();
        stored = structuredClone(snapshot);
      },
    };
    const writes = createSnapshotWriteQueue(repository);

    await Promise.all([
      writes.update((snapshot) => ({
        ...snapshot,
        tasks: [...snapshot.tasks, {
          id: "task-1", title: "Preparar propuesta", priority: "high", status: "inbox",
          createdAt: now, updatedAt: now,
        }],
      })),
      writes.update((snapshot) => ({
        ...snapshot,
        habits: [...snapshot.habits, {
          id: "habit-1", name: "Leer", type: "duration", scheduledDays: [1, 3, 5],
          target: 20, unit: "min", status: "active", createdAt: now, updatedAt: now,
        }],
      })),
    ]);

    expect(stored.tasks.map((task) => task.id)).toEqual(["task-1"]);
    expect(stored.habits.map((habit) => habit.id)).toEqual(["habit-1"]);
  });

  it("keeps accepting writes after a failed operation", async () => {
    let stored = createEmptySnapshot();
    const writes = createSnapshotWriteQueue({
      async load() { return structuredClone(stored); },
      async replace(snapshot) { stored = structuredClone(snapshot); },
    });

    await expect(writes.run(async () => { throw new Error("expected"); })).rejects.toThrow("expected");
    await writes.update((snapshot) => ({ ...snapshot, schemaVersion: 3 }));
    expect(stored.schemaVersion).toBe(3);
  });
});

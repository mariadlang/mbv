import type { PlannerSnapshot } from "@/src/domain/planner";
import type { PlannerRepository } from "@/src/repositories/interfaces/PlannerRepository";

type SnapshotRepository = Pick<PlannerRepository, "load" | "replace">;

export function createSnapshotWriteQueue(repository: SnapshotRepository) {
  let tail: Promise<void> = Promise.resolve();

  const run = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const update = (
    updater: (snapshot: PlannerSnapshot) => PlannerSnapshot,
  ): Promise<PlannerSnapshot> => run(async () => {
    const current = await repository.load();
    const next = updater(current);
    await repository.replace(next);
    return next;
  });

  return { run, update };
}

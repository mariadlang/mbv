import type { PlannerSnapshot } from "@/src/domain/planner";

export interface PlannerRepository {
  load(): Promise<PlannerSnapshot>;
  replace(snapshot: PlannerSnapshot): Promise<void>;
  clear(): Promise<void>;
}

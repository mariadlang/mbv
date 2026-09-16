import type { PlannerSnapshot } from "@/src/domain/planner";
import { plannerSnapshotSchema } from "@/src/lib/schemas";
import {
  IndexedDbPlannerRepository,
  LEGACY_PLANNER_DATABASE_NAME,
  plannerDatabaseNameForOwner,
  type PlannerMetadataRecord,
} from "@/src/repositories/local/IndexedDbPlannerRepository";
import {
  IndexedDbLegacyPlannerClaimRepository,
  type LegacyPlannerClaimRegistry,
} from "@/src/repositories/local/LegacyPlannerClaimRepository";

export interface LegacyPlannerSummary {
  name: string;
  areas: number;
  goals: number;
  habits: number;
  tasks: number;
}

export interface LegacyPlannerTarget {
  hasData(): Promise<boolean>;
  getMetadata(): Promise<PlannerMetadataRecord | undefined>;
  replaceFromLegacy(snapshot: PlannerSnapshot, claimToken: string): Promise<void>;
  load(): Promise<PlannerSnapshot>;
  close(): void;
}

export interface LegacyPlannerSource {
  exists(): Promise<boolean>;
  hasData(): Promise<boolean>;
  load(): Promise<PlannerSnapshot>;
  close(): void;
}

export interface LocalPlannerClaimDependencies {
  registry: LegacyPlannerClaimRegistry;
  source: LegacyPlannerSource;
  target: LegacyPlannerTarget;
  token: () => string;
}

function summarize(snapshot: PlannerSnapshot): LegacyPlannerSummary {
  return {
    name: snapshot.profile?.name ?? "Sin perfil",
    areas: snapshot.lifeAreas.length,
    goals: snapshot.goals.length,
    habits: snapshot.habits.length,
    tasks: snapshot.tasks.length,
  };
}

function validateSnapshot(value: unknown): PlannerSnapshot {
  return plannerSnapshotSchema.parse(value) as unknown as PlannerSnapshot;
}

export function createLocalPlannerClaimService(ownerId: string, dependencies: LocalPlannerClaimDependencies) {
  const { registry, source, target, token } = dependencies;

  return {
    async inspect(): Promise<LegacyPlannerSummary | null> {
      if (await target.hasData()) return null;
      if (await registry.hasStartedFresh(ownerId)) return null;
      const existingClaim = await registry.getClaim();
      if (existingClaim && existingClaim.ownerId !== ownerId) return null;
      if (!await source.exists() || !await source.hasData()) return null;
      const snapshot = validateSnapshot(await source.load());
      return summarize(snapshot);
    },

    async claim(): Promise<PlannerSnapshot> {
      const existingMetadata = await target.getMetadata();
      if (existingMetadata) {
        const existingClaim = await registry.getClaim();
        if (!existingClaim || existingClaim.ownerId !== ownerId || existingMetadata.legacyClaimToken !== existingClaim.token) {
          throw new Error("SCOPED_PLANNER_NOT_EMPTY");
        }
        const alreadyCopied = validateSnapshot(await target.load());
        await registry.completeClaim(ownerId, existingClaim.token);
        return alreadyCopied;
      }
      if (!await source.exists() || !await source.hasData()) throw new Error("LEGACY_PLANNER_NOT_FOUND");
      const snapshot = validateSnapshot(await source.load());
      const claim = await registry.beginClaim(ownerId, token());
      await target.replaceFromLegacy(snapshot, claim.token);
      const copiedMetadata = await target.getMetadata();
      if (copiedMetadata?.legacyClaimToken !== claim.token) throw new Error("LEGACY_PLANNER_COPY_NOT_VERIFIED");
      const copied = validateSnapshot(await target.load());
      await registry.completeClaim(ownerId, claim.token);
      return copied;
    },

    startFresh(): Promise<void> {
      return registry.markStartedFresh(ownerId);
    },

    close(): void {
      source.close();
      target.close();
      registry.close();
    },
  };
}

export function createIndexedDbLocalPlannerClaimService(ownerId: string) {
  const target = new IndexedDbPlannerRepository(plannerDatabaseNameForOwner(ownerId), ownerId);
  const legacy = new IndexedDbPlannerRepository(LEGACY_PLANNER_DATABASE_NAME);
  return createLocalPlannerClaimService(ownerId, {
    registry: new IndexedDbLegacyPlannerClaimRepository(),
    target,
    source: {
      exists: () => IndexedDbPlannerRepository.exists(LEGACY_PLANNER_DATABASE_NAME),
      hasData: () => legacy.hasData(),
      load: () => legacy.load(),
      close: () => legacy.close(),
    },
    token: () => crypto.randomUUID(),
  });
}

export type LocalPlannerClaimService = ReturnType<typeof createLocalPlannerClaimService>;

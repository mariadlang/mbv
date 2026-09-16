import Dexie, { type Table } from "dexie";
import { LEGACY_PLANNER_DATABASE_NAME } from "@/src/repositories/local/IndexedDbPlannerRepository";

export interface LegacyPlannerClaim {
  sourceDatabaseName: string;
  ownerId: string;
  token: string;
  status: "pending" | "complete";
  createdAt: string;
  updatedAt: string;
}

interface LegacyPlannerDecision {
  ownerId: string;
  decision: "start_fresh";
  updatedAt: string;
}

class LegacyPlannerClaimDatabase extends Dexie {
  claims!: Table<LegacyPlannerClaim, string>;
  decisions!: Table<LegacyPlannerDecision, string>;

  constructor() {
    super("my-best-version-planner-legacy-claims-v1");
    this.version(1).stores({
      claims: "&sourceDatabaseName, ownerId, status",
      decisions: "&ownerId, decision",
    });
  }
}

export interface LegacyPlannerClaimRegistry {
  getClaim(): Promise<LegacyPlannerClaim | undefined>;
  beginClaim(ownerId: string, token: string): Promise<LegacyPlannerClaim>;
  completeClaim(ownerId: string, token: string): Promise<void>;
  hasStartedFresh(ownerId: string): Promise<boolean>;
  markStartedFresh(ownerId: string): Promise<void>;
  close(): void;
}

export class IndexedDbLegacyPlannerClaimRepository implements LegacyPlannerClaimRegistry {
  private readonly db = new LegacyPlannerClaimDatabase();

  getClaim(): Promise<LegacyPlannerClaim | undefined> {
    return this.db.claims.get(LEGACY_PLANNER_DATABASE_NAME);
  }

  beginClaim(ownerId: string, token: string): Promise<LegacyPlannerClaim> {
    return this.db.transaction("rw", this.db.claims, async () => {
      const existing = await this.db.claims.get(LEGACY_PLANNER_DATABASE_NAME);
      if (existing) {
        if (existing.ownerId !== ownerId) throw new Error("LEGACY_PLANNER_ALREADY_CLAIMED");
        return existing;
      }
      const now = new Date().toISOString();
      const claim: LegacyPlannerClaim = {
        sourceDatabaseName: LEGACY_PLANNER_DATABASE_NAME,
        ownerId,
        token,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };
      await this.db.claims.add(claim);
      return claim;
    });
  }

  async completeClaim(ownerId: string, token: string): Promise<void> {
    await this.db.transaction("rw", this.db.claims, async () => {
      const claim = await this.db.claims.get(LEGACY_PLANNER_DATABASE_NAME);
      if (!claim || claim.ownerId !== ownerId || claim.token !== token) {
        throw new Error("LEGACY_PLANNER_CLAIM_MISMATCH");
      }
      await this.db.claims.put({ ...claim, status: "complete", updatedAt: new Date().toISOString() });
    });
  }

  async hasStartedFresh(ownerId: string): Promise<boolean> {
    return Boolean(await this.db.decisions.get(ownerId));
  }

  async markStartedFresh(ownerId: string): Promise<void> {
    await this.db.decisions.put({ ownerId, decision: "start_fresh", updatedAt: new Date().toISOString() });
  }

  close(): void {
    this.db.close();
  }
}

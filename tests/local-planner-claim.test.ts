import { describe, expect, it } from "vitest";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import type { PlannerMetadataRecord } from "@/src/repositories/local/IndexedDbPlannerRepository";
import type { LegacyPlannerClaim, LegacyPlannerClaimRegistry } from "@/src/repositories/local/LegacyPlannerClaimRepository";
import {
  createLocalPlannerClaimService,
  type LegacyPlannerSource,
  type LegacyPlannerTarget,
} from "@/src/services/localPlannerClaimService";

const now = "2026-09-16T12:00:00.000Z";
const legacySnapshot: PlannerSnapshot = {
  ...createEmptySnapshot(),
  tasks: [{ id: "legacy-task", title: "Dato legacy", priority: "high", status: "inbox", createdAt: now, updatedAt: now }],
};

class MemoryClaimRegistry implements LegacyPlannerClaimRegistry {
  claim?: LegacyPlannerClaim;
  fresh = new Set<string>();
  failCompleteOnce = false;
  async getClaim() { return this.claim; }
  async beginClaim(ownerId: string, token: string) {
    if (this.claim && this.claim.ownerId !== ownerId) throw new Error("LEGACY_PLANNER_ALREADY_CLAIMED");
    this.claim ??= { sourceDatabaseName: "my-best-version-planner", ownerId, token, status: "pending", createdAt: now, updatedAt: now };
    return this.claim;
  }
  async completeClaim(ownerId: string, token: string) {
    if (!this.claim || this.claim.ownerId !== ownerId || this.claim.token !== token) throw new Error("LEGACY_PLANNER_CLAIM_MISMATCH");
    if (this.failCompleteOnce) {
      this.failCompleteOnce = false;
      throw new Error("SIMULATED_CRASH_AFTER_COPY");
    }
    this.claim = { ...this.claim, status: "complete" };
  }
  async hasStartedFresh(ownerId: string) { return this.fresh.has(ownerId); }
  async markStartedFresh(ownerId: string) { this.fresh.add(ownerId); }
  close() {}
}

class MemoryTarget implements LegacyPlannerTarget {
  snapshot: PlannerSnapshot | null = null;
  metadata?: PlannerMetadataRecord;
  replaces = 0;
  async hasData() { return Boolean(this.metadata); }
  async getMetadata() { return this.metadata; }
  async replaceFromLegacy(snapshot: PlannerSnapshot, claimToken: string) {
    this.replaces += 1;
    this.snapshot = structuredClone(snapshot);
    this.metadata = { key: "planner", schemaVersion: 3, updatedAt: now, ownerId: "account-a", legacyClaimToken: claimToken };
  }
  async load() {
    if (!this.snapshot) throw new Error("EMPTY");
    return structuredClone(this.snapshot);
  }
  close() {}
}

function source(snapshot: PlannerSnapshot = legacySnapshot): LegacyPlannerSource {
  return {
    async exists() { return true; },
    async hasData() { return true; },
    async load() { return structuredClone(snapshot); },
    close() {},
  };
}

describe("legacy local planner claim", () => {
  it("copies only after an explicit claim and is idempotent after retry", async () => {
    const registry = new MemoryClaimRegistry();
    const target = new MemoryTarget();
    const service = createLocalPlannerClaimService("account-a", { registry, source: source(), target, token: () => "claim-token" });

    expect(await service.inspect()).toMatchObject({ tasks: 1, goals: 0, habits: 0 });
    expect(target.replaces).toBe(0);

    expect((await service.claim()).tasks[0]?.title).toBe("Dato legacy");
    expect((await service.claim()).tasks[0]?.title).toBe("Dato legacy");
    expect(target.replaces).toBe(1);
    expect(registry.claim?.status).toBe("complete");
  });

  it("never lets a second account claim a source already assigned to A", async () => {
    const registry = new MemoryClaimRegistry();
    const targetA = new MemoryTarget();
    const serviceA = createLocalPlannerClaimService("account-a", { registry, source: source(), target: targetA, token: () => "token-a" });
    await serviceA.claim();

    const serviceB = createLocalPlannerClaimService("account-b", { registry, source: source(), target: new MemoryTarget(), token: () => "token-b" });
    expect(await serviceB.inspect()).toBeNull();
    await expect(serviceB.claim()).rejects.toThrow("LEGACY_PLANNER_ALREADY_CLAIMED");
  });

  it("resumes a pending claim after the copy without copying twice", async () => {
    const registry = new MemoryClaimRegistry();
    registry.failCompleteOnce = true;
    const target = new MemoryTarget();
    const service = createLocalPlannerClaimService("account-a", { registry, source: source(), target, token: () => "claim-token" });

    await expect(service.claim()).rejects.toThrow("SIMULATED_CRASH_AFTER_COPY");
    expect(target.replaces).toBe(1);
    expect(registry.claim?.status).toBe("pending");

    expect((await service.claim()).tasks[0]?.title).toBe("Dato legacy");
    expect(target.replaces).toBe(1);
    expect(registry.claim?.status).toBe("complete");
  });

  it("remembers start-fresh without mutating or deleting the legacy source", async () => {
    const registry = new MemoryClaimRegistry();
    const target = new MemoryTarget();
    let legacyLoads = 0;
    const legacy = source();
    legacy.load = async () => { legacyLoads += 1; return structuredClone(legacySnapshot); };
    const service = createLocalPlannerClaimService("account-a", { registry, source: legacy, target, token: () => "token" });

    await service.startFresh();

    expect(await service.inspect()).toBeNull();
    expect(target.replaces).toBe(0);
    expect(legacyLoads).toBe(0);
  });

  it("does not overwrite a nonempty scoped planner from a different operation", async () => {
    const registry = new MemoryClaimRegistry();
    const target = new MemoryTarget();
    target.snapshot = createEmptySnapshot();
    target.metadata = { key: "planner", schemaVersion: 3, updatedAt: now, ownerId: "account-a" };
    const service = createLocalPlannerClaimService("account-a", { registry, source: source(), target, token: () => "token" });

    await expect(service.claim()).rejects.toThrow("SCOPED_PLANNER_NOT_EMPTY");
    expect(target.replaces).toBe(0);
    expect(registry.claim).toBeUndefined();
  });

  it("validates legacy data before mutating the scoped target", async () => {
    const registry = new MemoryClaimRegistry();
    const target = new MemoryTarget();
    const invalid = { ...legacySnapshot, schemaVersion: 99 } as unknown as PlannerSnapshot;
    const service = createLocalPlannerClaimService("account-a", { registry, source: source(invalid), target, token: () => "token" });

    await expect(service.claim()).rejects.toThrow();
    expect(target.replaces).toBe(0);
    expect(registry.claim).toBeUndefined();
  });
});

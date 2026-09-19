"use client";

import { qualifyingActivityTypes, type QualifyingActivityType } from "@/src/domain/participation";
import { authService } from "@/src/services/authService";

const QUEUE_KEY = "mbv-participation-queue-v2";
const LEGACY_QUEUE_KEY = "mbv-participation-queue-v1";
const MAX_QUEUE_ENTRIES = 50;
export const COMMERCIAL_ACCESS_UPDATED_EVENT = "mbv:commercial-access-updated";

export interface QueuedParticipation {
  userId: string;
  actionType: QualifyingActivityType;
}

export interface ParticipationTransportDependencies {
  getCurrentUserId(): Promise<string | null>;
  getAccessToken(): Promise<string | null>;
  request(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  onCounted(): void;
}

const queuedEntries = new Map<string, QueuedParticipation>();
const requestedFlushUsers = new Set<string>();
let listenerInstalled = false;
let flushPromise: Promise<void> | null = null;

function queueEntryKey(entry: QueuedParticipation): string {
  return `${entry.userId}:${entry.actionType}`;
}

function isQueuedParticipation(value: unknown): value is QueuedParticipation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<QueuedParticipation>;
  return typeof candidate.userId === "string"
    && candidate.userId.length > 0
    && candidate.userId.length <= 128
    && typeof candidate.actionType === "string"
    && qualifyingActivityTypes.includes(candidate.actionType as QualifyingActivityType);
}

export function parseParticipationQueue(value: string | null): QueuedParticipation[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQueuedParticipation).slice(0, MAX_QUEUE_ENTRIES);
  } catch {
    return [];
  }
}

function readQueue(): QueuedParticipation[] {
  if (typeof window === "undefined") return [];
  try {
    // Version 1 did not carry an owner, so it cannot be migrated safely on a
    // shared browser. Dropping only that telemetry avoids cross-account sends.
    window.localStorage.removeItem(LEGACY_QUEUE_KEY);
    return parseParticipationQueue(window.localStorage.getItem(QUEUE_KEY));
  } catch {
    return [];
  }
}

function persistQueue() {
  if (typeof window === "undefined") return;
  try {
    const values = [...queuedEntries.values()].slice(0, MAX_QUEUE_ENTRIES);
    if (values.length) window.localStorage.setItem(QUEUE_KEY, JSON.stringify(values));
    else window.localStorage.removeItem(QUEUE_KEY);
  } catch {
    // La actividad principal ya fue guardada localmente. La telemetría
    // operativa nunca debe impedir el uso si el almacenamiento está restringido.
  }
}

export async function sendParticipationEntry(
  entry: QueuedParticipation,
  dependencies: ParticipationTransportDependencies,
): Promise<void> {
  const userBeforeToken = await dependencies.getCurrentUserId();
  if (userBeforeToken !== entry.userId) throw new Error("PARTICIPATION_ACCOUNT_MISMATCH");
  const token = await dependencies.getAccessToken();
  if (!token) throw new Error("AUTH_TOKEN_UNAVAILABLE");
  const userAfterToken = await dependencies.getCurrentUserId();
  if (userAfterToken !== entry.userId) throw new Error("PARTICIPATION_ACCOUNT_MISMATCH");

  const response = await dependencies.request("/api/commerce/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ actionType: entry.actionType }),
  });
  if (!response.ok) throw new Error(`PARTICIPATION_${response.status}`);
  const result = await response.json() as { counted?: boolean };
  if (result.counted) dependencies.onCounted();
}

function productionDependencies(): ParticipationTransportDependencies {
  return {
    getCurrentUserId: async () => (await authService.getCurrentUser())?.id ?? null,
    getAccessToken: () => authService.getAccessToken(),
    request: (input, init) => fetch(input, init),
    onCounted: () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(COMMERCIAL_ACCESS_UPDATED_EVENT));
      }
    },
  };
}

async function drainQueue(requestedUserId?: string): Promise<void> {
  if (requestedUserId) requestedFlushUsers.add(requestedUserId);
  if (flushPromise) return flushPromise;
  if (typeof window === "undefined" || !navigator.onLine) return;

  flushPromise = (async () => {
    while (navigator.onLine) {
      const activeUserId = (await authService.getCurrentUser())?.id ?? null;
      if (!activeUserId) return;
      requestedFlushUsers.delete(activeUserId);
      const activeEntries = [...queuedEntries.values()].filter((entry) => entry.userId === activeUserId);
      if (!activeEntries.length) {
        // Requests for another account stay queued until that same account is active.
        return;
      }
      for (const entry of activeEntries) {
        try {
          await sendParticipationEntry(entry, productionDependencies());
          queuedEntries.delete(queueEntryKey(entry));
          persistQueue();
        } catch {
          // Includes an account switch while obtaining the token. The entry keeps
          // its original owner and is retried only when that owner signs in again.
          return;
        }
      }
      if (!requestedFlushUsers.size) return;
    }
  })().finally(() => {
    flushPromise = null;
  });
  return flushPromise;
}

function ensureOnlineListener() {
  if (listenerInstalled || typeof window === "undefined") return;
  listenerInstalled = true;
  readQueue().forEach((entry) => queuedEntries.set(queueEntryKey(entry), entry));
  window.addEventListener("online", () => { void drainQueue(); });
}

export const participationService = {
  record(userId: string, actionType: QualifyingActivityType) {
    if (typeof window === "undefined" || !userId) return;
    ensureOnlineListener();
    const entry = { userId, actionType } satisfies QueuedParticipation;
    queuedEntries.set(queueEntryKey(entry), entry);
    persistQueue();
    void drainQueue(userId);
  },
  flush(userId?: string) {
    if (typeof window === "undefined") return Promise.resolve();
    ensureOnlineListener();
    return drainQueue(userId);
  },
};

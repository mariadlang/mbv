import { describe, expect, it } from "vitest";
import { createEmptySnapshot } from "./planner";
import {
  buildReferralLink,
  buildShareCardModel,
  createOpaqueReferralCode,
  REFERRAL_CODE_PATTERN,
  sanitizeShareCardHeadline,
  SHARE_CARD_FORMATS,
} from "./shareCards";

const timestamp = "2026-09-16T12:00:00.000Z";

describe("share card privacy model", () => {
  it("sanitizes an optional headline without retaining controls or unbounded text", () => {
    const longHeadline = `  Un\u202esecreto\ncon   calma ${"x".repeat(100)}  `;
    const result = sanitizeShareCardHeadline(longHeadline);

    expect(result).not.toContain("\u202e");
    expect(result).not.toContain("\n");
    expect(result).toMatch(/^Unsecreto con calma /);
    expect(Array.from(result ?? "")).toHaveLength(72);
    expect(sanitizeShareCardHeadline(" \u200b ")).toBeNull();
  });

  it("builds only aggregate allowlisted evidence and never includes personal source content", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [
      { id: "one", title: "Tarea privada: llamar a Ana", priority: "high", status: "completed", date: "2026-09-14", completedAt: "2026-09-14T12:00:00.000Z", createdAt: timestamp, updatedAt: timestamp },
      { id: "two", title: "Texto libre confidencial", priority: "medium", status: "completed", date: "2026-09-15", completedAt: "2026-09-15T12:00:00.000Z", createdAt: timestamp, updatedAt: timestamp },
    ];
    snapshot.habits = [{ id: "habit", name: "Hábito médico privado", type: "boolean", scheduledDays: [1], target: 1, unit: "vez", status: "active", createdAt: timestamp, updatedAt: timestamp }];
    snapshot.habitLogs = [{ id: "log", habitId: "habit", date: "2026-09-16", value: 1, note: "nota privada", createdAt: timestamp, updatedAt: timestamp }];
    snapshot.goals = [{ id: "goal", title: "Meta privada", reason: "Motivo privado", progressType: "manual", manualProgress: 64, priority: "high", status: "active", createdAt: timestamp, updatedAt: timestamp }];
    snapshot.journalEntries = [{ id: "journal", date: "2026-09-16", type: "free", title: "Diario secreto", text: "Nunca compartir", status: "saved", createdAt: timestamp, updatedAt: timestamp }];
    snapshot.moodLogs = [{ id: "mood", date: "2026-09-16", mood: "Abrumada", energy: 1, factors: ["Privado"], createdAt: timestamp, updatedAt: timestamp }];
    snapshot.transactions = [{ id: "transaction", type: "expense", amount: 900000, date: "2026-09-16", note: "Deuda privada", status: "active", createdAt: timestamp, updatedAt: timestamp }];

    const model = buildShareCardModel(snapshot, {
      format: "story",
      headline: null,
      metricKeys: ["completed_tasks", "habit_checkins", "intentional_days", "goal_progress", "journal", "mood"],
    });

    expect(model).toEqual({
      template: "weekly",
      format: "story",
      ...SHARE_CARD_FORMATS.story,
      headline: null,
      metrics: [
        { key: "completed_tasks", value: 2, suffix: "" },
        { key: "habit_checkins", value: 1, suffix: "" },
        { key: "intentional_days", value: 3, suffix: "" },
        { key: "goal_progress", value: 64, suffix: "%" },
      ],
    });
    const serialized = JSON.stringify(model);
    for (const privateValue of ["Ana", "confidencial", "médico", "nota privada", "Meta privada", "Diario secreto", "Nunca compartir", "Abrumada", "900000", "Deuda privada"]) {
      expect(serialized).not.toContain(privateValue);
    }
  });

  it("uses the exact supported export dimensions", () => {
    const snapshot = createEmptySnapshot();
    expect(buildShareCardModel(snapshot, { format: "story" })).toMatchObject({ width: 1080, height: 1920 });
    expect(buildShareCardModel(snapshot, { format: "feed" })).toMatchObject({ width: 1080, height: 1350 });
    expect(buildShareCardModel(snapshot, { format: "square" })).toMatchObject({ width: 1080, height: 1080 });
  });

  it("limits weekly evidence to the requested period and calculates consistency from scheduled days", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = [
      { id: "inside", title: "Privada", priority: "high", status: "completed", date: "2026-09-15", completedAt: "2026-09-15T10:00:00.000Z", createdAt: timestamp, updatedAt: timestamp },
      { id: "outside", title: "Antigua", priority: "low", status: "completed", date: "2026-08-01", completedAt: "2026-08-01T10:00:00.000Z", createdAt: timestamp, updatedAt: timestamp },
    ];
    snapshot.habits = [
      { id: "habit", name: "Privado", type: "boolean", scheduledDays: [1, 2], target: 1, unit: "vez", status: "active", createdAt: timestamp, updatedAt: timestamp },
      { id: "archived", name: "Archivado", type: "boolean", scheduledDays: [1], target: 1, unit: "vez", status: "archived", createdAt: timestamp, updatedAt: timestamp },
    ];
    snapshot.habitLogs = [
      { id: "inside-log", habitId: "habit", date: "2026-09-15", value: 1, createdAt: timestamp, updatedAt: timestamp },
      { id: "unscheduled-log", habitId: "habit", date: "2026-09-16", value: 1, createdAt: timestamp, updatedAt: timestamp },
      { id: "archived-log", habitId: "archived", date: "2026-09-14", value: 1, createdAt: timestamp, updatedAt: timestamp },
      { id: "outside-log", habitId: "habit", date: "2026-08-01", value: 1, createdAt: timestamp, updatedAt: timestamp },
    ];

    const model = buildShareCardModel(snapshot, {
      template: "habits",
      format: "square",
      dateKeys: ["2026-09-14", "2026-09-15", "2026-09-16"],
      metricKeys: ["completed_tasks", "habit_checkins", "habit_consistency", "intentional_days"],
    });

    expect(model.template).toBe("habits");
    expect(model.metrics).toEqual([
      { key: "completed_tasks", value: 1, suffix: "" },
      { key: "habit_checkins", value: 3, suffix: "" },
      { key: "habit_consistency", value: 50, suffix: "%" },
      { key: "intentional_days", value: 3, suffix: "" },
    ]);
  });
});

describe("opaque referral codes", () => {
  it("creates a URL-safe opaque code from cryptographic bytes", () => {
    const code = createOpaqueReferralCode(() => Uint8Array.from({ length: 18 }, (_, index) => index));

    expect(code).toBe("ref_000102030405060708090a0b0c0d0e0f1011");
    expect(code).toMatch(REFERRAL_CODE_PATTERN);
    expect(buildReferralLink(code)).toBe(`https://mybestversion.life/signup?ref=${code}`);
  });

  it("rejects predictable short entropy, invalid codes and insecure link origins", () => {
    expect(() => createOpaqueReferralCode(() => new Uint8Array(8))).toThrow("INVALID_REFERRAL_RANDOM_BYTES");
    expect(() => buildReferralLink("ref_not-enough")).toThrow("INVALID_REFERRAL_CODE");
    const valid = createOpaqueReferralCode(() => new Uint8Array(16).fill(7));
    expect(() => buildReferralLink(valid, "http://example.com/signup")).toThrow("INVALID_REFERRAL_URL");
  });
});

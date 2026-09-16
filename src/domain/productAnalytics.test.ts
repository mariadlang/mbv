import { describe, expect, it } from "vitest";
import { evaluateActivation, sanitizeProductMetadata, type ActivationEvent, type ProductEventName } from "./productAnalytics";

const createdAt = "2026-09-01T10:00:00.000Z";
const event = (eventName: ProductEventName, day: number, extra: Partial<ActivationEvent> = {}): ActivationEvent => ({
  eventName,
  occurredAt: "2026-09-0" + day + "T10:00:00.000Z",
  ...extra,
});

describe("metadata analytics por evento", () => {
  it("preserves only the closed vocabulary for the concrete event", () => {
    expect(sanitizeProductMetadata({
      source: "weekly_review",
      period: "2026-09-14",
      result: "saved_and_prepare",
      version: 2,
      channel: "private_note",
    }, "weekly_recap_completed")).toEqual({
      source: "weekly_review",
      period: "2026-09-14",
      result: "saved_and_prepare",
      version: "2",
    });
  });

  it("rejects a sensitive single word even when it uses a known metadata key", () => {
    expect(sanitizeProductMetadata({ source: "diagnostico", result: "secreto", section: "salud" }, "task_created")).toEqual({});
    expect(sanitizeProductMetadata({ source: "diagnostico" })).toEqual({});
  });

  it("does not let metadata valid for one event cross into another", () => {
    expect(sanitizeProductMetadata({
      referral_id: "ref_aB3dE5fG7hJ9kL2m",
      channel: "native_share",
      source: "upgrade_page",
    }, "today_view_opened")).toEqual({});
  });

  it("supports exact P2 funnel metadata without accepting free text", () => {
    expect(sanitizeProductMetadata({ surface: "progress", view: "story", channel: "download", version: 2 }, "share_exported")).toEqual({
      surface: "progress",
      view: "story",
      channel: "download",
      version: "2",
    });
    expect(sanitizeProductMetadata({ surface: "progress", view: "weekly", section: "template", version: 2 }, "share_card_customized")).toEqual({
      surface: "progress",
      view: "weekly",
      section: "template",
      version: "2",
    });
  });

  it.each(["move", "release"] as const)("keeps the real return action %s", (result) => {
    expect(sanitizeProductMetadata({
      source: "dashboard",
      surface: "dashboard",
      result,
      days_away: 4,
      version: 2,
    }, "return_experience_action_clicked")).toEqual({
      source: "dashboard",
      surface: "dashboard",
      result,
      days_away: "4",
      version: "2",
    });
  });

  it("accepts only the canonical opaque referral shape", () => {
    const referralId = `ref_${"a1".repeat(16)}`;
    expect(sanitizeProductMetadata({ referral_id: referralId }, "referral_link_created")).toEqual({ referral_id: referralId });
    expect(sanitizeProductMetadata({ referral_id: "ref_aB3dE5fG7hJ9kL2m" }, "referral_link_created")).toEqual({});
  });
});

describe("activación de producto v2", () => {
  it.each(["today", "goal", "weekly_planning", "habit"])("permite activar desde la ruta %s sin exigir una meta", (source) => {
    const result = evaluateActivation([
      event("onboarding_completed", 1),
      event("first_action_created", 1, { metadata: { source, result: "connected" } }),
      event("first_action_completed", 2),
      event("app_session_started", 1, { sessionId: "session-one" }),
      event("app_session_started", 3, { sessionId: "session-two" }),
    ].reverse(), createdAt);
    expect(result).toEqual({
      activated: true,
      onboardingCompleted: true,
      connectedActionCreated: true,
      consciousProgressRecorded: true,
      secondSessionStarted: true,
    });
  });

  it.each(["first_habit_recorded", "action_rescheduled"] as const)("acepta %s como progreso consciente", (progressEvent) => {
    expect(evaluateActivation([
      event("onboarding_completed", 1),
      event("first_action_created", 1, { metadata: { source: "onboarding" } }),
      event(progressEvent, 2),
      event("second_session_started", 3),
    ], createdAt).activated).toBe(true);
  });

  it("no considera conectada una tarea aislada de la bandeja", () => {
    expect(evaluateActivation([
      event("onboarding_completed", 1),
      event("first_action_created", 1, { metadata: { source: "task_inbox" } }),
      event("first_action_completed", 2),
      event("second_session_started", 3),
    ], createdAt).connectedActionCreated).toBe(false);
  });

  it("exige una segunda sesión distinta", () => {
    expect(evaluateActivation([
      event("onboarding_completed", 1),
      event("first_action_created", 1, { metadata: { result: "connected" } }),
      event("first_action_completed", 2),
      event("app_session_started", 1, { sessionId: "same-session" }),
      event("app_session_started", 3, { sessionId: "same-session" }),
    ], createdAt).activated).toBe(false);
  });

  it("rechaza hitos fuera de los primeros siete días", () => {
    expect(evaluateActivation([
      event("onboarding_completed", 1),
      event("first_action_created", 1, { metadata: { result: "connected" } }),
      event("first_action_completed", 2),
      { eventName: "second_session_started", occurredAt: "2026-09-08T10:00:00.001Z" },
    ], createdAt).activated).toBe(false);
  });
});

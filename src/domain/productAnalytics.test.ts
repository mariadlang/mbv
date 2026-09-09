import { describe, expect, it } from "vitest";
import { evaluateActivation, type ActivationEvent, type ProductEventName } from "./productAnalytics";

const createdAt = "2026-09-01T10:00:00.000Z";
const event = (eventName: ProductEventName, day: number, extra: Partial<ActivationEvent> = {}): ActivationEvent => ({
  eventName,
  occurredAt: "2026-09-0" + day + "T10:00:00.000Z",
  ...extra,
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

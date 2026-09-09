// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyticsService,
  claimQueuedProductEvents,
  clearQueuedProductEvents,
  consumeAuthAnalyticsIntent,
  isPermanentAnalyticsFailure,
  PRODUCT_SESSION_IDLE_MS,
  readQueuedProductEvents,
  releaseAnalyticsAccount,
  rememberAuthAnalyticsIntent,
  resolveProductSession,
  setAnalyticsConsent,
  startProductSessionHeartbeat,
} from "@/src/services/analyticsService";

describe("cola de analítica con consentimiento", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setAnalyticsConsent(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no captura eventos sin consentimiento y borra la cola al retirarlo", () => {
    analyticsService.track("signup_started", { source: "email_form" });
    expect(readQueuedProductEvents()).toEqual([]);
    setAnalyticsConsent(true);
    analyticsService.track("signup_started", { source: "email_form" }, "first:v2");
    expect(readQueuedProductEvents()).toHaveLength(1);
    setAnalyticsConsent(false);
    expect(readQueuedProductEvents()).toEqual([]);
  });

  it("conserva el primer timestamp para una misma clave de deduplicación", () => {
    setAnalyticsConsent(true);
    analyticsService.track("first_action_created", { source: "today", result: "connected" }, "first:v2");
    analyticsService.track("first_action_created", { source: "habit", result: "connected" }, "first:v2");
    const events = readQueuedProductEvents();
    expect(events).toHaveLength(1);
    expect(events[0].properties.source).toBe("today");
    expect(Number.isFinite(new Date(events[0].occurredAt).getTime())).toBe(true);
  });

  it("separa eventos por cuenta y conserva la sesión original", () => {
    setAnalyticsConsent(true);
    analyticsService.track("signup_started", { source: "email_form" }, "first:v2");
    const publicSession = readQueuedProductEvents()[0].sessionId;
    claimQueuedProductEvents("account-a");
    analyticsService.track("app_session_started", { source: "authenticated_app" }, "session-a:v2");
    releaseAnalyticsAccount("account-a");
    claimQueuedProductEvents("account-b");
    analyticsService.track("app_session_started", { source: "authenticated_app" }, "session-b:v2");
    expect(readQueuedProductEvents("account-a")).toHaveLength(2);
    expect(readQueuedProductEvents("account-a")[0].sessionId).toBe(publicSession);
    expect(readQueuedProductEvents("account-b")).toHaveLength(1);
  });

  it("crea otra sesión después de 30 minutos de inactividad", () => {
    setAnalyticsConsent(true);
    const first = resolveProductSession(1_000);
    expect(resolveProductSession(1_000 + 29 * 60 * 1000)).toBe(first);
    expect(resolveProductSession(1_000 + 61 * 60 * 1000)).not.toBe(first);
  });

  it("espera actividad real para iniciar una sesión nueva y la emite una sola vez", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T12:00:00.000Z"));
    const started: string[] = [];
    const heartbeat = startProductSessionHeartbeat((sessionId) => started.push(sessionId));
    const first = heartbeat.getSessionId();

    vi.advanceTimersByTime(PRODUCT_SESSION_IDLE_MS + 1);
    expect(started).toEqual([]);

    window.dispatchEvent(new Event("pointerdown"));
    expect(started).toHaveLength(1);
    expect(started[0]).not.toBe(first);

    window.dispatchEvent(new Event("keydown"));
    window.dispatchEvent(new Event("touchstart"));
    window.dispatchEvent(new Event("focus"));
    expect(started).toHaveLength(1);
    heartbeat.stop();
  });

  it("conserva y consume una sola vez la intención OAuth sin datos personales", () => {
    setAnalyticsConsent(true);
    rememberAuthAnalyticsIntent("signup", "google");
    const intent = consumeAuthAnalyticsIntent();
    expect(intent).toMatchObject({ kind: "signup", source: "google" });
    expect(consumeAuthAnalyticsIntent()).toBeNull();
  });

  it("descarta sólo errores cliente permanentes y reintenta fallos temporales", () => {
    expect(isPermanentAnalyticsFailure({ status: 400 })).toBe(true);
    expect(isPermanentAnalyticsFailure({ status: 422 })).toBe(true);
    expect(isPermanentAnalyticsFailure({ name: "ZodError", issues: [] })).toBe(true);
    expect(isPermanentAnalyticsFailure({ status: 408 })).toBe(false);
    expect(isPermanentAnalyticsFailure({ status: 429 })).toBe(false);
    expect(isPermanentAnalyticsFailure({ status: 500 })).toBe(false);
    expect(isPermanentAnalyticsFailure(new TypeError("offline"))).toBe(false);
  });

  it("permite conservar el timestamp autoritativo del hito", () => {
    setAnalyticsConsent(true);
    analyticsService.track("trial_started", { source: "verified_access" }, "started:v2", "2026-09-01T12:00:00.000Z");
    expect(readQueuedProductEvents()[0].occurredAt).toBe("2026-09-01T12:00:00.000Z");
  });

  it("limita la cola y elimina contenido no permitido", () => {
    setAnalyticsConsent(true);
    for (let index = 0; index < 90; index += 1) {
      analyticsService.track("today_view_opened", { route: "/app/today?private=1", journalText: "no guardar" }, "day-" + index);
    }
    const events = readQueuedProductEvents();
    expect(events).toHaveLength(80);
    expect(events.at(-1)?.properties).toEqual({ route: "/app/today" });
    clearQueuedProductEvents();
    expect(readQueuedProductEvents()).toEqual([]);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACTIVATION_DEFINITION, clientProductEventNames, sanitizeProductMetadata, serverProductEventNames } from "@/src/domain/productAnalytics";
import { feedbackTicketSchema, marketingPreferenceSchema, productEventSchema } from "@/src/lib/supportSchemas";

const analyticsV2Migration = readFileSync(new URL("../supabase/migrations/202609080001_product_analytics_v2.sql", import.meta.url), "utf8");

describe("soporte y analítica minimizada", () => {
  it("acepta un ticket válido sin campos sensibles", () => {
    const parsed = feedbackTicketSchema.parse({ type:"bug", category:"Planificación", subject:"No guarda la semana", message:"Intenté guardar la semana y el botón no respondió.", pageUrl:"/app/planning" });
    expect(parsed.type).toBe("bug");
    expect(Object.keys(parsed)).not.toContain("password");
  });

  it("rechaza mensajes demasiado breves", () => {
    expect(feedbackTicketSchema.safeParse({ type:"support", category:"Cuenta", subject:"Ayuda", message:"No" }).success).toBe(false);
  });

  it("conserva sólo metadatos permitidos y elimina contenido privado", () => {
    expect(sanitizeProductMetadata({ route:"/app/journal?entry=private#note", result:"created", journalText:"contenido privado", token:"secreto", email:"persona@example.com" })).toEqual({ route:"/app/journal", result:"created" });
    expect(sanitizeProductMetadata({ source:"persona@example.com" })).toEqual({ source:"redacted" });
  });

  it("mantiene el marketing desactivable y la activación centralizada", () => {
    expect(marketingPreferenceSchema.parse({ consent:false, source:"settings" }).consent).toBe(false);
    expect(ACTIVATION_DEFINITION).toEqual({
      version: 2,
      windowDays: 7,
      requiresOnboarding: true,
      requiresConnectedAction: true,
      acceptedProgressEvents: ["first_action_completed", "first_habit_recorded", "action_rescheduled"],
      requiresSecondSession: true,
      requiresGoal: false,
    });
  });

  it("acepta sólo eventos cliente con timestamp y rechaza hitos del servidor", () => {
    const base = { feature:"account", sessionId:"session-123", dedupeKey:"event:dedupe-123", occurredAt:"2026-09-08T12:00:00.000Z", metadata:{} };
    for (const eventName of clientProductEventNames) expect(productEventSchema.safeParse({ ...base, eventName }).success).toBe(true);
    for (const eventName of serverProductEventNames) expect(productEventSchema.safeParse({ ...base, eventName }).success).toBe(false);
    expect(productEventSchema.safeParse({ ...base, eventName:"app_session_started", occurredAt:"ayer" }).success).toBe(false);
  });

  it("calcula onboarding y activación sobre la cohorte observable v2", () => {
    const summaryFunction = analyticsV2Migration.match(/create or replace function public\.platform_summary_metrics\(\)([\s\S]*?)revoke all on function public\.platform_summary_metrics\(\) from public;/)?.[1];
    expect(summaryFunction).toBeDefined();

    const normalized = summaryFunction!.replace(/\s+/g, " ");
    expect(normalized).toContain("where e.user_id=p.user_id and e.taxonomy_version=2");
    expect(normalized).toContain("'analytics_v2_cohort_users',analytics_v2_cohort_users");
    expect(normalized).toContain("analytics_v2_onboarding_users/nullif(analytics_v2_cohort_users,0)");
    expect(normalized).toContain("analytics_v2_activated_users/nullif(analytics_v2_cohort_users,0)");
    expect(normalized).not.toContain("onboarding_completed_at is not null)/nullif(count(*),0)");
  });
});

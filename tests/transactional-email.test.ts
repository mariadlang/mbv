import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  processNextTransactionalEmail,
  processTransactionalEmailBatch,
  type ClaimedEmailOutboxRow,
  type EmailOutboxPersistence,
} from "@/src/server/email/outbox";
import { renderEmailOutboxRow } from "@/src/server/email/outboxRenderer";
import { renderTransactionalEmail } from "@/src/server/email/templates";
import {
  DisabledEmailTransport,
  emailDedupeKey,
  FakeEmailTransport,
  InMemoryEmailDeliveryLedger,
  TransactionalEmailDispatcher,
} from "@/src/server/email/transport";

const common = {
  name: "María <script>alert(1)</script>",
  appUrl: "https://example.com/app/dashboard",
  subscriptionUrl: "https://example.com/app/settings?section=plan",
  supportEmail: "soporte@example.com",
};

describe("transactional email templates", () => {
  it("renders responsive branded HTML and a plain-text Premium welcome", () => {
    const result = renderTransactionalEmail({
      kind: "premium_welcome",
      ...common,
      interval: "annual",
      amountMinor: 2_999,
      currency: "USD",
      periodStart: "2026-09-19T12:00:00.000Z",
      periodEnd: "2027-09-19T12:00:00.000Z",
      renewalDescription: "Renovación anual el 19 de septiembre de 2027",
    });
    expect(result.subject).toBe("Tu Premium de My Best Version está activo: empieza por aquí");
    expect(result.html).toContain("@media(max-width:520px)");
    expect(result.html).toContain("USD 29,99");
    expect(result.html).toContain("María &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result.html).not.toContain("María <script>");
    expect(result.text).toContain("Fitness y alimentación");
    expect(result.text).toContain("Soporte: soporte@example.com");
  });

  it("uses a neutral greeting when the name is absent", () => {
    const result = renderTransactionalEmail({
      kind: "commercial_trial_activated",
      ...common,
      name: null,
      trialStart: "2026-09-19T12:00:00.000Z",
      trialEnd: "2026-10-19T12:00:00.000Z",
    });
    expect(result.text).toContain("Hola:");
    expect(result.text).toContain("Esta prueba no crea cobros automáticos");
  });

  it("renders all required operational variants", () => {
    const messages = [
      renderTransactionalEmail({ kind: "commercial_trial_ended", ...common }),
      renderTransactionalEmail({ kind: "subscription_renewed", ...common, interval: "monthly", amountMinor: 299, currency: "USD", periodStart: "2026-09-19T12:00:00.000Z", periodEnd: "2026-10-19T12:00:00.000Z" }),
      renderTransactionalEmail({ kind: "renewal_payment_requested", ...common, interval: "annual", amountMinor: 2_999, currency: "USD", dueAt: "2027-09-19T12:00:00.000Z", paymentUrl: "https://www.mercadopago.com.co/pay/period-1" }),
      renderTransactionalEmail({ kind: "renewal_pending", ...common, interval: "monthly" }),
      renderTransactionalEmail({ kind: "payment_failed", ...common, actionUrl: "https://www.mercadopago.com.co/subscriptions/manage" }),
      renderTransactionalEmail({ kind: "subscription_cancelled", ...common, cancelledAt: "2026-09-19T12:00:00.000Z", accessUntil: "2026-10-19T12:00:00.000Z" }),
      renderTransactionalEmail({ kind: "commercial_eligibility_admin", userName: "Ana", userEmail: "ana@example.com", eligibleAt: "2026-09-19T12:00:00.000Z", participationStart: "2026-08-21T12:00:00.000Z", participationEnd: "2026-09-19T12:00:00.000Z", adminRecordUrl: "https://example.com/platform/users/123", supportEmail: "soporte@example.com" }),
    ];
    expect(new Set(messages.map((message) => message.kind)).size).toBe(7);
    expect(messages.every((message) => message.html && message.text && message.subject)).toBe(true);
  });
});

describe("transactional email delivery", () => {
  it("renders the canonical SQL outbox payload without client-provided commercial data", () => {
    const row: ClaimedEmailOutboxRow = {
      id: "7ecf7056-3e0c-4906-af79-d25b33785232",
      userId: "194929c3-56ce-48cf-bdda-8c2dcfb3e5a4",
      recipientKind: "user",
      recipientEmail: "persona@example.com",
      templateKey: "premium_welcome",
      dedupeKey: "premium_welcome:payment-123",
      templateData: {
        plan_interval: "monthly",
        amount_minor: 299,
        currency: "USD",
        period_start: "2026-09-19T12:00:00.000Z",
        period_end: "2026-10-19T12:00:00.000Z",
        next_payment_at: "2026-10-19T12:00:00.000Z",
      },
      attemptCount: 1,
      createdAt: "2026-09-19T12:00:00.000Z",
      claimToken: "405914f9-abf0-4577-bfc7-2eb233f630f5",
      claimExpiresAt: "2026-09-19T12:05:00.000Z",
    };
    const rendered = renderEmailOutboxRow(row, {
      appUrl: "https://example.com/app/dashboard",
      subscriptionUrl: "https://example.com/app/settings?section=plan",
      supportEmail: "soporte@example.com",
      adminRecordUrl: (userId) => `https://example.com/platform/users/${userId}`,
    });
    expect(rendered.kind).toBe("premium_welcome");
    expect(rendered.text).toContain("USD 2,99");
    expect(rendered.text).toContain("https://example.com/app/dashboard");
  });

  it("deduplicates an accepted delivery", async () => {
    const transport = new FakeEmailTransport();
    const dispatcher = new TransactionalEmailDispatcher(transport, new InMemoryEmailDeliveryLedger());
    const message = {
      to: "persona@example.com",
      subject: "Asunto",
      html: "<p>Hola</p>",
      text: "Hola",
      dedupeKey: emailDedupeKey("premium_welcome", "payment-123", "user-123"),
    };
    await expect(dispatcher.send(message)).resolves.toMatchObject({ status: "accepted" });
    await expect(dispatcher.send(message)).resolves.toEqual({ status: "duplicate", providerMessageId: null });
    expect(transport.messages).toHaveLength(1);
  });

  it("never pretends disabled delivery was accepted and leaves it retryable", async () => {
    const dispatcher = new TransactionalEmailDispatcher(new DisabledEmailTransport(), new InMemoryEmailDeliveryLedger());
    const message = {
      to: "persona@example.com",
      subject: "Asunto",
      html: "<p>Hola</p>",
      text: "Hola",
      dedupeKey: emailDedupeKey("commercial_trial_ended", "trial-123", "user-123"),
    };
    await expect(dispatcher.send(message)).resolves.toEqual({ status: "disabled", providerMessageId: null });
    await expect(dispatcher.send(message)).resolves.toEqual({ status: "disabled", providerMessageId: null });
  });

  it("does not claim outbox rows without an explicitly live transport", async () => {
    const persistence: EmailOutboxPersistence = {
      claimNext: vi.fn(),
      isStillRelevant: vi.fn(),
      complete: vi.fn(),
    };
    await expect(processNextTransactionalEmail({
      client: {} as SupabaseClient,
      transport: null,
      persistence,
    })).resolves.toEqual({ status: "blocked", reason: "EMAIL_TRANSPORT_NOT_CONFIGURED" });
    expect(persistence.claimNext).not.toHaveBeenCalled();
  });

  it("claims, sends and completes one row with the opt-in fake test transport", async () => {
    const row: ClaimedEmailOutboxRow = {
      id: "7ecf7056-3e0c-4906-af79-d25b33785232",
      userId: "194929c3-56ce-48cf-bdda-8c2dcfb3e5a4",
      recipientKind: "user",
      recipientEmail: "persona@example.com",
      templateKey: "commercial_trial_ended",
      dedupeKey: "commercial_trial_ended:trial-123",
      templateData: {},
      attemptCount: 1,
      createdAt: "2026-09-19T12:00:00.000Z",
      claimToken: "405914f9-abf0-4577-bfc7-2eb233f630f5",
      claimExpiresAt: "2026-09-19T12:05:00.000Z",
    };
    const persistence: EmailOutboxPersistence = {
      claimNext: vi.fn().mockResolvedValue(row),
      isStillRelevant: vi.fn().mockResolvedValue(true),
      complete: vi.fn().mockResolvedValue(undefined),
    };
    const transport = new FakeEmailTransport();
    await expect(processNextTransactionalEmail({
      client: {} as SupabaseClient,
      transport,
      persistence,
      allowTestTransport: true,
      now: new Date("2026-09-19T12:00:00.000Z"),
      render: () => ({
        kind: "commercial_trial_ended",
        subject: "Tu prueba terminó",
        html: "<p>Tu prueba terminó</p>",
        text: "Tu prueba terminó",
      }),
    })).resolves.toEqual({
      status: "accepted",
      outboxId: row.id,
      providerMessageId: "fake-1",
    });
    expect(transport.messages).toHaveLength(1);
    expect(persistence.complete).toHaveBeenCalledWith(expect.anything(), {
      outboxId: row.id,
      claimToken: row.claimToken,
      status: "accepted",
      providerMessageId: "fake-1",
      errorCode: null,
      nextRetryAt: null,
    });
  });

  it("revalidates a claimed renewal notice and never sends it after payment supersedes it", async () => {
    const row: ClaimedEmailOutboxRow = {
      id: "7ecf7056-3e0c-4906-af79-d25b33785232",
      userId: "194929c3-56ce-48cf-bdda-8c2dcfb3e5a4",
      recipientKind: "user",
      recipientEmail: "persona@example.com",
      templateKey: "renewal_pending",
      dedupeKey: "renewal_pending:payment-123",
      templateData: { plan_interval: "monthly", provider_payment_id: "payment-123" },
      attemptCount: 1,
      createdAt: "2026-09-19T12:00:00.000Z",
      claimToken: "405914f9-abf0-4577-bfc7-2eb233f630f5",
      claimExpiresAt: "2026-09-19T12:05:00.000Z",
    };
    const persistence: EmailOutboxPersistence = {
      claimNext: vi.fn().mockResolvedValue(row),
      isStillRelevant: vi.fn().mockResolvedValue(false),
      complete: vi.fn(),
    };
    const transport = new FakeEmailTransport();

    await expect(processNextTransactionalEmail({
      client: {} as SupabaseClient,
      transport,
      persistence,
      allowTestTransport: true,
      render: () => ({ kind: "renewal_pending", subject: "Pendiente", html: "<p>Pendiente</p>", text: "Pendiente" }),
    })).resolves.toEqual({ status: "superseded", outboxId: row.id });
    expect(transport.messages).toHaveLength(0);
    expect(persistence.complete).not.toHaveBeenCalled();
  });

  it("processes a bounded email batch instead of one row per cron run", async () => {
    const rows = ["7ecf7056-3e0c-4906-af79-d25b33785232", "8ecf7056-3e0c-4906-af79-d25b33785232"].map((id, index): ClaimedEmailOutboxRow => ({
      id,
      userId: "194929c3-56ce-48cf-bdda-8c2dcfb3e5a4",
      recipientKind: "user",
      recipientEmail: "persona@example.com",
      templateKey: "commercial_trial_ended",
      dedupeKey: `commercial_trial_ended:trial-${index}`,
      templateData: {},
      attemptCount: 1,
      createdAt: "2026-09-19T12:00:00.000Z",
      claimToken: index === 0 ? "405914f9-abf0-4577-bfc7-2eb233f630f5" : "505914f9-abf0-4577-bfc7-2eb233f630f5",
      claimExpiresAt: "2026-09-19T12:05:00.000Z",
    }));
    const persistence: EmailOutboxPersistence = {
      claimNext: vi.fn()
        .mockResolvedValueOnce(rows[0])
        .mockResolvedValueOnce(rows[1])
        .mockResolvedValueOnce(null),
      isStillRelevant: vi.fn().mockResolvedValue(true),
      complete: vi.fn().mockResolvedValue(undefined),
    };
    const transport = new FakeEmailTransport();
    const result = await processTransactionalEmailBatch({
      client: {} as SupabaseClient,
      transport,
      persistence,
      allowTestTransport: true,
      maxMessages: 10,
      render: () => ({ kind: "commercial_trial_ended", subject: "Fin", html: "<p>Fin</p>", text: "Fin" }),
    });
    expect(result.processed).toBe(2);
    expect(result.terminal.status).toBe("idle");
    expect(transport.messages).toHaveLength(2);
  });
});

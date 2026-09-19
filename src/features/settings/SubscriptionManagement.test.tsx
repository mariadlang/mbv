// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { UserAccess } from "@/src/domain/access";
import { SubscriptionManagement } from "@/src/features/settings/SubscriptionManagement";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { billingService } from "@/src/services/billingService";
import { useUiStore } from "@/src/stores/useUiStore";

const { refreshAccess } = vi.hoisted(() => ({ refreshAccess: vi.fn() }));
vi.mock("@/src/hooks/useAccount", () => ({ useAccount: () => ({ refreshAccess }) }));

const activeAccess: UserAccess = {
  userId: "7f871b9e-c704-4ef4-8763-a971b1023bdb",
  email: "persona@example.com",
  displayName: "Persona",
  role: "user",
  accessStatus: "paid_monthly",
  subscriptionStatus: "active",
  trialStartedAt: null,
  trialEndsAt: null,
  serverNow: "2026-09-19T12:00:00.000Z",
  eligibilityStatus: "tracking",
  planInterval: "monthly",
  premiumSource: "paid_subscription",
  campaignKey: "consistency-30-v1",
  currentStreakDays: 6,
  eligibleAt: null,
  currentPeriodStartsAt: "2026-09-19T12:00:00.000Z",
  currentPeriodEndsAt: "2026-10-19T12:00:00.000Z",
  nextPaymentAt: "2026-10-19T12:00:00.000Z",
  cancelAtPeriodEnd: false,
};

function renderManagement(access: UserAccess = activeAccess) {
  return render(<I18nProvider><MemoryRouter><SubscriptionManagement access={access} /></MemoryRouter></I18nProvider>);
}

describe("Mi plan subscription management", () => {
  beforeEach(() => {
    useUiStore.setState({ language: "es" });
    refreshAccess.mockReset();
    refreshAccess.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("requires confirmation and explains that paid access remains available", async () => {
    const cancel = vi.spyOn(billingService, "cancelSubscription").mockResolvedValue({
      status: "scheduled",
      accessStatus: "cancellation_scheduled",
      subscriptionStatus: "cancel_at_period_end",
      cancelAtPeriodEnd: true,
      accessUntil: "2026-10-19T12:00:00.000Z",
      serverNow: "2026-09-19T12:01:00.000Z",
    });
    const view = renderManagement();

    fireEvent.click(view.getByRole("button", { name: "Cancelar renovación" }));
    expect(view.getByRole("dialog", { name: "Cancelar la renovación de Premium" })).toBeTruthy();
    expect(view.getByText(/Tu acceso Premium continuará hasta/)).toBeTruthy();
    expect(view.getByText("Tus datos y avances no se eliminan al cancelar la renovación.")).toBeTruthy();

    fireEvent.click(view.getByRole("button", { name: "Sí, cancelar renovación" }));

    await waitFor(() => expect(cancel).toHaveBeenCalledOnce());
    await waitFor(() => expect(refreshAccess).toHaveBeenCalledOnce());
    expect(await view.findByText(/Renovación cancelada. Conservarás Premium hasta/)).toBeTruthy();
  });

  it("does not offer a second cancellation when renewal is already stopped", () => {
    const view = renderManagement({
      ...activeAccess,
      accessStatus: "cancellation_scheduled",
      subscriptionStatus: "cancel_at_period_end",
      cancelAtPeriodEnd: true,
      nextPaymentAt: null,
    });

    expect(view.queryByRole("button", { name: "Cancelar renovación" })).toBeNull();
    expect(view.getByText(/La renovación ya está cancelada/)).toBeTruthy();
  });
});

// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { UpgradePage } from "@/src/features/account/AccountPages";
import { CookieConsentProvider } from "@/src/features/legal/CookieConsent";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import type { BillingStatusResult } from "@/src/repositories/interfaces/BillingRepository";
import { billingService } from "@/src/services/billingService";
import { useUiStore } from "@/src/stores/useUiStore";

const { refreshAccess } = vi.hoisted(() => ({ refreshAccess: vi.fn() }));
vi.mock("@/src/hooks/useAccount", () => ({ useAccount: () => ({ refreshAccess }) }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderUpgrade(path: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <CookieConsentProvider>
          <UpgradePage />
          <LocationProbe />
        </CookieConsentProvider>
      </MemoryRouter>
    </I18nProvider>,
  );
}

function billingStatus(accessStatus: BillingStatusResult["accessStatus"]): BillingStatusResult {
  return {
    accessStatus,
    subscriptionStatus: accessStatus === "paid_monthly" || accessStatus === "paid_annual" ? "active" : "pending",
    interval: accessStatus === "paid_annual" ? "annual" : accessStatus === "paid_monthly" ? "monthly" : null,
    premiumSource: accessStatus === "paid_monthly" || accessStatus === "paid_annual" ? "paid_subscription" : null,
    trialStartedAt: null,
    trialEndsAt: null,
    eligibilityStatus: null,
    campaignKey: null,
    currentStreakDays: 0,
    eligibleAt: null,
    currentPeriodStartsAt: null,
    currentPeriodEndsAt: null,
    nextPaymentAt: null,
    cancelAtPeriodEnd: false,
    serverNow: "2026-09-19T12:00:00.000Z",
  };
}

describe("flujo comercial de Upgrade", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useUiStore.setState({ language: "es" });
    refreshAccess.mockReset();
    refreshAccess.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("conserva el periodo y exige autenticación antes de iniciar checkout", async () => {
    const startCheckout = vi.spyOn(billingService, "startCheckout").mockRejectedValue(new Error("AUTH_REQUIRED"));
    const view = renderUpgrade("/upgrade?interval=annual");

    expect(view.getByText("Premium anual").closest("article")?.classList.contains("is-selected")).toBe(true);
    fireEvent.click(view.getByRole("button", { name: /^Comprar anual$/ }));

    await waitFor(() => expect(startCheckout).toHaveBeenCalledWith("annual"));
    await waitFor(() => expect(view.getByTestId("location").textContent).toBe("/login?next=%2Fupgrade&interval=annual"));
  });

  it("no proclama éxito por el query y espera el estado pagado del backend", async () => {
    let resolveStatus: ((value: BillingStatusResult) => void) | undefined;
    vi.spyOn(billingService, "getStatus").mockReturnValue(new Promise((resolve) => { resolveStatus = resolve; }));
    const view = renderUpgrade("/upgrade?billing=confirming");

    expect(view.getByRole("heading", { name: /^Estamos confirmando tu pago$/ })).toBeTruthy();
    expect(view.getByText("Consultando el estado seguro del pago…", { exact: true })).toBeTruthy();
    expect(view.queryByText(/Pago confirmado/)).toBeNull();

    await act(async () => { resolveStatus?.(billingStatus("paid_annual")); });
    await waitFor(() => expect(view.getByText("Pago confirmado. Ya puedes consultar tu acceso en Mi plan.", { exact: true })).toBeTruthy());
    expect(refreshAccess).toHaveBeenCalledOnce();
  });

  it("mantiene un estado neutral mientras el pago sigue pendiente", async () => {
    vi.spyOn(billingService, "getStatus").mockResolvedValue(billingStatus("payment_pending"));
    const view = renderUpgrade("/upgrade?billing=confirming");

    await waitFor(() => expect(view.getByText("Tu pago aún está pendiente de confirmación. Puedes volver a consultar en unos momentos.", { exact: true })).toBeTruthy());
    expect(view.queryByText(/Pago confirmado/)).toBeNull();
    expect(refreshAccess).not.toHaveBeenCalled();
  });
});

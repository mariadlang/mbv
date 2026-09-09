// @vitest-environment jsdom

import { createElement, type ComponentType, type ReactNode } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsentProvider, useCookieConsent } from "@/src/features/legal/CookieConsent";
import { analyticsService, readQueuedProductEvents, setAnalyticsConsent } from "@/src/services/analyticsService";
import { COOKIE_POLICY_VERSION } from "@/src/lib/legalConfig";
import { UpgradePage } from "@/src/features/account/AccountPages";
import { PremiumFeatureGate } from "@/src/components/access/PremiumFeatureGate";
import type { UserAccess } from "@/src/domain/access";
import { I18nProvider } from "@/src/i18n/I18nProvider";

const LEGAL_STORAGE_KEY = "mbv-legal-privacy-v1";
const TestPremiumFeatureGate = PremiumFeatureGate as ComponentType<Omit<Parameters<typeof PremiumFeatureGate>[0], "children"> & { children?: ReactNode }>;
const trialAccess: UserAccess = {
  userId: "user-1",
  email: "person@example.com",
  displayName: "María",
  role: "user",
  accessStatus: "trial",
  subscriptionStatus: "none",
  trialStartedAt: "2026-09-01T12:00:00.000Z",
  trialEndsAt: "2026-09-16T12:00:00.000Z",
  serverNow: "2026-09-08T12:00:00.000Z",
};

function ConsentProbe() {
  const { preferences } = useCookieConsent();
  return createElement("output", { "data-testid": "analytics-consent" }, preferences?.analytics ? "on" : "off");
}

function persistPreference(analytics: boolean) {
  const preferences = {
    version: COOKIE_POLICY_VERSION,
    essential: true as const,
    functional: false,
    analytics,
    marketing: false,
    decidedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify({ consents: [], requests: [], cookies: preferences }));
  window.dispatchEvent(new StorageEvent("storage", { key: LEGAL_STORAGE_KEY, newValue: window.localStorage.getItem(LEGAL_STORAGE_KEY) }));
}

describe("sincronización de consentimiento entre pestañas", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setAnalyticsConsent(false);
  });

  afterEach(() => {
    cleanup();
    setAnalyticsConsent(false);
    vi.restoreAllMocks();
  });

  it("actualiza el contexto y detiene y limpia analítica al retirar el consentimiento en otra pestaña", async () => {
    const view = render(createElement(MemoryRouter, null, createElement(CookieConsentProvider, null, createElement(ConsentProbe))));
    await waitFor(() => expect(view.getByTestId("analytics-consent").textContent).toBe("off"));

    persistPreference(true);
    await waitFor(() => expect(view.getByTestId("analytics-consent").textContent).toBe("on"));
    analyticsService.track("today_view_opened", { route: "/app/today" }, "cross-tab:v2");
    expect(readQueuedProductEvents()).toHaveLength(1);

    persistPreference(false);
    await waitFor(() => expect(view.getByTestId("analytics-consent").textContent).toBe("off"));
    expect(readQueuedProductEvents()).toEqual([]);
    analyticsService.track("today_view_opened", { route: "/app/today" }, "after-withdrawal:v2");
    expect(readQueuedProductEvents()).toEqual([]);
  });

  it("registra la apertura de Upgrade una vez después de hidratar consentimiento concedido", async () => {
    const track = vi.spyOn(analyticsService, "track");
    const view = render(createElement(I18nProvider, null, createElement(MemoryRouter, null, createElement(CookieConsentProvider, null,
      createElement(ConsentProbe), createElement(UpgradePage)))));
    await waitFor(() => expect(view.getByTestId("analytics-consent").textContent).toBe("off"));
    expect(track).not.toHaveBeenCalled();

    persistPreference(true);
    await waitFor(() => expect(track.mock.calls.filter(([event]) => event === "upgrade_opened")).toHaveLength(1));
    persistPreference(false);
    persistPreference(true);
    await waitFor(() => expect(view.getByTestId("analytics-consent").textContent).toBe("on"));
    expect(track.mock.calls.filter(([event]) => event === "upgrade_opened")).toHaveLength(1);
  });

  it("registra cada gate Premium una vez después de hidratar consentimiento concedido", async () => {
    const track = vi.spyOn(analyticsService, "track");
    const view = render(createElement(MemoryRouter, null, createElement(CookieConsentProvider, null,
      createElement(ConsentProbe),
      createElement(TestPremiumFeatureGate, { access: trialAccess, feature: "five_year_planning" }, createElement("span", null, "Premium")))));
    await waitFor(() => expect(view.getByTestId("analytics-consent").textContent).toBe("off"));
    expect(track).not.toHaveBeenCalled();

    persistPreference(true);
    await waitFor(() => expect(track.mock.calls.filter(([event]) => event === "premium_gate_viewed")).toHaveLength(1));
    persistPreference(false);
    persistPreference(true);
    await waitFor(() => expect(view.getByTestId("analytics-consent").textContent).toBe("on"));
    expect(track.mock.calls.filter(([event]) => event === "premium_gate_viewed")).toHaveLength(1);
  });
});

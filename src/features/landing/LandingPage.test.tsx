// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "@/src/features/landing/LandingPage";
import { CookieConsentProvider, useCookieConsent } from "@/src/features/legal/CookieConsent";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { COOKIE_POLICY_VERSION } from "@/src/lib/legalConfig";
import { analyticsService, setAnalyticsConsent } from "@/src/services/analyticsService";

vi.mock("@/src/hooks/useAccount", () => ({
  useAccount: () => ({ user: null }),
}));

vi.mock("next/image", () => ({
  default: ({ alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element -- unit-test replacement for next/image
    <img alt={alt} {...props} />
  ),
}));

const LEGAL_STORAGE_KEY = "mbv-legal-privacy-v1";

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0.35];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

function ConsentProbe() {
  const { preferences } = useCookieConsent();
  return <output data-testid="analytics-consent">{preferences?.analytics ? "on" : "off"}</output>;
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
  const serialized = JSON.stringify({ consents: [], requests: [], cookies: preferences });
  window.localStorage.setItem(LEGAL_STORAGE_KEY, serialized);
  window.dispatchEvent(new StorageEvent("storage", { key: LEGAL_STORAGE_KEY, newValue: serialized }));
}

describe("analítica de la landing y consentimiento", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setAnalyticsConsent(false);
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    cleanup();
    setAnalyticsConsent(false);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("espera el consentimiento hidratado y registra landing_view una sola vez", async () => {
    const track = vi.spyOn(analyticsService, "track");
    persistPreference(true);

    const view = render(
      <I18nProvider>
        <MemoryRouter>
          <CookieConsentProvider>
            <ConsentProbe />
            <LandingPage />
          </CookieConsentProvider>
        </MemoryRouter>
      </I18nProvider>,
    );

    await waitFor(() => expect(view.getByTestId("analytics-consent").textContent).toBe("on"));
    await waitFor(() => expect(track.mock.calls.filter(([event]) => event === "landing_view")).toHaveLength(1));
    expect(track.mock.calls.find(([event]) => event === "landing_view")?.[1]).toMatchObject({
      source: "landing_hero",
      route: "/",
      version: 2,
    });

    persistPreference(false);
    await waitFor(() => expect(view.getByTestId("analytics-consent").textContent).toBe("off"));
    persistPreference(true);
    await waitFor(() => expect(view.getByTestId("analytics-consent").textContent).toBe("on"));
    expect(track.mock.calls.filter(([event]) => event === "landing_view")).toHaveLength(1);
  });
});

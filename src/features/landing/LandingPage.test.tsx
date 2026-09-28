// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "@/src/features/landing/LandingPage";
import { CookieConsentProvider, useCookieConsent } from "@/src/features/legal/CookieConsent";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { COOKIE_POLICY_VERSION } from "@/src/lib/legalConfig";
import { analyticsService, setAnalyticsConsent } from "@/src/services/analyticsService";
import { landingContent } from "@/src/features/landing/landingContent";
import { LandingAfterTrial, LandingPricing } from "@/src/features/landing/LandingConversionSections";

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

describe("oferta comercial de la landing", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("mantiene el contrato bilingüe de Gratis, Premium y la recompensa de constancia", () => {
    const { es, en } = landingContent;

    expect(es.actions).toMatchObject({ start: "Empieza gratis", login: "Iniciar sesión", included: "Ver qué incluye" });
    expect(es.pricing).toMatchObject({ freePrice: "USD 0", monthlyPrice: "USD 2,99 / mes", annualPrice: "USD 29,99 / año" });
    expect(es.pricing.freeIncludes).toEqual(["Visión", "Metas", "Hábitos y registro", "Mi día", "Dashboard"]);
    expect(es.pricing.premiumIncludes.map(({ title }) => title)).toEqual([
      "Todo lo incluido en Gratis",
      "Fitness y alimentación",
      "Finanzas",
      "Análisis avanzado del progreso",
      "Recomendaciones para ti",
    ]);
    expect(es.reward).toMatchObject({
      titleLines: ["Tu constancia", "tiene recompensa"],
      descriptionLines: ["Usa My Best Version durante 30 días consecutivos", "y recibe 30 días Premium gratis."],
      cta: "Empezar gratis",
      note: "Para sumar un día, guarda al menos una acción en Visión, Metas, Hábitos o Mi día.",
    });
    expect(es.reward.facts.map(({ lines }) => lines)).toEqual([
      ["30 días", "consecutivos"],
      ["30 días", "Premium"],
      ["Sin costo"],
    ]);
    expect(JSON.stringify({ promo: es.promo, reward: es.reward, faq: es.faq })).not.toMatch(/equipo|alerta|activaci[oó]n/i);
    expect(JSON.stringify(es)).not.toMatch(/15 días|30,99|con IA|planificación de (?:1|3|5) (?:año|años|meses)/i);
    expect(en.pricing.annualPrice).toBe("USD 29.99 / year");
    expect(JSON.stringify({ promo: en.promo, reward: en.reward, faq: en.faq })).not.toMatch(/team|alert|activation/i);
    expect(JSON.stringify(en)).not.toMatch(/15-day trial|30\.99|AI recommendations|(?:one|three|five)-(?:month|year) planning/i);
  });

  it("renderiza una sola recompensa accesible y conserva el CTA anónimo", () => {
    const onTrialAction = vi.fn();
    const view = render(
      <MemoryRouter>
        <LandingAfterTrial content={landingContent.es} authenticated={false} onTrialAction={onTrialAction} />
      </MemoryRouter>,
    );

    const reward = within(view.getByRole("region", { name: "Tu constancia tiene recompensa" }));
    expect(reward.getByText("Usa My Best Version durante 30 días consecutivos")).toBeTruthy();
    expect(reward.getByText("y recibe 30 días Premium gratis.")).toBeTruthy();
    expect(reward.getByText("Para sumar un día, guarda al menos una acción en Visión, Metas, Hábitos o Mi día.")).toBeTruthy();
    expect(reward.queryByRole("listitem", { name: /equipo|alerta|activación/i })).toBeNull();
    expect(reward.getAllByRole("listitem")).toHaveLength(3);

    const cta = reward.getByRole("link", { name: "Empezar gratis" });
    expect(cta.getAttribute("href")).toBe("/signup");
    cta.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(cta);
    expect(onTrialAction).toHaveBeenCalledWith("landing_after_trial");
  });

  it("lleva la recompensa al espacio existente cuando hay una sesión", () => {
    const view = render(
      <MemoryRouter>
        <LandingAfterTrial content={landingContent.es} authenticated onTrialAction={vi.fn()} />
      </MemoryRouter>,
    );

    expect(view.getByRole("link", { name: "Ir a mi espacio" }).getAttribute("href")).toBe("/app/dashboard");
  });

  it("conserva el periodo al dirigir compras anónimas hacia el registro", () => {
    const getPurchaseDestination = vi.fn((period: "monthly" | "annual") => `/signup?next=/upgrade&interval=${period}`);
    const onCheckout = vi.fn();
    const onPricingChange = vi.fn();
    const view = render(
      <MemoryRouter>
        <LandingPricing
          content={landingContent.es}
          authenticated={false}
          getPurchaseDestination={getPurchaseDestination}
          onTrialAction={vi.fn()}
          onCheckout={onCheckout}
          onPricingChange={onPricingChange}
        />
      </MemoryRouter>,
    );

    const plans = within(view.getByRole("region", { name: "Elige cómo quieres empezar" }));
    const free = plans.getAllByRole("link", { name: /^Empieza gratis$/ })[0];
    const monthly = plans.getByRole("link", { name: /Comprar mensual/i });
    const annual = plans.getByRole("link", { name: /Comprar anual/i });
    expect(free.getAttribute("href")).toBe("/signup");
    expect(monthly.getAttribute("href")).toBe("/signup?next=/upgrade&interval=monthly");
    expect(annual.getAttribute("href")).toBe("/signup?next=/upgrade&interval=annual");

    monthly.addEventListener("click", (event) => event.preventDefault(), { once: true });
    annual.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(monthly);
    fireEvent.click(annual);
    expect(onPricingChange.mock.calls).toEqual([["monthly"], ["annual"]]);
    expect(onCheckout.mock.calls).toEqual([["landing_pricing", "monthly"], ["landing_pricing", "annual"]]);
  });
});

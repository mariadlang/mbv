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
import { LandingProductShowcase } from "@/src/features/landing/LandingProductVisuals";

vi.mock("@/src/hooks/useAccount", () => ({
  useAccount: () => ({ user: null }),
}));

vi.mock("next/image", () => ({
  default: ({ alt = "", src, ...props }: ImgHTMLAttributes<HTMLImageElement> & { src?: string | { src: string } }) => (
    // eslint-disable-next-line @next/next/no-img-element -- unit-test replacement for next/image
    <img alt={alt} src={typeof src === "string" ? src : src?.src} {...props} />
  ),
  getImageProps: ({ src, sizes }: { src: string | { src: string }; sizes?: string }) => {
    const resolvedSrc = typeof src === "string" ? src : src.src;
    return { props: { src: resolvedSrc, srcSet: `${resolvedSrc} 1x, ${resolvedSrc} 2x`, sizes } };
  },
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
    vi.unstubAllGlobals();
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

  it("mantiene el contrato bilingüe de presentación del producto real", () => {
    const { es, en } = landingContent;

    expect(es.hero.paragraphs[0]).toBe("Ordena tus planes, elige lo importante y encuentra tu siguiente paso para hoy. Un espacio para dar forma a tus metas, organizar tus tareas y reconocer tus avances a tu ritmo.");
    expect(es.benefits.items).toHaveLength(5);
    expect(es.how.steps).toHaveLength(4);
    expect(es.included.items).toHaveLength(6);
    expect(es.included.secondaryItems.map(({ title }) => title)).toEqual(["Alimentación", "Entrenamiento", "Finanzas"]);
    expect(es.showcase.moments.map(({ id }) => id)).toEqual(["today", "planning", "wellbeing", "progress"]);
    expect(en.showcase.moments).toHaveLength(4);
    expect(JSON.stringify(en.showcase)).not.toMatch(/Elige qué hacer hoy|Vista de ejemplo|Reconoce lo que avanzaste/);
  });

  it("inserta una sola invitación después del header y antes del hero sin reemplazar la promoción", async () => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
    const view = render(
      <I18nProvider>
        <MemoryRouter>
          <CookieConsentProvider>
            <LandingPage />
          </CookieConsentProvider>
        </MemoryRouter>
      </I18nProvider>,
    );

    await waitFor(() => expect(view.container.querySelector(".landing-launch-invitation")).toBeTruthy());
    const header = view.container.querySelector(".landing-header");
    const invitation = view.container.querySelector(".landing-launch-invitation")!;
    const hero = view.container.querySelector(".landing-hero");
    expect(header).toBeTruthy();
    expect(hero).toBeTruthy();
    expect(view.container.querySelectorAll(".landing-promo")).toHaveLength(1);
    expect(header!.compareDocumentPosition(invitation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(invitation.compareDocumentPosition(hero!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

describe("selector accesible de momentos del producto", () => {
  afterEach(cleanup);

  it("muestra Mi día primero y cambia un único panel por clic y teclado", () => {
    const view = render(<LandingProductShowcase language="es" content={landingContent.es.showcase} />);
    const tabs = view.getAllByRole("tab");

    expect(tabs).toHaveLength(4);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(view.getAllByRole("tabpanel")).toHaveLength(1);
    expect(view.container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
    expect(view.container.querySelectorAll(".landing-product-selector__panel img")).toHaveLength(1);
    expect(view.getByRole("img", { name: /Mi día con tres prioridades/i }).getAttribute("loading")).toBe("lazy");

    const planningTab = view.getByRole("tab", { name: "Dale un lugar a tus planes" });
    fireEvent.click(planningTab);
    expect(view.getByRole("img", { name: /planificación semanal/i })).toBeTruthy();
    expect(view.queryByRole("img", { name: /Mi día con tres prioridades/i })).toBeNull();

    planningTab.focus();
    fireEvent.keyDown(planningTab, { key: "End" });
    const progressTab = view.getByRole("tab", { name: "Reconoce lo que avanzaste" });
    expect(progressTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(progressTab);
    expect(view.getByRole("img", { name: /Progreso con tareas completadas/i })).toBeTruthy();
    expect(view.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(progressTab.id);
    expect(progressTab.getAttribute("aria-controls")).toBe(view.getByRole("tabpanel").id);
  });

  it("renderiza e interactúa el selector en inglés sin mezclar el copy", () => {
    const view = render(<LandingProductShowcase language="en" content={landingContent.en.showcase} />);
    const initialTab = view.getByRole("tab", { name: "Choose what to do today" });
    const initialImage = view.getByRole("img", { name: /Example My Day view/i });
    expect(initialTab.getAttribute("aria-selected")).toBe("true");
    expect(initialImage.getAttribute("src")).toContain("today-desktop-en");

    fireEvent.click(view.getByRole("tab", { name: "Organize with how you feel in mind" }));
    expect(view.getByRole("heading", { name: "Organize with how you feel in mind" })).toBeTruthy();
    expect(view.getByRole("img", { name: /daily mood and energy/i }).getAttribute("src")).toContain("wellbeing-desktop-en");
    expect(view.queryByText("Vista de ejemplo")).toBeNull();
  });
});

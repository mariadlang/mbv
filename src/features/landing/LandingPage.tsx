"use client";

import { useEffect, useRef } from "react";
import { analyticsService } from "@/src/services/analyticsService";
import { useAccount } from "@/src/hooks/useAccount";
import { useCookieConsent } from "@/src/features/legal/CookieConsent";
import { useI18n } from "@/src/i18n/I18nProvider";
import { landingContent } from "@/src/features/landing/landingContent";
import { LandingNavigation } from "@/src/features/landing/LandingNavigation";
import {
  LandingBenefits,
  LandingHero,
  LandingHowItWorks,
  LandingIncluded,
  LandingProblemSolution,
  LandingShowcase,
} from "@/src/features/landing/LandingStorySections";
import {
  LandingAfterTrial,
  LandingComparison,
  LandingFaq,
  LandingFinalCta,
  LandingFooter,
  LandingPremium,
  LandingPricing,
} from "@/src/features/landing/LandingConversionSections";
import type { ClientProductEventName } from "@/src/domain/productAnalytics";
import type { BillingInterval } from "@/src/domain/commercialOffer";

type TrialSource = "landing_header" | "landing_hero" | "landing_pricing" | "landing_after_trial" | "landing_footer";
type LoginSource = "landing_header" | "landing_hero" | "landing_after_trial" | "landing_footer";
type CheckoutSource = "landing_premium" | "landing_pricing" | "landing_comparison" | "landing_after_trial" | "landing_faq";

function useLandingViewTracking(analyticsEnabled: boolean) {
  const landingViewTracked = useRef(false);
  const seenSections = useRef(new Set<string>());

  useEffect(() => {
    if (!analyticsEnabled) return;
    if (!landingViewTracked.current) {
      analyticsService.track("landing_view", {
        source: "landing_hero",
        route: "/",
        version: 2,
      });
      landingViewTracked.current = true;
    }
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-analytics-view]"));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        const event = element.dataset.analyticsView as ClientProductEventName | undefined;
        const source = element.dataset.analyticsSource;
        const section = element.dataset.analyticsSection;
        if (!event || !source || !section) continue;
        const sectionKey = `${event}:${source}:${section}`;
        if (seenSections.current.has(sectionKey)) {
          observer.unobserve(entry.target);
          continue;
        }
        seenSections.current.add(sectionKey);
        analyticsService.track(event, { source, route: "/", section, version: 2 });
        if (event === "pricing_view") analyticsService.track("paywall_view", { source: "landing_pricing", route: "/", section: "planes", version: 2 });
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.35 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [analyticsEnabled]);
}

export function LandingPage() {
  const { language } = useI18n();
  const { user } = useAccount();
  const { preferences } = useCookieConsent();
  const content = landingContent[language];
  const authenticated = Boolean(user);
  const getPurchaseDestination = (period: BillingInterval) => authenticated
    ? `/upgrade?interval=${period}`
    : `/signup?next=/upgrade&interval=${period}`;
  useLandingViewTracking(preferences?.analytics === true);

  const trackTrialAction = (source: TrialSource) => {
    if (authenticated) return;
    analyticsService.track("landing_trial_cta_click", { source, route: "/signup", version: 2 });
    analyticsService.track("trial_start", { source, route: "/signup", version: 2 });
    if (["landing_header", "landing_hero", "landing_footer"].includes(source)) {
      analyticsService.track("landing_primary_cta_clicked", { source, route: "/signup", version: 2 });
    }
  };
  const trackLogin = (source: LoginSource) => analyticsService.track("landing_login_click", { source, route: "/login", version: 2 });
  const trackNavigation = (section: (typeof content.navigation)[number]["id"]) => analyticsService.track("landing_nav_click", { source: "landing_header", route: "/", section, version: 2 });
  const trackPricingChange = (period: BillingInterval) => analyticsService.track(period === "monthly" ? "pricing_monthly_selected" : "pricing_annual_selected", { source: "landing_pricing", route: "/", section: period, version: 2 });
  const trackCheckout = (source: CheckoutSource, period: BillingInterval) => analyticsService.track("premium_checkout_click", { source, route: "/upgrade", section: period, version: 2 });
  const trackFaqOpen = (index: number) => analyticsService.track("faq_open", { source: "landing_faq", route: "/", section: "faq", version: 2 }, `faq:${index}:v2`);

  return (
    <div className="landing-page" data-i18n-explicit="true">
      <a className="landing-skip-link" href="#landing-main">Saltar al contenido</a>
      <LandingNavigation content={content} authenticated={authenticated} onNavigation={trackNavigation} onPrimaryAction={() => trackTrialAction("landing_header")} onLogin={() => trackLogin("landing_header")} />
      <main id="landing-main">
        <LandingHero content={content} authenticated={authenticated} onTrialAction={trackTrialAction} onLogin={trackLogin} />
        <LandingBenefits content={content} />
        <LandingProblemSolution content={content} />
        <LandingHowItWorks content={content} />
        <LandingIncluded content={content} />
        <LandingShowcase content={content} />
        <LandingPremium content={content} />
        <LandingPricing content={content} authenticated={authenticated} getPurchaseDestination={getPurchaseDestination} onTrialAction={trackTrialAction} onCheckout={trackCheckout} onPricingChange={trackPricingChange} />
        <LandingComparison content={content} />
        <LandingAfterTrial content={content} />
        <LandingFinalCta content={content} authenticated={authenticated} onTrialAction={trackTrialAction} onLogin={trackLogin} />
        <LandingFaq content={content} getPurchaseDestination={getPurchaseDestination} onCheckout={trackCheckout} onFaqOpen={trackFaqOpen} />
      </main>
      <LandingFooter content={content} authenticated={authenticated} onTrialAction={trackTrialAction} onLogin={trackLogin} />
    </div>
  );
}

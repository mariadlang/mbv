"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Minus, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { CookiePreferencesButton } from "@/src/features/legal/CookieConsent";
import type { LandingContent } from "@/src/features/landing/landingContent";
import { LandingIcon } from "@/src/features/landing/LandingIcon";

type BillingPeriod = "monthly" | "annual";
type CheckoutSource = "landing_premium" | "landing_pricing" | "landing_comparison" | "landing_after_trial" | "landing_faq";

interface ConversionProps {
  content: LandingContent;
  authenticated: boolean;
  checkoutUrl: string;
  onTrialAction(source: "landing_pricing" | "landing_after_trial" | "landing_footer"): void;
  onLogin(source: "landing_after_trial" | "landing_footer"): void;
  onCheckout(source: CheckoutSource, period: BillingPeriod): void;
  onPricingChange(period: BillingPeriod): void;
  onFaqOpen(index: number): void;
}

export function LandingPremium({ content, checkoutUrl, onCheckout }: Pick<ConversionProps, "content" | "checkoutUrl" | "onCheckout">) {
  return (
    <section className="landing-section landing-section--premium" data-analytics-view="premium_benefits_view" data-analytics-source="landing_premium" data-analytics-section="beneficios" aria-labelledby="landing-premium-title">
      <div className="landing-shell landing-section__intro landing-section__intro--center">
        <p className="landing-eyebrow">{content.premium.eyebrow}</p>
        <h2 id="landing-premium-title">{content.premium.title}</h2>
        <p>{content.premium.description}</p>
      </div>
      <div className="landing-shell landing-premium-grid">
        {content.premium.items.map((item) => <article key={item.title} className="landing-premium-card"><div><span className="landing-icon"><LandingIcon name={item.icon} /></span><span className={`landing-status landing-status--${item.availability}`}>{item.availability === "available" ? content.premium.availableLabel : content.premium.comingSoonLabel}</span></div><h3>{item.title}</h3><p>{item.description}</p><small>{item.detail}</small></article>)}
      </div>
      <div className="landing-shell landing-section__action"><a className="landing-button landing-button--secondary" href={checkoutUrl} target="_blank" rel="noreferrer" onClick={() => onCheckout("landing_premium", "monthly")}>{content.actions.checkout}<ArrowRight aria-hidden="true" size={18} /></a></div>
    </section>
  );
}

export function LandingPricing({ content, authenticated, checkoutUrl, onTrialAction, onCheckout, onPricingChange }: Pick<ConversionProps, "content" | "authenticated" | "checkoutUrl" | "onTrialAction" | "onCheckout" | "onPricingChange">) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const setBillingPeriod = (next: BillingPeriod) => {
    setPeriod(next);
    onPricingChange(next);
  };
  const primaryDestination = authenticated ? "/app/dashboard" : "/trial";
  return (
    <section id="planes" className="landing-section landing-section--pricing" data-analytics-view="pricing_view" data-analytics-source="landing_pricing" data-analytics-section="planes" aria-labelledby="landing-pricing-title">
      <div className="landing-shell landing-section__intro landing-section__intro--center">
        <p className="landing-eyebrow">{content.pricing.eyebrow}</p>
        <h2 id="landing-pricing-title">{content.pricing.title}</h2>
        <p>{content.pricing.description}</p>
        <div className="landing-period-selector" role="group" aria-label={content.accessibility.pricingSelector}>
          <button type="button" aria-pressed={period === "monthly"} onClick={() => setBillingPeriod("monthly")}>{content.pricing.monthly}</button>
          <button type="button" aria-pressed={period === "annual"} onClick={() => setBillingPeriod("annual")}>{content.pricing.annual}</button>
        </div>
      </div>
      <div className="landing-shell landing-pricing-grid">
        <article className="landing-plan-card">
          <div className="landing-plan-card__heading"><span className="landing-icon"><LandingIcon name="leaf" /></span><div><h3>{content.pricing.trialName}</h3><p>{content.pricing.trialDescription}</p></div></div>
          <p className="landing-price"><strong>{content.pricing.trialPrice}</strong><span>{content.pricing.trialPeriod}</span></p>
          <div className="landing-plan-list"><h4>{content.pricing.trialIncludesLabel}</h4><ul>{content.pricing.trialIncludes.map((item) => <li key={item}><Check aria-hidden="true" size={17} />{item}</li>)}</ul></div>
          <div className="landing-plan-list landing-plan-list--muted"><h4>{content.pricing.trialExcludesLabel}</h4><ul>{content.pricing.trialExcludes.map((item) => <li key={item}><Minus aria-hidden="true" size={17} />{item}</li>)}</ul></div>
          <Link className="landing-button landing-button--secondary landing-button--wide" to={primaryDestination} onClick={() => onTrialAction("landing_pricing")}>{authenticated ? content.actions.openSpace : content.actions.start}</Link>
          {!authenticated && <small className="landing-plan-trust"><ShieldCheck aria-hidden="true" size={16} />{content.pricing.trialTrust}</small>}
        </article>
        <article className="landing-plan-card landing-plan-card--premium">
          <span className="landing-plan-card__badge"><Sparkles aria-hidden="true" size={14} />Premium</span>
          <div className="landing-plan-card__heading"><span className="landing-icon"><LandingIcon name="sparkles" /></span><div><h3>{content.pricing.premiumName}</h3><p>{content.pricing.premiumDescription}</p></div></div>
          <p className="landing-price"><strong>{period === "monthly" ? content.pricing.monthlyPrice : content.pricing.annualPrice}</strong></p>
          <div className="landing-plan-list"><h4>{content.pricing.premiumIncludesLabel}</h4><ul>{content.pricing.premiumIncludes.map((item) => <li key={item.title}><Check aria-hidden="true" size={17} /><span>{item.title}{item.detail && <small>{item.detail}</small>}</span></li>)}</ul></div>
          <div className="landing-plan-list landing-plan-list--upcoming"><h4>{content.pricing.premiumComingSoonLabel}</h4><ul>{content.pricing.premiumComingSoon.map((item) => <li key={item}><Sparkles aria-hidden="true" size={15} />{item}</li>)}</ul></div>
          <a className="landing-button landing-button--primary landing-button--wide" href={checkoutUrl} target="_blank" rel="noreferrer" onClick={() => onCheckout("landing_pricing", period)}>{content.actions.checkout}<ArrowRight aria-hidden="true" size={18} /></a>
          {!authenticated && <Link className="landing-plan-secondary" to="/trial" onClick={() => onTrialAction("landing_pricing")}>{content.actions.start}</Link>}
          <small className="landing-checkout-note">{content.pricing.checkoutNote}</small>
        </article>
      </div>
    </section>
  );
}

function ComparisonValue({ value, content }: { value: boolean | "coming_soon"; content: LandingContent }) {
  if (value === "coming_soon") return <span className="landing-comparison__soon"><Sparkles aria-hidden="true" size={15} />{content.comparison.comingSoon}</span>;
  if (value) return <span className="landing-comparison__yes"><Check aria-hidden="true" /><span className="landing-sr-only">{content.accessibility.comparisonAvailable}</span></span>;
  return <span className="landing-comparison__no"><Minus aria-hidden="true" /><span className="landing-sr-only">{content.accessibility.comparisonUnavailable}</span></span>;
}

export function LandingComparison({ content }: { content: LandingContent }) {
  return (
    <section className="landing-section landing-section--comparison" aria-labelledby="landing-comparison-title">
      <div className="landing-shell landing-section__intro landing-section__intro--center"><p className="landing-eyebrow">{content.comparison.eyebrow}</p><h2 id="landing-comparison-title">{content.comparison.title}</h2><p>{content.comparison.description}</p></div>
      <div className="landing-shell landing-comparison-wrap">
        <table className="landing-comparison"><thead><tr><th scope="col">{content.comparison.featureLabel}</th><th scope="col">{content.comparison.trialLabel}</th><th scope="col">{content.comparison.premiumLabel}</th></tr></thead><tbody>{content.comparison.rows.map((row) => <tr key={row.feature}><th scope="row">{row.feature}</th><td data-label={content.comparison.trialLabel}><ComparisonValue value={row.trial} content={content} /></td><td data-label={content.comparison.premiumLabel}><ComparisonValue value={row.premium} content={content} /></td></tr>)}</tbody></table>
      </div>
    </section>
  );
}

export function LandingAfterTrial({ content }: { content: LandingContent }) {
  return (
    <section className="landing-section landing-section--after-trial" aria-labelledby="landing-after-trial-title"><div className="landing-shell landing-after-trial"><span className="landing-icon"><ShieldCheck aria-hidden="true" /></span><div><p className="landing-eyebrow">{content.afterTrial.eyebrow}</p><h2 id="landing-after-trial-title">{content.afterTrial.title}</h2>{content.afterTrial.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><blockquote>{content.afterTrial.note}</blockquote></div></section>
  );
}

export function LandingFinalCta({ content, authenticated, onTrialAction, onLogin }: Pick<ConversionProps, "content" | "authenticated" | "onTrialAction" | "onLogin">) {
  const destination = authenticated ? "/app/dashboard" : "/trial";
  return (
    <section className="landing-final-cta" aria-labelledby="landing-final-title"><div className="landing-shell"><p className="landing-eyebrow">{content.finalCta.eyebrow}</p><h2 id="landing-final-title">{content.finalCta.title}</h2><p>{content.finalCta.description}</p><div className="landing-actions"><Link className="landing-button landing-button--primary" to={destination} onClick={() => onTrialAction("landing_after_trial")}>{authenticated ? content.actions.openSpace : content.actions.start}<ArrowRight aria-hidden="true" size={18} /></Link>{!authenticated && <Link className="landing-button landing-button--secondary" to="/login" onClick={() => onLogin("landing_after_trial")}>{content.actions.login}</Link>}<a className="landing-text-link" href="#que-incluye">{content.actions.included}<ArrowRight aria-hidden="true" size={16} /></a></div></div></section>
  );
}

export function LandingFaq({ content, checkoutUrl, onCheckout, onFaqOpen }: Pick<ConversionProps, "content" | "checkoutUrl" | "onCheckout" | "onFaqOpen">) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section id="faq" className="landing-section landing-section--faq" aria-labelledby="landing-faq-title">
      <div className="landing-shell landing-section__intro landing-section__intro--center"><p className="landing-eyebrow">{content.faq.eyebrow}</p><h2 id="landing-faq-title">{content.faq.title}</h2><p>{content.faq.description}</p></div>
      <div className="landing-shell landing-faq-list">{content.faq.items.map((item, index) => { const open = openIndex === index; const panelId = `landing-faq-panel-${index}`; return <article key={item.question} className={open ? "is-open" : ""}><h3><button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => { setOpenIndex(open ? null : index); if (!open) onFaqOpen(index); }}>{item.question}<ChevronDown aria-hidden="true" /></button></h3><div id={panelId} hidden={!open}><p>{item.answer}</p>{item.checkout && <a href={checkoutUrl} target="_blank" rel="noreferrer" onClick={() => onCheckout("landing_faq", "monthly")}>{content.actions.checkout}<ArrowRight aria-hidden="true" size={16} /></a>}</div></article>; })}</div>
    </section>
  );
}

export function LandingFooter({ content, authenticated, onTrialAction, onLogin }: Pick<ConversionProps, "content" | "authenticated" | "onTrialAction" | "onLogin">) {
  return (
    <footer className="landing-footer"><div className="landing-shell landing-footer__grid"><div className="landing-footer__brand"><BrandMark /><strong>{content.footer.tagline}</strong></div><div><h2>{content.footer.product}</h2><a href="#como-funciona">{content.navigation[0].label}</a><a href="#que-incluye">{content.navigation[1].label}</a><a href="#planes">{content.navigation[3].label}</a><a href="#faq">{content.navigation[4].label}</a></div><div><h2>{content.footer.account}</h2>{authenticated ? <Link to="/app/dashboard">{content.actions.openSpace}</Link> : <><Link to="/trial" onClick={() => onTrialAction("landing_footer")}>{content.actions.start}</Link><Link to="/login" onClick={() => onLogin("landing_footer")}>{content.actions.login}</Link></>}</div><div><h2>{content.footer.legal}</h2><Link to="/privacy">{content.footer.privacy}</Link><Link to="/terms">{content.footer.terms}</Link><Link to="/cookies">{content.footer.cookies}</Link><CookiePreferencesButton /><Link to="/pqr">{content.footer.pqr}</Link></div></div><div className="landing-shell landing-footer__bottom"><span>{content.footer.copyright}</span><span>My Best Version · {content.footer.tagline}</span></div></footer>
  );
}

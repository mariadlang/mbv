import { ArrowRight, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { LandingContent } from "@/src/features/landing/landingContent";
import { LandingIcon } from "@/src/features/landing/LandingIcon";
import { LandingHeroVisual, LandingProductShowcase } from "@/src/features/landing/LandingProductVisuals";

interface LandingStorySectionsProps {
  content: LandingContent;
  authenticated: boolean;
  onTrialAction(source: "landing_hero"): void;
  onLogin(source: "landing_hero"): void;
}

export function LandingHero({ content, authenticated, onTrialAction, onLogin }: LandingStorySectionsProps) {
  const destination = authenticated ? "/app/dashboard" : "/signup";
  return (
    <section id="inicio" className="landing-hero landing-shell" aria-labelledby="landing-title">
      <div className="landing-hero__copy">
        <p className="landing-eyebrow">{content.hero.eyebrow}</p>
        <h1 id="landing-title">{content.hero.title} <em>{content.hero.accent}</em></h1>
        {content.hero.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="landing-actions">
          <Link className="landing-button landing-button--primary" to={destination} onClick={() => onTrialAction("landing_hero")}>
            {authenticated ? content.actions.openSpace : content.actions.start}<ArrowRight aria-hidden="true" size={18} />
          </Link>
          {!authenticated && <Link className="landing-button landing-button--secondary" to="/login" onClick={() => onLogin("landing_hero")}>{content.actions.login}</Link>}
          <a className="landing-button landing-button--secondary" href="#que-incluye">{content.actions.included}</a>
        </div>
        {!authenticated && <p className="landing-trust"><Check aria-hidden="true" size={16} />{content.hero.trust}</p>}
      </div>
      <LandingHeroVisual alt={content.hero.visualAlt} />
    </section>
  );
}

export function LandingBenefits({ content }: { content: LandingContent }) {
  return (
    <section id="beneficios" className="landing-section landing-section--benefits" data-analytics-view="benefits_view" data-analytics-source="landing_benefits" data-analytics-section="beneficios" aria-labelledby="landing-benefits-title">
      <div className="landing-shell landing-section__intro landing-section__intro--center">
        <p className="landing-eyebrow">{content.benefits.eyebrow}</p>
        <h2 id="landing-benefits-title">{content.benefits.title}</h2>
        <p>{content.benefits.description}</p>
      </div>
      <div className="landing-shell landing-feature-grid landing-feature-grid--four">
        {content.benefits.items.map((item) => <article key={item.title} className="landing-feature-card"><span className="landing-icon"><LandingIcon name={item.icon} /></span><h3>{item.title}</h3><p>{item.description}</p></article>)}
      </div>
    </section>
  );
}

export function LandingProblemSolution({ content }: { content: LandingContent }) {
  return (
    <section className="landing-section landing-section--story" aria-labelledby="landing-problem-title">
      <div className="landing-shell landing-section__intro">
        <p className="landing-eyebrow">{content.problemSolution.eyebrow}</p>
        <h2 id="landing-problem-title">{content.problemSolution.title}</h2>
        <p>{content.problemSolution.description}</p>
      </div>
      <div className="landing-shell landing-problem-solution">
        <article className="landing-story-card landing-story-card--problem">
          <span>{content.problemSolution.problemLabel}</span>
          <h3>{content.problemSolution.problemTitle}</h3>
          <ul>{content.problemSolution.problemItems.map((item) => <li key={item}><X aria-hidden="true" size={18} />{item}</li>)}</ul>
        </article>
        <div className="landing-story-arrow" aria-hidden="true"><ArrowRight /></div>
        <article className="landing-story-card landing-story-card--solution">
          <span>{content.problemSolution.solutionLabel}</span>
          <h3>{content.problemSolution.solutionTitle}</h3>
          <ul>{content.problemSolution.solutionItems.map((item) => <li key={item}><Check aria-hidden="true" size={18} />{item}</li>)}</ul>
        </article>
      </div>
    </section>
  );
}

export function LandingHowItWorks({ content }: { content: LandingContent }) {
  return (
    <section id="como-funciona" className="landing-section landing-section--how" data-analytics-view="how_it_works_view" data-analytics-source="landing_how_it_works" data-analytics-section="como-funciona" aria-labelledby="landing-how-title">
      <div className="landing-shell landing-section__intro landing-section__intro--center">
        <p className="landing-eyebrow">{content.how.eyebrow}</p>
        <h2 id="landing-how-title">{content.how.title}</h2>
        <p>{content.how.description}</p>
      </div>
      <ol className="landing-shell landing-flow">
        {content.how.steps.map((step, index) => <li key={step.title}><span className="landing-flow__number">{String(index + 1).padStart(2, "0")}</span><span className="landing-icon"><LandingIcon name={step.icon} /></span><h3>{step.title}</h3><p>{step.description}</p></li>)}
      </ol>
    </section>
  );
}

export function LandingIncluded({ content }: { content: LandingContent }) {
  return (
    <section id="que-incluye" className="landing-section landing-section--included" aria-labelledby="landing-included-title">
      <div className="landing-shell landing-section__intro landing-section__intro--center">
        <p className="landing-eyebrow">{content.included.eyebrow}</p>
        <h2 id="landing-included-title">{content.included.title}</h2>
        <p>{content.included.description}</p>
      </div>
      <div className="landing-shell landing-feature-grid landing-feature-grid--included">
        {content.included.items.map((item) => <article key={item.title} className="landing-included-card"><span className="landing-icon"><LandingIcon name={item.icon} /></span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}
      </div>
    </section>
  );
}

export function LandingShowcase({ content }: { content: LandingContent }) {
  return (
    <section className="landing-section landing-section--showcase" aria-labelledby="landing-showcase-title">
      <div className="landing-shell landing-section__intro landing-section__intro--center">
        <p className="landing-eyebrow">{content.showcase.eyebrow}</p>
        <h2 id="landing-showcase-title">{content.showcase.title}</h2>
        <p>{content.showcase.description}</p>
      </div>
      <div className="landing-shell"><LandingProductShowcase content={content.showcase} /></div>
    </section>
  );
}

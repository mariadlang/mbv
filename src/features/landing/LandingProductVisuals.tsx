import Image from "next/image";
import dashboardScreenshot from "../../../docs/qa/screenshots/p0-dashboard-1440x900.png";
import habitsScreenshot from "../../../docs/qa/screenshots/p0-habits-1440x900.png";
import todayScreenshot from "../../../docs/qa/screenshots/p0-today-390x844.png";
import type { LandingContent } from "@/src/features/landing/landingContent";

export function LandingHeroVisual({ alt }: { alt: string }) {
  return (
    <div className="landing-hero-visual">
      <div className="landing-hero-visual__halo" aria-hidden="true" />
      <div className="landing-device landing-device--desktop">
        <div className="landing-device__bar" aria-hidden="true"><span /><span /><span /></div>
        <Image src={dashboardScreenshot} alt={alt} loading="eager" sizes="(max-width: 760px) 88vw, 48vw" />
      </div>
      <div className="landing-device landing-device--phone">
        <span className="landing-device__notch" aria-hidden="true" />
        <Image src={todayScreenshot} alt="" sizes="(max-width: 760px) 34vw, 15vw" />
      </div>
      <blockquote>“Disciplina hoy, libertad mañana.” <span aria-hidden="true">♡</span></blockquote>
    </div>
  );
}

export function LandingProductShowcase({ content }: { content: LandingContent["showcase"] }) {
  const items = [
    { label: content.labels[0], alt: content.dashboardAlt, src: dashboardScreenshot, className: "landing-showcase__dashboard" },
    { label: content.labels[1], alt: content.todayAlt, src: todayScreenshot, className: "landing-showcase__today" },
    { label: content.labels[2], alt: content.habitsAlt, src: habitsScreenshot, className: "landing-showcase__habits" },
  ];
  return (
    <div className="landing-showcase" role="group" aria-label={content.title}>
      {items.map((item) => (
        <figure key={item.label} className={item.className}>
          <div className="landing-showcase__frame"><Image src={item.src} alt={item.alt} sizes="(max-width: 760px) 92vw, 48vw" /></div>
          <figcaption>{item.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

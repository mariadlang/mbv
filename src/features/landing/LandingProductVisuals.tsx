"use client";

import Image, { getImageProps, type StaticImageData } from "next/image";
import { useState } from "react";
import planningDesktop from "../../../public/landing/product/planning-desktop.png";
import planningDesktopEn from "../../../public/landing/product/planning-desktop-en.png";
import planningMobile from "../../../public/landing/product/planning-mobile.png";
import planningMobileEn from "../../../public/landing/product/planning-mobile-en.png";
import progressDesktop from "../../../public/landing/product/progress-desktop.png";
import progressDesktopEn from "../../../public/landing/product/progress-desktop-en.png";
import progressMobile from "../../../public/landing/product/progress-mobile.png";
import progressMobileEn from "../../../public/landing/product/progress-mobile-en.png";
import todayDesktop from "../../../public/landing/product/today-desktop.png";
import todayDesktopEn from "../../../public/landing/product/today-desktop-en.png";
import todayMobile from "../../../public/landing/product/today-mobile.png";
import todayMobileEn from "../../../public/landing/product/today-mobile-en.png";
import wellbeingDesktop from "../../../public/landing/product/wellbeing-desktop.png";
import wellbeingDesktopEn from "../../../public/landing/product/wellbeing-desktop-en.png";
import wellbeingMobile from "../../../public/landing/product/wellbeing-mobile.png";
import wellbeingMobileEn from "../../../public/landing/product/wellbeing-mobile-en.png";
import type { LandingContent, LandingShowcaseMomentId } from "@/src/features/landing/landingContent";
import { Tabs } from "@/src/components/ui/Primitives";
import type { Language } from "@/src/stores/useUiStore";

type ProductCaptureSet = Record<LandingShowcaseMomentId, { desktop: StaticImageData; mobile: StaticImageData }>;

const productCaptures: Record<Language, ProductCaptureSet> = {
  es: {
    today: { desktop: todayDesktop, mobile: todayMobile },
    planning: { desktop: planningDesktop, mobile: planningMobile },
    wellbeing: { desktop: wellbeingDesktop, mobile: wellbeingMobile },
    progress: { desktop: progressDesktop, mobile: progressMobile },
  },
  en: {
    today: { desktop: todayDesktopEn, mobile: todayMobileEn },
    planning: { desktop: planningDesktopEn, mobile: planningMobileEn },
    wellbeing: { desktop: wellbeingDesktopEn, mobile: wellbeingMobileEn },
    progress: { desktop: progressDesktopEn, mobile: progressMobileEn },
  },
};

function ProductCapture({ desktop, mobile, alt, priority = false }: {
  desktop: StaticImageData;
  mobile: StaticImageData;
  alt: string;
  priority?: boolean;
}) {
  const mobileSizes = "(max-width: 640px) calc(100vw - 28px), 640px";
  const { props: mobileImageProps } = getImageProps({ src: mobile, alt: "", sizes: mobileSizes });
  return (
    <picture>
      <source
        media="(max-width: 640px)"
        srcSet={mobileImageProps.srcSet}
        sizes={mobileImageProps.sizes}
        width={mobile.width}
        height={mobile.height}
      />
      <Image
        src={desktop}
        alt={alt}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        sizes="(max-width: 640px) calc(100vw - 28px), (max-width: 900px) calc(100vw - 44px), 54vw"
      />
    </picture>
  );
}

export function LandingHeroVisual({ language, alt, exampleLabel }: { language: Language; alt: string; exampleLabel: string }) {
  const capture = productCaptures[language].today;
  return (
    <div className="landing-hero-visual">
      <figure className="landing-product-capture landing-product-capture--hero">
        <div className="landing-product-capture__frame">
          <ProductCapture desktop={capture.desktop} mobile={capture.mobile} alt={alt} priority />
        </div>
        <figcaption className="landing-example-label">{exampleLabel}</figcaption>
      </figure>
    </div>
  );
}

export function LandingProductShowcase({ language, content }: { language: Language; content: LandingContent["showcase"] }) {
  const [activeId, setActiveId] = useState<LandingShowcaseMomentId>("today");
  const activeMoment = content.moments.find((moment) => moment.id === activeId) ?? content.moments[0];
  const activeCapture = productCaptures[language][activeMoment.id];
  const tabsId = "landing-product-moments";
  const panelId = "landing-product-moment-panel";

  return (
    <div className="landing-product-selector">
      <Tabs
        id={tabsId}
        ariaLabel={content.selectorLabel}
        items={content.moments}
        value={activeId}
        onChange={setActiveId}
        panelId={panelId}
        className="landing-product-selector__tabs"
      />
      <div
        id={panelId}
        className="landing-product-selector__panel"
        role="tabpanel"
        aria-labelledby={`${tabsId}-${activeMoment.id}-tab`}
        tabIndex={0}
      >
        <div className="landing-product-selector__copy">
          <span className="landing-product-selector__moment" aria-hidden="true">{activeMoment.marker}</span>
          <h3>{activeMoment.title}</h3>
          <p>{activeMoment.description}</p>
        </div>
        <figure className="landing-product-capture landing-product-capture--showcase">
          <div className="landing-product-capture__frame">
            <ProductCapture desktop={activeCapture.desktop} mobile={activeCapture.mobile} alt={activeMoment.alt} />
          </div>
          <figcaption className="landing-example-label">{content.exampleLabel}</figcaption>
        </figure>
      </div>
    </div>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element */
import { BRAND_NAME, BRAND_LOGO_TAGLINE } from "@/src/lib/brand";

export function BrandMark({ compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean }) {
  return (
    <span translate="no" aria-label={iconOnly ? BRAND_NAME : undefined} role={iconOnly ? "img" : undefined} className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${iconOnly ? "brand-mark--icon-only" : ""}`}>
      <span className="brand-mark__icon" aria-hidden="true"><img src="/brand-icon.svg" alt="" /></span>
      {!iconOnly && <span className="brand-mark__copy"><strong><span>MY BEST</span><span>VERSION</span></strong>{!compact && <small>{BRAND_LOGO_TAGLINE}</small>}</span>}
    </span>
  );
}

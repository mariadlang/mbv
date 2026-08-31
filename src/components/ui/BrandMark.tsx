"use client";

/* eslint-disable @next/next/no-img-element */
import { BRAND_NAME, BRAND_SLOGAN } from "@/src/lib/brand";

export function BrandMark({ compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean }) {
  return (
    <span className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${iconOnly ? "brand-mark--icon-only" : ""}`}>
      <span className="brand-mark__icon" aria-hidden="true"><img src="/brand-icon.svg" alt="" /></span>
      {!iconOnly && <span className="brand-mark__copy"><strong>{BRAND_NAME}</strong>{!compact && <small>{BRAND_SLOGAN}</small>}</span>}
    </span>
  );
}

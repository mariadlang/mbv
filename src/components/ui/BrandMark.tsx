"use client";

/* eslint-disable @next/next/no-img-element */
export function BrandMark({ compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean }) {
  return (
    <span className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${iconOnly ? "brand-mark--icon-only" : ""}`}>
      <span className="brand-mark__icon" aria-hidden="true"><img src="/brand-icon.png" alt="" /></span>
      {!iconOnly && <span className="brand-mark__copy"><strong>My Best Version</strong>{!compact && <small>Life, but more you.</small>}</span>}
    </span>
  );
}

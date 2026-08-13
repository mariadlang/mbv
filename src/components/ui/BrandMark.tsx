"use client";

import { BookOpenCheck } from "lucide-react";

export function BrandMark({
  compact = false,
  iconOnly = false,
}: {
  compact?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <span className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${iconOnly ? "brand-mark--icon-only" : ""}`}>
      <span className="brand-mark__icon" aria-hidden="true">
        <BookOpenCheck strokeWidth={1.7} />
      </span>
      {!iconOnly && (
        <span className="brand-mark__copy">
          <strong>My Best Version</strong>
          {!compact && <small>Planea · Acciona · Logra</small>}
        </span>
      )}
    </span>
  );
}

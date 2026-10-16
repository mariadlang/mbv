"use client";

import { Heart } from "lucide-react";
import { useI18n } from "@/src/i18n/I18nProvider";

/** Decorative stationery, not a handwritten font or an extracted mockup asset. */
export function DecorativeNote({ variant = "next" }: { variant?: "next" | "month" }) {
  const { m } = useI18n();
  return <div className={`prep-decorative-note is-${variant}`} aria-hidden="true">
    <span className="prep-note-sheet">
      <span>{m(variant === "month" ? "preparation.smallSteps" : "preparation.pace")}</span>
      <Heart size={18} strokeWidth={1.4} />
    </span>
    <span className="prep-note-clip" />
  </div>;
}

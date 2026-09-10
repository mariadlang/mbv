"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { Language } from "@/src/stores/useUiStore";

export function LanguageSwitcher({ compact = false, onChange }: { compact?: boolean; onChange?: (language: Language) => void }) {
  const { language, setLanguage, m } = useI18n();
  const change = (next: Language) => { setLanguage(next); onChange?.(next); };
  return <div className={`language-switcher ${compact ? "language-switcher--compact" : ""}`} role="group" aria-label={m("language.selector.label")} data-i18n-explicit="true">
    {!compact && <Languages size={17} aria-hidden="true" />}
    <button type="button" className={language === "es" ? "is-active" : ""} title={m("language.spanish")} aria-pressed={language === "es"} onClick={() => change("es")}>ES</button>
    <button type="button" className={language === "en" ? "is-active" : ""} title={m("language.englishBeta")} aria-label={m("language.englishBeta")} aria-pressed={language === "en"} onClick={() => change("en")}>EN · {m("language.beta")}</button>
  </div>;
}

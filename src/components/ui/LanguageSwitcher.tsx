"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { Language } from "@/src/stores/useUiStore";

export function LanguageSwitcher({ compact = false, onChange }: { compact?: boolean; onChange?: (language: Language) => void }) {
  const { language, setLanguage, t } = useI18n();
  const change = (next: Language) => { setLanguage(next); onChange?.(next); };
  return <div className={`language-switcher ${compact ? "language-switcher--compact" : ""}`} role="group" aria-label={t("Idioma")}>
    {!compact && <Languages size={17} aria-hidden="true" />}
    <button type="button" className={language === "es" ? "is-active" : ""} aria-pressed={language === "es"} onClick={() => change("es")}>ES</button>
    <button type="button" className={language === "en" ? "is-active" : ""} aria-pressed={language === "en"} onClick={() => change("en")}>EN</button>
  </div>;
}

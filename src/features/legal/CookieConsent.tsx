"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CookiePreferences } from "@/src/domain/legal";
import { COOKIE_POLICY_VERSION } from "@/src/lib/legalConfig";
import { legalPrivacyService } from "@/src/services/legalPrivacyService";
import { setAnalyticsConsent } from "@/src/services/analyticsService";
import { Button } from "@/src/components/ui/Primitives";
import { Link } from "react-router-dom";
import { useI18n } from "@/src/i18n/I18nProvider";

interface CookieContextValue { preferences: CookiePreferences | null; openSettings(): void }
const CookieContext = createContext<CookieContextValue | null>(null);

const makePreferences = (functional: boolean, analytics: boolean, marketing: boolean): CookiePreferences => ({
  version: COOKIE_POLICY_VERSION,
  essential: true,
  functional,
  analytics,
  marketing,
  decidedAt: new Date().toISOString(),
});

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const { m } = useI18n();
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const restoreDraft = useCallback((saved: CookiePreferences | null) => {
    setFunctional(saved?.functional ?? false);
    setAnalytics(saved?.analytics ?? false);
    setMarketing(saved?.marketing ?? false);
  }, []);
  const openSettings = useCallback(() => {
    restoreDraft(preferences);
    setSettingsOpen(true);
  }, [preferences, restoreDraft]);

  const applySavedPreferences = useCallback((saved: CookiePreferences | null) => {
    const current = saved?.version === COOKIE_POLICY_VERSION ? saved : null;
    setPreferences(current);
    restoreDraft(current);
    setAnalyticsConsent(current?.analytics ?? false);
    setLoaded(true);
  }, [restoreDraft]);

  useEffect(() => {
    let active = true;
    const unsubscribe = legalPrivacyService.subscribeCookiePreferences((saved) => {
      if (active) applySavedPreferences(saved);
    });
    void legalPrivacyService.getCookiePreferences()
      .then((saved) => { if (active) applySavedPreferences(saved); })
      .catch(() => { if (active) applySavedPreferences(null); });
    return () => { active = false; unsubscribe(); };
  }, [applySavedPreferences]);

  useEffect(() => {
    window.addEventListener("mbv-open-cookie-settings", openSettings);
    return () => window.removeEventListener("mbv-open-cookie-settings", openSettings);
  }, [openSettings]);

  const save = useCallback(async (next: CookiePreferences) => {
    const saved = await legalPrivacyService.saveCookiePreferences(next);
    setPreferences(saved);
    setAnalyticsConsent(saved.analytics);
    setSettingsOpen(false);
  }, []);
  const cancel = useCallback(() => {
    if (!preferences) {
      void save(makePreferences(false, false, false));
      return;
    }
    restoreDraft(preferences);
    setSettingsOpen(false);
  }, [preferences, restoreDraft, save]);
  useEffect(() => {
    if (!settingsOpen) return;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector<HTMLElement>(".cookie-settings");
    const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])";
    queueMicrotask(() => dialog?.querySelector<HTMLElement>(focusableSelector)?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancel();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [cancel, settingsOpen]);
  const value = useMemo(() => ({ preferences, openSettings }), [openSettings, preferences]);

  return <CookieContext.Provider value={value}>{children}
    {loaded && !preferences && !settingsOpen && <aside className="cookie-banner" role="region" aria-labelledby="cookie-title" data-i18n-explicit="true"><div><strong id="cookie-title">{m("cookies.banner.title")}</strong><p>{m("cookies.banner.description")}</p><Link to="/cookies">{m("cookies.readPolicy")}</Link></div><div><Button variant="ghost" onClick={openSettings}>{m("cookies.configure")}</Button><Button variant="secondary" onClick={() => void save(makePreferences(false, false, false))}>{m("cookies.necessaryOnly")}</Button><Button onClick={() => void save(makePreferences(true, true, true))}>{m("cookies.acceptAll")}</Button></div></aside>}
    {settingsOpen && <div className="cookie-settings-backdrop" role="presentation"><section className="cookie-settings" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title" data-i18n-explicit="true"><header><p className="eyebrow">{m("cookies.settings.eyebrow")}</p><h2 id="cookie-settings-title">{m("cookies.settings.title")}</h2><p>{m("cookies.settings.description")}</p></header><div className="cookie-category"><div><strong>{m("cookies.necessary.title")}</strong><p>{m("cookies.necessary.description")}</p></div><span>{m("cookies.alwaysActive")}</span></div><CookieToggle label={m("cookies.functional.title")} description={m("cookies.functional.description")} checked={functional} onChange={setFunctional} /><CookieToggle label={m("cookies.analytics.title")} description={m("cookies.analytics.description")} checked={analytics} onChange={setAnalytics} /><CookieToggle label={m("cookies.marketing.title")} description={m("cookies.marketing.description")} checked={marketing} onChange={setMarketing} /><footer><Button variant="ghost" onClick={cancel}>{m("common.cancel")}</Button><Button onClick={() => void save(makePreferences(functional, analytics, marketing))}>{m("cookies.save")}</Button></footer></section></div>}
  </CookieContext.Provider>;
}

function CookieToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange(value: boolean): void }) {
  const { m } = useI18n();
  return <label className="cookie-category"><div><strong>{label}</strong><p>{description}</p></div><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={m("cookies.allow", { category: label.toLocaleLowerCase() })} /></label>;
}

export function useCookieConsent() {
  const value = useContext(CookieContext);
  if (!value) throw new Error("useCookieConsent debe usarse dentro de CookieConsentProvider");
  return value;
}

export function CookiePreferencesButton() {
  const { m } = useI18n();
  const { openSettings } = useCookieConsent();
  return <button type="button" className="public-footer-link" onClick={openSettings} data-i18n-explicit="true">{m("cookies.preferences")}</button>;
}

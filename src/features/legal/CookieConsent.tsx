"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CookiePreferences } from "@/src/domain/legal";
import { COOKIE_POLICY_VERSION } from "@/src/lib/legalConfig";
import { legalPrivacyService } from "@/src/services/legalPrivacyService";
import { Button } from "@/src/components/ui/Primitives";
import { Link } from "react-router-dom";

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
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => { void legalPrivacyService.getCookiePreferences().then((saved) => {
    if (saved?.version === COOKIE_POLICY_VERSION) {
      setPreferences(saved); setFunctional(saved.functional); setAnalytics(saved.analytics); setMarketing(saved.marketing);
    }
    setLoaded(true);
  }); }, []);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener("mbv-open-cookie-settings", open);
    return () => window.removeEventListener("mbv-open-cookie-settings", open);
  }, []);

  const save = async (next: CookiePreferences) => { setPreferences(await legalPrivacyService.saveCookiePreferences(next)); setSettingsOpen(false); };
  const value = useMemo(() => ({ preferences, openSettings: () => setSettingsOpen(true) }), [preferences]);

  return <CookieContext.Provider value={value}>{children}
    {loaded && !preferences && !settingsOpen && <aside className="cookie-banner" role="dialog" aria-modal="true" aria-labelledby="cookie-title"><div><strong id="cookie-title">Tu privacidad también se planea con claridad</strong><p>Usamos tecnologías necesarias para la sesión, tus preferencias y los datos locales. Las categorías opcionales permanecen apagadas hasta que las aceptes.</p><Link to="/cookies">Leer política de cookies</Link></div><div><Button variant="ghost" onClick={() => setSettingsOpen(true)}>Configurar</Button><Button variant="secondary" onClick={() => void save(makePreferences(false, false, false))}>Solo necesarias</Button><Button onClick={() => void save(makePreferences(true, true, true))}>Aceptar todas</Button></div></aside>}
    {settingsOpen && <div className="cookie-settings-backdrop" role="presentation"><section className="cookie-settings" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title"><header><p className="eyebrow">PRIVACIDAD</p><h2 id="cookie-settings-title">Preferencias de cookies</h2><p>Puedes cambiar estas opciones cuando quieras. Las categorías opcionales no cargan proveedores externos mientras no estén documentados y habilitados.</p></header><div className="cookie-category"><div><strong>Necesarias</strong><p>Sesión, seguridad, idioma, decisión de cookies e IndexedDB.</p></div><span>Siempre activas</span></div><CookieToggle label="Funcionales" description="Recuerdan opciones adicionales de experiencia." checked={functional} onChange={setFunctional} /><CookieToggle label="Analítica" description="Medición opcional. No hay un proveedor externo activo hoy." checked={analytics} onChange={setAnalytics} /><CookieToggle label="Marketing" description="Comunicaciones o medición publicitaria opcional. No hay un proveedor activo hoy." checked={marketing} onChange={setMarketing} /><footer><Button variant="ghost" onClick={() => { if (preferences) setSettingsOpen(false); else void save(makePreferences(false, false, false)); }}>Cancelar</Button><Button onClick={() => void save(makePreferences(functional, analytics, marketing))}>Guardar preferencias</Button></footer></section></div>}
  </CookieContext.Provider>;
}

function CookieToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange(value: boolean): void }) {
  return <label className="cookie-category"><div><strong>{label}</strong><p>{description}</p></div><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={`Permitir ${label.toLowerCase()}`} /></label>;
}

export function useCookieConsent() {
  const value = useContext(CookieContext);
  if (!value) throw new Error("useCookieConsent debe usarse dentro de CookieConsentProvider");
  return value;
}

export function CookiePreferencesButton() {
  const { openSettings } = useCookieConsent();
  return <button type="button" className="public-footer-link" onClick={openSettings}>Preferencias de cookies</button>;
}

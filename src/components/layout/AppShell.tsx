"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, CircleHelp, HeartPulse, LayoutDashboard, Landmark, Layers3, ListTodo, LogOut, Menu, MessageCircle, MoonStar, Plus, Settings, Sparkles, Sun, UserRound, Wrench, X } from "lucide-react";
import { useUiStore } from "@/src/stores/useUiStore";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { useI18n } from "@/src/i18n/I18nProvider";

const primaryItems = [
  ["/app/dashboard", "Inicio", LayoutDashboard],
  ["/app/today", "Hoy", ListTodo],
  ["/app/planning", "Plan", CalendarDays],
  ["/app/life-hub", "Mi espacio", Layers3],
  ["/app/health", "Salud", HeartPulse],
  ["/app/finance", "Finanzas", Landmark],
  ["/app/progress", "Progreso", BarChart3],
] as const;

const mobileItems = [primaryItems[0], primaryItems[1], primaryItems[2], primaryItems[3], primaryItems[6]] as const;

const utilityItems = [
  ["/app/help", "Centro de ayuda", CircleHelp],
  ["/app/settings", "Ajustes", Settings],
] as const;

function isPrimaryActive(href: string, pathname: string) {
  if (href === "/app/dashboard") return pathname === href;
  if (href === "/app/today") return pathname === href;
  if (href === "/app/planning") return ["/app/vision", "/app/goals", "/app/planning", "/app/tasks"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (href === "/app/life-hub") return ["/app/life-hub", "/app/journal", "/app/habits", "/app/tasks", "/app/learn"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (href === "/app/health") return pathname === "/app/health";
  if (href === "/app/finance") return pathname === "/app/finance";
  return pathname === "/app/progress";
}

export function AppShell({ children, userName, userAvatar, saving, theme, accessText, isSuperadmin = false, onQuickAdd, onNeedHelp, onSignOut }: { children: ReactNode; userName: string; userAvatar?: string; saving: boolean; theme: "light" | "rose" | "taupe"; accessText?: string; isSuperadmin?: boolean; onQuickAdd: () => void; onNeedHelp: () => void; onSignOut?: () => void }) {
  const { pathname } = useLocation();
  const isToday = pathname === "/app/today";
  const desktopPrimaryItems = isToday ? primaryItems.slice(1) : primaryItems;
  const desktopUtilityItems = isToday ? utilityItems.filter(([href]) => href === "/app/settings") : utilityItems;
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const isSidebarCollapsed = sidebarCollapsed && !isToday;
  const colorMode = useUiStore((state) => state.colorMode);
  const toggleColorMode = useUiStore((state) => state.toggleColorMode);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  useEffect(() => { document.documentElement.dataset.theme = colorMode; }, [colorMode]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenuOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);
  useEffect(() => {
    if (!fabOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setFabOpen(false); };
    const closeOutside = (event: PointerEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) setFabOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [fabOpen]);
  const avatar = userAvatar ? <img src={userAvatar} alt={`Foto de ${userName}`} /> : <span>{userName.slice(0, 1).toUpperCase()}</span>;
  return <div className={`app-shell theme-${theme} ${isSidebarCollapsed ? "app-shell--collapsed" : ""} ${isToday ? "app-shell--today" : ""}`} data-color-mode={colorMode}>
    <a className="skip-link" href="#main-content">{t("Saltar al contenido principal")}</a>
    <aside className="sidebar" aria-label={t("Navegación principal")}>
      <NavLink to="/app/dashboard" className="sidebar__brand" aria-label="My Best Version, inicio"><BrandMark compact={isSidebarCollapsed} iconOnly={isSidebarCollapsed} />{isToday && <span className="sidebar-today-claim">Planea · Haz · Vive · Avanza</span>}</NavLink>
      <nav className="sidebar__nav">{desktopPrimaryItems.map(([href, label, Icon]) => <NavLink key={href} to={href} className={`nav-item ${isPrimaryActive(href, pathname) ? "nav-item--active" : ""}`} title={isSidebarCollapsed ? t(label) : undefined}><Icon size={19} strokeWidth={1.7} aria-hidden="true" />{!isSidebarCollapsed && <span>{t(label)}</span>}</NavLink>)}</nav>
      <div className="sidebar__footer">
        <nav className="sidebar__utility-nav" aria-label="Utilidades">{desktopUtilityItems.map(([href, label, Icon]) => <NavLink key={href} to={href} className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`} title={isSidebarCollapsed ? t(label) : undefined}><Icon size={18} strokeWidth={1.7} aria-hidden="true" />{!isSidebarCollapsed && <span>{t(label)}</span>}</NavLink>)}{isToday && onSignOut && <button className="nav-item sidebar-today-signout" type="button" onClick={onSignOut}><LogOut size={18} />{!isSidebarCollapsed && <span>{t("Cerrar sesión")}</span>}</button>}{isSuperadmin && <NavLink className={({ isActive }) => `nav-item sidebar-admin-link ${isActive ? "nav-item--active" : ""}`} to="/platform" title={isSidebarCollapsed ? "Superadmin" : undefined}><Sparkles size={18} />{!isSidebarCollapsed && <span>Superadmin</span>}</NavLink>}</nav>
        <NavLink to="/app/profile" className="sidebar-profile" aria-label={`${t("Perfil")}: ${userName}`}>{avatar}{!isSidebarCollapsed && <div><strong>{userName}</strong><small>{t("Ver mi perfil")}</small></div>}{!isSidebarCollapsed && <ChevronRight size={16} aria-hidden="true" />}</NavLink>
        {!isToday && <div className="sidebar__footer-actions">{onSignOut && <button className="sidebar-signout" type="button" onClick={onSignOut} aria-label={t("Cerrar sesión")} title={t("Cerrar sesión")}><LogOut size={17} /></button>}<button className="collapse-button" type="button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-expanded={!isSidebarCollapsed} aria-label={isSidebarCollapsed ? t("Expandir navegación") : t("Contraer navegación")}>{isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button></div>}
      </div>
    </aside>
    {mobileMenuOpen && <div className="mobile-drawer-layer"><button className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú" /><aside className="mobile-drawer" aria-label="Menú móvil"><header><BrandMark compact /><button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú"><X size={20} /></button></header><nav><section><span>Principal</span>{primaryItems.map(([href, label, Icon]) => <NavLink key={href} to={href} onClick={() => setMobileMenuOpen(false)}><Icon size={18} /><strong>{t(label)}</strong></NavLink>)}</section><section><span>Tu cuenta</span>{utilityItems.map(([href, label, Icon]) => <NavLink key={href} to={href} onClick={() => setMobileMenuOpen(false)}><Icon size={18} /><strong>{t(label)}</strong></NavLink>)}{isSuperadmin && <NavLink to="/platform" onClick={() => setMobileMenuOpen(false)}><Sparkles size={18} /><strong>Superadmin</strong></NavLink>}<NavLink to="/app/profile" onClick={() => setMobileMenuOpen(false)}><UserRound size={18} /><strong>{t("Perfil")}</strong></NavLink></section></nav></aside></div>}
    <div className="app-main"><header className="topbar"><button type="button" className="topbar__mobile-brand" aria-label="Abrir menú" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}><Menu size={20} /><BrandMark compact /></button><div className="topbar__utilities">{accessText && <NavLink to="/upgrade" className="access-chip">{accessText}</NavLink>}<button type="button" onClick={onNeedHelp} aria-label="Necesito ayuda" title="¿Necesitas ayuda?"><CircleHelp size={18} /></button><button type="button" onClick={toggleColorMode} aria-label={colorMode === "light" ? "Activar modo oscuro" : "Activar modo claro"} aria-pressed={colorMode === "dark"}>{colorMode === "light" ? <MoonStar size={18} /> : <Sun size={18} />}</button></div><div className="topbar__status" aria-live="polite"><span className={saving ? "saving-dot saving-dot--active" : "saving-dot"} />{saving ? "Guardando…" : "Guardado"}</div><NavLink to="/app/settings" className="topbar__profile" aria-label="Editar foto y perfil"><span>{userName}</span><span className="topbar-avatar">{avatar}</span></NavLink></header><main id="main-content" className="page-content" key={pathname}>{children}</main></div>
    {!['/app/dashboard', '/app/today'].includes(pathname) && <div ref={fabRef} className={`fab-cluster ${fabOpen ? "is-open" : ""}`}><div className="fab-menu" aria-hidden={!fabOpen}><button type="button" onClick={() => { setFabOpen(false); onQuickAdd(); }}><Plus size={17} /><span>{t("Registrar")}</span></button><NavLink to="/app/support" onClick={() => setFabOpen(false)}><MessageCircle size={17} /><span>{t("Chat de soporte")}</span></NavLink><NavLink to="/app/support?type=suggestion" onClick={() => setFabOpen(false)}><Sparkles size={17} /><span>{t("Sugerencia al equipo")}</span></NavLink><NavLink to="/app/life-hub?tab=routines" onClick={() => setFabOpen(false)}><Wrench size={17} /><span>{t("Herramientas")}</span></NavLink></div><button className="fab" type="button" onClick={() => setFabOpen((open) => !open)} aria-label={fabOpen ? t("Cerrar acciones rápidas") : t("Abrir acciones rápidas")} aria-expanded={fabOpen}><Plus size={22} /></button></div>}
    <nav className="mobile-nav" aria-label={t("Navegación móvil")}>{mobileItems.map(([href,label,Icon]) => { const active = isPrimaryActive(href, pathname); return <NavLink key={href} to={href} className={active ? "mobile-nav__item is-active" : "mobile-nav__item"}><Icon size={20} strokeWidth={active ? 2 : 1.6} /><span>{t(label)}</span></NavLink>; })}</nav>
  </div>;
}

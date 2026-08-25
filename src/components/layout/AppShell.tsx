"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, Banknote, BookOpen, CalendarDays, ChevronLeft, ChevronRight, CircleHelp, Eye, Feather, Flag, HeartPulse, LayoutDashboard, Layers3, ListTodo, LogOut, Menu, MoreHorizontal, MoonStar, Plus, Settings, Sparkles, Sun, Target, X } from "lucide-react";
import { useUiStore } from "@/src/stores/useUiStore";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { useI18n } from "@/src/i18n/I18nProvider";

const desktopGroups = [
  { label: "Mi dirección", items: [["/app/dashboard", "Inicio", LayoutDashboard], ["/app/vision", "Visión y objetivos", Eye], ["/app/goals", "Metas", Target]] },
  { label: "Planeación en cascada", items: [["/app/planning", "Planificación", CalendarDays], ["/app/planning/weekly", "Plan semanal", CalendarDays], ["/app/today", "Hoy", ListTodo]] },
  { label: "Mi día a día", items: [["/app/tasks", "Tareas", Flag], ["/app/habits", "Hábitos y bienestar", HeartPulse], ["/app/finance", "Finanzas", Banknote], ["/app/life-hub", "Mi espacio", Layers3]] },
  { label: "Reconocer", items: [["/app/progress", "Tu progreso", BarChart3], ["/app/journal", "Mi diario", Feather], ["/app/feed", "Feed Hub", Sparkles], ["/app/help", "¿Necesitas ayuda?", BookOpen], ["/app/settings", "Ajustes", Settings]] },
] as const;
const mobileItems = [["/app/dashboard", "Inicio", LayoutDashboard], ["/app/planning/weekly", "Semana", CalendarDays], ["/app/today", "Hoy", Flag], ["/app/progress", "Progreso", BarChart3], ["/app/more", "Más", MoreHorizontal]] as const;

export function AppShell({ children, userName, userAvatar, saving, theme, accessText, isSuperadmin = false, onQuickAdd, onNeedHelp, onSignOut }: { children: ReactNode; userName: string; userAvatar?: string; saving: boolean; theme: "light" | "rose" | "taupe"; accessText?: string; isSuperadmin?: boolean; onQuickAdd: () => void; onNeedHelp: () => void; onSignOut?: () => void }) {
  const { pathname } = useLocation();
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const colorMode = useUiStore((state) => state.colorMode);
  const toggleColorMode = useUiStore((state) => state.toggleColorMode);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();
  useEffect(() => { document.documentElement.dataset.theme = colorMode; }, [colorMode]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenuOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);
  const avatar = userAvatar ? <img src={userAvatar} alt={`Foto de ${userName}`} /> : <span>{userName.slice(0, 1).toUpperCase()}</span>;
  return <div className={`app-shell theme-${theme} ${sidebarCollapsed ? "app-shell--collapsed" : ""}`} data-color-mode={colorMode}>
    <a className="skip-link" href="#main-content">{t("Saltar al contenido principal")}</a>
    <aside className="sidebar" aria-label={t("Navegación principal")}>
      <NavLink to="/app/dashboard" className="sidebar__brand" aria-label="My Best Version, inicio"><BrandMark compact={sidebarCollapsed} iconOnly={sidebarCollapsed} /></NavLink>
      <nav className="sidebar__nav">{desktopGroups.map((group) => <div className="nav-group" key={group.label}>{!sidebarCollapsed && <span className="nav-group__label">{t(group.label)}</span>}{group.items.map(([href, label, Icon]) => <NavLink key={href} to={href} className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`} title={sidebarCollapsed ? t(label) : undefined}><Icon size={18} strokeWidth={1.7} aria-hidden="true" />{!sidebarCollapsed && <span>{t(label)}</span>}</NavLink>)}</div>)}</nav>
      <div className="sidebar__footer">{isSuperadmin && !sidebarCollapsed && <NavLink className="sidebar-admin-link" to="/admin"><Sparkles size={16} /> Superadmin</NavLink>}<div className="sidebar-profile">{avatar}{!sidebarCollapsed && <div><strong>{userName}</strong><small>{accessText ?? t("Mi espacio")}</small></div>}</div>{onSignOut && <button className="sidebar-signout" type="button" onClick={onSignOut} aria-label={t("Cerrar sesión")} title={t("Cerrar sesión")}><LogOut size={17} /></button>}<button className="collapse-button" type="button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-expanded={!sidebarCollapsed} aria-label={sidebarCollapsed ? t("Expandir navegación") : t("Contraer navegación")}>{sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button></div>
    </aside>
    {mobileMenuOpen && <div className="mobile-drawer-layer"><button className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú" /><aside className="mobile-drawer" aria-label="Menú móvil"><header><BrandMark compact /><button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú"><X size={20} /></button></header><nav>{desktopGroups.map((group) => <section key={group.label}><span>{group.label}</span>{group.items.map(([href, label, Icon]) => <NavLink key={href} to={href} onClick={() => setMobileMenuOpen(false)}><Icon size={18} /><strong>{label}</strong></NavLink>)}</section>)}</nav></aside></div>}
    <div className="app-main"><header className="topbar"><button type="button" className="topbar__mobile-brand" aria-label="Abrir menú" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}><Menu size={20} /><BrandMark compact /></button><div className="topbar__utilities">{accessText && <NavLink to="/upgrade" className="access-chip">{accessText}</NavLink>}<button type="button" onClick={onNeedHelp} aria-label="Necesito ayuda" title="¿Necesitas ayuda?"><CircleHelp size={18} /></button><button type="button" onClick={toggleColorMode} aria-label={colorMode === "light" ? "Activar modo oscuro" : "Activar modo claro"} aria-pressed={colorMode === "dark"}>{colorMode === "light" ? <MoonStar size={18} /> : <Sun size={18} />}</button></div><div className="topbar__status" aria-live="polite"><span className={saving ? "saving-dot saving-dot--active" : "saving-dot"} />{saving ? "Guardando…" : "Guardado"}</div><NavLink to="/app/settings" className="topbar__profile" aria-label="Editar foto y perfil"><span>{userName}</span><span className="topbar-avatar">{avatar}</span></NavLink></header><main id="main-content" className="page-content" key={pathname}>{children}</main></div>
    <button className="fab" onClick={onQuickAdd} aria-label="Añadir tarea rápida"><Plus size={22} /></button>
    <nav className="mobile-nav" aria-label={t("Navegación móvil")}>{mobileItems.map(([href,label,Icon]) => { const active = pathname === href; return <NavLink key={href} to={href} className={active ? "mobile-nav__item is-active" : "mobile-nav__item"}><Icon size={20} strokeWidth={active ? 2 : 1.6} /><span>{t(label)}</span></NavLink>; })}</nav>
  </div>;
}

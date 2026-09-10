"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigationType } from "react-router-dom";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, CircleHelp, HeartPulse, LayoutDashboard, Layers3, ListTodo, LogOut, Menu, MessageCircle, MoonStar, Plus, Settings, Sparkles, Sun, WalletCards, Wrench, X } from "lucide-react";
import { useUiStore } from "@/src/stores/useUiStore";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { NavigationSpaceProgressMessageKey } from "@/src/i18n/messages/features/navigation-space-progress";

export const primaryItems = [
  ["/app/dashboard", "navigation.item.home", LayoutDashboard],
  ["/app/today", "navigation.item.today", ListTodo],
  ["/app/planning", "navigation.item.plan", CalendarDays],
  ["/app/life-hub", "navigation.item.space", Layers3],
  ["/app/progress", "navigation.item.progress", BarChart3],
] as const;

const mobileItems = primaryItems;

const spaceShortcutItems = [
  ["/app/health", "navigation.item.wellbeing", HeartPulse],
  ["/app/finance", "navigation.item.finances", WalletCards],
] as const;

const utilityItems = [
  ["/app/help", "navigation.item.help", CircleHelp],
  ["/app/settings", "navigation.item.settings", Settings],
] as const;

export function getAccessMessageDescriptor(accessText?: string): { key: NavigationSpaceProgressMessageKey; params?: { count: number } } | undefined {
  if (!accessText) return undefined;
  if (accessText === "Superadmin") return { key: "navigation.access.superadmin" };
  if (accessText === "Premium") return { key: "navigation.access.premium" };
  if (accessText === "Prueba") return { key: "navigation.access.trial" };
  if (accessText === "Acceso bloqueado") return { key: "navigation.access.blocked" };
  if (accessText === "Prueba finalizada") return { key: "navigation.access.expired" };
  const trialDays = /^Prueba · (\d+) d(?:ía|ías)$/.exec(accessText);
  if (trialDays) {
    const count = Number(trialDays[1]);
    return { key: count === 1 ? "navigation.access.trialDay" : "navigation.access.trialDays", params: { count } };
  }
  return { key: "navigation.access.status" };
}

export function isPrimaryActive(href: string, pathname: string) {
  if (href === "/app/dashboard") return pathname === href;
  if (href === "/app/today") return pathname === href;
  if (href === "/app/planning") return ["/app/vision", "/app/goals", "/app/planning"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (href === "/app/life-hub") return ["/app/life-hub", "/app/journal", "/app/habits", "/app/tasks", "/app/learn", "/app/more", "/app/health", "/app/finance"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return pathname === "/app/progress";
}

export function AppShell({ children, userName, userAvatar, saving, theme, accessText, isSuperadmin = false, onQuickAdd, onNeedHelp, onSignOut }: { children: ReactNode; userName: string; userAvatar?: string; saving: boolean; theme: "light" | "rose" | "taupe"; accessText?: string; isSuperadmin?: boolean; onQuickAdd: () => void; onNeedHelp: () => void; onSignOut?: () => void }) {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();
  const isToday = pathname === "/app/today";
  const isWeeklyPlanning = pathname === "/app/planning/weekly" || (pathname === "/app/planning" && new URLSearchParams(search).get("view") === "week");
  const desktopPrimaryItems = primaryItems;
  const desktopUtilityItems = utilityItems;
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const isSidebarCollapsed = sidebarCollapsed && !isToday;
  const colorMode = useUiStore((state) => state.colorMode);
  const toggleColorMode = useUiStore((state) => state.toggleColorMode);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const { m } = useI18n();
  useEffect(() => {
    document.documentElement.dataset.theme = colorMode;
    return () => { delete document.documentElement.dataset.theme; };
  }, [colorMode]);
  useEffect(() => {
    if (navigationType !== "POP") window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [navigationType, pathname]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const backgroundElements = Array.from(document.querySelectorAll<HTMLElement>("[data-mobile-drawer-background]"));
    const previousInert = backgroundElements.map((element) => element.inert);
    document.body.style.overflow = "hidden";
    backgroundElements.forEach((element) => { element.inert = true; });
    const drawer = document.querySelector<HTMLElement>(".mobile-drawer");
    const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";
    queueMicrotask(() => drawer?.querySelector<HTMLElement>(focusableSelector)?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector));
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
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      backgroundElements.forEach((element, index) => { element.inert = previousInert[index]; });
      previousActiveElement?.focus();
    };
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
  const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  const avatar = userAvatar ? <img src={userAvatar} alt={m("navigation.avatarAlt", { name: userName })} /> : <span>{userName.slice(0, 1).toUpperCase()}</span>;
  const accessMessage = getAccessMessageDescriptor(accessText);
  const localizedAccessText = accessMessage ? m(accessMessage.key, accessMessage.params) : undefined;
  return <div className={`app-shell theme-${theme} ${isSidebarCollapsed ? "app-shell--collapsed" : ""} ${isToday ? "app-shell--today" : ""} ${isWeeklyPlanning ? "app-shell--weekly" : ""}`} data-color-mode={colorMode}>
    <a className="skip-link" href="#main-content" data-i18n-explicit="true">{m("navigation.skipToContent")}</a>
    <aside className="sidebar" aria-label={m("navigation.mainLabel")} data-mobile-drawer-background data-i18n-explicit="true">
      <NavLink to="/app/dashboard" className="sidebar__brand" aria-label={m("navigation.brandHome")}><BrandMark compact={isSidebarCollapsed} iconOnly={isSidebarCollapsed} /></NavLink>
      <nav className="sidebar__nav" aria-label={m("navigation.primaryDestinations")}>{desktopPrimaryItems.map(([href, labelKey, Icon]) => { const active = isPrimaryActive(href, pathname); return <Link key={href} to={href} onClick={scrollToTop} className={`nav-item ${active ? "nav-item--active" : ""}`} aria-current={active ? "page" : undefined} title={isSidebarCollapsed ? m(labelKey) : undefined}><Icon size={19} strokeWidth={1.7} aria-hidden="true" />{!isSidebarCollapsed && <span>{m(labelKey)}</span>}</Link>; })}</nav>
      <nav className="sidebar__utility-nav sidebar__space-shortcuts" aria-label={m("navigation.spaceShortcuts")}>
        {!isSidebarCollapsed && <span className="local-note">{m("navigation.inSpace")}</span>}
        {spaceShortcutItems.map(([href, labelKey, Icon]) => <Link key={href} to={href} onClick={scrollToTop} className="nav-item" aria-label={m("navigation.spaceShortcutLabel", { destination: m(labelKey) })} title={isSidebarCollapsed ? m(labelKey) : undefined}><Icon size={18} strokeWidth={1.7} aria-hidden="true" />{!isSidebarCollapsed && <span>{m(labelKey)}</span>}</Link>)}
      </nav>
      <div className="sidebar__footer">
        <nav className="sidebar__utility-nav" aria-label={m("navigation.utilities")}>{desktopUtilityItems.map(([href, labelKey, Icon]) => <NavLink key={href} to={href} className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`} title={isSidebarCollapsed ? m(labelKey) : undefined}><Icon size={18} strokeWidth={1.7} aria-hidden="true" />{!isSidebarCollapsed && <span>{m(labelKey)}</span>}</NavLink>)}{isToday && onSignOut && <button className="nav-item sidebar-today-signout" type="button" onClick={onSignOut}><LogOut size={18} />{!isSidebarCollapsed && <span>{m("navigation.signOut")}</span>}</button>}{isSuperadmin && <NavLink className={({ isActive }) => `nav-item sidebar-admin-link ${isActive ? "nav-item--active" : ""}`} to="/platform" title={isSidebarCollapsed ? m("navigation.access.superadmin") : undefined}><Sparkles size={18} />{!isSidebarCollapsed && <span>{m("navigation.access.superadmin")}</span>}</NavLink>}</nav>
        <Link to="/app/settings" className="sidebar-profile" aria-label={m("navigation.settingsForUser", { name: userName })}>{avatar}{!isSidebarCollapsed && <div><strong>{userName}</strong><small>{m("navigation.settingsAndProfile")}</small></div>}{!isSidebarCollapsed && <ChevronRight size={16} aria-hidden="true" />}</Link>
        {!isToday && <div className="sidebar__footer-actions">{onSignOut && <button className="sidebar-signout" type="button" onClick={onSignOut} aria-label={m("navigation.signOut")} title={m("navigation.signOut")}><LogOut size={17} /></button>}<button className="collapse-button" type="button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-expanded={!isSidebarCollapsed} aria-label={isSidebarCollapsed ? m("navigation.expand") : m("navigation.collapse")}>{isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button></div>}
      </div>
    </aside>
    {mobileMenuOpen && <div className="mobile-drawer-layer" data-i18n-explicit="true"><button className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label={m("navigation.closeMenu")} /><aside id="mobile-navigation-drawer" className="mobile-drawer" role="dialog" aria-modal="true" aria-label={m("navigation.mobileMenu")}><header><BrandMark compact /><button type="button" onClick={() => setMobileMenuOpen(false)} aria-label={m("navigation.closeMenu")}><X size={20} /></button></header><nav><section><span>{m("navigation.primary")}</span>{primaryItems.map(([href, labelKey, Icon]) => { const active = isPrimaryActive(href, pathname); return <Link key={href} to={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined} onClick={() => { scrollToTop(); setMobileMenuOpen(false); }}><Icon size={18} /><strong>{m(labelKey)}</strong></Link>; })}</section><section><span>{m("navigation.inSpace")}</span>{spaceShortcutItems.map(([href, labelKey, Icon]) => <Link key={href} to={href} onClick={() => { scrollToTop(); setMobileMenuOpen(false); }}><Icon size={18} /><strong>{m(labelKey)}</strong></Link>)}</section><section><span>{m("navigation.account")}</span>{utilityItems.map(([href, labelKey, Icon]) => <NavLink key={href} to={href} onClick={() => setMobileMenuOpen(false)}><Icon size={18} /><strong>{m(labelKey)}</strong></NavLink>)}{isSuperadmin && <NavLink to="/platform" onClick={() => setMobileMenuOpen(false)}><Sparkles size={18} /><strong>{m("navigation.access.superadmin")}</strong></NavLink>}</section></nav></aside></div>}
    <div className="app-main" data-mobile-drawer-background><header className="topbar" data-i18n-explicit="true"><button type="button" className="topbar__mobile-brand" aria-label={m("navigation.openMenu")} aria-controls="mobile-navigation-drawer" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}><Menu size={20} /><BrandMark compact /></button><div className="topbar__utilities">{localizedAccessText && <NavLink to="/upgrade" className="access-chip">{localizedAccessText}</NavLink>}<button type="button" onClick={onNeedHelp} aria-label={m("navigation.needHelp")} title={m("navigation.needHelpQuestion")}><CircleHelp size={18} /></button><button type="button" onClick={toggleColorMode} aria-label={colorMode === "light" ? m("navigation.darkMode") : m("navigation.lightMode")} aria-pressed={colorMode === "dark"}>{colorMode === "light" ? <MoonStar size={18} /> : <Sun size={18} />}</button></div><div className="topbar__status" aria-live="polite"><span className={saving ? "saving-dot saving-dot--active" : "saving-dot"} />{saving ? m("navigation.saving") : m("navigation.saved")}</div><Link to="/app/settings" className="topbar__profile" aria-label={m("navigation.editProfile")}><span>{userName}</span><span className="topbar-avatar">{avatar}</span></Link></header><main id="main-content" className="page-content" key={pathname}>{children}</main></div>
    {!['/app/dashboard', '/app/today'].includes(pathname) && !isWeeklyPlanning && <div ref={fabRef} className={`fab-cluster ${fabOpen ? "is-open" : ""}`} data-mobile-drawer-background data-i18n-explicit="true"><div className="fab-menu" aria-hidden={!fabOpen}><button type="button" onClick={() => { setFabOpen(false); onQuickAdd(); }}><Plus size={17} /><span>{m("navigation.capture")}</span></button><NavLink to="/app/support" onClick={() => setFabOpen(false)}><MessageCircle size={17} /><span>{m("navigation.supportChat")}</span></NavLink><NavLink to="/app/support?type=suggestion" onClick={() => setFabOpen(false)}><Sparkles size={17} /><span>{m("navigation.suggestion")}</span></NavLink><NavLink to="/app/more" onClick={() => setFabOpen(false)}><Wrench size={17} /><span>{m("navigation.tools")}</span></NavLink></div><button className="fab" type="button" onClick={() => setFabOpen((open) => !open)} aria-label={fabOpen ? m("navigation.quickActions.close") : m("navigation.quickActions.open")} aria-expanded={fabOpen}><Plus size={22} /></button></div>}
    <nav className="mobile-nav" aria-label={m("navigation.mobileLabel")} data-mobile-drawer-background data-i18n-explicit="true">{mobileItems.map(([href,labelKey,Icon]) => { const active = isPrimaryActive(href, pathname); return <Link key={href} to={href} onClick={scrollToTop} className={active ? "mobile-nav__item is-active" : "mobile-nav__item"} aria-current={active ? "page" : undefined}><Icon size={20} strokeWidth={active ? 2 : 1.6} /><span>{m(labelKey)}</span></Link>; })}</nav>
  </div>;
}

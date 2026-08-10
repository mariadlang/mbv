"use client";

import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Feather,
  Flag,
  HeartPulse,
  Home,
  LayoutDashboard,
  ListTodo,
  Menu,
  MoreHorizontal,
  Plus,
  Settings,
  Target,
} from "lucide-react";
import { useUiStore } from "@/src/stores/useUiStore";

const desktopItems = [
  ["/app/dashboard", "Dashboard", LayoutDashboard],
  ["/app/planning", "Planificación", CalendarDays],
  ["/app/today", "Hoy", ListTodo],
  ["/app/habits", "Hábitos", HeartPulse],
  ["/app/goals", "Metas", Target],
  ["/app/progress", "Progreso", BarChart3],
  ["/app/journal", "Journal", Feather],
  ["/app/settings", "Ajustes", Settings],
] as const;

const mobileItems = [
  ["/app/dashboard", "Inicio", Home],
  ["/app/planning", "Plan", CalendarDays],
  ["/app/today", "Hoy", Flag],
  ["/app/habits", "Hábitos", HeartPulse],
  ["/app/more", "Más", MoreHorizontal],
] as const;

export function AppShell({
  children,
  userName,
  saving,
  onQuickAdd,
}: {
  children: ReactNode;
  userName: string;
  saving: boolean;
  onQuickAdd: () => void;
}) {
  const { pathname } = useLocation();
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);

  return (
    <div className={`app-shell ${sidebarCollapsed ? "app-shell--collapsed" : ""}`}>
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="sidebar__brand">
          <span className="wordmark">My Best Version</span>
          {!sidebarCollapsed && <span className="wordmark-sub">Planner</span>}
        </div>
        <nav className="sidebar__nav">
          {desktopItems.map(([href, label, Icon]) => (
            <NavLink
              key={href}
              to={href}
              className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={19} strokeWidth={1.6} aria-hidden="true" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="local-note" title="Tus datos permanecen en este dispositivo">
            <span className="local-note__dot" />
            {!sidebarCollapsed && <span>Guardado en este dispositivo</span>}
          </div>
          <button
            className="collapse-button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expandir navegación" : "Contraer navegación"}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__mobile-brand">
            <Menu size={20} aria-hidden="true" />
            <span className="wordmark">My Best Version</span>
          </div>
          <div className="topbar__status" aria-live="polite">
            <span className={saving ? "saving-dot saving-dot--active" : "saving-dot"} />
            {saving ? "Guardando…" : "Guardado"}
          </div>
          <div className="topbar__profile">
            <span>{userName}</span>
            <CircleUserRound size={27} strokeWidth={1.4} aria-hidden="true" />
          </div>
        </header>

        <main className="page-content" key={pathname}>{children}</main>
      </div>

      <button className="fab" onClick={onQuickAdd} aria-label="Añadir tarea rápida">
        <Plus size={22} aria-hidden="true" />
      </button>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        {mobileItems.map(([href, label, Icon]) => {
          const active = pathname === href;
          return (
            <NavLink key={href} to={href} className={active ? "mobile-nav__item is-active" : "mobile-nav__item"}>
              <Icon size={20} strokeWidth={active ? 2 : 1.6} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

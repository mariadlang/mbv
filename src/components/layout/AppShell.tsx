"use client";

import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Banknote,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Eye,
  Feather,
  Flag,
  HeartPulse,
  LayoutDashboard,
  ListTodo,
  Menu,
  MoreHorizontal,
  MoonStar,
  Plus,
  Settings,
  Smile,
  Sun,
  Target,
} from "lucide-react";
import { useUiStore } from "@/src/stores/useUiStore";

const desktopItems = [
  ["/app/dashboard", "Dashboard", LayoutDashboard],
  ["/app/vision", "Visión", Eye],
  ["/app/goals", "Metas", Target],
  ["/app/planning", "Planificación", CalendarDays],
  ["/app/today", "Hoy", ListTodo],
  ["/app/tasks", "Tareas", Flag],
  ["/app/habits", "Hábitos", HeartPulse],
  ["/app/mood", "Ánimo", Smile],
  ["/app/finance", "Finanzas", Banknote],
  ["/app/progress", "Progreso", BarChart3],
  ["/app/journal", "Journal", Feather],
  ["/app/settings", "Ajustes", Settings],
  ["/app/help", "Centro de ayuda", BookOpen],
] as const;

const mobileItems = [
  ["/app/dashboard", "Inicio", LayoutDashboard],
  ["/app/planning", "Plan", CalendarDays],
  ["/app/today", "Hoy", Flag],
  ["/app/habits", "Hábitos", HeartPulse],
  ["/app/more", "Más", MoreHorizontal],
] as const;

export function AppShell({
  children,
  userName,
  saving,
  theme,
  onQuickAdd,
}: {
  children: ReactNode;
  userName: string;
  saving: boolean;
  theme: "light" | "rose" | "taupe";
  onQuickAdd: () => void;
}) {
  const { pathname } = useLocation();
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);

  return (
    <div className={`app-shell theme-${theme} ${sidebarCollapsed ? "app-shell--collapsed" : ""}`}>
      <aside className="sidebar" aria-label="Navegación principal">
        <NavLink to="/app/dashboard" className="sidebar__brand">
          <span className="wordmark">My Best Version</span>
          {!sidebarCollapsed && <span className="wordmark-sub">Planner</span>}
        </NavLink>
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
          <div className="sidebar-profile"><span>{userName.slice(0, 1).toUpperCase()}</span>{!sidebarCollapsed && <div><strong>{userName}</strong><small>Mi espacio</small></div>}</div>
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
          <NavLink to="/app/dashboard" className="topbar__mobile-brand">
            <Menu size={20} aria-hidden="true" />
            <span className="wordmark">My Best Version</span>
          </NavLink>
          <div className="topbar__utilities"><button aria-label="Cambiar apariencia"><Sun size={18} /><MoonStar size={14} /></button><button aria-label="Notificaciones"><Bell size={19} /></button></div>
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

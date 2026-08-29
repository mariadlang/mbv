"use client";

import { Link, useLocation } from "react-router-dom";

type Section = "plan" | "progress" | "space";

const sections = {
  plan: {
    label: "Secciones de Plan",
    items: [
      ["/app/vision", "Visión"],
      ["/app/goals", "Metas"],
      ["/app/planning", "Año y meses"],
      ["/app/planning/weekly", "Semana"],
      ["/app/life-hub?tab=events", "Calendario"],
      ["/app/tasks", "Tareas y proyectos"],
      ["/app/life-hub?tab=routines", "Rutinas"],
    ],
  },
  progress: {
    label: "Secciones de Progreso",
    items: [
      ["/app/progress", "Resumen"],
      ["/app/goals", "Metas"],
      ["/app/habits", "Consistencia"],
      ["/app/habits?checkin=1", "Bienestar"],
      ["/app/progress#statistics", "Estadísticas"],
    ],
  },
  space: {
    label: "Secciones de Mi espacio",
    items: [
      ["/app/journal", "Diario y notas"],
      ["/app/life-hub", "Braindump"],
      ["/app/finance", "Finanzas"],
      ["/app/learn", "Recursos"],
      ["/app/life-hub?tab=routines", "Más herramientas"],
    ],
  },
} satisfies Record<Section, { label: string; items: Array<[string, string]> }>;

export function SectionNavigation({ section }: { section: Section }) {
  const location = useLocation();
  const current = `${location.pathname}${location.search}${location.hash}`;
  const isActive = (href: string) => {
    if (href.includes("?") || href.includes("#")) return current === href;
    if (href === "/app/planning") return location.pathname === href && !location.search;
    if (href === "/app/life-hub") return location.pathname === href && !location.search;
    return location.pathname === href;
  };

  return <nav className="section-navigation" aria-label={sections[section].label}>
    {sections[section].items.map(([href, label]) => <Link key={href} to={href} className={isActive(href) ? "is-active" : ""} aria-current={isActive(href) ? "page" : undefined}>{label}</Link>)}
  </nav>;
}

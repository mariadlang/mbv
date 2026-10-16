"use client";

import { BriefcaseBusiness, CalendarDays, ChevronRight, Coins, Dumbbell, GraduationCap, Heart, Home, Leaf, Palette, Plane, Sparkles, Users, type LucideIcon } from "lucide-react";
import type { CascadePlan, LifeArea, PlannerSnapshot } from "@/src/domain/planner";
import { useI18n } from "@/src/i18n/I18nProvider";

const areaIconNames: Record<string, LucideIcon> = {
  heart: Heart, health: Heart, salud: Heart, "salud y bienestar": Heart,
  briefcase: BriefcaseBusiness, briefcasebusiness: BriefcaseBusiness, "briefcase-business": BriefcaseBusiness, work: BriefcaseBusiness,
  carrera: BriefcaseBusiness, trabajo: BriefcaseBusiness, "carrera profesional o trabajo": BriefcaseBusiness,
  coins: Coins, finance: Coins, finanzas: Coins,
  users: Users, relaciones: Users, "familia y amigos": Users,
  "amor / pareja": Heart, home: Home, hogar: Home, "ambiente fisico / entorno": Home,
  leaf: Leaf, bienestar: Leaf, crecimiento: Leaf, "crecimiento personal": Leaf,
  "desarrollo personal / crecimiento": Leaf,
  palette: Palette, creatividad: Palette, "proyectos creativos": Palette,
  plane: Plane, experiencias: Plane, "diversion y ocio": Plane,
  graduationcap: GraduationCap, "graduation-cap": GraduationCap, aprendizaje: GraduationCap,
  dumbbell: Dumbbell, entrenamiento: Dumbbell, sparkles: Sparkles,
};
const normalizeAreaMetadata = (value?: string) => value?.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ") ?? "";
const iconFromMetadata = (value?: string) => { const key = normalizeAreaMetadata(value); return Object.hasOwn(areaIconNames, key) ? areaIconNames[key] : undefined; };

/** Presentation follows saved metadata, never an area's position or a month's sample title. */
export function getPlanningAreaVisual(area?: Pick<LifeArea, "icon" | "category" | "name" | "color">) {
  if (!area) return { Icon: CalendarDays, tone: "neutral" as const };
  const Icon = iconFromMetadata(area.icon)
    ?? iconFromMetadata(area.category)
    ?? iconFromMetadata(area.name)
    ?? Leaf;
  return { Icon, tone: area.color };
}

export function PlanningYearSelect({ snapshot, year, onYearChange }: { snapshot: PlannerSnapshot; year: number; onYearChange: (year: number) => void }) {
  const { m } = useI18n();
  return <label><span className="sr-only">{m("preparation.year")}</span><select value={year} onChange={(event) => onYearChange(Number(event.target.value))}>{Array.from(new Set([...Array.from({ length: 16 }, (_, index) => new Date().getFullYear() - 5 + index), year, ...snapshot.cascadePlans.filter((item) => item.horizon === "monthly").map((item) => Number(item.periodKey.slice(0, 4)))] )).sort().map((item) => <option key={item}>{item}</option>)}</select></label>;
}

export function PlanningMonthGrid({ snapshot, year, selectedMonthIndex, onSelect, isDisabled }: {
  snapshot: PlannerSnapshot;
  year: number;
  selectedMonthIndex?: number;
  onSelect: (periodKey: string, plan?: CascadePlan) => void;
  isDisabled?: (periodKey: string, plan?: CascadePlan) => boolean;
}) {
  const { m, formatDate } = useI18n();
  return <div className="prep-month-grid">{Array.from({ length: 12 }, (_, index) => { const key = `${year}-${String(index + 1).padStart(2, "0")}`; const saved = snapshot.cascadePlans.find((item) => item.horizon === "monthly" && item.periodKey === key); const linkedArea = saved?.areaIds?.map((id) => snapshot.lifeAreas.find((area) => area.id === id)).find((area) => Boolean(area)); const { Icon, tone } = getPlanningAreaVisual(linkedArea); return <button key={key} data-period={key} aria-pressed={selectedMonthIndex === undefined ? undefined : index === selectedMonthIndex} disabled={isDisabled?.(key, saved)} onClick={() => onSelect(key, saved)}><header className="prep-month-card-heading"><strong>{formatDate(new Date(year, index, 1, 12), { month: "long" })}</strong><small>{String(index + 1).padStart(2, "0")}</small></header><div><span className={`prep-icon prep-area-icon ${index % 2 ? "" : "is-sage"}`} data-tone={tone}><Icon aria-hidden="true" /></span><ChevronRight size={15} aria-hidden="true" /></div><h3 className="prep-month-card-title" data-no-translate="true">{saved?.intention || m("preparation.noFocus")}</h3>{saved?.objectives[0] && <small data-no-translate="true">{saved.objectives[0]}</small>}</button>; })}</div>;
}

"use client";

import { Heart } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { CascadePlan } from "@/src/domain/planner";
import type { UserAccess } from "@/src/domain/access";
import { isTrialPlanningMonthAllowed } from "@/src/domain/access";
import { useI18n } from "@/src/i18n/I18nProvider";
import { PlanningMonthGrid, PlanningYearSelect } from "./PlanningMonthGrid";

export function EditorialYear({ planner, access, year, onYearChange, onCreate, onOpen }: {
  planner: PlannerController;
  access: UserAccess;
  year: number;
  onYearChange: (year: number) => void;
  onCreate: (periodKey: string) => void;
  onOpen: (plan: CascadePlan) => void;
}) {
  const { m } = useI18n();
  return <div className="prep-year prep-main-column" data-i18n-explicit="true">
    <header className="prep-heading"><span className="prep-eyebrow">{m("preparation.year")}</span><h1>{m("preparation.annualTitle", { year })} <Heart className="prep-drawn-heart" aria-hidden="true" /></h1></header>
    <div className="prep-year-toolbar"><PlanningYearSelect snapshot={planner.snapshot} year={year} onYearChange={onYearChange} /></div>
    <PlanningMonthGrid snapshot={planner.snapshot} year={year} onSelect={(key, plan) => plan ? onOpen(plan) : onCreate(key)} isDisabled={(key, plan) => !plan && !isTrialPlanningMonthAllowed(access, key)} />
  </div>;
}

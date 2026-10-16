"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, GraduationCap, Heart, Plus, Target } from "lucide-react";
import type { CascadePlan, BrainDumpType } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { UserAccess } from "@/src/domain/access";
import { isTrialPlanningMonthAllowed } from "@/src/domain/access";
import { getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { parseAreaGoals } from "@/src/domain/monthPlanning";
import { useI18n } from "@/src/i18n/I18nProvider";
import { Modal } from "@/src/components/ui/Modal";
import { useUnsavedDraft } from "@/src/components/navigation/UnsavedDraftProvider";
import { Botanical, EditorialCard, EditorialHeading, localDate, usePreparationOperation } from "./PreparationShared";
import { DecorativeNote } from "./DecorativeNote";
import { getPlanningAreaVisual, PlanningMonthGrid, PlanningYearSelect } from "./PlanningMonthGrid";
export { getPlanningAreaVisual } from "./PlanningMonthGrid";

type ListKey = "books" | "learning" | "experiences";
const preparationLabelKey = (key: ListKey) => `preparation.${key}` as const;

export function EditorialMonthMap({ planner, access, year, onYearChange, onEdit, onCreate, onOpen }: { planner: PlannerController; access: UserAccess; year: number; onYearChange: (year: number) => void; onEdit: (plan: CascadePlan) => void; onCreate: (key: string) => void; onOpen: (plan: CascadePlan) => void }) {
  const { m, formatDate } = useI18n();
  const navigate = useNavigate();
  const { snapshot } = planner;
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const plan = snapshot.cascadePlans.find((item) => item.horizon === "monthly" && item.periodKey === month);
  const allowed = isTrialPlanningMonthAllowed(access, month);
  const [listEditor, setListEditor] = useState<{ type: BrainDumpType; id?: string; month: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [weekPicker, setWeekPicker] = useState(false);
  const operation = usePreparationOperation();
  const date = localDate(month + "-01");
  const monthName = formatDate(date, { month: "long" });
  const changeMonth = (delta: number) => { const next = new Date(year, monthIndex + delta, 1); onYearChange(next.getFullYear()); setMonthIndex(next.getMonth()); };
  const weeks = Array.from(new Set(Array.from({ length: new Date(year, monthIndex + 1, 0).getDate() }, (_, index) => toLocalDateKey(getWeekDates(new Date(year, monthIndex, index + 1, 12), 1)[0]))));
  const areas = snapshot.lifeAreas.filter((area) => area.active);
  const annualAreas = parseAreaGoals(snapshot.cascadePlans.find((item) => item.horizon === "annual" && item.periodKey === String(year))?.details?.areaGoals);
  const saveList = async () => {
    if (!listEditor || !isTrialPlanningMonthAllowed(access, listEditor.month) || draft.trim().length < 2) return false;
    const ok = await operation.run(() => listEditor.id ? planner.updateBrainDumpItem(listEditor.id, { title: draft }) : planner.createBrainDumpItem({ title: draft, type: listEditor.type, tentativeDate: listEditor.month + "-01" }));
    if (ok) { guard.markSaved(); setListEditor(null); } return ok;
  };
  const guard = useUnsavedDraft({ dirty: Boolean(listEditor && draft !== (snapshot.brainDumpItems.find((item) => item.id === listEditor.id)?.title || "")), saving: Boolean(listEditor && operation.busy), onSave: saveList, onDiscard: () => setListEditor(null) });
  return <div className="prep-page prep-map" data-i18n-explicit="true">
    <div className="prep-main-column"><EditorialHeading page="map" /><p className="prep-map-description">{m("preparation.map.description")}</p>
      <EditorialCard className="prep-annual"><header className="prep-card-heading"><span className="prep-icon"><Target /></span><h2>{m("preparation.annual")}</h2><Link to="/app/planning?view=annual">{m("preparation.annualLink")} <ArrowRight size={15} /></Link></header><div className="prep-area-grid">{areas.map((area) => { const { Icon, tone } = getPlanningAreaVisual(area); return <Link key={area.id} to="/app/vision"><span className="prep-icon is-sage prep-area-icon" data-tone={tone}><Icon aria-hidden="true" /></span><strong data-no-translate="true">{area.name}</strong><small data-no-translate="true">{annualAreas[area.id] || m("preparation.noFocus")}</small></Link>; })}</div></EditorialCard>
      <header className="prep-months-heading"><h2>{m("preparation.allMonths")}</h2><span>{m("preparation.smallSteps")}</span><PlanningYearSelect snapshot={snapshot} year={year} onYearChange={onYearChange} /></header>
      <PlanningMonthGrid snapshot={snapshot} year={year} selectedMonthIndex={monthIndex} onSelect={(key) => setMonthIndex(Number(key.slice(5, 7)) - 1)} />
    </div>
    <aside className="prep-aside"><EditorialCard className="prep-month-detail"><header className="prep-card-heading"><span className="prep-icon"><CalendarDays /></span><h2>{m(month === toLocalDateKey(new Date()).slice(0, 7) ? "preparation.currentMonth" : "preparation.selectedMonth")}</h2><button aria-label={m("preparation.previous")} onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button><small>{monthName} {year}</small><button aria-label={m("preparation.nextPeriod")} onClick={() => changeMonth(1)}><ChevronRight size={18} /></button></header>
      <div className="prep-featured-month"><span className="prep-icon"><Botanical /></span><div><h2>{monthName}</h2><p data-no-translate="true">{plan?.intention || m("preparation.emptyMonth")}</p></div></div>
      {!allowed && <p className="prep-readonly-note">{m("planning.trial.limit")} <Link to="/upgrade">{m("public.cta.features")}</Link></p>}
      <h3><Target size={20} />{m("preparation.intention")}</h3><blockquote className="prep-intention" data-no-translate="true">{plan?.intention || m("preparation.noFocus")}</blockquote>
      <h3><Target size={20} />{m("preparation.three")}</h3><ol className="prep-priorities">{plan?.objectives.slice(0, 3).map((text, index) => <li key={index}><span>{index + 1}</span><span data-no-translate="true">{text}</span></li>)}</ol>{!plan?.objectives.length && <p>{m("preparation.emptyPriorities")}</p>}
      <button className="prep-text-link" disabled={!allowed} onClick={() => plan ? onEdit(plan) : onCreate(month)}>{m("preparation.edit")} <ArrowRight size={15} /></button>{plan && <button className="prep-text-link" onClick={() => onOpen(plan)}>{m("preparation.view")}</button>}
      {plan && plan.objectives.length > 3 && <details><summary>{m("preparation.extra")}</summary><ul>{plan.objectives.slice(3).map((text, index) => <li key={index} data-no-translate="true">{text}</li>)}</ul></details>}
      <h3><CalendarDays size={20} />{m("preparation.optionalLists")}</h3><div className="prep-list-grid">{([{ type: "want_to_read", key: "books", Icon: BookOpen }, { type: "want_to_learn", key: "learning", Icon: GraduationCap }, { type: "want_to_do", key: "experiences", Icon: Heart }] as const).map(({ type, key, Icon }) => <section key={key}><h4><Icon size={18} />{m(preparationLabelKey(key))}</h4>{snapshot.brainDumpItems.filter((item) => item.type === type && (item.periodPlanId === plan?.id && Boolean(plan) || item.tentativeDate?.startsWith(month)) && item.status !== "released").map((item) => <div className="prep-list-item" key={item.id}><button disabled={operation.busy || !allowed} aria-label={item.title} aria-pressed={item.status === "completed"} onClick={() => operation.run(() => planner.updateBrainDumpItem(item.id, { status: item.status === "completed" ? "idea" : "completed" }))}>{item.status === "completed" && <Check size={13} />}</button><button disabled={!allowed} data-no-translate="true" onClick={() => { setDraft(item.title); setListEditor({ type, id: item.id, month }); }}>{item.title}</button></div>)}<button className="prep-text-link" disabled={!allowed} onClick={() => { setDraft(""); setListEditor({ type, month }); }}><Plus size={12} />{m("preparation.add")}</button></section>)}</div>
      {operation.error && <p role="alert">{m("preparation.error")}</p>}
      <div className="prep-week-bridge"><div className="prep-week-bridge-copy"><h3>{m("preparation.weeklyBridge")}</h3><p>{m("preparation.weeklyBridgeHelp")}</p><button className="prep-primary" onClick={() => setWeekPicker(true)}>{m("preparation.viewWeek")} <ArrowRight size={17} /></button></div><DecorativeNote variant="month" /></div>
    </EditorialCard></aside>
    <Modal open={Boolean(listEditor)} onClose={() => guard.request(() => setListEditor(null))} title={m(listEditor?.id ? "preparation.edit" : "preparation.add")} explicitI18n inertBackground><form onSubmit={async (event) => { event.preventDefault(); await saveList(); }}><label className="form-field">{m("preparation.optionalLists")}<input required minLength={2} maxLength={300} disabled={operation.busy} value={draft} onChange={(event) => setDraft(event.target.value)} /></label>{operation.error && <p role="alert">{m("preparation.error")}</p>}<button className="button" disabled={operation.busy}>{m("preparation.save")}</button></form></Modal>
    <Modal open={weekPicker} onClose={() => !operation.busy && setWeekPicker(false)} title={m("preparation.selectWeek")} explicitI18n inertBackground><div className="prep-week-choices">{weeks.map((week) => <button key={week} disabled={operation.busy} onClick={async () => { if (await operation.run(() => planner.saveWeekPreparation({ week, month }))) navigate(`/app/guide?week=${week}`); }}>{formatDate(localDate(week), { month: "long", day: "numeric" })}<ArrowRight size={16} /></button>)}</div>{operation.error && <p role="alert">{m("preparation.error")}</p>}</Modal>
  </div>;
}

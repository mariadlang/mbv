"use client";

import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Apple, ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, Check, Circle, CircleDot, ClipboardList, Dumbbell, Heart, Leaf, SlidersHorizontal, Target } from "lucide-react";
import { Modal } from "@/src/components/ui/Modal";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { PlannerSnapshot } from "@/src/domain/planner";
import { preparationKeys, weekPreparation } from "@/src/domain/weekPreparation";
import { getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { MessageKey } from "@/src/i18n/keys";
import { useUnsavedDraft } from "@/src/components/navigation/UnsavedDraftProvider";

export const localDate = (key: string) => new Date(`${key}T12:00:00`);
export const currentWeek = () => toLocalDateKey(getWeekDates(new Date(), 1)[0]);
export function preparationLabel(id: string): MessageKey {
  return (`preparation.${[...preparationKeys, "finance", "study", "wellbeing", "social", "other"].includes(id as typeof preparationKeys[number]) ? id : "other"}`) as MessageKey;
}
export function preparationHref(id: string, week: string) {
  const back = encodeURIComponent(`/app/guide?week=${week}`);
  if (id === "nutrition" || id === "training") return `/app/health?section=${id}&date=${week}&returnTo=${back}`;
  if (id === "habits") return `/app/habits?returnTo=${back}`;
  if (id === "finance") return "/app/finance";
  return `/app/planning/weekly?date=${week}&returnTo=${back}${id === "priorities" ? "#weekly-priorities" : ""}`;
}
const icons = { nutrition: Apple, training: Dumbbell, habits: ChartNoAxesColumnIncreasing, priorities: Target, agenda: CalendarDays };
export function Botanical({ className = "" }: { className?: string }) {
  return <svg className={`prep-botanical ${className}`} viewBox="0 0 70 120" fill="none" aria-hidden="true"><path d="M27 115C30 82 49 52 45 6M33 91C14 88 12 73 9 62C27 67 35 76 33 91ZM41 63C57 60 65 45 65 31C48 39 39 48 41 63ZM44 41C29 33 29 18 31 8C44 19 49 27 44 41ZM27 111C44 101 50 89 48 76C36 88 28 99 27 111Z" stroke="currentColor" strokeWidth="1.4" /><path d="M33 87L15 70M44 58L59 39M43 36L33 15" stroke="currentColor" /></svg>;
}
export function EditorialHeading({ page }: { page: "home" | "guide" | "map" }) {
  const { m } = useI18n();
  const titleKey = `preparation.title.${page}` as const;
  const subtitleKey = `preparation.subtitle.${page}` as const;
  return <header className="prep-heading"><span className="prep-eyebrow">{m(page === "map" ? "preparation.months" : `preparation.${page}`)}</span><h1>{m(titleKey)} <Heart className="prep-drawn-heart" aria-hidden="true" /></h1><p>{m(subtitleKey)}</p></header>;
}
export function EditorialCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`prep-card ${className}`}>{children}</section>;
}
export function usePreparationOperation() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const run = async (operation: () => Promise<unknown>) => {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError(false);
    try { await operation(); return true; }
    catch { setError(true); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  return { run, busy, error };
}
export function MonthlyContext({ snapshot, month, compact = false }: { snapshot: PlannerSnapshot; month: string; compact?: boolean }) {
  const { m, formatDate } = useI18n();
  const plan = snapshot.cascadePlans.find((item) => item.horizon === "monthly" && item.periodKey === month);
  return <EditorialCard className={`prep-month-context ${compact ? "is-compact" : ""}`}>
    <header className="prep-card-heading"><span className="prep-icon"><Target /></span><h2>{m(compact ? "preparation.context" : "preparation.focus")}</h2><small>{formatDate(localDate(month + "-01"), { month: "long", year: "numeric" })}</small></header>
    <div className="prep-focus-body">
      <small>{m("preparation.intention")}</small>
      <h3 data-no-translate="true">{plan?.intention || m("preparation.emptyMonth")}</h3>
      <h4>{m("preparation.three")}</h4>
      {plan?.objectives.length ? <ol className="prep-priorities">{plan.objectives.slice(0, 3).map((title, index) => <li key={index}><span>{index + 1}</span><span data-no-translate="true">{title}</span></li>)}</ol> : <p>{m("preparation.emptyPriorities")}</p>}
      {plan && plan.objectives.length > 3 && <details><summary>{m("preparation.extra")}</summary><ul>{plan.objectives.slice(3).map((text, i) => <li key={i} data-no-translate="true">{text}</li>)}</ul></details>}
      <Link className="prep-text-link" to={`/app/planning?month=${month}&create=month`}>{m("preparation.edit")} <ArrowRight size={15} /></Link>
    </div>
    {compact ? <p className="prep-handwritten"><Botanical />{m("preparation.contextQuote")}</p> : <div className="prep-focus-photo" aria-hidden="true" />}
  </EditorialCard>;
}
export function PreparationChecklist({ planner, week, guide = false, overview = false, onPriorities }: { planner: PlannerController; week: string; guide?: boolean; overview?: boolean; onPriorities?: () => void }) {
  const { m, formatNumber } = useI18n();
  const data = weekPreparation(planner.snapshot, week, overview);
  const [editing, setEditing] = useState<string | null>(null);
  const [customize, setCustomize] = useState(false);
  const [selection, setSelection] = useState(data.rows.map(({ id, label }) => ({ id, label })));
  const [custom, setCustom] = useState("");
  const [preferencesBaseline, setPreferencesBaseline] = useState(() => JSON.stringify(selection));
  const operation = usePreparationOperation();
  const savePreferences = async (): Promise<boolean> => {
    const items = custom.trim() ? [...selection, { id: crypto.randomUUID(), label: custom.trim() }] : selection;
    if (!await operation.run(() => planner.savePreparationPreferences(items))) return false;
    setPreferencesBaseline(JSON.stringify(items));
    preferencesGuard.markSaved(); setCustomize(false); setCustom("");
    return true;
  };
  const preferencesGuard = useUnsavedDraft({ dirty: customize && (custom.trim().length > 0 || JSON.stringify(selection) !== preferencesBaseline), saving: customize && operation.busy, onSave: savePreferences, onDiscard: () => { setSelection(data.rows.map(({ id, label }) => ({ id, label }))); setCustom(""); setCustomize(false); } });
  const selected = data.rows.find((row) => row.id === editing);
  const options = [...preparationKeys, "finance", "study", "wellbeing", "social"] as const;
  return <EditorialCard className={`prep-checklist ${overview ? "home-preparation" : ""}`}>
    {overview ? <header className="prep-card-heading"><span className="prep-icon"><CalendarDays aria-hidden="true" /></span><div><h2>{m("homeOverview.preparation")}</h2><p>{m("preparation.checklist.help")}</p></div><small className="home-ready-count" aria-live="polite">{m("homeOverview.count", { ready: formatNumber(data.ready) })}</small></header> : <header className="prep-card-heading"><span className="prep-icon"><ClipboardList /></span><div><h2>{m(guide ? "preparation.prepare" : "preparation.checklist")}</h2><p>{m("preparation.checklist.help")}</p></div><div className="prep-progress"><small>{data.active.length ? m("preparation.count", { ready: formatNumber(data.ready), total: formatNumber(data.active.length) }) : m("preparation.neutral")}</small><progress value={data.ready} max={data.active.length || 1} aria-label={m("preparation.checklist")} /><span>{formatNumber(data.percent)}%</span><svg className="prep-progress-ring" viewBox="0 0 48 48" role="img" aria-label={`${formatNumber(data.percent)}%`}><circle cx="24" cy="24" r="20" pathLength="100" /><circle className="prep-progress-ring-value" cx="24" cy="24" r="20" pathLength="100" strokeDasharray={`${data.percent} 100`} /><text x="24" y="28" textAnchor="middle">{formatNumber(data.percent)}%</text></svg></div></header>}
    <div>{data.rows.map((row) => { const Icon = icons[row.id as keyof typeof icons] ?? Leaf; const known = preparationKeys.includes(row.id as typeof preparationKeys[number]); const helpKey = `preparation.${row.id}.help` as MessageKey; const displayState = overview && row.state === "excluded" ? "pending" : row.state; const stateKey = `preparation.${displayState}` as MessageKey; return <div className={`prep-checklist-row ${!overview && row.state === "excluded" ? "is-excluded" : ""}`} key={row.id}>
      <span className={`prep-icon ${row.id !== "priorities" ? "is-sage" : ""}`}><Icon /></span>
      <div className="prep-row-copy"><strong>{row.label || m(preparationLabel(row.id))}</strong>{known && <small>{m(overview ? row.state === "excluded" ? "homeOverview.excluded" : `homeOverview.${row.id}Help` as MessageKey : helpKey)}</small>}</div>
      <button className={`prep-badge is-${displayState}`} onClick={() => setEditing(row.id)}>{row.state === "ready" ? <Check size={16} aria-hidden="true" /> : overview ? displayState === "progress" ? <CircleDot size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" /> : null}{m(stateKey)}</button>
      {row.id === "priorities" && onPriorities ? <button type="button" className="prep-row-action" onClick={onPriorities}>{m(guide ? "preparation.define" : "preparation.review")}<ArrowRight size={17} /></button> : <Link className="prep-row-action" to={preparationHref(row.id, week)}>{m(guide ? row.state === "ready" ? "preparation.adjust" : row.id === "priorities" ? "preparation.define" : "preparation.plan" : row.state === "ready" ? row.id === "agenda" ? "preparation.viewAgenda" : "preparation.view" : row.id === "priorities" ? "preparation.review" : "preparation.organize")}<ArrowRight size={17} /></Link>}
    </div>; })}</div>
    {!overview && <footer><button className="prep-text-link" onClick={() => { const items = data.rows.map(({ id, label }) => ({ id, label })); setPreferencesBaseline(JSON.stringify(items)); setSelection(items); setCustom(""); setCustomize(true); }}><SlidersHorizontal size={14} />{m("preparation.customize")}</button></footer>}
    <Modal open={Boolean(selected)} onClose={() => !operation.busy && setEditing(null)} title={selected ? selected.label || m(preparationLabel(selected.id)) : ""} explicitI18n inertBackground>
      <p>{m("preparation.confirmHelp")}</p>
      {operation.error && <p role="alert">{m("preparation.error")}</p>}
      <div className="prep-dialog-actions">{selected && <>
        <button className="button" disabled={operation.busy} onClick={async () => { if (await operation.run(() => planner.saveWeekPreparation({ week, item: selected.id, state: selected.state === "ready" ? "pending" : "ready" }))) setEditing(null); }}>{m(selected.state === "ready" ? "preparation.unconfirm" : "preparation.confirm")}</button>
        {!overview && <button className="button button--outline" disabled={operation.busy} onClick={async () => { if (await operation.run(() => planner.saveWeekPreparation({ week, item: selected.id, state: selected.state === "excluded" ? "pending" : "excluded" }))) setEditing(null); }}>{m(selected.state === "excluded" ? "preparation.include" : "preparation.excluded")}</button>}
      </>}</div>
    </Modal>
    <Modal open={customize} onClose={() => preferencesGuard.request(() => setCustomize(false))} title={m("preparation.customize.title")} explicitI18n inertBackground>
      <p>{m("preparation.customize.help")}</p>
      <form onSubmit={async (event) => { event.preventDefault(); await savePreferences(); }}><fieldset disabled={operation.busy} aria-busy={operation.busy} style={{ display: "contents" }}>
        {[...options.map((id) => ({ id, label: undefined as string | undefined })), ...selection.filter((item) => !options.includes(item.id as typeof options[number]))].map((option) => <label className="prep-option" key={option.id}><input type="checkbox" checked={selection.some((item) => item.id === option.id)} onChange={(event) => setSelection((items) => event.target.checked ? [...items, option] : items.filter((item) => item.id !== option.id))} />{option.label || m(preparationLabel(option.id))}</label>)}
        <label className="form-field">{m("preparation.other")}<input maxLength={100} value={custom} onChange={(event) => setCustom(event.target.value)} /></label>
        {operation.error && <p role="alert">{m("preparation.error")}</p>}
        <div className="prep-dialog-actions"><button className="button" disabled={operation.busy}>{m("preparation.continue")}</button><button type="button" className="button button--outline" disabled={operation.busy} onClick={() => preferencesGuard.request(() => setCustomize(false))}>{m("preparation.skip")}</button></div>
      </fieldset></form>
    </Modal>
  </EditorialCard>;
}

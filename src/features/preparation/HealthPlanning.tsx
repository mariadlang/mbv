"use client";
import { useState } from "react";
import { Apple, ArrowRight, CalendarDays, Dumbbell, Pencil, Sparkles } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { healthPreparation, healthLibrary, hasHealthDetail, type HealthContent, type HealthPreparationInput, type HealthScope } from "@/src/domain/healthPreparation";
import { normalizedExerciseSets } from "@/src/domain/fitnessRules";
import { getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { useI18n } from "@/src/i18n/I18nProvider";
import { Modal } from "@/src/components/ui/Modal";
import { useUnsavedDraft } from "@/src/components/navigation/UnsavedDraftProvider";
import { EditorialCard, localDate, usePreparationOperation } from "./PreparationShared";

type LibraryRecord = ReturnType<typeof healthLibrary>[number];
type Props = { planner: PlannerController; date: string; section: "nutrition" | "training"; onSelectDate: (date: string) => void; onEditRecord?: (date: string, recordId?: string, scope?: HealthScope) => void };
export function HealthPlanning({ planner, date, section, onSelectDate, onEditRecord }: Props) {
  const { m, formatDate } = useI18n();
  const [view, setView] = useState<"weekly" | "monthly" | "library">("weekly");
  const [draft, setDraft] = useState<HealthPreparationInput | null>(null);
  const [initialDraft, setInitialDraft] = useState("");
  const [detail, setDetail] = useState<LibraryRecord | null>(null);
  const [help, setHelp] = useState(false);
  const operation = usePreparationOperation();
  const saveDraft = async () => {
    if (!draft || draft.title.trim().length < 2) return false;
    if (!await operation.run(() => planner.saveHealthPreparation(draft))) return false;
    draftGuard.markSaved(); setDraft(null); return true;
  };
  const draftGuard = useUnsavedDraft({ dirty: Boolean(draft && JSON.stringify(draft) !== initialDraft), saving: operation.busy, onSave: saveDraft, onDiscard: () => setDraft(null) });
  const startDraft = (value: HealthPreparationInput) => { setInitialDraft(JSON.stringify(value)); setDraft(value); };
  const anchor = localDate(date);
  const dates = view === "monthly" ? Array.from({ length: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate() }, (_, day) => new Date(anchor.getFullYear(), anchor.getMonth(), day + 1, 12)) : getWeekDates(anchor, 1);
  const library = healthLibrary(planner.snapshot, section).sort((a, b) => b.date.localeCompare(a.date));
  const template = draft?.sourceRecordId ? library.find((item) => item.recordId === draft.sourceRecordId && item.date === draft.sourceDate) : undefined;
  const edit = (key: string) => {
    const saved = healthPreparation(planner.snapshot, key, section);
    startDraft({ date: key, section, scope: view === "monthly" ? "monthly" : "weekly", title: view === "monthly" ? saved.monthly?.title || saved.title : saved.title, rest: view === "monthly" ? saved.monthly?.rest || false : saved.rest });
  };
  const applyTemplate = (item: LibraryRecord) => { setDetail(null); startDraft({ date, section, scope: "weekly", title: item.title, sourceDate: item.date, sourceRecordId: item.recordId }); };
  const openDetailed = () => {
    if (!draft) return;
    const target = draft;
    draftGuard.request(() => { setDraft(null); onEditRecord?.(target.date, healthPreparation(planner.snapshot, target.date, section).source?.recordId, target.scope); });
  };
  const Icon = section === "nutrition" ? Apple : Dumbbell;
  return <EditorialCard className="prep-health">
    <div data-i18n-explicit="true"><header className="prep-card-heading"><span className="prep-icon is-sage"><Icon /></span><div><h2>{m(section === "nutrition" ? "preparation.mealPlan" : "preparation.trainingPlan")}</h2><p>{m("preparation.healthHelp")}</p></div></header>
      <div className="prep-category-tabs" role="group" aria-label={m("preparation.plan")}><button aria-pressed={view === "weekly"} onClick={() => draftGuard.request(() => setView("weekly"))}>{m("preparation.week")}</button><button aria-pressed={view === "monthly"} onClick={() => draftGuard.request(() => setView("monthly"))}>{m("preparation.month")}</button><button aria-pressed={view === "library"} onClick={() => draftGuard.request(() => setView("library"))}>{m("healthLibrary.title")}</button></div>
      <label className="prep-health-date">{m("preparation.date")}<input type="date" required value={date} onChange={(event) => { const value = event.target.value; if (value) draftGuard.request(() => onSelectDate(value)); }} /></label>
      {view === "library" ? <><p>{m("healthLibrary.help")}</p>{library.length ? <div className="health-library-records">{library.map((item) => <article className="health-library-record" key={item.date + item.recordId}><time>{formatDate(localDate(item.date), { day: "numeric", month: "long", year: "numeric" })}</time><h3 data-no-translate="true">{item.title}</h3>{!hasHealthDetail(item.content) && <p className="health-library-incomplete">{m("healthLibrary.incomplete")}</p>}<div><button className="button button--outline" onClick={() => setDetail(item)}>{m("healthLibrary.detail")}</button>{hasHealthDetail(item.content) && <button className="button" onClick={() => applyTemplate(item)}>{m("healthLibrary.use")}</button>}</div></article>)}</div> : <p>{m("preparation.libraryEmpty")}</p>}</> : <>
        <div className="prep-health-choices"><button onClick={() => setView("library")}><CalendarDays size={20} />{m("preparation.useTemplate")}</button><button onClick={() => setHelp(true)}><Sparkles size={20} />{m("preparation.proposal")}</button><button onClick={() => edit(date)}><Pencil size={20} />{m("preparation.createPlan")}</button></div>
        <div className="prep-health-days">{dates.map((day) => { const key = toLocalDateKey(day); const saved = healthPreparation(planner.snapshot, key, section); const title = view === "monthly" ? saved.monthly?.title || saved.title : saved.title; return <button key={key} onClick={() => edit(key)}><time>{formatDate(day, { weekday: "short", day: "numeric" })}</time><span><strong data-no-translate="true">{title || m("preparation.pending")}</strong>{saved.recovered && view === "weekly" && <small>{m("preparation.recovered")}</small>}{saved.override && <small>{m("preparation.weeklyException")}</small>}{saved.rest && <small>{m("preparation.rest")}</small>}</span><ArrowRight size={17} /></button>; })}</div>
      </>}
      <p className="prep-health-details-note">{m("healthLibrary.manual")}</p>
      <Modal open={help} onClose={() => setHelp(false)} title={m("preparation.proposal")} explicitI18n inertBackground><p>{m("preparation.manualHelp")}</p><button className="button" onClick={() => { setHelp(false); edit(date); }}>{m("preparation.createPlan")}</button></Modal>
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={m("healthLibrary.detail")} explicitI18n inertBackground>{detail && <><h3 data-no-translate="true">{detail.title}</h3><time>{formatDate(localDate(detail.date), { day: "numeric", month: "long", year: "numeric" })}</time><HealthDetail content={detail.content} /><div className="prep-dialog-actions">{onEditRecord && <button className="button button--outline" onClick={() => { setDetail(null); onEditRecord(detail.date, detail.recordId); }}>{m("healthLibrary.edit")}</button>}{hasHealthDetail(detail.content) && <button className="button" onClick={() => applyTemplate(detail)}>{m("healthLibrary.use")}</button>}</div></>}</Modal>
      <Modal open={Boolean(draft)} onClose={() => draftGuard.request(() => setDraft(null))} title={m("preparation.edit")} explicitI18n inertBackground><form onSubmit={async (event) => { event.preventDefault(); await saveDraft(); }}>
        <fieldset disabled={operation.busy} aria-busy={operation.busy} style={{ display: "contents" }}>
        <p>{draft && formatDate(localDate(draft.date), { weekday: "long", day: "numeric", month: "long" })} · {m(draft?.scope === "monthly" ? "preparation.month" : "preparation.week")}</p>
        {template && <><label className="form-field">{m("healthLibrary.destination")}<input type="date" value={draft?.date || ""} required onChange={(event) => setDraft((current) => current ? { ...current, date: event.target.value } : current)} /></label><label className="form-field">{m("healthLibrary.scope")}<select value={draft?.scope} onChange={(event) => setDraft((current) => current ? { ...current, scope: event.target.value as HealthScope } : current)}><option value="weekly">{m("preparation.week")}</option><option value="monthly">{m("preparation.month")}</option></select></label><details className="health-library-template" open><summary>{m("healthLibrary.template")}</summary><HealthDetail content={template.content} /></details></>}
        <label className="form-field">{m(section === "nutrition" ? "preparation.mealPlan" : "preparation.trainingPlan")}<textarea rows={3} minLength={2} maxLength={300} required value={draft?.title || ""} onChange={(event) => setDraft((current) => current ? { ...current, title: event.target.value } : current)} /></label>
        {section === "training" && <label className="prep-option"><input type="checkbox" checked={draft?.rest || false} onChange={(event) => setDraft((current) => current ? { ...current, rest: event.target.checked, title: event.target.checked ? m("preparation.rest") : current.title } : current)} />{m("preparation.rest")}</label>}
        {!template && onEditRecord && <button type="button" className="button button--outline" disabled={operation.busy} onClick={openDetailed}>{m("healthLibrary.edit")}</button>}
        <p>{m("preparation.healthSaveHelp")}</p>{operation.error && <p role="alert">{m("preparation.error")}</p>}<div className="prep-dialog-actions"><button className="button" disabled={operation.busy}>{m("preparation.save")}</button>{draft?.scope === "weekly" && healthPreparation(planner.snapshot, draft.date, section).monthly && <button type="button" className="button button--outline" disabled={operation.busy} onClick={() => { const current = draft; draftGuard.request(() => { void operation.run(() => planner.saveHealthPreparation({ ...current, title: current.title || m("preparation.rest"), inherit: true })).then((saved) => { if (saved) { draftGuard.markSaved(); setDraft(null); } }); }); }}>{m("preparation.restoreMonth")}</button>}</div>
        </fieldset>
      </form></Modal>
    </div>
  </EditorialCard>;
}

function HealthDetail({ content }: { content: HealthContent }) {
  const { m, formatNumber } = useI18n();
  if (!hasHealthDetail(content)) return <p>{m("healthLibrary.noDetail")}</p>;
  if (content.kind === "nutrition") return <div className="health-library-detail"><dl>{([["calories", "healthLibrary.calories"], ["protein", "healthLibrary.protein"], ["carbs", "healthLibrary.carbs"], ["fat", "healthLibrary.fat"]] as const).map(([key, label]) => <div key={key}><dt>{m(label)}</dt><dd>{typeof content[key] === "number" ? formatNumber(content[key]) : m("healthLibrary.unknown")}</dd></div>)}</dl>{content.notes && <section><h4>{m("healthLibrary.notes")}</h4><p data-no-translate="true">{content.notes}</p></section>}</div>;
  return <div className="health-library-detail">{content.durationMinutes && <p>{m("healthLibrary.duration")}: {formatNumber(content.durationMinutes)}</p>}{content.goal && <p data-no-translate="true">{content.goal}</p>}{content.exercises.map((exercise) => <section key={exercise.id}><h4 data-no-translate="true">{exercise.name}</h4><ul>{normalizedExerciseSets(exercise).map((set) => <li key={set.id}>{m("healthLibrary.set", { number: set.setNumber })}: {m("healthLibrary.repetitions", { reps: set.reps, weight: set.weight })}</li>)}</ul></section>)}</div>;
}

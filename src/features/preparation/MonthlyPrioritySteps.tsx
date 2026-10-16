"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, Target } from "lucide-react";
import { Modal } from "@/src/components/ui/Modal";
import { useUnsavedDraft } from "@/src/components/navigation/UnsavedDraftProvider";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { monthlyPriorityCandidates, monthlyPriorityForTask, monthlyPriorityStepSchema } from "@/src/domain/monthlyPrioritySteps";
import { weekPreparation } from "@/src/domain/weekPreparation";
import { getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { useI18n } from "@/src/i18n/I18nProvider";
import { localDate, usePreparationOperation } from "./PreparationShared";

type Draft = { taskId: string; actionKey: string; title: string; date: string; time: string; confirmMove: boolean };
type SavedStep = { title: string; date: string; time?: string; month?: string; priority?: string };
const emptyDraft = (week: string): Draft => ({ taskId: "", actionKey: crypto.randomUUID(), title: "", date: week, time: "", confirmMove: false });
const draftValue = (draft: Draft) => JSON.stringify([draft.taskId, draft.title, draft.date, draft.time]);

/** Both Mi guía and Semana render this editor over the same monthly tasks. */
export function MonthlyPrioritySteps({ planner, week, open, onClose }: { planner: PlannerController; week: string; open: boolean; onClose: () => void }) {
  return open ? <MonthlyPriorityStepEditor key={week} planner={planner} week={week} onClose={onClose} /> : null;
}

function MonthlyPriorityStepEditor({ planner, week, onClose }: { planner: PlannerController; week: string; onClose: () => void }) {
  const { m, formatDate } = useI18n();
  const context = weekPreparation(planner.snapshot, week);
  const plan = planner.snapshot.cascadePlans.find((item) => item.horizon === "monthly" && item.periodKey === context.month);
  const [priority, setPriority] = useState(plan?.objectives[0] ?? "");
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(week));
  const [baseline, setBaseline] = useState(() => draftValue(draft));
  const [invalid, setInvalid] = useState(false);
  const [savedStep, setSavedStep] = useState<SavedStep | null>(null);
  const savedTitleId = useId();
  const savedHeading = useRef<HTMLHeadingElement>(null);
  const actionField = useRef<HTMLTextAreaElement>(null);
  const operation = usePreparationOperation();
  useEffect(() => {
    if (savedStep) savedHeading.current?.focus();
  }, [savedStep]);
  const candidates = plan && priority ? monthlyPriorityCandidates(planner.snapshot, plan, priority) : [];
  const selected = planner.snapshot.tasks.find((task) => task.id === draft.taskId);
  const needsMove = Boolean(selected?.date && selected.date !== draft.date);
  const monthOptions = [...new Set([context.month, ...getWeekDates(localDate(week), 1).map((date) => toLocalDateKey(date).slice(0, 7)), ...planner.snapshot.cascadePlans.filter((item) => item.horizon === "monthly").map((item) => item.periodKey)])].sort();
  const dirty = draftValue(draft) !== baseline;
  const save = async (): Promise<boolean> => {
    const input = { taskId: draft.taskId || undefined, actionKey: draft.actionKey, planId: priority ? plan?.id : undefined, priority: priority || undefined, title: draft.title, date: draft.date, time: draft.time || undefined, confirmMove: draft.confirmMove };
    if (!monthlyPriorityStepSchema.safeParse(input).success || (needsMove && !draft.confirmMove)) { setInvalid(true); return false; }
    const saved = await operation.run(async () => {
      const snapshot = await planner.saveMonthlyPriorityStep(input);
      const task = snapshot.tasks.find((item) => input.taskId ? item.id === input.taskId : item.planActionKey === input.actionKey && item.periodPlanId === input.planId);
      if (!task?.date) throw new Error("MONTHLY_STEP_SAVE_NOT_CONFIRMED");
      const savedPlan = snapshot.cascadePlans.find((item) => item.id === task.periodPlanId && item.horizon === "monthly");
      setSavedStep({ title: task.title, date: task.date, time: task.time, month: savedPlan?.periodKey, priority: savedPlan ? monthlyPriorityForTask(savedPlan, task) : undefined });
    });
    if (saved) { setBaseline(draftValue(draft)); guard.markSaved(); }
    return saved;
  };
  const guard = useUnsavedDraft({ dirty, saving: operation.busy, onSave: save, onDiscard: () => { setBaseline(draftValue(draft)); } });
  const resetDraft = (taskId = "") => {
    const task = planner.snapshot.tasks.find((item) => item.id === taskId);
    const next = task ? { taskId: task.id, actionKey: task.planActionKey || `task:${task.id}`, title: task.title, date: task.date || week, time: task.time || "", confirmMove: false } : emptyDraft(week);
    setBaseline(draftValue(next)); setDraft(next); setInvalid(false);
  };
  const dateLabel = (date: string) => formatDate(localDate(date), { day: "numeric", month: "long", year: "numeric" });
  const savedWeek = savedStep ? toLocalDateKey(getWeekDates(localDate(savedStep.date), 1)[0]) : week;
  const isSavedToday = savedStep?.date === toLocalDateKey(new Date());
  return <Modal open title={m("monthlySteps.title")} onClose={() => guard.request(onClose)} explicitI18n inertBackground className="monthly-steps-dialog">
    {savedStep ? <section className="monthly-steps-receipt" aria-labelledby={savedTitleId}>
      <h3 id={savedTitleId} ref={savedHeading} tabIndex={-1}><Check size={22} aria-hidden="true" />{m("monthlySteps.savedTitle")}</h3>
      <p role="status">{m("monthlySteps.saved")}</p>
      <dl>
        <div><dt>{m("monthlySteps.action")}</dt><dd data-no-translate="true">{savedStep.title}</dd></div>
        <div><dt>{m("monthlySteps.date")}</dt><dd><time dateTime={savedStep.date}>{dateLabel(savedStep.date)}</time></dd></div>
        <div><dt>{m("monthlySteps.time")}</dt><dd>{savedStep.time ? <time dateTime={`${savedStep.date}T${savedStep.time}`}>{formatDate(new Date(`${savedStep.date}T${savedStep.time}:00`), { hour: "2-digit", minute: "2-digit" })}</time> : m("monthlySteps.noTime")}</dd></div>
        <div><dt>{m("monthlySteps.origin")}</dt><dd>{savedStep.month ? <>{m("monthlySteps.monthOrigin", { month: formatDate(localDate(`${savedStep.month}-01`), { month: "long", year: "numeric" }) })}{savedStep.priority && <span data-no-translate="true">{savedStep.priority}</span>}</> : m("monthlySteps.independent")}</dd></div>
      </dl>
      <p className="monthly-steps-help">{m("monthlySteps.savedHelp")}</p>
      <div className="monthly-steps-receipt-actions">
        <Link className="button" to={`/app/planning/weekly?date=${savedWeek}`} onClick={onClose}>{m("preparation.viewWeek")}<ArrowRight size={17} aria-hidden="true" /></Link>
        <Link className="button button--outline" to={isSavedToday ? "/app/today" : `/app/planning?view=day&date=${savedStep.date}`} onClick={onClose}>{m(isSavedToday ? "monthlySteps.viewToday" : "monthlySteps.viewDay")}<ArrowRight size={17} aria-hidden="true" /></Link>
        <button type="button" className="button button--outline" onClick={onClose}>{m("monthlySteps.keepPreparing")}</button>
        <button type="button" className="prep-text-link" onClick={() => { resetDraft(); setSavedStep(null); requestAnimationFrame(() => actionField.current?.focus()); }}>{m("monthlySteps.addAnother")}</button>
      </div>
    </section> : <form className="monthly-steps-form" aria-busy={operation.busy} onSubmit={async (event) => { event.preventDefault(); await save(); }}>
      <p>{m("monthlySteps.help")}</p>
      <label>{m("monthlySteps.context")}<select disabled={operation.busy} value={context.month} onChange={(event) => { const month = event.target.value; guard.request(async () => { if (await operation.run(() => planner.saveWeekPreparation({ week, month }))) { setPriority(planner.snapshot.cascadePlans.find((item) => item.horizon === "monthly" && item.periodKey === month)?.objectives[0] ?? ""); resetDraft(); } }); }}>{monthOptions.map((month) => <option key={month} value={month}>{formatDate(localDate(`${month}-01`), { month: "long", year: "numeric" })}</option>)}</select></label>
      {plan ? <div className="monthly-steps-context"><Target size={22} aria-hidden="true" /><div><strong data-no-translate="true">{plan.intention}</strong><ol>{plan.objectives.slice(0, 3).map((title, index) => <li key={index} data-no-translate="true">{title}</li>)}</ol></div></div> : <p className="monthly-steps-context">{m("monthlySteps.noPlan")} <Link to={`/app/planning?view=month&month=${context.month}&create=month`}>{m("monthlySteps.organizeMonth")}<ArrowRight size={15} /></Link></p>}
      <label>{m("monthlySteps.priority")}<select disabled={operation.busy} value={priority} onChange={(event) => { const value = event.target.value; guard.request(() => { setPriority(value); resetDraft(); }); }}><option value="">{m("monthlySteps.independent")}</option>{plan?.objectives.slice(0, 3).map((title, index) => <option key={index} value={title} data-no-translate="true">{title}</option>)}</select></label>
      {priority && <label>{m("monthlySteps.source")}<select disabled={operation.busy} value={draft.taskId} onChange={(event) => { const value = event.target.value; guard.request(() => resetDraft(value)); }}><option value="">{m("monthlySteps.new")}</option>{candidates.map((task) => <option key={task.id} value={task.id} data-no-translate="true">{task.title} · {task.date ? dateLabel(task.date) : m("monthlySteps.pending")}</option>)}</select></label>}
      <label>{m("monthlySteps.action")}<textarea ref={actionField} required minLength={2} maxLength={300} rows={2} disabled={operation.busy} value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} placeholder={m("monthlySteps.example")} /></label>
      <div className="monthly-steps-fields"><label>{m("monthlySteps.date")}<input required type="date" disabled={operation.busy} value={draft.date} onChange={(event) => setDraft((value) => ({ ...value, date: event.target.value, confirmMove: false }))} /></label><label>{m("monthlySteps.time")}<input type="time" disabled={operation.busy} value={draft.time} onChange={(event) => setDraft((value) => ({ ...value, time: event.target.value }))} /></label></div>
      {selected?.date && <p className="monthly-steps-scheduled"><CalendarDays size={18} aria-hidden="true" />{m("monthlySteps.scheduled", { date: dateLabel(selected.date) })}</p>}
      {needsMove && <label className="monthly-steps-confirm"><input type="checkbox" required disabled={operation.busy} checked={draft.confirmMove} onChange={(event) => setDraft((value) => ({ ...value, confirmMove: event.target.checked }))} />{m("monthlySteps.confirmMove", { date: draft.date ? dateLabel(draft.date) : "—" })}</label>}
      {selected?.status === "completed" && <p>{m("monthlySteps.completed")}</p>}
      <p className="monthly-steps-help">{m("monthlySteps.distinction")}</p>
      {invalid && <p role="alert">{m("monthlySteps.validation")}</p>}
      {operation.error && <p role="alert">{m("preparation.error")}</p>}
      <div className="prep-dialog-actions"><button type="submit" className="button" disabled={operation.busy}>{m("monthlySteps.save")}</button><button type="button" className="button button--outline" disabled={operation.busy} onClick={() => guard.request(onClose)}>{m("common.cancel")}</button></div>
    </form>}
  </Modal>;
}

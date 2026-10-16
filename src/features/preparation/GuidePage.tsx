"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, Heart, Pencil, Sparkles, Zap } from "lucide-react";
import { isValidCalendarDateKey } from "@/src/domain/calendar";
import { weekPreparation } from "@/src/domain/weekPreparation";
import { getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { currentWeek, EditorialCard, EditorialHeading, localDate, MonthlyContext, PreparationChecklist, usePreparationOperation } from "./PreparationShared";
import { Modal } from "@/src/components/ui/Modal";
import { MonthlyPrioritySteps } from "./MonthlyPrioritySteps";
import { useUnsavedDraft } from "@/src/components/navigation/UnsavedDraftProvider";

type StepKey = "reviewPrevious" | "remember" | "prepare" | "viewWeek";
const preparationLabelKey = (key: StepKey) => `preparation.${key}` as const;

export function GuidePage({ planner }: { planner: PlannerController }) {
  const { m } = useI18n();
  const [params] = useSearchParams();
  const requestedWeek = params.get("week");
  const week = requestedWeek && isValidCalendarDateKey(requestedWeek) ? toLocalDateKey(getWeekDates(localDate(requestedWeek), 1)[0]) : currentWeek();
  const data = weekPreparation(planner.snapshot, week);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [prioritiesOpen, setPrioritiesOpen] = useState(false);
  const [mobileStep, setMobileStep] = useState<"entry" | "review" | "prepare">(data.review ? "prepare" : "entry");
  const [moving, setMoving] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState(week);
  const reviewSummary = useRef<HTMLParagraphElement>(null);
  const reviewFocusPending = useRef(false);
  const operation = usePreparationOperation();
  useEffect(() => {
    if (data.review && !reviewOpen && !operation.busy && reviewFocusPending.current) {
      reviewSummary.current?.focus();
      reviewFocusPending.current = false;
    }
  }, [data.review, reviewOpen, operation.busy]);
  const saveMove = async (): Promise<boolean> => {
    if (!moving) return true;
    const saved = await operation.run(() => planner.rescheduleTask(moving, moveDate));
    if (saved) { moveGuard.markSaved(); setMoving(null); }
    return saved;
  };
  const moveGuard = useUnsavedDraft({ dirty: Boolean(moving && moveDate !== week), saving: Boolean(moving && operation.busy), onSave: saveMove, onDiscard: () => { setMoving(null); setMoveDate(week); } });
  const previous = localDate(week); previous.setDate(previous.getDate() - 7);
  const previousStart = toLocalDateKey(previous);
  const tasks = planner.snapshot.tasks.filter((task) => task.date && task.date >= previousStart && task.date < week);
  const step = data.review ? data.active.length > 0 && data.ready === data.active.length ? 3 : 2 : 0;
  const finishReview = async (review: "skipped" | "reviewed") => {
    reviewFocusPending.current = true;
    if (await operation.run(() => planner.saveWeekPreparation({ week, review }))) {
      setReviewOpen(false); setMobileStep("prepare");
    } else reviewFocusPending.current = false;
  };
  const openStep = (index: number) => {
    if (index === 0) { setReviewOpen(true); return; }
    if (index === 1 && window.matchMedia("(max-width: 800px)").matches) { setContextOpen(true); return; }
    if (index === 2) setMobileStep("prepare");
    requestAnimationFrame(() => document.getElementById(index === 1 ? "prep-guide-context" : "prep-guide-checklist")?.scrollIntoView({ behavior: "smooth" }));
  };
  return <div className={`prep-page prep-guide prep-mobile-step-${mobileStep}`} data-i18n-explicit="true">
    <div className="prep-main-column"><EditorialHeading page="guide" />
      <div className="prep-mobile-entry"><h2>{m("preparation.title.guide")}</h2><button className="prep-primary" onClick={() => setMobileStep(data.review ? "prepare" : "review")}>{m("preparation.start")}</button></div>
      <nav className="prep-stepper" aria-label={m("preparation.guide")}>{(["reviewPrevious", "remember", "prepare", "viewWeek"] as const).map((key, index) => index === 3 ? <Link key={key} to={`/app/planning/weekly?date=${week}`}><span>{index + 1}</span>{m(preparationLabelKey(key))}</Link> : <button key={key} aria-label={m(preparationLabelKey(key))} className={step === index ? "is-current" : ""} aria-current={step === index ? "step" : undefined} onClick={() => openStep(index)}><span>{index + 1}</span>{m(preparationLabelKey(key))}</button>)}</nav>
      {data.review ? <EditorialCard className="prep-review-summary"><span className="prep-icon"><Check aria-hidden="true" /></span><div><p role="status" tabIndex={-1} ref={reviewSummary}>{m(data.review === "skipped" ? "preparation.skipped" : "preparation.reviewed")}</p><small>{m("preparation.reviewCompactHelp")}</small></div><button className="prep-secondary" onClick={() => setReviewOpen(true)}>{m("preparation.reviewResume")}<ArrowRight size={17} aria-hidden="true" /></button></EditorialCard> : <EditorialCard className="prep-review-invitation"><span className="prep-icon"><CalendarDays /></span><div><h2>1. {m("preparation.reviewPrevious")} <small>({m("preparation.optional")})</small></h2><p>{m("preparation.reviewHelp")}</p><p className="prep-review-notice">{m("preparation.reviewNotice")}</p></div><div className="prep-review-paper" aria-hidden="true" /><div className="prep-review-buttons"><button className="prep-primary" onClick={() => setReviewOpen(true)}>{m("preparation.reviewPrevious")}<ArrowRight size={17} /></button><button className="prep-secondary" disabled={operation.busy} onClick={() => finishReview("skipped")}>{m("preparation.skip")}<ArrowRight size={17} /></button></div></EditorialCard>}
      {operation.error && <p role="alert">{m("preparation.error")}</p>}
      <div id="prep-guide-checklist"><PreparationChecklist planner={planner} week={week} guide onPriorities={() => setPrioritiesOpen(true)} /></div>
      <Link className="prep-primary prep-guide-continue" to={`/app/planning/weekly?date=${week}`}>{m("preparation.continue")} <ArrowRight size={17} /></Link>
      <blockquote className="prep-quote">{m("preparation.quote.guide")}<cite>— MY BEST VERSION</cite></blockquote>
    </div>
    <aside className="prep-aside"><div id="prep-guide-context"><MonthlyContext snapshot={planner.snapshot} month={data.month} compact /></div>
      <EditorialCard className="prep-help"><header className="prep-card-heading"><span className="prep-icon"><Zap /></span><h2>{m("preparation.help")}</h2></header><p>{m("preparation.help.description")}</p><Link to={`/app/planning/weekly?date=${week}`}><Pencil /><span>{m("preparation.manual")}</span><ArrowRight size={17} /></Link><button onClick={() => setHelpOpen(true)}><Sparkles /><span>{m("preparation.suggest")}</span><ArrowRight size={17} /></button><p className="prep-handwritten">{m("preparation.editAnytime")} <Heart size={23} /></p></EditorialCard>
      <div className="prep-guide-photo"><p className="prep-handwritten">{m("preparation.photoQuote")} <Heart size={20} aria-hidden="true" /></p></div>
    </aside>
    <MonthlyPrioritySteps planner={planner} week={week} open={prioritiesOpen} onClose={() => setPrioritiesOpen(false)} />
    <Modal open={contextOpen} onClose={() => setContextOpen(false)} title={m("preparation.remember")} explicitI18n inertBackground><MonthlyContext snapshot={planner.snapshot} month={data.month} compact /></Modal>
    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title={m("preparation.help")} explicitI18n inertBackground><p>{m("preparation.manualHelp")}</p><Link className="button" to={`/app/planning/weekly?date=${week}`}>{m("preparation.manual")}</Link></Modal>
    <Modal open={reviewOpen} onClose={() => moveGuard.request(() => setReviewOpen(false))} title={m("preparation.reviewPrevious")} explicitI18n inertBackground>
      <p>{m("preparation.reviewNotice")}</p>
      {tasks.length ? tasks.map((task) => <div className="prep-review-task" key={task.id}><strong data-no-translate="true">{task.title}</strong>{task.status === "completed" ? <Check size={18} /> : task.status === "cancelled" ? <button disabled={operation.busy} onClick={() => operation.run(() => planner.restoreTask(task.id))}>{m("preparation.restore")}</button> : <><span>{m("preparation.keep")}</span><button disabled={operation.busy} onClick={() => moveGuard.request(() => { setMoving(task.id); setMoveDate(week); })}>{m("preparation.move")}</button><button disabled={operation.busy} onClick={() => operation.run(() => planner.cancelTask(task.id))}>{m("preparation.release")}</button></>}
        {moving === task.id && <form onSubmit={async (event) => { event.preventDefault(); await saveMove(); }}><label>{m("preparation.date")}<input type="date" required disabled={operation.busy} value={moveDate} onChange={(event) => setMoveDate(event.target.value)} /></label><button disabled={operation.busy} className="button">{m("preparation.move")}</button></form>}
      </div>) : <p>{m("preparation.reviewEmpty")}</p>}
      {operation.error && <p role="alert">{m("preparation.error")}</p>}
      <div className="prep-dialog-actions"><button className="button" disabled={operation.busy} onClick={() => moveGuard.request(() => finishReview("reviewed"))}>{m("preparation.reviewDone")}</button><button className="button button--outline" disabled={operation.busy} onClick={() => moveGuard.request(() => finishReview("skipped"))}>{m("preparation.skip")}</button></div>
    </Modal>
  </div>;
}

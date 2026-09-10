"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { addWeeks, isSameMonth, isSameYear } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Inbox,
  Lock,
  MoreHorizontal,
  Plus,
  Repeat2,
  Star,
  X,
} from "lucide-react";
import type { BrainDumpItem, Task } from "@/src/domain/planner";
import { weeklyPlanningInsight } from "@/src/domain/cascadeRules";
import { isHabitLogComplete, isHabitScheduledOn } from "@/src/domain/rules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { getReviewPeriodKey, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { Button } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { getTrialPlanningDateBounds, isTrialPlanningDateAllowed, type UserAccess } from "@/src/domain/access";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { PlanningMessageKey } from "@/src/i18n/messages/features/planning";

type WeeklyPlanViewProps = {
  planner: PlannerController;
  access: UserAccess;
  anchorDate: Date;
  todayKey: string;
  reviewInitiallyOpen?: boolean;
  onAnchorDateChange: (date: Date) => void;
  onBack: () => void;
  onEditTask: (task: Task) => void;
};

type TaskUpdatePatch = Omit<Parameters<PlannerController["updateTask"]>[1], "title">;
type FeedbackMessage = { key: PlanningMessageKey; params?: Record<string, string | number> };

type ReviewDraft = {
  celebrate: string;
  release: string;
  adjust: string;
  priorities: string[];
};

const emptyReview = (): ReviewDraft => ({ celebrate: "", release: "", adjust: "", priorities: ["", "", ""] });
const dayInitialKeys = [
  "planning.week.dayInitial.sunday",
  "planning.week.dayInitial.monday",
  "planning.week.dayInitial.tuesday",
  "planning.week.dayInitial.wednesday",
  "planning.week.dayInitial.thursday",
  "planning.week.dayInitial.friday",
  "planning.week.dayInitial.saturday",
] as const;

type I18n = ReturnType<typeof useI18n>;

function reviewFromResponses(responses: Record<string, string> = {}): ReviewDraft {
  return {
    celebrate: responses.celebrate ?? "",
    release: responses.release ?? "",
    adjust: responses.adjust ?? "",
    priorities: [responses.priority1 ?? "", responses.priority2 ?? "", responses.priority3 ?? ""],
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatWeekRange(dates: Date[], formatDate: I18n["formatDate"], formatNumber: I18n["formatNumber"]) {
  const first = dates[0];
  const last = dates[6];
  if (isSameMonth(first, last)) return `${formatNumber(first.getDate())}–${formatDate(last, { day: "numeric", month: "short", year: "numeric" })}`;
  if (isSameYear(first, last)) return `${formatDate(first, { day: "numeric", month: "short" })} – ${formatDate(last, { day: "numeric", month: "short", year: "numeric" })}`;
  return `${formatDate(first, { day: "numeric", month: "short", year: "numeric" })} – ${formatDate(last, { day: "numeric", month: "short", year: "numeric" })}`;
}

function closeClosestDetails(target: EventTarget | null) {
  (target as HTMLElement | null)?.closest("details")?.removeAttribute("open");
}

export function WeeklyPlanView({ planner, access, anchorDate, todayKey, reviewInitiallyOpen = false, onAnchorDateChange, onBack, onEditTask }: WeeklyPlanViewProps) {
  const { snapshot } = planner;
  const { m, formatDate, formatNumber } = useI18n();
  const weekDates = useMemo(() => getWeekDates(anchorDate, 1), [anchorDate]);
  const weekKeys = useMemo(() => new Set(weekDates.map(toLocalDateKey)), [weekDates]);
  const weekTasks = snapshot.tasks.filter((task) => task.date && weekKeys.has(task.date) && task.status !== "cancelled");
  const unscheduledTasks = snapshot.tasks.filter((task) => !task.date && !["completed", "cancelled"].includes(task.status));
  const unplacedIdeas = snapshot.brainDumpItems.filter((item) => item.status === "idea" && !item.convertedTaskId);
  const priorityTasks = weekTasks.filter((task) => task.priority === "high");
  const visibleWeekIsCurrent = weekKeys.has(todayKey);
  const reviewPeriodKey = getReviewPeriodKey("weekly", weekDates[0], 1);
  const savedReview = snapshot.reviews.find((review) => review.type === "weekly" && review.periodKey === reviewPeriodKey);
  const insight = weeklyPlanningInsight(snapshot, weekDates[0]);
  const insightSummary = insight.summaryKind === "completed"
    ? m(insight.total === 1 ? "planning.week.insightCompletedOne" : "planning.week.insightCompleted", { completed: formatNumber(insight.completed), total: formatNumber(insight.total) })
    : m("planning.week.insightInsufficient");
  const dateBounds = getTrialPlanningDateBounds(access);
  const canPlanDate = (date: string) => isTrialPlanningDateAllowed(access, date);
  const visibleWeekReadOnly = weekDates.every((date) => !canPlanDate(toLocalDateKey(date)));
  const visibleWeekHasReadOnlyDays = weekDates.some((date) => !canPlanDate(toLocalDateKey(date)));
  const reviewReferenceDateAllowed = canPlanDate(toLocalDateKey(weekDates[0]));

  const [openComposerDate, setOpenComposerDate] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingDraft, setPendingDraft] = useState("");
  const [pendingOpen, setPendingOpen] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<FeedbackMessage | null>(null);
  const [notice, setNotice] = useState<FeedbackMessage | null>(null);
  const [reviewOpen, setReviewOpen] = useState(reviewInitiallyOpen);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(() => savedReview ? reviewFromResponses(savedReview.responses) : emptyReview());
  const composerRef = useRef<HTMLInputElement>(null);
  const savingKeyRef = useRef<string | null>(null);

  useEffect(() => {
    composerRef.current?.focus();
  }, [openComposerDate]);

  const runOperation = async (key: string, operation: () => Promise<unknown>, successMessage: FeedbackMessage) => {
    if (savingKeyRef.current) return false;
    savingKeyRef.current = key;
    setSavingKey(key);
    setOperationError(null);
    setNotice(null);
    try {
      await operation();
      setNotice(successMessage);
      return true;
    } catch {
      setOperationError({ key: "planning.week.saveError" });
      return false;
    } finally {
      savingKeyRef.current = null;
      setSavingKey(null);
    }
  };

  const createTask = async (date?: string) => {
    if (date && !canPlanDate(date)) { setOperationError({ key: "planning.trial.limit" }); return; }
    const key = date ?? "pending";
    const title = (date ? drafts[date] ?? "" : pendingDraft).trim();
    if (!title || savingKeyRef.current) return;
    const saved = await runOperation(`create-${key}`, () => planner.createTask(title, date), { key: date ? "planning.week.taskAdded" : "planning.week.pendingSaved" });
    if (!saved) return;
    if (date) setDrafts((current) => ({ ...current, [date]: "" }));
    else setPendingDraft("");
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const updateTask = async (task: Task, patch: TaskUpdatePatch, message: FeedbackMessage) =>
    (!task.date || canPlanDate(task.date)) && (!patch.date || canPlanDate(patch.date))
      ? runOperation(`task-${task.id}`, () => planner.updateTask(task.id, { title: task.title, ...patch }), message)
      : (setOperationError({ key: "planning.trial.limit" }), Promise.resolve(false));

  const toggleTask = async (task: Task) =>
    !task.date || canPlanDate(task.date)
      ? runOperation(`task-${task.id}`, () => planner.toggleTask(task.id), { key: task.status === "completed" ? "planning.week.taskReopened" : "planning.week.taskCompleted" })
      : (setOperationError({ key: "planning.trial.limit" }), Promise.resolve(false));

  const moveTask = async (task: Task, date: string) => {
    if ((task.date && !canPlanDate(task.date)) || !canPlanDate(date)) { setOperationError({ key: "planning.trial.limit" }); return false; }
    const target = new Date(`${date}T12:00:00`);
    const outsideVisibleWeek = !weekKeys.has(date);
    return updateTask(task, { date }, outsideVisibleWeek ? { key: "planning.week.taskMovedDate", params: { date: formatDate(target, { day: "numeric", month: "long", year: "numeric" }) } } : { key: "planning.week.taskMovedDay", params: { day: capitalize(formatDate(target, { weekday: "long" })) } });
  };

  const placeIdea = async (idea: BrainDumpItem, date: string) => {
    if (!canPlanDate(date)) { setOperationError({ key: "planning.trial.limit" }); return false; }
    const target = new Date(`${date}T12:00:00`);
    return runOperation(`idea-${idea.id}`, () => planner.scheduleBrainDumpItem(idea.id, date, "weekly"), { key: "planning.week.ideaScheduled", params: { date: formatDate(target, { day: "numeric", month: "long" }) } });
  };

  const scrollToTask = (taskId: string) => {
    const target = document.getElementById(`weekly-task-${taskId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  };

  const navigateWeek = (amount: number) => {
    setOpenComposerDate(null);
    onAnchorDateChange(addWeeks(anchorDate, amount));
  };

  const returnToCurrentWeek = () => {
    setOpenComposerDate(null);
    onAnchorDateChange(new Date());
  };

  const openReview = () => {
    setReviewDraft(reviewFromResponses(savedReview?.responses));
    setReviewOpen(true);
  };

  const saveReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!reviewReferenceDateAllowed) { setOperationError({ key: "planning.trial.limit" }); return; }
    const responses = {
      celebrate: reviewDraft.celebrate,
      observe: insightSummary,
      release: reviewDraft.release,
      adjust: reviewDraft.adjust,
      priority1: reviewDraft.priorities[0],
      priority2: reviewDraft.priorities[1],
      priority3: reviewDraft.priorities[2],
    };
    const saved = await runOperation("weekly-review", () => planner.saveStructuredReview("weekly", responses, reviewDraft.priorities, weekDates[0]), { key: "planning.week.reviewSaved" });
    if (saved) setReviewOpen(false);
  };

  return <section className="weekly-plan-page" aria-labelledby="weekly-plan-title" data-i18n-explicit="true">
    <button type="button" className="weekly-back-link" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /> {m("planning.week.back")}</button>

    <header className="weekly-plan-header">
      <div className="weekly-plan-heading">
        <h1 id="weekly-plan-title">{m("planning.week.title")}</h1>
        <p>{m("planning.week.description")}</p>
      </div>
      <div className="weekly-header-actions">
        <Button type="button" variant="outline" onClick={openReview} disabled={!reviewReferenceDateAllowed} title={!reviewReferenceDateAllowed ? m("planning.week.reviewReadOnlyTitle") : undefined}><ClipboardCheck size={17} aria-hidden="true" /> {m("planning.week.review")}</Button>
        <div className="weekly-period-navigation" aria-label={m("planning.week.navigationLabel")}>
          <button type="button" onClick={() => navigateWeek(-1)} aria-label={m("planning.week.previous")}><ChevronLeft size={18} /></button>
          <strong>{formatWeekRange(weekDates, formatDate, formatNumber)}</strong>
          <button type="button" onClick={() => navigateWeek(1)} aria-label={m("planning.week.next")}><ChevronRight size={18} /></button>
          <Button type="button" variant="secondary" onClick={returnToCurrentWeek} disabled={visibleWeekIsCurrent}>{m("planning.week.current")}</Button>
        </div>
      </div>
    </header>

    {visibleWeekHasReadOnlyDays && <div className="month-readonly-notice weekly-readonly-notice" role="status"><Lock size={18} aria-hidden="true" /><div><strong>{m(visibleWeekReadOnly ? "planning.week.readOnly" : "planning.week.someReadOnly")}</strong><span>{m("planning.trial.limit")}</span></div></div>}

    <section className="weekly-priority-strip" aria-labelledby="weekly-priorities-title">
      <div><Star size={17} aria-hidden="true" /><strong id="weekly-priorities-title">{m("planning.week.priorities")}</strong></div>
      <div className="weekly-priority-chips">
        {priorityTasks.map((task) => <button type="button" key={task.id} onClick={() => scrollToTask(task.id)}><Star size={14} aria-hidden="true" /> <span data-no-translate="true" translate="no">{task.title}</span></button>)}
        {!priorityTasks.length && <span>{m("planning.week.noPriorities")}</span>}
      </div>
    </section>

    <div className="weekly-feedback" aria-live="polite">
      {notice && <p className="weekly-notice">{m(notice.key, notice.params)}</p>}
      {operationError && <p className="weekly-error" role="alert">{m(operationError.key, operationError.params)}</p>}
    </div>

    <div className="weekly-plan-layout">
      <section className="weekly-days-panel" aria-labelledby="weekly-days-title">
        <header className="weekly-days-panel__header">
          <h2 id="weekly-days-title">{m("planning.week.daysTitle")}</h2>
          <nav aria-label={m("planning.week.goToDay")}>
            {weekDates.map((date) => {
              const key = toLocalDateKey(date);
              return <button type="button" className={key === todayKey ? "is-today" : ""} key={key} onClick={() => document.getElementById(`weekly-day-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} aria-label={m("planning.week.goToDate", { date: formatDate(date, { weekday: "long", day: "numeric", month: "long" }) })}><span>{m(dayInitialKeys[date.getDay()])}</span><strong>{formatNumber(date.getDate())}</strong></button>;
            })}
          </nav>
        </header>

        <div className="weekly-day-groups">
          {weekDates.map((date) => {
            const key = toLocalDateKey(date);
            const isToday = key === todayKey;
            const dayReadOnly = !canPlanDate(key);
            const dayTasks = weekTasks.filter((task) => task.date === key);
            const dayHabits = snapshot.habits.filter((habit) => isHabitScheduledOn(habit, date));
            return <section id={`weekly-day-${key}`} className={`weekly-day-group ${isToday ? "is-today" : ""} ${dayReadOnly ? "is-readonly" : ""}`} key={key} aria-labelledby={`weekly-day-title-${key}`}>
              <header className="weekly-day-label">
                <span id={`weekly-day-title-${key}`}>{capitalize(formatDate(date, { weekday: "long" }))}</span>
                <strong>{formatNumber(date.getDate())} <small>{formatDate(date, { month: "short" })}</small></strong>
                {isToday && <em>{m("planning.common.today")}</em>}
              </header>
              <div className="weekly-day-content">
                <div className="weekly-day-toolbar">{dayReadOnly ? <span className="weekly-readonly-label"><Lock size={14} aria-hidden="true" /> {m("planning.common.readOnly")}</span> : <button type="button" onClick={() => setOpenComposerDate(key)}><Plus size={16} aria-hidden="true" /> {m("planning.week.addTask")}</button>}</div>
                <div className="weekly-day-items">
                  {dayTasks.map((task) => <WeeklyTaskRow key={task.id} task={task} planner={planner} weekDates={weekDates} saving={savingKey === `task-${task.id}`} readOnly={dayReadOnly} canPlanDate={canPlanDate} dateBounds={dateBounds} onMove={moveTask} onUpdate={updateTask} onToggle={toggleTask} onEdit={onEditTask} />)}
                  {dayHabits.map((habit) => {
                    const log = snapshot.habitLogs.find((item) => item.habitId === habit.id && item.date === key);
                    const complete = isHabitLogComplete(habit, log);
                    return <div className="weekly-habit-row" key={habit.id}>
                      <button type="button" className={complete ? "is-complete" : ""} aria-pressed={complete} aria-label={m(complete ? "planning.week.habitUnmarkLabel" : "planning.week.habitRegisterLabel", { habit: habit.name, date: formatDate(date, { day: "numeric", month: "long" }), readOnly: dayReadOnly ? m("planning.day.readOnlySuffix") : "" })} disabled={Boolean(savingKey) || dayReadOnly} onClick={() => void runOperation(`habit-${habit.id}-${key}`, () => planner.toggleHabit(habit.id, key), { key: complete ? "planning.week.habitRemoved" : "planning.week.habitRegistered" })}>{complete ? <Check size={13} /> : <Circle size={13} />}</button>
                      <Repeat2 size={15} aria-hidden="true" />
                      <span>{m("planning.week.habitPrefix")} <span data-no-translate="true" translate="no">{habit.name}</span></span>
                    </div>;
                  })}
                  {!dayTasks.length && !dayHabits.length && openComposerDate !== key && <p className="weekly-day-empty">{m("planning.week.dayEmpty")}</p>}
                </div>
                {!dayReadOnly && openComposerDate === key && <form className="weekly-inline-composer" onSubmit={(event) => { event.preventDefault(); void createTask(key); }}>
                  <input ref={composerRef} value={drafts[key] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} placeholder={m("planning.week.taskPlaceholder")} aria-label={m("planning.week.taskLabel", { date: formatDate(date, { weekday: "long", day: "numeric", month: "long" }) })} />
                  <Button type="submit" size="sm" loading={savingKey === `create-${key}`} disabled={!drafts[key]?.trim()}>{m("planning.common.save")}</Button>
                  <button type="button" className="weekly-composer-cancel" onClick={() => setOpenComposerDate(null)} aria-label={m("planning.week.cancelNewTask")}><X size={18} /></button>
                </form>}
              </div>
            </section>;
          })}
        </div>
      </section>

      <aside className={`weekly-pending-panel ${pendingOpen ? "is-open" : ""}`} aria-labelledby="weekly-pending-title">
        <header>
          <div><Inbox size={20} aria-hidden="true" /><h2 id="weekly-pending-title">{m("planning.week.pendingTitle")}</h2></div>
          <button type="button" className="weekly-pending-toggle" aria-expanded={pendingOpen} aria-controls="weekly-pending-content" onClick={() => setPendingOpen((current) => !current)}><ChevronDown size={18} /><span className="sr-only">{m(pendingOpen ? "planning.week.hidePending" : "planning.week.showPending")}</span></button>
        </header>
        <div id="weekly-pending-content" className="weekly-pending-content">
          <form className="weekly-pending-composer" onSubmit={(event) => { event.preventDefault(); void createTask(); }}>
            <Plus size={16} aria-hidden="true" />
            <input value={pendingDraft} onChange={(event) => setPendingDraft(event.target.value)} placeholder={m("planning.week.pendingPlaceholder")} aria-label={m("planning.week.pendingLabel")} />
            <Button type="submit" size="sm" loading={savingKey === "create-pending"} disabled={!pendingDraft.trim()} aria-label={m("planning.week.savePending")}><ArrowRight size={17} /></Button>
          </form>
          <div className="weekly-pending-list">
            {unscheduledTasks.map((task) => <WeeklyPendingTask key={task.id} task={task} planner={planner} weekDates={weekDates} saving={savingKey === `task-${task.id}`} readOnly={false} canPlanDate={canPlanDate} dateBounds={dateBounds} onMove={moveTask} onUpdate={updateTask} onToggle={toggleTask} onEdit={onEditTask} />)}
            {unplacedIdeas.map((idea) => <WeeklyPendingIdea key={idea.id} idea={idea} weekDates={weekDates} saving={savingKey === `idea-${idea.id}`} canPlanDate={canPlanDate} dateBounds={dateBounds} onPlace={placeIdea} />)}
            {!unscheduledTasks.length && !unplacedIdeas.length && <p className="weekly-pending-empty">{m("planning.week.noPending")}</p>}
          </div>
        </div>
      </aside>
    </div>

    <Modal explicitI18n open={reviewOpen} title={m("planning.week.review")} description={m("planning.week.reviewDescription", { range: formatWeekRange(weekDates, formatDate, formatNumber) })} onClose={() => setReviewOpen(false)}>
      <form className="weekly-review-dialog" onSubmit={saveReview}>
        <label><span>{m("planning.week.reviewAdvanced")}</span><textarea required rows={3} value={reviewDraft.celebrate} onChange={(event) => setReviewDraft({ ...reviewDraft, celebrate: event.target.value })} /></label>
        <div className="weekly-review-observation"><strong>{m("planning.week.observe")}</strong><span>{insightSummary}</span></div>
        <label><span>{m("planning.week.reviewRelease")}</span><textarea rows={2} value={reviewDraft.release} onChange={(event) => setReviewDraft({ ...reviewDraft, release: event.target.value })} /></label>
        <label><span>{m("planning.week.reviewAdjust")}</span><textarea rows={2} value={reviewDraft.adjust} onChange={(event) => setReviewDraft({ ...reviewDraft, adjust: event.target.value })} /></label>
        <fieldset><legend>{m("planning.week.reviewPriorities")}</legend>{reviewDraft.priorities.map((value, index) => <input key={index} value={value} onChange={(event) => setReviewDraft({ ...reviewDraft, priorities: reviewDraft.priorities.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} placeholder={m("planning.longTerm.priorityPlaceholder", { number: index + 1 })} />)}</fieldset>
        {operationError && <p className="weekly-error" role="alert">{m(operationError.key, operationError.params)}</p>}
        <div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setReviewOpen(false)}>{m("planning.week.reviewLater")}</Button><Button type="submit" loading={savingKey === "weekly-review"}>{m("planning.week.reviewSave")}</Button></div>
      </form>
    </Modal>
  </section>;
}

type TaskOperationProps = {
  task: Task;
  planner: PlannerController;
  weekDates: Date[];
  saving: boolean;
  readOnly: boolean;
  canPlanDate: (date: string) => boolean;
  dateBounds: ReturnType<typeof getTrialPlanningDateBounds>;
  onMove: (task: Task, date: string) => Promise<boolean>;
  onUpdate: (task: Task, patch: TaskUpdatePatch, message: FeedbackMessage) => Promise<boolean>;
  onToggle: (task: Task) => Promise<boolean>;
  onEdit: (task: Task) => void;
};

function DateAssignmentMenu({ task, weekDates, label, canPlanDate, dateBounds, onMove, onUpdate }: Pick<TaskOperationProps, "task" | "weekDates" | "canPlanDate" | "dateBounds" | "onMove" | "onUpdate"> & { label: string }) {
  const { m, formatDate, formatNumber } = useI18n();
  return <details className="weekly-date-menu">
    <summary aria-label={m("planning.week.assignDateLabel", { label, task: task.title })}><CalendarDays size={15} aria-hidden="true" /><span>{label}</span><ChevronDown size={14} aria-hidden="true" /></summary>
    <div className="weekly-popover weekly-date-popover">
      <strong>{m("planning.week.visibleWeek")}</strong>
      <div>{weekDates.map((date) => {
        const key = toLocalDateKey(date);
        return <button type="button" key={key} disabled={!canPlanDate(key)} aria-label={m("planning.week.assignTaskToDate", { task: task.title, date: formatDate(date, { weekday: "long", day: "numeric", month: "long" }), outside: canPlanDate(key) ? "" : m("planning.week.outsideTrialSuffix") })} onClick={(event) => { closeClosestDetails(event.currentTarget); void onMove(task, key); }}><span>{capitalize(formatDate(date, { weekday: "short" }).replace(".", ""))}</span><strong>{formatNumber(date.getDate())}</strong></button>;
      })}</div>
      <label><span>{m("planning.week.otherDate")}</span><input type="date" min={dateBounds?.min} max={dateBounds?.max} defaultValue={task.date ?? ""} onChange={(event) => { if (!event.target.value || !canPlanDate(event.target.value)) return; closeClosestDetails(event.currentTarget); void onMove(task, event.target.value); }} /></label>
      {task.date && <button type="button" className="weekly-unschedule-action" onClick={(event) => { closeClosestDetails(event.currentTarget); void onUpdate(task, { date: "" }, { key: "planning.week.unscheduled" }); }}>{m("planning.week.removeDate")}</button>}
    </div>
  </details>;
}

function TaskOptionsMenu({ task, planner, onUpdate, onEdit }: Pick<TaskOperationProps, "task" | "planner" | "onUpdate" | "onEdit">) {
  const { m } = useI18n();
  return <details className="weekly-options-menu">
    <summary aria-label={m("planning.week.moreOptions", { task: task.title })}><MoreHorizontal size={18} aria-hidden="true" /></summary>
    <div className="weekly-popover weekly-options-popover">
      <button type="button" onClick={(event) => { closeClosestDetails(event.currentTarget); onEdit(task); }}>{m("planning.week.editTask")}</button>
      <button type="button" onClick={(event) => { closeClosestDetails(event.currentTarget); void onUpdate(task, { priority: task.priority === "high" ? "medium" : "high" }, { key: task.priority === "high" ? "planning.week.priorityRemoved" : "planning.week.priorityAdded" }); }}>{m(task.priority === "high" ? "planning.week.removePriority" : "planning.week.markPriority")}</button>
      <label><span>{m("planning.common.goal")}</span><select value={task.goalId ?? ""} onChange={(event) => { closeClosestDetails(event.currentTarget); void onUpdate(task, { goalId: event.target.value }, { key: event.target.value ? "planning.week.goalLinked" : "planning.week.goalUnlinked" }); }}><option value="">{m("planning.common.noGoal")}</option>{planner.snapshot.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id} data-no-translate="true" translate="no">{goal.title}</option>)}</select></label>
    </div>
  </details>;
}

function WeeklyTaskRow({ task, planner, weekDates, saving, readOnly, canPlanDate, dateBounds, onMove, onUpdate, onToggle, onEdit }: TaskOperationProps) {
  const goal = planner.snapshot.goals.find((item) => item.id === task.goalId);
  const complete = task.status === "completed";
  const { m } = useI18n();
  const readOnlySuffix = readOnly ? m("planning.day.readOnlySuffix") : "";
  return <article id={`weekly-task-${task.id}`} className={`weekly-task-row ${complete ? "is-complete" : ""}`} tabIndex={-1}>
    <button type="button" className="weekly-task-check" aria-label={m(complete ? "planning.week.reopenTask" : "planning.week.completeTask", { task: task.title, readOnly: readOnlySuffix })} disabled={saving || readOnly} onClick={() => void onToggle(task)}>{complete ? <Check size={14} /> : <Circle size={14} />}</button>
    <div className="weekly-task-copy"><strong data-no-translate="true" translate="no">{task.title}</strong>{goal && <span>{m("planning.week.goalPrefix")} <span data-no-translate="true" translate="no">{goal.title}</span></span>}</div>
    <button type="button" className={`weekly-task-star ${task.priority === "high" ? "is-active" : ""}`} aria-pressed={task.priority === "high"} aria-label={m(task.priority === "high" ? "planning.week.removePriorityLabel" : "planning.week.markPriorityLabel", { task: task.title, readOnly: readOnlySuffix })} disabled={saving || readOnly} onClick={() => void onUpdate(task, { priority: task.priority === "high" ? "medium" : "high" }, { key: task.priority === "high" ? "planning.week.priorityRemoved" : "planning.week.priorityAdded" })}><Star size={15} /></button>
    <div className="weekly-task-actions">{readOnly ? <span className="weekly-readonly-label"><Lock size={14} aria-hidden="true" /> {m("planning.common.readOnly")}</span> : <><DateAssignmentMenu task={task} weekDates={weekDates} label={m("planning.week.changeDay")} canPlanDate={canPlanDate} dateBounds={dateBounds} onMove={onMove} onUpdate={onUpdate} /><TaskOptionsMenu task={task} planner={planner} onUpdate={onUpdate} onEdit={onEdit} /></>}</div>
  </article>;
}

function WeeklyPendingTask({ task, planner, weekDates, saving, canPlanDate, dateBounds, onMove, onUpdate, onToggle, onEdit }: TaskOperationProps) {
  const complete = task.status === "completed";
  const goal = planner.snapshot.goals.find((item) => item.id === task.goalId);
  const { m } = useI18n();
  return <article className={`weekly-pending-task ${complete ? "is-complete" : ""}`}>
    <div className="weekly-pending-task__main">
      <button type="button" className="weekly-task-check" aria-label={m(complete ? "planning.week.reopenTask" : "planning.week.completeTask", { task: task.title, readOnly: "" })} disabled={saving} onClick={() => void onToggle(task)}>{complete ? <Check size={14} /> : <Circle size={14} />}</button>
      <div className="weekly-pending-task__copy"><strong data-no-translate="true" translate="no">{task.title}</strong>{goal && <span>{m("planning.week.goalPrefix")} <span data-no-translate="true" translate="no">{goal.title}</span></span>}</div>
      <TaskOptionsMenu task={task} planner={planner} onUpdate={onUpdate} onEdit={onEdit} />
    </div>
    <DateAssignmentMenu task={task} weekDates={weekDates} label={m("planning.week.assignDay")} canPlanDate={canPlanDate} dateBounds={dateBounds} onMove={onMove} onUpdate={onUpdate} />
  </article>;
}

function WeeklyPendingIdea({ idea, weekDates, saving, canPlanDate, dateBounds, onPlace }: { idea: BrainDumpItem; weekDates: Date[]; saving: boolean; canPlanDate: (date: string) => boolean; dateBounds: ReturnType<typeof getTrialPlanningDateBounds>; onPlace: (idea: BrainDumpItem, date: string) => Promise<boolean> }) {
  const { m, formatDate, formatNumber } = useI18n();
  return <article className="weekly-pending-task weekly-pending-idea">
    <div className="weekly-pending-task__main"><Inbox size={15} aria-hidden="true" /><strong data-no-translate="true" translate="no">{idea.title}</strong><span>{m("planning.week.inboxIdea")}</span></div>
    <details className="weekly-date-menu">
      <summary aria-label={m("planning.week.assignIdeaDay", { idea: idea.title })}><CalendarDays size={15} aria-hidden="true" /><span>{m("planning.week.assignDay")}</span><ChevronDown size={14} aria-hidden="true" /></summary>
      <div className="weekly-popover weekly-date-popover"><strong>{m("planning.week.visibleWeek")}</strong><div>{weekDates.map((date) => { const key = toLocalDateKey(date); return <button type="button" disabled={saving || !canPlanDate(key)} key={key} aria-label={m("planning.week.assignTaskToDate", { task: idea.title, date: formatDate(date, { weekday: "long", day: "numeric", month: "long" }), outside: canPlanDate(key) ? "" : m("planning.week.outsideTrialSuffix") })} onClick={(event) => { closeClosestDetails(event.currentTarget); void onPlace(idea, key); }}><span>{capitalize(formatDate(date, { weekday: "short" }).replace(".", ""))}</span><strong>{formatNumber(date.getDate())}</strong></button>; })}</div><label><span>{m("planning.week.otherDate")}</span><input type="date" min={dateBounds?.min} max={dateBounds?.max} onChange={(event) => { if (!event.target.value || !canPlanDate(event.target.value)) return; closeClosestDetails(event.currentTarget); void onPlace(idea, event.target.value); }} /></label></div>
    </details>
  </article>;
}

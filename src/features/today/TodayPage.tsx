"use client";

/* eslint-disable jsx-a11y/no-autofocus -- The inline composer opens after an explicit user action. */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, ChevronRight, Circle, Dumbbell, GripVertical, Heart, HeartPulse, Lightbulb, Pencil, Plus, Quote, Save, Sparkles, Utensils, X } from "lucide-react";
import { isHabitScheduledOn, isTaskOverdue } from "@/src/domain/rules";
import { getDailyTopThree } from "@/src/domain/guidanceRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { getReviewPeriodKey, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { Button, Card, SectionHeading, Tabs } from "@/src/components/ui/Primitives";
import { analyticsService } from "@/src/services/analyticsService";
import { HabitWeekDots } from "./TodayVisuals";
import type { QuickCaptureDefaults } from "@/src/features/tasks/QuickCaptureDrawer";
import { TodayMoodCard } from "@/src/features/mood/TodayMoodCard";
import { useI18n } from "@/src/i18n/I18nProvider";

type TimelineFilter = "all" | "tasks" | "training" | "meals" | "events";
type TimelineItem = { id: string; type: Exclude<TimelineFilter, "all">; title: string; detail: string; completed?: boolean; action: ReactNode };
type DayComposerKind = "task" | "priority" | "habit" | "workout" | "meal" | "event";
type HabitRecurrence = "today" | "daily" | "weekdays" | "custom";
type DayComposer = { kind: DayComposerKind; id?: string; title: string; priority: "" | "1" | "2" | "3"; duration: string; calories: string; goalId: string; projectId: string; habitRecurrence: HabitRecurrence; scheduledDays: number[] };
const emptyComposer = (kind: DayComposerKind = "task"): DayComposer => ({ kind, title: "", priority: "", duration: "", calories: "", goalId: "", projectId: "", habitRecurrence: "today", scheduledDays: [] });

function readDailyClose(text?: string) {
  const match = text?.match(/^¿Qué avancé hoy\?\n([\s\S]*?)\n\n¿Qué quiero recordar de hoy\?\n([\s\S]*)$/);
  return {
    advanced: match?.[1] === "—" ? "" : match?.[1] ?? "",
    remember: match?.[2] === "—" ? "" : match?.[2] ?? "",
  };
}

function habitRecurrence(days: number[], oneOffDate?: string): HabitRecurrence {
  if (oneOffDate) return "today";
  if (days.length === 7) return "daily";
  if ([1, 2, 3, 4, 5].every((day) => days.includes(day)) && days.length === 5) return "weekdays";
  return "custom";
}

export function TodayPage({ planner, onQuickCapture, onNeedHelp }: { planner: PlannerController; onQuickCapture: (defaults: QuickCaptureDefaults) => void; onNeedHelp: () => void }) {
  const { m, formatDate, formatNumber, formatPlural } = useI18n();
  const { snapshot } = planner;
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const profileName = snapshot.profile?.name;
  useEffect(() => { analyticsService.track("today_view_opened", { route: "/app/today" }, `today:${todayKey}`); }, [todayKey]);
  const savedIntention = snapshot.journalEntries.find((entry) => entry.date === todayKey && entry.title === "Intención del día")?.text ?? snapshot.profile?.dailyIntention ?? "";
  const dailyCloseEntry = snapshot.journalEntries.find((entry) => entry.date === todayKey && entry.title === "Cierre del día");
  const initialDailyClose = readDailyClose(dailyCloseEntry?.text);
  const [intention, setIntention] = useState(savedIntention);
  const [intentionEditing, setIntentionEditing] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [minimumMode, setMinimumMode] = useState(false);
  const [advancedToday, setAdvancedToday] = useState(initialDailyClose.advanced);
  const [rememberToday, setRememberToday] = useState(initialDailyClose.remember);
  const [closeSaved, setCloseSaved] = useState(false);
  const [dayComposer, setDayComposer] = useState<DayComposer | null>(null);
  const todayTasks = snapshot.tasks.filter((task) => task.date === todayKey && task.status !== "cancelled");
  const focusTasks = getDailyTopThree(snapshot.tasks, todayKey);
  const nextAction = focusTasks.find((task) => task.status !== "completed") ?? todayTasks.find((task) => task.status !== "completed");
  const overdue = snapshot.tasks.filter((task) => isTaskOverdue(task, todayKey));
  const habits = snapshot.habits.filter((habit) => habit.status === "active" && isHabitScheduledOn(habit, today));
  const weekDates = getWeekDates(today, snapshot.profile?.weekStartsOn ?? 1);
  const weekDateKeys = weekDates.map(toLocalDateKey);
  const weekReviewKey = getReviewPeriodKey("weekly", today, snapshot.profile?.weekStartsOn ?? 1);
  const completedWeeklyReview = snapshot.reviews.find((review) => review.type === "weekly" && review.periodKey === weekReviewKey && review.status === "completed");
  const todayWorkout = snapshot.workoutLogs.find((item) => item.date === todayKey);
  const todayNutrition = snapshot.nutritionLogs.find((item) => item.date === todayKey);
  const todayEvents = snapshot.events.filter((item) => item.startDate === todayKey);
  const macros = (todayNutrition?.meals ?? []).reduce((total, meal) => ({ calories: total.calories + (meal.calories ?? 0), protein: total.protein + (meal.protein ?? 0), carbs: total.carbs + (meal.carbs ?? 0), fat: total.fat + (meal.fat ?? 0) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  function openDayComposer(kind: DayComposerKind, itemId?: string) {
    if (kind === "task" || kind === "priority") {
      const task = snapshot.tasks.find((item) => item.id === itemId);
      setDayComposer({ ...emptyComposer(kind), id: task?.id, title: task?.title ?? "", priority: task?.focusPriority ? String(task.focusPriority) as DayComposer["priority"] : "", goalId: task?.goalId ?? "", projectId: task?.projectId ?? "" });
      return;
    }
    if (kind === "workout") {
      setDayComposer({ ...emptyComposer(kind), id: todayWorkout?.id, title: todayWorkout?.name ?? todayWorkout?.goal ?? "", duration: todayWorkout?.durationMinutes ? String(todayWorkout.durationMinutes) : "" });
      return;
    }
    if (kind === "meal") {
      const meal = todayNutrition?.meals.find((item) => item.id === itemId);
      setDayComposer({ ...emptyComposer(kind), id: meal?.id, title: meal?.name ?? "", calories: meal?.calories ? String(meal.calories) : "" });
      return;
    }
    if (kind === "event") {
      const currentEvent = todayEvents.find((item) => item.id === itemId);
      setDayComposer({ ...emptyComposer(kind), id: currentEvent?.id, title: currentEvent?.title ?? "" });
      return;
    }
    const habit = snapshot.habits.find((item) => item.id === itemId);
    setDayComposer({ ...emptyComposer(kind), id: habit?.id, title: habit?.name ?? "", habitRecurrence: habit ? habitRecurrence(habit.scheduledDays, habit.oneOffDate) : "today", scheduledDays: habit?.scheduledDays ?? [today.getDay()] });
  }

  const saveDayItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!dayComposer?.title.trim()) return;
    const focusPriority = dayComposer.priority ? Number(dayComposer.priority) as 1 | 2 | 3 : undefined;
    if ((dayComposer.kind === "task" || dayComposer.kind === "priority") && dayComposer.id) await planner.updateTask(dayComposer.id, { title: dayComposer.title, date: todayKey, focusPriority: dayComposer.kind === "priority" ? focusPriority : undefined, goalId: dayComposer.goalId, projectId: dayComposer.projectId });
    else if (dayComposer.kind === "task" || dayComposer.kind === "priority") await planner.createTaskDetailed({ title: dayComposer.title, date: todayKey, priority: "medium", focusPriority: dayComposer.kind === "priority" ? focusPriority : undefined, goalId: dayComposer.goalId || undefined, projectId: dayComposer.projectId || undefined });
    else if (dayComposer.kind === "workout") await planner.saveWorkoutPlan({ date: todayKey, name: dayComposer.title, durationMinutes: Number(dayComposer.duration) || undefined, exercises: todayWorkout?.exercises.map((exercise) => ({ id: exercise.id, name: exercise.name, sets: (exercise.setDetails?.length ? exercise.setDetails : Array.from({ length: exercise.sets }, (_, index) => ({ id: crypto.randomUUID(), setNumber: index + 1, reps: exercise.reps, weight: exercise.weight }))).map((set, index) => ({ id: set.id, setNumber: index + 1, reps: set.reps, weight: set.weight })) })) ?? [] });
    else if (dayComposer.kind === "meal") { const meal = todayNutrition?.meals.find((item) => item.id === dayComposer.id); await planner.saveMeal({ date: todayKey, mealId: meal?.id, name: dayComposer.title, calories: Number(dayComposer.calories) || undefined, protein: meal?.protein, carbs: meal?.carbs, fat: meal?.fat, notes: meal?.notes, completed: meal?.completed ?? true }); }
    else if (dayComposer.kind === "event") { const input = { title: dayComposer.title, startDate: todayKey, category: "personal" as const }; if (dayComposer.id) await planner.updateEvent(dayComposer.id, input); else await planner.createEvent(input); }
    else {
      const scheduledDays = dayComposer.habitRecurrence === "daily" ? [0, 1, 2, 3, 4, 5, 6] : dayComposer.habitRecurrence === "weekdays" ? [1, 2, 3, 4, 5] : dayComposer.habitRecurrence === "custom" ? dayComposer.scheduledDays : [today.getDay()];
      const oneOffDate = dayComposer.habitRecurrence === "today" ? todayKey : null;
      if (dayComposer.id) await planner.updateHabit(dayComposer.id, { name: dayComposer.title, scheduledDays, oneOffDate });
      else await planner.createHabit({ name: dayComposer.title, type: "boolean", scheduledDays, oneOffDate: oneOffDate ?? undefined, target: 1, unit: "vez", origin: "experiment" });
    }
    setDayComposer(null);
  };
  const taskItems: TimelineItem[] = todayTasks.map((task) => {
    const goal = snapshot.goals.find((item) => item.id === task.goalId)?.title;
    const project = snapshot.projects.find((item) => item.id === task.projectId)?.name;
    const plan = snapshot.cascadePlans.find((item) => item.id === task.periodPlanId && item.horizon === "monthly");
    const monthlyResult = plan ? m("today.timeline.monthlyOutcome", { result: plan.intention || plan.priority }) : undefined;
    const origin = [goal, project, monthlyResult].filter(Boolean).join(" · ");
    return { id: task.id, type: "tasks", title: task.title, detail: origin || (task.focusPriority ? m("today.timeline.priority", { priority: task.focusPriority }) : m("today.timeline.todayTask")), completed: task.status === "completed", action: <div className="timeline-actions"><button type="button" className="timeline-check" onClick={() => planner.toggleTask(task.id)} aria-label={task.status === "completed" ? m("today.timeline.reopenAria", { title: task.title }) : m("today.timeline.completeAria", { title: task.title })}>{task.status === "completed" ? <Check size={16} /> : <Circle size={16} />}</button><button type="button" onClick={() => openDayComposer(task.focusPriority ? "priority" : "task", task.id)} aria-label={m("today.timeline.editAria", { title: task.title })}><Pencil size={15} /></button></div> };
  });
  const workoutItems: TimelineItem[] = todayWorkout ? [{ id: todayWorkout.id, type: "training", title: todayWorkout.name ?? todayWorkout.goal ?? m("today.timeline.workoutFallback"), detail: `${todayWorkout.exercises.length ? formatPlural(todayWorkout.exercises.length, { one: m("today.timeline.exerciseCountOne", { count: formatNumber(todayWorkout.exercises.length) }), other: m("today.timeline.exerciseCount", { count: formatNumber(todayWorkout.exercises.length) }) }) : m("today.timeline.generalActivity")}${todayWorkout.durationMinutes ? ` · ${formatNumber(todayWorkout.durationMinutes)} ${m("today.unit.minuteShort")}` : ""}`, action: <button type="button" onClick={() => openDayComposer("workout", todayWorkout.id)} aria-label={m("today.timeline.editWorkoutAria")}><Pencil size={15} /></button> }] : [];
  const mealItems: TimelineItem[] = (todayNutrition?.meals ?? []).map((meal) => ({ id: meal.id, type: "meals", title: meal.name, detail: `${formatNumber(meal.calories ?? 0)} ${m("today.unit.kcal")}`, completed: meal.completed, action: <button type="button" onClick={() => openDayComposer("meal", meal.id)} aria-label={m("today.timeline.editAria", { title: meal.name })}><Pencil size={15} /></button> }));
  const eventCategoryLabel = (category: (typeof todayEvents)[number]["category"]) => {
    if (category === "medical") return m("today.timeline.eventCategory.medical");
    if (category === "birthday") return m("today.timeline.eventCategory.birthday");
    if (category === "social") return m("today.timeline.eventCategory.social");
    if (category === "work") return m("today.timeline.eventCategory.work");
    if (category === "wellness") return m("today.timeline.eventCategory.wellness");
    return m("today.timeline.eventCategory.personal");
  };
  const eventItems: TimelineItem[] = todayEvents.map((event) => ({ id: event.id, type: "events", title: event.title, detail: eventCategoryLabel(event.category), action: <button type="button" onClick={() => openDayComposer("event", event.id)} aria-label={m("today.timeline.editAria", { title: event.title })}><Pencil size={15} /></button> }));
  const timeline = [...taskItems, ...workoutItems, ...mealItems, ...eventItems];
  const visibleTimeline = timelineFilter === "all" ? timeline : timeline.filter((item) => item.type === timelineFilter);
  const timelineFilters: Array<[TimelineFilter, string]> = [
    ["all", m("today.timeline.filter.all")],
    ["tasks", m("today.timeline.filter.tasks")],
    ["training", m("today.timeline.filter.training")],
    ["meals", m("today.timeline.filter.meals")],
    ["events", m("today.timeline.filter.events")],
  ];
  const timelineComposerKinds: Array<[DayComposerKind, string]> = [
    ["task", m("today.timeline.add.task")],
    ["priority", m("today.timeline.add.priority")],
    ["habit", m("today.timeline.add.habit")],
    ["workout", m("today.timeline.add.workout")],
    ["meal", m("today.timeline.add.meal")],
    ["event", m("today.timeline.add.event")],
  ];
  const saveIntention = async () => { await planner.updateDailyIntention(intention); setIntentionEditing(false); };
  const saveClose = async (event: FormEvent) => {
    event.preventDefault();
    if (!advancedToday.trim() && !rememberToday.trim()) return;
    const text = `¿Qué avancé hoy?\n${advancedToday.trim() || "—"}\n\n¿Qué quiero recordar de hoy?\n${rememberToday.trim() || "—"}`;
    if (dailyCloseEntry) await planner.updateJournal(dailyCloseEntry.id, { title: "Cierre del día", text, type: "free", goalId: dailyCloseEntry.goalId });
    else await planner.saveJournal(text, { title: "Cierre del día", type: "free" });
    setCloseSaved(true);
  };
  const localizedDate = formatDate(today, { weekday: "long", day: "numeric", month: "long" });
  const todayDateLabel = `${localizedDate.charAt(0).toLocaleUpperCase()}${localizedDate.slice(1)}`;

  return <div className={`page-stack today-command-center ${minimumMode ? "is-minimum" : ""}`} data-i18n-explicit="true">
    <SectionHeading eyebrow={m("today.header.eyebrow")} title={<>{m("today.header.greeting")} <span data-no-translate={profileName ? "true" : undefined}>{profileName ?? m("today.header.fallbackName")}</span> 👋</>} description={todayDateLabel} action={<span className="today-header-note">{m("today.header.note")} <Heart size={15} /></span>} />

    {minimumMode && <Card className="minimum-banner"><HeartPulse size={22} /><div><p className="eyebrow">{m("today.minimum.eyebrow")}</p><h2>{m("today.minimum.title")}</h2><p>{m("today.minimum.description")}</p></div><Button variant="ghost" onClick={() => setMinimumMode(false)}>{m("today.minimum.exit")}</Button></Card>}

    <Card className={`today-next-action ${nextAction ? "" : "is-empty"}`}>
      <div><p className="eyebrow">{m("today.next.eyebrow")}</p>{nextAction ? <><h2 data-no-translate="true">{nextAction.title}</h2><p>{nextAction.focusPriority ? m("today.next.priorityDetail", { priority: nextAction.focusPriority }) : m("today.next.defaultDetail")}</p></> : <><h2>{m("today.next.emptyTitle")}</h2><p>{m("today.next.emptyDescription")}</p></>}</div>
      {nextAction ? <div className="today-next-action__actions"><Button onClick={() => planner.toggleTask(nextAction.id)}><Check size={16} /> {m("today.next.markDone")}</Button><Button variant="ghost" onClick={() => openDayComposer(nextAction.focusPriority ? "priority" : "task", nextAction.id)}><Pencil size={15} /> {m("today.next.edit")}</Button></div> : <div className="today-empty-actions"><Button onClick={() => onQuickCapture({ source: "today", date: todayKey })}>{m("today.next.addTask")}</Button><Button variant="secondary" onClick={() => onQuickCapture({ source: "today", date: todayKey, focusPriority: 1 })}>{m("today.next.choosePriority")}</Button><Button variant="ghost" onClick={onNeedHelp}>{m("today.next.helpDecide")}</Button></div>}
    </Card>

    <section className="today-work-grid">
      <h3 className="sr-only">{m("today.work.srTitle")}</h3>
      <Card className="today-priorities-card">
        <header><h2>{m("today.priorities.title")}</h2><button type="button" className="today-text-action" onClick={() => onQuickCapture({ source: "today", date: todayKey, focusPriority: (focusTasks.length + 1 > 3 ? 3 : focusTasks.length + 1) as 1 | 2 | 3 })}><Plus size={15} /> {m("today.priorities.add")}</button></header>
        {!focusTasks.length && <p className="today-priority-question">{m("today.priorities.question")}</p>}
        <div className="today-priority-list">{Array.from({ length: minimumMode ? 1 : 3 }, (_, index) => {
          const task = focusTasks[index];
          const priority = (index + 1) as 1 | 2 | 3;
          return task ? <div className="today-priority-row" key={task.id}><GripVertical className="priority-grip" size={15} aria-hidden="true" /><button type="button" className="priority-toggle" onClick={() => planner.toggleTask(task.id)} aria-label={task.status === "completed" ? m("today.priorities.reopenAria", { title: task.title }) : m("today.priorities.completeAria", { title: task.title })}><span>{task.status === "completed" ? <Check size={16} /> : task.focusPriority ?? priority}</span><strong className={task.status === "completed" ? "is-complete" : ""} data-no-translate="true">{task.title}</strong><Circle size={17} className={task.status === "completed" ? "is-complete" : ""} /></button><button type="button" className="priority-edit" onClick={() => openDayComposer("priority", task.id)} aria-label={m("today.priorities.editAria", { title: task.title })}><Pencil size={15} /></button></div> : <button type="button" className="today-priority-slot--empty" key={`priority-${priority}`} onClick={() => onQuickCapture({ source: "today", date: todayKey, focusPriority: priority })} aria-label={m("today.priorities.addSlotAria", { priority })}><GripVertical className="priority-grip" size={15} aria-hidden="true" /><span>{priority}</span><strong>{m("today.priorities.addSlot")}</strong><Plus size={16} aria-hidden="true" /></button>;
        })}</div>
        <div className="today-priority-callout"><Lightbulb size={18} /><p>{m("today.priorities.callout")}</p></div>
      </Card>

      <Card className="day-timeline-card">
        <header><h2>{m("today.timeline.title")}</h2><button type="button" className="today-text-action" onClick={() => onQuickCapture({ source: "today", date: todayKey })}><Plus size={15} /> {m("today.timeline.add")}</button></header>
        <Tabs id="today-timeline-filters" ariaLabel={m("today.timeline.filterAria")} items={timelineFilters.map(([id, label]) => ({ id, label }))} value={timelineFilter} onChange={setTimelineFilter} panelId="today-timeline-panel" className="timeline-filters" />
        {dayComposer && <DayComposerForm draft={dayComposer} goals={snapshot.goals} projects={snapshot.projects} onChange={setDayComposer} onSubmit={saveDayItem} onClose={() => setDayComposer(null)} />}
        <div id="today-timeline-panel" role="tabpanel" aria-labelledby={`today-timeline-filters-${timelineFilter}-tab`}>{visibleTimeline.length ? <div className="day-timeline-list">{(minimumMode ? visibleTimeline.slice(0, 1) : visibleTimeline).map((item) => <article key={`${item.type}-${item.id}`}><span className={`timeline-kind timeline-kind--${item.type}`}>{item.type === "tasks" ? <Check size={17} /> : item.type === "training" ? <Dumbbell size={17} /> : item.type === "meals" ? <Utensils size={17} /> : <CalendarDays size={17} />}</span><div><strong className={item.completed ? "is-complete" : ""} data-no-translate="true">{item.title}</strong><small data-no-translate="true">{item.detail}</small></div>{item.action}</article>)}</div> : <div className="today-timeline-empty"><CalendarDays size={20} aria-hidden="true" /><p>{m("today.timeline.empty")}</p></div>}</div>
        <div className="today-timeline-add-menu" aria-label={m("today.timeline.addMenuAria")}>{timelineComposerKinds.map(([kind, label]) => <button type="button" key={kind} onClick={() => kind === "task" ? onQuickCapture({ source: "today", date: todayKey }) : kind === "priority" ? onQuickCapture({ source: "today", date: todayKey, focusPriority: 1 }) : openDayComposer(kind)}><Plus size={14} /> {label}</button>)}</div>
      </Card>

      <Card className="today-habits-card">
        <header><h2>{m("today.habits.title")}</h2><Link to="/app/habits">{m("today.habits.viewAll")} <ChevronRight size={15} /></Link></header>
        <div className="habit-week-header" aria-hidden="true">{weekDates.map((date) => <span key={toLocalDateKey(date)}>{formatDate(date, { weekday: "narrow" })}</span>)}</div>
        <div>{habits.map((habit) => {
          const completedDates = new Set(snapshot.habitLogs.filter((log) => log.habitId === habit.id && log.value > 0).map((log) => log.date));
          const completed = completedDates.has(todayKey);
          const defaultUnit = habit.unit === "vez" ? formatPlural(habit.target, { one: m("today.habits.defaultUnitOne"), other: m("today.habits.defaultUnitOther") }) : null;
          return <div className="today-habit-row" key={habit.id}><button type="button" onClick={() => planner.toggleHabit(habit.id, todayKey)}><span>{completed ? <Check size={16} /> : <Circle size={16} />}</span><span className="habit-today-copy"><strong data-no-translate="true">{habit.name}</strong><small>{completed ? m("today.habits.logged") : <>{formatNumber(habit.target)} <span data-no-translate={defaultUnit ? undefined : "true"}>{defaultUnit ?? habit.unit}</span></>}</small></span><HabitWeekDots dateKeys={weekDateKeys} completedDates={completedDates} todayKey={todayKey} habitName={habit.name} /></button><button type="button" className="today-habit-edit" onClick={() => openDayComposer("habit", habit.id)} aria-label={m("today.timeline.editAria", { title: habit.name })}><Pencil size={14} /></button></div>;
        })}{!habits.length && <div className="today-habits-empty"><p>{m("today.habits.empty")}</p><small>{m("today.habits.freeDay")}</small><button type="button" onClick={() => openDayComposer("habit")}><Plus size={15} /> {m("today.habits.create")}</button></div>}</div>
      </Card>
    </section>

    {!minimumMode && overdue.length > 0 && <Card className="overdue-card"><div><p className="eyebrow">{m("today.overdue.eyebrow")}</p><h2>{m("today.overdue.title")}</h2><p>{m("today.overdue.description")}</p></div>{overdue.slice(0, 4).map((task) => <div className="overdue-row" key={task.id}><strong data-no-translate="true">{task.title}</strong><Button variant="secondary" onClick={() => planner.rescheduleTask(task.id, todayKey)}>{m("today.overdue.move")}</Button></div>)}</Card>}

    <section className="today-wellbeing-checkin" aria-label={m("today.wellbeing.ariaLabel")}>
      <TodayMoodCard planner={planner} saveOnChange onLowEnergy={() => setMinimumMode(true)} />
      <Card className="today-intention-card today-intention-card--standalone"><header><h2>{m("today.intention.title")} <Sparkles size={17} aria-hidden="true" /></h2><button type="button" className="today-icon-button" onClick={() => setIntentionEditing(true)} aria-label={m("today.intention.editAria")}><Pencil size={17} /></button></header>{intentionEditing ? <div className="today-intention-editor"><textarea value={intention} onChange={(event) => setIntention(event.target.value)} aria-label={m("today.intention.inputAria")} rows={3} placeholder={m("today.intention.placeholder")} translate="no" data-no-translate="true" /><Button variant="secondary" onClick={saveIntention}><Save size={16} /> {m("today.intention.save")}</Button></div> : <blockquote className={`today-intention-quote ${intention ? "" : "is-empty"}`}><Quote size={25} /><p data-no-translate={intention ? "true" : undefined}>{intention || m("today.intention.placeholder")}</p></blockquote>}</Card>
    </section>

    {!minimumMode && <section className="today-closing-grid">
      {(todayNutrition || todayWorkout) && <Card className="today-nutrition-card"><header><h2>{m("today.wellbeing.title")}</h2><Link to={`/app/health?date=${todayKey}`}>{m("today.wellbeing.detail")} <ChevronRight size={15} /></Link></header>{todayWorkout && <p><Dumbbell size={16} /> <span data-no-translate={todayWorkout.name || todayWorkout.goal ? "true" : undefined}>{todayWorkout.name ?? todayWorkout.goal ?? m("today.wellbeing.workoutFallback")}</span>{todayWorkout.durationMinutes ? ` · ${formatNumber(todayWorkout.durationMinutes)} ${m("today.unit.minuteShort")}` : ""}</p>}{todayNutrition && <><div className="today-macros"><span><strong>{formatNumber(macros.calories)}</strong> {m("today.unit.kcal")}</span><span><strong>{formatNumber(macros.protein)}g</strong> {m("today.wellbeing.protein")}</span><span><strong>{formatNumber(macros.carbs)}g</strong> {m("today.wellbeing.carbs")}</span><span><strong>{formatNumber(macros.fat)}g</strong> {m("today.wellbeing.fats")}</span></div><div className="today-meals">{todayNutrition.meals.map((meal) => <span key={meal.id} data-no-translate="true">{meal.completed ? <Check size={14} /> : <Circle size={14} />}{meal.name}</span>)}</div></>}<footer><Link className="button button--secondary" to={`/app/health?date=${todayKey}`}>{m("today.wellbeing.open")}</Link></footer></Card>}

      <Card className="daily-close-card"><header><div><h2>{m("today.close.title")}</h2><p>{m("today.close.when")}</p></div><Sparkles size={22} /></header><form onSubmit={saveClose}><label><span>{m("today.close.advanced")}</span><textarea rows={3} value={advancedToday} onChange={(event) => { setAdvancedToday(event.target.value); setCloseSaved(false); }} placeholder={m("today.close.placeholder")} translate="no" data-no-translate="true" /></label><label><span>{m("today.close.remember")}</span><textarea rows={3} value={rememberToday} onChange={(event) => { setRememberToday(event.target.value); setCloseSaved(false); }} placeholder={m("today.close.placeholder")} translate="no" data-no-translate="true" /></label><Button type="submit" disabled={(!advancedToday.trim() && !rememberToday.trim()) || closeSaved}><Save size={16} /> {dailyCloseEntry ? m("today.close.update") : m("today.close.create")}</Button>{closeSaved && <small role="status">{m("today.close.saved")}</small>}</form></Card>

      <Card className={`weekly-review-prompt ${completedWeeklyReview ? "is-complete" : ""}`}><h2>{m("today.weeklyReview.title")}</h2><div className="weekly-review-copy"><CalendarDays size={28} /><div><h3>{completedWeeklyReview ? m("today.weeklyReview.completedTitle") : m("today.weeklyReview.readyTitle")}</h3><p>{completedWeeklyReview ? m("today.weeklyReview.completedText") : m("today.weeklyReview.readyText")}</p></div></div><Link className="button button--secondary" to="/app/planning/weekly?reset=1">{completedWeeklyReview ? m("today.weeklyReview.view") : m("today.weeklyReview.start")}</Link></Card>
    </section>}

    <Card className="today-quote"><Quote size={20} /><p>{m("today.quote")}</p><small>{m("today.brand.name")} <Sparkles size={14} /></small></Card>
  </div>;
}

function DayComposerForm({ draft, goals, projects, onChange, onSubmit, onClose }: { draft: DayComposer; goals: Array<{ id: string; title: string; status: string }>; projects: Array<{ id: string; name: string; status: string }>; onChange: (draft: DayComposer) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  const { m } = useI18n();
  const labels: Record<DayComposerKind, string> = {
    task: m("today.composer.kind.task"),
    priority: m("today.composer.kind.priority"),
    habit: m("today.composer.kind.habit"),
    workout: m("today.composer.kind.workout"),
    meal: m("today.composer.kind.meal"),
    event: m("today.composer.kind.event"),
  };
  const taskLike = draft.kind === "task" || draft.kind === "priority";
  const recurrenceOptions: Array<[HabitRecurrence, string]> = [
    ["today", m("today.composer.recurrence.today")],
    ["daily", m("today.composer.recurrence.daily")],
    ["weekdays", m("today.composer.recurrence.weekdays")],
    ["custom", m("today.composer.recurrence.custom")],
  ];
  const dayOptions = [
    [1, m("today.composer.day.monday.short"), m("today.composer.day.monday.long")],
    [2, m("today.composer.day.tuesday.short"), m("today.composer.day.tuesday.long")],
    [3, m("today.composer.day.wednesday.short"), m("today.composer.day.wednesday.long")],
    [4, m("today.composer.day.thursday.short"), m("today.composer.day.thursday.long")],
    [5, m("today.composer.day.friday.short"), m("today.composer.day.friday.long")],
    [6, m("today.composer.day.saturday.short"), m("today.composer.day.saturday.long")],
    [0, m("today.composer.day.sunday.short"), m("today.composer.day.sunday.long")],
  ] as const;
  return <form className="day-inline-composer" onSubmit={onSubmit}>
    <header><strong>{draft.id ? m("today.composer.action.edit", { kind: labels[draft.kind] }) : m("today.composer.action.add", { kind: labels[draft.kind] })}</strong><button type="button" onClick={onClose} aria-label={m("today.composer.closeAria")}><X size={15} /></button></header>
    <label><span>{m("today.composer.name")}</span><input autoFocus required minLength={2} value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder={m("today.composer.namePlaceholder", { kind: labels[draft.kind] })} translate="no" data-no-translate="true" /></label>
    {draft.kind === "priority" && <label><span>{m("today.composer.position")}</span><select required value={draft.priority} onChange={(event) => onChange({ ...draft, priority: event.target.value as DayComposer["priority"] })}><option value="">{m("today.composer.choose")}</option><option value="1">{m("today.composer.priority", { priority: 1 })}</option><option value="2">{m("today.composer.priority", { priority: 2 })}</option><option value="3">{m("today.composer.priority", { priority: 3 })}</option></select></label>}
    {taskLike && <><label><span>{m("today.composer.goal")}</span><select value={draft.goalId} onChange={(event) => onChange({ ...draft, goalId: event.target.value })}><option value="">{m("today.composer.noGoal")}</option>{goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id} data-no-translate="true">{goal.title}</option>)}</select></label><label><span>{m("today.composer.project")}</span><select value={draft.projectId} onChange={(event) => onChange({ ...draft, projectId: event.target.value })}><option value="">{m("today.composer.noProject")}</option>{projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id} data-no-translate="true">{project.name}</option>)}</select></label></>}
    {draft.kind === "habit" && <fieldset className="day-habit-recurrence"><legend>{m("today.composer.recurrenceLegend")}</legend><div>{recurrenceOptions.map(([value, label]) => <button type="button" key={value} className={draft.habitRecurrence === value ? "is-selected" : ""} aria-pressed={draft.habitRecurrence === value} onClick={() => onChange({ ...draft, habitRecurrence: value })}>{label}</button>)}</div>{draft.habitRecurrence === "custom" && <div className="day-picker">{dayOptions.map(([day, label, ariaLabel]) => <button type="button" key={day} aria-label={ariaLabel} aria-pressed={draft.scheduledDays.includes(day)} className={draft.scheduledDays.includes(day) ? "is-selected" : ""} onClick={() => onChange({ ...draft, scheduledDays: draft.scheduledDays.includes(day) ? draft.scheduledDays.filter((item) => item !== day) : [...draft.scheduledDays, day] })}>{label}</button>)}</div>}</fieldset>}
    {draft.kind === "workout" && <label><span>{m("today.composer.duration")}</span><input type="number" min="1" value={draft.duration} onChange={(event) => onChange({ ...draft, duration: event.target.value })} /></label>}
    {draft.kind === "meal" && <label><span>{m("today.composer.calories")}</span><input type="number" min="0" value={draft.calories} onChange={(event) => onChange({ ...draft, calories: event.target.value })} /></label>}
    <Button type="submit" size="sm" disabled={draft.kind === "habit" && draft.habitRecurrence === "custom" && !draft.scheduledDays.length}><Save size={15} /> {m("today.composer.save")}</Button>
  </form>;
}

"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { BookOpen, CalendarCheck2, CalendarDays, ChartNoAxesColumnIncreasing, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Droplets, Dumbbell, MoreVertical, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { addMonths, addWeeks, eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns";
import { useSearchParams } from "react-router-dom";
import type { Habit } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { calculateBestHabitStreak, calculateHabitConsistency, getHabitDayState, getHabitTrackingStartDateKey, isHabitLogComplete, isHabitScheduledOn } from "@/src/domain/rules";
import { getRecentDates, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { habitFormSchema, type HabitFormInput } from "@/src/lib/schemas";
import { Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { TodayMoodCard } from "@/src/features/mood/TodayMoodCard";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";
import { isTrialPlanningDateAllowed, type UserAccess } from "@/src/domain/access";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { NavigationSpaceProgressMessageKey } from "@/src/i18n/messages/features/navigation-space-progress";

const dayOptions = [1, 2, 3, 4, 5, 6, 0] as const;
const weekdayShortKeys: Record<number, NavigationSpaceProgressMessageKey> = {
  0: "habits.weekday.sunday.short", 1: "habits.weekday.monday.short", 2: "habits.weekday.tuesday.short", 3: "habits.weekday.wednesday.short", 4: "habits.weekday.thursday.short", 5: "habits.weekday.friday.short", 6: "habits.weekday.saturday.short",
};
const weekdayNameKeys: Record<number, NavigationSpaceProgressMessageKey> = {
  0: "habits.weekday.sunday", 1: "habits.weekday.monday", 2: "habits.weekday.tuesday", 3: "habits.weekday.wednesday", 4: "habits.weekday.thursday", 5: "habits.weekday.friday", 6: "habits.weekday.saturday",
};

const defaultHabit: HabitFormInput = {
  name: "",
  type: "boolean",
  target: 1,
  unit: "check",
  scheduledDays: [1, 2, 3, 4, 5],
  lifeAreaId: "",
  origin: "established",
};

function dailyConsistency(habits: Habit[], logs: PlannerController["snapshot"]["habitLogs"], date: Date): number | null {
  const scheduled = habits.filter((habit) => isHabitScheduledOn(habit, date));
  if (!scheduled.length) return null;
  const dateKey = toLocalDateKey(date);
  const completed = scheduled.filter((habit) => isHabitLogComplete(habit, logs.find((log) => log.habitId === habit.id && log.date === dateKey))).length;
  return Math.round((completed / scheduled.length) * 100);
}

export function getHabitConsistencyDayPresentation(percentage: number | null) {
  const isScheduled = percentage !== null;
  return {
    isScheduled,
    height: isScheduled ? Math.max(percentage, percentage === 0 ? 3 : 0) : 0,
  };
}

function HabitIcon({ habit }: { habit: Habit }) {
  const lowerName = habit.name.toLocaleLowerCase();
  if (lowerName.includes("agua") || lowerName.includes("vaso")) return <Droplets size={21} />;
  if (lowerName.includes("leer") || lowerName.includes("lectura")) return <BookOpen size={21} />;
  if (lowerName.includes("entren") || lowerName.includes("ejercicio")) return <Dumbbell size={21} />;
  return <ClipboardCheck size={21} />;
}

export function HabitsPage({ planner, access }: { planner: PlannerController; access: UserAccess }) {
  const { m, formatDate } = useI18n();
  const { snapshot } = planner;
  const [searchParams, setSearchParams] = useSearchParams();
  const wellbeingRef = useRef<HTMLElement>(null);
  const handledProgressRequestRef = useRef<string | null>(null);
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const currentMonthKey = todayKey.slice(0, 7);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [menuHabitId, setMenuHabitId] = useState<string | null>(null);
  const [progressHabitId, setProgressHabitId] = useState<string | null>(null);
  const [progressDate, setProgressDate] = useState(todayKey);
  const [progressValue, setProgressValue] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [progressMonth, setProgressMonth] = useState(currentMonthKey);
  const activeHabits = useMemo(() => snapshot.habits.filter((habit) => habit.status === "active"), [snapshot.habits]);
  const todayHabits = activeHabits.filter((habit) => isHabitScheduledOn(habit, today));
  const weekDates = getWeekDates(addWeeks(today, weekOffset), snapshot.profile?.weekStartsOn ?? 1);
  const canPlanDate = (date: string) => isTrialPlanningDateAllowed(access, date);
  const weekReadOnly = weekDates.every((date) => !canPlanDate(toLocalDateKey(date)));
  const weekHasReadOnlyDays = weekDates.some((date) => !canPlanDate(toLocalDateKey(date)));
  const recentDates = useMemo(() => getRecentDates(365), []);
  const currentMonthDates = eachDayOfInterval({ start: startOfMonth(today), end: today });
  const monthOptions = Array.from({ length: 6 }, (_, index) => addMonths(startOfMonth(today), -index));
  const selectedMonthDate = new Date(`${progressMonth}-01T12:00:00`);
  const selectedMonthEnd = progressMonth === currentMonthKey ? today : endOfMonth(selectedMonthDate);
  const selectedMonthDates = eachDayOfInterval({ start: startOfMonth(selectedMonthDate), end: selectedMonthEnd });
  const requestedHabitId = searchParams.get("habit");
  const requestedHabitDate = searchParams.get("date");
  const requestedSearch = searchParams.toString();

  useEffect(() => {
    if (searchParams.get("checkin") === "1") wellbeingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams]);

  useEffect(() => {
    if (!requestedHabitId || !requestedHabitDate) {
      handledProgressRequestRef.current = null;
      return;
    }
    const requestKey = `${requestedHabitId}:${requestedHabitDate}:${requestedSearch}`;
    if (handledProgressRequestRef.current === requestKey || !/^\d{4}-\d{2}-\d{2}$/.test(requestedHabitDate) || !isTrialPlanningDateAllowed(access, requestedHabitDate)) return;
    const habit = activeHabits.find((item) => item.id === requestedHabitId);
    if (!habit || habit.type === "boolean") return;
    const currentLog = snapshot.habitLogs.find((log) => log.habitId === habit.id && log.date === requestedHabitDate);
    handledProgressRequestRef.current = requestKey;
    queueMicrotask(() => {
      setProgressHabitId(habit.id);
      setProgressDate(requestedHabitDate);
      setProgressValue(String(currentLog?.value ?? 0));
      const next = new URLSearchParams(requestedSearch);
      next.delete("habit");
      next.delete("date");
      setSearchParams(next, { replace: true });
    });
  }, [access, activeHabits, requestedHabitDate, requestedHabitId, requestedSearch, setSearchParams, snapshot.habitLogs]);

  const form = useForm<HabitFormInput>({ resolver: zodResolver(habitFormSchema), defaultValues: defaultHabit });
  const selectedDays = useWatch({ control: form.control, name: "scheduledDays" });
  const toggleDay = (day: number) => form.setValue("scheduledDays", selectedDays.includes(day) ? selectedDays.filter((value) => value !== day) : [...selectedDays, day], { shouldValidate: true });

  const openCreate = () => {
    setEditingHabitId(null);
    setPersonalizeOpen(false);
    form.reset(defaultHabit);
    setDialogOpen(true);
  };

  const openEdit = (habit: Habit) => {
    setEditingHabitId(habit.id);
    setPersonalizeOpen(true);
    setMenuHabitId(null);
    form.reset({ name: habit.name, type: habit.type, target: habit.target, unit: habit.unit, scheduledDays: habit.scheduledDays, oneOffDate: habit.oneOffDate, lifeAreaId: habit.lifeAreaId ?? "", origin: habit.origin ?? "established" });
    setDialogOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (editingHabitId) await planner.updateHabit(editingHabitId, values);
    else await planner.createHabit(values);
    setDialogOpen(false);
    setEditingHabitId(null);
    setPersonalizeOpen(false);
    form.reset(defaultHabit);
  });

  const openProgress = (habit: Habit, date = todayKey) => {
    const currentLog = snapshot.habitLogs.find((log) => log.habitId === habit.id && log.date === date);
    setProgressHabitId(habit.id);
    setProgressDate(date);
    setProgressValue(String(currentLog?.value ?? 0));
    setMenuHabitId(null);
  };

  const saveProgress = async (event: FormEvent) => {
    event.preventDefault();
    if (!progressHabitId) return;
    await planner.setHabitProgress(progressHabitId, progressDate, Number(progressValue));
    setProgressHabitId(null);
  };

  const deleteProgress = async () => {
    if (!progressHabitId || !window.confirm(m("habits.progressModal.deleteConfirm"))) return;
    await planner.deleteHabitLog(progressHabitId, progressDate);
    setProgressHabitId(null);
  };

  const currentAggregate = activeHabits.reduce((totals, habit) => {
    const result = calculateHabitConsistency(habit, snapshot.habitLogs, currentMonthDates);
    return { completed: totals.completed + result.completed, scheduled: totals.scheduled + result.scheduled };
  }, { completed: 0, scheduled: 0 });
  const currentPercentage = currentAggregate.scheduled ? Math.round((currentAggregate.completed / currentAggregate.scheduled) * 100) : null;
  const completedToday = todayHabits.filter((habit) => isHabitLogComplete(habit, snapshot.habitLogs.find((log) => log.habitId === habit.id && log.date === todayKey))).length;
  const greatestContinuity = calculateBestHabitStreak(activeHabits, snapshot.habitLogs, recentDates);
  const miniBars = currentMonthDates.slice(-16).map((date) => dailyConsistency(activeHabits, snapshot.habitLogs, date));
  const monthBars = selectedMonthDates.map((date) => ({ date, percentage: dailyConsistency(activeHabits, snapshot.habitLogs, date) }));
  const monthHasData = snapshot.habitLogs.some((log) => log.date.startsWith(progressMonth) && log.value > 0);
  const completedInMonth = activeHabits.reduce((total, habit) => total + calculateHabitConsistency(habit, snapshot.habitLogs, selectedMonthDates).completed, 0);
  const weekdayRates = dayOptions.map((day) => {
    const dates = selectedMonthDates.filter((date) => date.getDay() === day);
    const scheduled = dates.reduce((total, date) => total + activeHabits.filter((habit) => isHabitScheduledOn(habit, date)).length, 0);
    const completed = dates.reduce((total, date) => total + activeHabits.filter((habit) => isHabitScheduledOn(habit, date) && isHabitLogComplete(habit, snapshot.habitLogs.find((log) => log.habitId === habit.id && log.date === toLocalDateKey(date)))).length, 0);
    return { day, percentage: scheduled ? Math.round((completed / scheduled) * 100) : 0 };
  });
  const bestWeekdayRate = Math.max(...weekdayRates.map((item) => item.percentage));
  const bestWeekdays = weekdayRates.filter((item) => item.percentage === bestWeekdayRate && bestWeekdayRate > 0).map((item) => m(weekdayNameKeys[item.day]));
  const progressInsight = completedInMonth >= 3 && bestWeekdays.length ? m("habits.progress.insight", { days: bestWeekdays.slice(0, 2).join(m("habits.conjunction")) }) : m("habits.progress.insight.pending");
  const progressHabit = activeHabits.find((habit) => habit.id === progressHabitId);
  const progressLog = progressHabitId ? snapshot.habitLogs.find((log) => log.habitId === progressHabitId && log.date === progressDate) : undefined;

  return (
    <div className="page-stack habits-page">
      <SectionNavigation section="space" />
      <SectionHeading eyebrow={m("habits.header.eyebrow")} title={m("habits.header.title")} description={m("habits.header.description")} action={<Button onClick={openCreate}><Plus size={17} /> {m("habits.create")}</Button>} />

      <section className="habit-summary-grid" aria-label={m("habits.summary.label")} data-i18n-explicit="true">
        <Card className="habit-summary-card habit-summary-card--consistency"><span className="habit-summary-card__icon"><CalendarDays size={21} /></span><div><p>{m("habits.summary.consistency")}</p><strong>{currentPercentage === null ? m("habits.status.notScheduled") : m("habits.value.percent", { value: currentPercentage })}</strong><small>{m("habits.summary.scheduledRecords", { completed: currentAggregate.completed, scheduled: currentAggregate.scheduled })}</small></div><div className="habit-summary-mini-chart" aria-hidden="true">{miniBars.map((value, index) => { const presentation = getHabitConsistencyDayPresentation(value); return <span key={index} className={presentation.isScheduled ? undefined : "is-not-scheduled"} style={{ "--bar-height": `${presentation.isScheduled ? Math.max(10, presentation.height) : 0}%` } as CSSProperties} />; })}</div></Card>
        <Card className="habit-summary-card"><span className="habit-summary-card__icon"><ClipboardCheck size={21} /></span><div><p>{m("habits.summary.active")}</p><strong>{activeHabits.length}</strong><small>{m(completedToday === 1 ? "habits.summary.completedToday.one" : "habits.summary.completedToday.many", { count: completedToday })}</small></div><ChevronRight size={18} aria-hidden="true" /></Card>
        <Card className="habit-summary-card habit-summary-card--secondary"><span className="habit-summary-card__icon"><CalendarCheck2 size={21} /></span><div><p>{m("habits.summary.continuity")}</p><strong>{m(greatestContinuity === 1 ? "habits.summary.continuity.one" : "habits.summary.continuity.many", { count: greatestContinuity })}</strong><small>{greatestContinuity ? m("habits.summary.continuity.description") : m("habits.summary.continuity.empty")}</small></div><ChevronRight size={18} aria-hidden="true" /></Card>
      </section>

      {!activeHabits.length ? <Card className="habits-empty-card" data-i18n-explicit="true"><EmptyState title={m("habits.empty.title")} text={m("habits.empty.description")} action={<Button onClick={openCreate}>{m("habits.empty.action")}</Button>} /></Card> : <div className="habits-dashboard-grid">
        <Card className="habit-today-card" data-i18n-explicit="true">
          <header><div><span className="habit-section-icon habit-section-icon--sun"><Sparkles size={22} /></span><div><h2>{m("habits.today.title")}</h2><p>{formatDate(today, { weekday: "long", day: "numeric", month: "long" })}</p></div></div><a href="#habit-week">{m("habits.today.viewAll")} <ChevronRight size={17} /></a></header>
          <div className="habit-today-list">{todayHabits.length ? todayHabits.map((habit) => {
            const log = snapshot.habitLogs.find((item) => item.habitId === habit.id && item.date === todayKey);
            const completed = isHabitLogComplete(habit, log);
            const isMeasured = habit.type !== "boolean";
            const percentage = Math.min(100, Math.round(((log?.value ?? 0) / habit.target) * 100));
            return <article className="habit-today-row" key={habit.id}><span className={`habit-today-row__icon habit-today-row__icon--${habit.type}`}><HabitIcon habit={habit} /></span><div className="habit-today-row__copy"><strong>{habit.name}</strong><small>{m("habits.today.target", { target: habit.target, unit: habit.unit })}</small></div><div className="habit-today-row__status">{isMeasured && !completed ? <><strong>{log?.value ?? 0}/{habit.target} {habit.unit}</strong><span><i style={{ width: `${percentage}%` }} /></span></> : <span className={completed ? "habit-status habit-status--complete" : "habit-status"}>{completed ? m("habits.status.completed") : m("habits.status.notRecorded")}</span>}</div>{completed ? <button type="button" className="habit-complete-button" onClick={() => isMeasured ? openProgress(habit) : void planner.toggleHabit(habit.id, todayKey)} aria-label={isMeasured ? m("habits.today.editProgress", { name: habit.name }) : m("habits.today.uncheck", { name: habit.name })}><Check size={18} /></button> : <Button size="sm" variant={isMeasured ? "primary" : "outline"} onClick={() => isMeasured ? openProgress(habit) : void planner.toggleHabit(habit.id, todayKey)}>{isMeasured ? m("habits.today.record") : m("habits.today.mark")}</Button>}<div className="habit-row-menu"><button type="button" aria-label={m("habits.today.moreOptions", { name: habit.name })} aria-expanded={menuHabitId === habit.id} onClick={() => setMenuHabitId(menuHabitId === habit.id ? null : habit.id)}><MoreVertical size={19} /></button>{menuHabitId === habit.id && <div role="menu"><button type="button" role="menuitem" onClick={() => openEdit(habit)}><Pencil size={15} /> {m("habits.today.edit")}</button>{isMeasured && <button type="button" role="menuitem" onClick={() => openProgress(habit)}><ChartNoAxesColumnIncreasing size={15} /> {m("habits.today.recordProgress")}</button>}</div>}</div></article>;
          }) : <div className="habit-today-empty"><Sparkles size={21} /><div><h3>{m("habits.today.empty.title")}</h3><p>{m("habits.today.empty.description")}</p></div></div>}</div>
        </Card>

        <section ref={wellbeingRef} className="habit-mood-panel" aria-label={m("habits.wellbeing.label")}><TodayMoodCard planner={planner} /></section>

        <Card className="habit-week-card" id="habit-week" data-i18n-explicit="true">
          <header><div><span className="habit-section-icon"><CalendarDays size={20} /></span><div><h2>{m("habits.week.title")}</h2><p>{m("habits.week.description")}</p></div></div><div className="habit-week-navigation"><button type="button" onClick={() => setWeekOffset((value) => value - 1)} aria-label={m("habits.week.previous")}><ChevronLeft size={17} /></button><strong>{weekOffset === 0 ? m("habits.week.current") : m("habits.week.range", { start: weekDates[0].getDate(), end: weekDates[6].getDate(), month: formatDate(weekDates[6], { month: "short" }) })}</strong><button type="button" onClick={() => setWeekOffset((value) => value + 1)} aria-label={m("habits.week.next")}><ChevronRight size={17} /></button></div></header>
          {weekHasReadOnlyDays && <div className="month-readonly-notice weekly-readonly-notice" role="status"><div><strong>{weekReadOnly ? m("habits.week.readOnly") : m("habits.week.partlyReadOnly")}</strong><span>{m("habits.trialPlanningLimit")}</span></div></div>}
          <div className="habit-week-table-wrap"><table className="habit-week-table"><thead><tr><th scope="col">{m("habits.week.habitColumn")}</th>{weekDates.map((date) => <th scope="col" key={toLocalDateKey(date)} className={toLocalDateKey(date) === todayKey ? "is-today" : ""}><span>{m(weekdayShortKeys[date.getDay()])}</span><strong>{date.getDate()}</strong></th>)}</tr></thead><tbody>{activeHabits.map((habit) => <tr key={habit.id}><th scope="row"><strong>{habit.name}</strong><small>{getHabitTrackingStartDateKey(habit) ? m("habits.tracking.since", { date: formatDate(getHabitTrackingStartDateKey(habit), { dateStyle: "medium" }) }) : m("habits.tracking.legacy")}</small></th>{weekDates.map((date) => { const dateKey = toLocalDateKey(date); const dayState = getHabitDayState(habit, date); const log = snapshot.habitLogs.find((item) => item.habitId === habit.id && item.date === dateKey); const complete = isHabitLogComplete(habit, log); const partial = habit.type !== "boolean" && Boolean(log && log.value > 0 && !complete); const readOnly = !canPlanDate(dateKey); if (dayState === "before_tracking") return <td key={dateKey} className={dateKey === todayKey ? "is-today" : ""}><span className="habit-not-tracking" aria-label={m("habits.status.beforeTracking")}>·</span></td>; if (dayState === "not_scheduled") return <td key={dateKey} className={dateKey === todayKey ? "is-today" : ""}><span className="habit-not-scheduled" aria-label={m("habits.status.notScheduled")}>–</span></td>; const status = complete ? m("habits.status.completed.lower") : partial ? m("habits.status.partial", { value: log?.value ?? 0, target: habit.target, unit: habit.unit }) : m("habits.status.notRecorded.lower"); return <td key={dateKey} className={dateKey === todayKey ? "is-today" : ""}><button type="button" className={complete ? "is-complete" : partial ? "is-partial" : "is-pending"} disabled={readOnly} title={readOnly ? m("habits.readOnly") : undefined} onClick={() => habit.type === "boolean" ? void planner.toggleHabit(habit.id, dateKey) : openProgress(habit, dateKey)} aria-label={readOnly ? m("habits.readOnly") : m("habits.week.entryLabel", { name: habit.name, date: formatDate(date, { dateStyle: "medium" }), status })} aria-pressed={habit.type === "boolean" ? complete : undefined}>{complete ? <Check size={15} /> : partial ? <span className="habit-partial-value">{log?.value}/{habit.target}</span> : <span />}</button></td>; })}</tr>)}</tbody></table></div>
          <footer className="habit-week-legend"><span><i className="is-complete"><Check size={12} /></i> {m("habits.status.completed")}</span><span><i className="is-partial" /> {m("habits.status.partialLegend")}</span><span><i className="is-pending" /> {m("habits.status.notRecorded")}</span><span><i className="is-before">·</i> {m("habits.status.beforeTracking")}</span><span><i className="is-off">–</i> {m("habits.status.notScheduled")}</span></footer>
        </Card>

        <Card className="habit-progress-card" data-i18n-explicit="true">
          <header><div><span className="habit-section-icon"><ChartNoAxesColumnIncreasing size={20} /></span><div><h2>{m("habits.progress.title")}</h2><p>{m("habits.progress.description")}</p></div></div><label><span className="sr-only">{m("habits.progress.month")}</span><select value={progressMonth} onChange={(event) => setProgressMonth(event.target.value)}>{monthOptions.map((date) => <option key={toLocalDateKey(date)} value={toLocalDateKey(date).slice(0, 7)}>{formatDate(date, { month: "long" })}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></label></header>
          {monthHasData ? <><div className="habit-progress-chart" role="img" aria-label={m("habits.progress.chartLabel", { month: formatDate(selectedMonthDate, { month: "long" }) })}><div className="habit-progress-axis"><span>100%</span><span>50%</span><span>0%</span></div><div className="habit-progress-bars">{monthBars.map(({ date, percentage }) => { const presentation = getHabitConsistencyDayPresentation(percentage); const label = percentage === null ? m("habits.status.notScheduled") : m("habits.value.percent", { value: percentage }); return <div key={toLocalDateKey(date)}><span className={presentation.isScheduled ? undefined : "is-not-scheduled"} title={m("habits.progress.dayValue", { day: date.getDate(), value: label })} style={{ height: `${presentation.height}%` }} /><small>{[1, 5, 10, 15, 20, 25, selectedMonthDates.length].includes(date.getDate()) ? date.getDate() : ""}</small></div>; })}</div></div><div className="habit-progress-insight"><Sparkles size={18} /><p>{progressInsight}</p></div></> : <div className="habit-progress-empty"><Sparkles size={22} /><h3>{m("habits.progress.empty.title")}</h3><p>{m("habits.progress.empty.description")}</p></div>}
        </Card>
      </div>}

      <Modal open={dialogOpen} title={editingHabitId ? m("habits.form.editTitle") : m("habits.form.createTitle")} description={m("habits.form.description")} onClose={() => setDialogOpen(false)} explicitI18n>
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="form-field form-field--full"><span>{m("habits.form.name")}</span><input placeholder={m("habits.form.name.placeholder")} {...form.register("name")} />{form.formState.errors.name && <small className="form-error">{m("habits.form.name.error")}</small>}</label>
          <fieldset className="form-field form-field--full"><legend>{m("habits.form.days")}</legend><div className="day-picker">{dayOptions.map((value) => <button type="button" key={value} className={selectedDays.includes(value) ? "is-selected" : ""} onClick={() => toggleDay(value)} aria-pressed={selectedDays.includes(value)}>{m(weekdayShortKeys[value])}</button>)}</div>{form.formState.errors.scheduledDays && <small className="form-error">{m("habits.form.days.error")}</small>}</fieldset>
          <button type="button" className="habit-personalize-toggle form-field--full" aria-expanded={personalizeOpen} onClick={() => setPersonalizeOpen((current) => !current)}><span><strong>{m("habits.form.personalize")}</strong><small>{m("habits.form.personalize.description")}</small></span><ChevronDown size={18} /></button>
          {personalizeOpen && <div className="habit-personalize-fields form-field--full"><label className="form-field"><span>{m("habits.form.recordType")}</span><select {...form.register("type")}><option value="boolean">{m("habits.form.type.boolean")}</option><option value="quantity">{m("habits.form.type.quantity")}</option><option value="duration">{m("habits.form.type.duration")}</option></select></label><label className="form-field"><span>{m("habits.form.lifeArea")}</span><select {...form.register("lifeAreaId")}><option value="">{m("habits.form.noArea")}</option>{snapshot.lifeAreas.filter((area) => area.active).map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select></label><label className="form-field"><span>{m("habits.form.target")}</span><input type="number" min="1" {...form.register("target", { valueAsNumber: true })} />{form.formState.errors.target && <small className="form-error">{m("habits.form.target.error")}</small>}</label><label className="form-field"><span>{m("habits.form.unit")}</span><input placeholder={m("habits.form.unit.placeholder")} {...form.register("unit")} />{form.formState.errors.unit && <small className="form-error">{m("habits.form.unit.error")}</small>}</label><label className="form-field form-field--full"><span>{m("habits.form.startMode")}</span><select {...form.register("origin")}><option value="established">{m("habits.form.origin.established")}</option><option value="experiment">{m("habits.form.origin.experiment")}</option></select></label></div>}
          <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>{m("habits.form.notNow")}</Button><Button type="submit">{editingHabitId ? m("habits.form.saveChanges") : m("habits.form.saveHabit")}</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(progressHabit)} title={progressHabit ? m("habits.progressModal.titleWithName", { name: progressHabit.name }) : m("habits.progressModal.title")} description={progressHabit ? m("habits.progressModal.selectedDate", { target: progressHabit.target, unit: progressHabit.unit, date: formatDate(progressDate, { dateStyle: "long" }) }) : undefined} onClose={() => setProgressHabitId(null)} explicitI18n>
        {progressHabit && <form className="habit-progress-form" onSubmit={saveProgress}><label className="form-field"><span>{m("habits.progressModal.today", { unit: progressHabit.unit })}</span><input type="number" min="0" max={progressHabit.target} step="any" value={progressValue} onChange={(event) => setProgressValue(event.target.value)} /></label><div className="modal__actions habit-progress-form__actions">{progressLog && <Button type="button" variant="ghost" onClick={() => void deleteProgress()}><Trash2 size={15} /> {m("habits.progressModal.delete")}</Button>}<span className="habit-progress-form__spacer" /><Button type="button" variant="ghost" onClick={() => setProgressHabitId(null)}>{m("habits.form.cancel")}</Button><Button type="submit">{m("habits.progressModal.save")}</Button></div></form>}
      </Modal>
    </div>
  );
}

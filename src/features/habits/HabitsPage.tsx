"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { BookOpen, CalendarDays, ChartNoAxesColumnIncreasing, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Droplets, Dumbbell, Flame, MoreVertical, Pencil, Plus, Sparkles, Trophy } from "lucide-react";
import { addMonths, addWeeks, eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { useSearchParams } from "react-router-dom";
import type { Habit } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { calculateBestHabitStreak, calculateHabitConsistency, isHabitLogComplete, isHabitScheduledOn } from "@/src/domain/rules";
import { formatLongDate, getDateFnsLocale, getRecentDates, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { habitFormSchema, type HabitFormInput } from "@/src/lib/schemas";
import { Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { TodayMoodCard } from "@/src/features/mood/TodayMoodCard";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";

const dayOptions = [
  [1, "L"], [2, "M"], [3, "X"], [4, "J"], [5, "V"], [6, "S"], [0, "D"],
] as const;

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

function HabitIcon({ habit }: { habit: Habit }) {
  const lowerName = habit.name.toLocaleLowerCase();
  if (lowerName.includes("agua") || lowerName.includes("vaso")) return <Droplets size={21} />;
  if (lowerName.includes("leer") || lowerName.includes("lectura")) return <BookOpen size={21} />;
  if (lowerName.includes("entren") || lowerName.includes("ejercicio")) return <Dumbbell size={21} />;
  return <ClipboardCheck size={21} />;
}

export function HabitsPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const [searchParams] = useSearchParams();
  const wellbeingRef = useRef<HTMLElement>(null);
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const currentMonthKey = todayKey.slice(0, 7);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [menuHabitId, setMenuHabitId] = useState<string | null>(null);
  const [progressHabitId, setProgressHabitId] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [progressMonth, setProgressMonth] = useState(currentMonthKey);
  const activeHabits = snapshot.habits.filter((habit) => habit.status === "active");
  const todayHabits = activeHabits.filter((habit) => isHabitScheduledOn(habit, today));
  const weekDates = getWeekDates(addWeeks(today, weekOffset), snapshot.profile?.weekStartsOn ?? 1);
  const recentDates = useMemo(() => getRecentDates(365), []);
  const currentMonthDates = eachDayOfInterval({ start: startOfMonth(today), end: today });
  const monthOptions = Array.from({ length: 6 }, (_, index) => addMonths(startOfMonth(today), -index));
  const selectedMonthDate = new Date(`${progressMonth}-01T12:00:00`);
  const selectedMonthEnd = progressMonth === currentMonthKey ? today : endOfMonth(selectedMonthDate);
  const selectedMonthDates = eachDayOfInterval({ start: startOfMonth(selectedMonthDate), end: selectedMonthEnd });

  useEffect(() => {
    if (searchParams.get("checkin") === "1") wellbeingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams]);

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

  const openProgress = (habit: Habit) => {
    const currentLog = snapshot.habitLogs.find((log) => log.habitId === habit.id && log.date === todayKey);
    setProgressHabitId(habit.id);
    setProgressValue(String(currentLog?.value ?? 0));
    setMenuHabitId(null);
  };

  const saveProgress = async (event: FormEvent) => {
    event.preventDefault();
    if (!progressHabitId) return;
    await planner.setHabitProgress(progressHabitId, todayKey, Number(progressValue));
    setProgressHabitId(null);
  };

  const currentAggregate = activeHabits.reduce((totals, habit) => {
    const result = calculateHabitConsistency(habit, snapshot.habitLogs, currentMonthDates);
    return { completed: totals.completed + result.completed, scheduled: totals.scheduled + result.scheduled };
  }, { completed: 0, scheduled: 0 });
  const currentPercentage = currentAggregate.scheduled ? Math.round((currentAggregate.completed / currentAggregate.scheduled) * 100) : 0;
  const completedToday = todayHabits.filter((habit) => isHabitLogComplete(habit, snapshot.habitLogs.find((log) => log.habitId === habit.id && log.date === todayKey))).length;
  const bestStreak = calculateBestHabitStreak(activeHabits, snapshot.habitLogs, recentDates);
  const miniBars = currentMonthDates.slice(-16).map((date) => dailyConsistency(activeHabits, snapshot.habitLogs, date) ?? 0);
  const monthBars = selectedMonthDates.map((date) => ({ date, percentage: dailyConsistency(activeHabits, snapshot.habitLogs, date) }));
  const monthHasData = snapshot.habitLogs.some((log) => log.date.startsWith(progressMonth) && log.value > 0);
  const completedInMonth = activeHabits.reduce((total, habit) => total + calculateHabitConsistency(habit, snapshot.habitLogs, selectedMonthDates).completed, 0);
  const weekdayRates = dayOptions.map(([day]) => {
    const dates = selectedMonthDates.filter((date) => date.getDay() === day);
    const scheduled = dates.reduce((total, date) => total + activeHabits.filter((habit) => isHabitScheduledOn(habit, date)).length, 0);
    const completed = dates.reduce((total, date) => total + activeHabits.filter((habit) => isHabitLogComplete(habit, snapshot.habitLogs.find((log) => log.habitId === habit.id && log.date === toLocalDateKey(date)))).length, 0);
    return { day, percentage: scheduled ? Math.round((completed / scheduled) * 100) : 0 };
  });
  const bestWeekdayRate = Math.max(...weekdayRates.map((item) => item.percentage));
  const bestWeekdays = weekdayRates.filter((item) => item.percentage === bestWeekdayRate && bestWeekdayRate > 0).map((item) => ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"][item.day]);
  const progressInsight = completedInMonth >= 3 && bestWeekdays.length ? `Tus días más constantes suelen ser ${bestWeekdays.slice(0, 2).join(" y ")}.` : "Registra algunos días más para empezar a descubrir tus patrones.";
  const progressHabit = activeHabits.find((habit) => habit.id === progressHabitId);

  return (
    <div className="page-stack habits-page">
      <SectionNavigation section="space" />
      <SectionHeading eyebrow="Constancia sin perfección" title="Hábitos" description="Pequeñas acciones que sostienen tu progreso día a día." action={<Button onClick={openCreate}><Plus size={17} /> Crear hábito</Button>} />

      <section className="habit-summary-grid" aria-label="Resumen de hábitos">
        <Card className="habit-summary-card habit-summary-card--consistency"><span className="habit-summary-card__icon"><CalendarDays size={21} /></span><div><p>Consistencia mensual</p><strong>{currentPercentage}%</strong><small>{currentAggregate.completed} de {currentAggregate.scheduled} registros programados</small></div><div className="habit-summary-mini-chart" aria-hidden="true">{miniBars.map((value, index) => <span key={index} style={{ "--bar-height": `${Math.max(10, value)}%` } as CSSProperties} />)}</div></Card>
        <Card className="habit-summary-card"><span className="habit-summary-card__icon"><Flame size={21} /></span><div><p>Hábitos activos</p><strong>{activeHabits.length}</strong><small>{completedToday} {completedToday === 1 ? "hábito completado" : "hábitos completados"} hoy</small></div><ChevronRight size={18} aria-hidden="true" /></Card>
        <Card className="habit-summary-card"><span className="habit-summary-card__icon"><Trophy size={21} /></span><div><p>Mejor racha</p><strong>{bestStreak} {bestStreak === 1 ? "día" : "días"}</strong><small>{bestStreak ? "Cada día programado cuenta" : "Tu primera racha empieza con un registro"}</small></div><ChevronRight size={18} aria-hidden="true" /></Card>
      </section>

      {!activeHabits.length ? <Card className="habits-empty-card"><EmptyState title="Empieza con algo pequeño." text="Crea tu primer hábito y comienza a construir constancia." action={<Button onClick={openCreate}>Crear mi primer hábito</Button>} /></Card> : <div className="habits-dashboard-grid">
        <Card className="habit-today-card">
          <header><div><span className="habit-section-icon habit-section-icon--sun"><Sparkles size={22} /></span><div><h2>Hoy</h2><p>{formatLongDate(today)}</p></div></div><a href="#habit-week">Ver todos los hábitos <ChevronRight size={17} /></a></header>
          <div className="habit-today-list">{todayHabits.length ? todayHabits.map((habit) => {
            const log = snapshot.habitLogs.find((item) => item.habitId === habit.id && item.date === todayKey);
            const completed = isHabitLogComplete(habit, log);
            const isMeasured = habit.type !== "boolean";
            const percentage = Math.min(100, Math.round(((log?.value ?? 0) / habit.target) * 100));
            return <article className="habit-today-row" key={habit.id}><span className={`habit-today-row__icon habit-today-row__icon--${habit.type}`}><HabitIcon habit={habit} /></span><div className="habit-today-row__copy"><strong>{habit.name}</strong><small>Meta: {habit.target} {habit.unit}</small></div><div className="habit-today-row__status">{isMeasured && !completed ? <><strong>{log?.value ?? 0}/{habit.target} {habit.unit}</strong><span><i style={{ width: `${percentage}%` }} /></span></> : <span className={completed ? "habit-status habit-status--complete" : "habit-status"}>{completed ? "Completado" : "Pendiente"}</span>}</div>{completed ? <button type="button" className="habit-complete-button" onClick={() => isMeasured ? void planner.setHabitProgress(habit.id, todayKey, 0) : void planner.toggleHabit(habit.id, todayKey)} aria-label={`Desmarcar ${habit.name}`}><Check size={18} /></button> : <Button size="sm" variant={isMeasured ? "primary" : "outline"} onClick={() => isMeasured ? openProgress(habit) : void planner.toggleHabit(habit.id, todayKey)}>{isMeasured ? "Registrar" : "Marcar"}</Button>}<div className="habit-row-menu"><button type="button" aria-label={`Más opciones para ${habit.name}`} aria-expanded={menuHabitId === habit.id} onClick={() => setMenuHabitId(menuHabitId === habit.id ? null : habit.id)}><MoreVertical size={19} /></button>{menuHabitId === habit.id && <div role="menu"><button type="button" role="menuitem" onClick={() => openEdit(habit)}><Pencil size={15} /> Editar hábito</button>{isMeasured && <button type="button" role="menuitem" onClick={() => openProgress(habit)}><ChartNoAxesColumnIncreasing size={15} /> Registrar progreso</button>}</div>}</div></article>;
          }) : <div className="habit-today-empty"><Sparkles size={21} /><div><h3>Hoy no tienes hábitos programados.</h3><p>Un día libre también forma parte de una constancia sostenible.</p></div></div>}</div>
        </Card>

        <section ref={wellbeingRef} className="habit-mood-panel" aria-label="Bienestar, ánimo y energía"><TodayMoodCard planner={planner} /></section>

        <Card className="habit-week-card" id="habit-week">
          <header><div><span className="habit-section-icon"><CalendarDays size={20} /></span><div><h2>Tu semana</h2><p>Vista semanal de tus hábitos</p></div></div><div className="habit-week-navigation"><button type="button" onClick={() => setWeekOffset((value) => value - 1)} aria-label="Semana anterior"><ChevronLeft size={17} /></button><strong>{weekOffset === 0 ? "Esta semana" : `${weekDates[0].getDate()}–${weekDates[6].getDate()} ${format(weekDates[6], "MMM", { locale: getDateFnsLocale() })}`}</strong><button type="button" onClick={() => setWeekOffset((value) => value + 1)} aria-label="Semana siguiente"><ChevronRight size={17} /></button></div></header>
          <div className="habit-week-table-wrap"><table className="habit-week-table"><thead><tr><th scope="col">Hábito</th>{weekDates.map((date) => <th scope="col" key={toLocalDateKey(date)} className={toLocalDateKey(date) === todayKey ? "is-today" : ""}><span>{["D", "L", "M", "X", "J", "V", "S"][date.getDay()]}</span><strong>{date.getDate()}</strong></th>)}</tr></thead><tbody>{activeHabits.map((habit) => <tr key={habit.id}><th scope="row">{habit.name}</th>{weekDates.map((date) => { const dateKey = toLocalDateKey(date); const scheduled = isHabitScheduledOn(habit, date); const log = snapshot.habitLogs.find((item) => item.habitId === habit.id && item.date === dateKey); const complete = isHabitLogComplete(habit, log); return <td key={dateKey} className={dateKey === todayKey ? "is-today" : ""}>{scheduled ? <button type="button" className={complete ? "is-complete" : "is-pending"} onClick={() => void planner.toggleHabit(habit.id, dateKey)} aria-label={`${habit.name}, ${dateKey}: ${complete ? "completado" : "pendiente"}`} aria-pressed={complete}>{complete ? <Check size={15} /> : <span />}</button> : <span className="habit-not-scheduled" aria-label="No programado">–</span>}</td>; })}</tr>)}</tbody></table></div>
          <footer className="habit-week-legend"><span><i className="is-complete"><Check size={12} /></i> Completado</span><span><i className="is-pending" /> Pendiente</span><span><i className="is-off">–</i> No programado</span></footer>
        </Card>

        <Card className="habit-progress-card">
          <header><div><span className="habit-section-icon"><ChartNoAxesColumnIncreasing size={20} /></span><div><h2>Tu progreso</h2><p>Consistencia diaria este mes</p></div></div><label><span className="sr-only">Mes del progreso</span><select value={progressMonth} onChange={(event) => setProgressMonth(event.target.value)}>{monthOptions.map((date) => <option key={toLocalDateKey(date)} value={toLocalDateKey(date).slice(0, 7)}>{format(date, "MMMM", { locale: getDateFnsLocale() })}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></label></header>
          {monthHasData ? <><div className="habit-progress-chart" role="img" aria-label={`Consistencia diaria de ${format(selectedMonthDate, "MMMM", { locale: getDateFnsLocale() })}`}><div className="habit-progress-axis"><span>100%</span><span>50%</span><span>0%</span></div><div className="habit-progress-bars">{monthBars.map(({ date, percentage }) => <div key={toLocalDateKey(date)}><span title={`${date.getDate()}: ${percentage ?? 0}%`} style={{ height: `${Math.max(percentage ?? 0, percentage === 0 ? 3 : 0)}%` }} /><small>{[1, 5, 10, 15, 20, 25, selectedMonthDates.length].includes(date.getDate()) ? date.getDate() : ""}</small></div>)}</div></div><div className="habit-progress-insight"><Sparkles size={18} /><p>{progressInsight}</p></div></> : <div className="habit-progress-empty"><Sparkles size={22} /><h3>Todavía estamos conociendo tu ritmo.</h3><p>Completa algunos hábitos y aquí empezarás a ver tu progreso.</p></div>}
        </Card>
      </div>}

      <Modal open={dialogOpen} title={editingHabitId ? "Editar hábito" : "Crear un hábito"} description="Empieza con algo pequeño y claro. Siempre podrás ajustarlo." onClose={() => setDialogOpen(false)}>
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="form-field form-field--full"><span>Nombre del hábito</span><input placeholder="Ej. Leer antes de dormir" {...form.register("name")} />{form.formState.errors.name && <small className="form-error">{form.formState.errors.name.message}</small>}</label>
          <fieldset className="form-field form-field--full"><legend>Días programados</legend><div className="day-picker">{dayOptions.map(([value, label]) => <button type="button" key={value} className={selectedDays.includes(value) ? "is-selected" : ""} onClick={() => toggleDay(value)} aria-pressed={selectedDays.includes(value)}>{label}</button>)}</div>{form.formState.errors.scheduledDays && <small className="form-error">{form.formState.errors.scheduledDays.message}</small>}</fieldset>
          <button type="button" className="habit-personalize-toggle form-field--full" aria-expanded={personalizeOpen} onClick={() => setPersonalizeOpen((current) => !current)}><span><strong>Personalizar</strong><small>Tipo de registro, área, objetivo y unidad</small></span><ChevronDown size={18} /></button>
          {personalizeOpen && <div className="habit-personalize-fields form-field--full"><label className="form-field"><span>Tipo de registro</span><select {...form.register("type")}><option value="boolean">Sí / no</option><option value="quantity">Cantidad</option><option value="duration">Duración</option></select></label><label className="form-field"><span>Área de vida</span><select {...form.register("lifeAreaId")}><option value="">Sin área</option>{snapshot.lifeAreas.filter((area) => area.active).map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select></label><label className="form-field"><span>Objetivo</span><input type="number" min="1" {...form.register("target", { valueAsNumber: true })} />{form.formState.errors.target && <small className="form-error">{form.formState.errors.target.message}</small>}</label><label className="form-field"><span>Unidad</span><input placeholder="min, pasos, sesión" {...form.register("unit")} />{form.formState.errors.unit && <small className="form-error">{form.formState.errors.unit.message}</small>}</label><label className="form-field form-field--full"><span>Modo de inicio</span><select {...form.register("origin")}><option value="established">Ya lo tengo y quiero sostenerlo</option><option value="experiment">Quiero probarlo durante 14 días</option></select></label></div>}
          <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Ahora no</Button><Button type="submit">{editingHabitId ? "Guardar cambios" : "Guardar hábito"}</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(progressHabit)} title={progressHabit ? `Registrar ${progressHabit.name}` : "Registrar progreso"} description={progressHabit ? `Meta de hoy: ${progressHabit.target} ${progressHabit.unit}.` : undefined} onClose={() => setProgressHabitId(null)}>
        {progressHabit && <form className="habit-progress-form" onSubmit={saveProgress}><label className="form-field"><span>Progreso de hoy ({progressHabit.unit})</span><input type="number" min="0" max={progressHabit.target} step="any" value={progressValue} onChange={(event) => setProgressValue(event.target.value)} /></label><div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setProgressHabitId(null)}>Cancelar</Button><Button type="submit">Guardar progreso</Button></div></form>}
      </Modal>
    </div>
  );
}

"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, ChevronRight, Circle, Dumbbell, Frown, GripVertical, Heart, HeartPulse, Laugh, Lightbulb, Meh, Pencil, Plus, Quote, Save, Smile, Sparkles, Utensils, X, type LucideIcon } from "lucide-react";
import type { MoodName } from "@/src/domain/planner";
import { isHabitScheduledOn, isTaskOverdue } from "@/src/domain/rules";
import { getDailyTopThree } from "@/src/domain/guidanceRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatLongDate, formatShortDay, getReviewPeriodKey, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { Button, Card, SectionHeading } from "@/src/components/ui/Primitives";
import { analyticsService } from "@/src/services/analyticsService";
import { HabitWeekDots } from "./TodayVisuals";
import type { QuickCaptureDefaults } from "@/src/features/tasks/QuickCaptureDrawer";

const moodOptions: { name: MoodName; label: string; Icon: LucideIcon }[] = [
  { name: "Abrumada", label: "Muy baja", Icon: Frown }, { name: "Cansada", label: "Baja", Icon: Meh },
  { name: "Calmada", label: "Equilibrada", Icon: Smile }, { name: "Enfocada", label: "Buena", Icon: Smile },
  { name: "Alegre", label: "Excelente", Icon: Laugh },
];

type TimelineFilter = "all" | "tasks" | "training" | "meals" | "events";
type TimelineItem = { id: string; type: Exclude<TimelineFilter, "all">; time?: string; title: string; detail: string; completed?: boolean; action: ReactNode };
type DayComposerKind = "task" | "priority" | "habit" | "workout" | "meal" | "event";
type DayComposer = { kind: DayComposerKind; id?: string; title: string; time: string; priority: "" | "1" | "2" | "3"; duration: string; calories: string };
const emptyComposer = (kind: DayComposerKind = "task"): DayComposer => ({ kind, title: "", time: "", priority: "", duration: "", calories: "" });

export function TodayPage({ planner, onQuickCapture, onNeedHelp }: { planner: PlannerController; onQuickCapture: (defaults: QuickCaptureDefaults) => void; onNeedHelp: () => void }) {
  const { snapshot } = planner;
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  useEffect(() => { analyticsService.track("today_view_opened", { route: "/app/today" }, `today:${todayKey}`); }, [todayKey]);
  const savedIntention = snapshot.journalEntries.find((entry) => entry.date === todayKey && entry.title === "Intención del día")?.text ?? snapshot.profile?.dailyIntention ?? "";
  const [intention, setIntention] = useState(savedIntention);
  const [intentionEditing, setIntentionEditing] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [minimumMode, setMinimumMode] = useState(false);
  const [wellbeingExpanded, setWellbeingExpanded] = useState(false);
  const [moodNote, setMoodNote] = useState(snapshot.moodLogs.find((log) => log.date === todayKey)?.note ?? "");
  const [advancedToday, setAdvancedToday] = useState("");
  const [rememberToday, setRememberToday] = useState("");
  const [closeSaved, setCloseSaved] = useState(false);
  const [dayComposer, setDayComposer] = useState<DayComposer | null>(null);
  const todayTasks = snapshot.tasks.filter((task) => task.date === todayKey && task.status !== "cancelled");
  const focusTasks = getDailyTopThree(snapshot.tasks, todayKey);
  const nextAction = focusTasks.find((task) => task.status !== "completed") ?? todayTasks.find((task) => task.status !== "completed");
  const overdue = snapshot.tasks.filter((task) => isTaskOverdue(task, todayKey));
  const habits = snapshot.habits.filter((habit) => habit.status === "active" && isHabitScheduledOn(habit, today));
  const mood = snapshot.moodLogs.find((log) => log.date === todayKey);
  const weekDates = getWeekDates(today, snapshot.profile?.weekStartsOn ?? 1);
  const weekDateKeys = weekDates.map(toLocalDateKey);
  const weekReviewKey = getReviewPeriodKey("weekly", today, snapshot.profile?.weekStartsOn ?? 1);
  const completedWeeklyReview = snapshot.reviews.find((review) => review.type === "weekly" && review.periodKey === weekReviewKey && review.status === "completed");
  const todayWorkout = snapshot.workoutLogs.find((item) => item.date === todayKey);
  const todayNutrition = snapshot.nutritionLogs.find((item) => item.date === todayKey);
  const todayEvents = snapshot.events.filter((item) => item.startDate === todayKey);
  const macros = (todayNutrition?.meals ?? []).reduce((total, meal) => ({ calories: total.calories + (meal.calories ?? 0), protein: total.protein + (meal.protein ?? 0), carbs: total.carbs + (meal.carbs ?? 0), fat: total.fat + (meal.fat ?? 0) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const saveMood = (name: MoodName, energy: number = mood?.energy ?? 6, note = moodNote) => planner.saveMood(name, energy as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, mood?.factors ?? [], note, mood?.sleep, mood?.concentration);

  function openDayComposer(kind: DayComposerKind, itemId?: string) {
    if (kind === "task" || kind === "priority") {
      const task = snapshot.tasks.find((item) => item.id === itemId);
      setDayComposer({ ...emptyComposer(kind), id: task?.id, title: task?.title ?? "", time: task?.time ?? "", priority: task?.focusPriority ? String(task.focusPriority) as DayComposer["priority"] : "" });
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
      setDayComposer({ ...emptyComposer(kind), id: currentEvent?.id, title: currentEvent?.title ?? "", time: currentEvent?.time ?? "" });
      return;
    }
    const habit = snapshot.habits.find((item) => item.id === itemId);
    setDayComposer({ ...emptyComposer(kind), id: habit?.id, title: habit?.name ?? "" });
  }

  const saveDayItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!dayComposer?.title.trim()) return;
    const focusPriority = dayComposer.priority ? Number(dayComposer.priority) as 1 | 2 | 3 : undefined;
    if ((dayComposer.kind === "task" || dayComposer.kind === "priority") && dayComposer.id) await planner.updateTask(dayComposer.id, { title: dayComposer.title, date: todayKey, time: dayComposer.time, focusPriority: dayComposer.kind === "priority" ? focusPriority : undefined });
    else if (dayComposer.kind === "task" || dayComposer.kind === "priority") await planner.createTaskDetailed({ title: dayComposer.title, date: todayKey, time: dayComposer.time || undefined, priority: "medium", focusPriority: dayComposer.kind === "priority" ? focusPriority : undefined });
    else if (dayComposer.kind === "workout") await planner.saveWorkoutPlan({ date: todayKey, name: dayComposer.title, durationMinutes: Number(dayComposer.duration) || undefined, exercises: todayWorkout?.exercises.map((exercise) => ({ id: exercise.id, name: exercise.name, sets: (exercise.setDetails?.length ? exercise.setDetails : Array.from({ length: exercise.sets }, (_, index) => ({ id: crypto.randomUUID(), setNumber: index + 1, reps: exercise.reps, weight: exercise.weight }))).map((set, index) => ({ id: set.id, setNumber: index + 1, reps: set.reps, weight: set.weight })) })) ?? [] });
    else if (dayComposer.kind === "meal") { const meal = todayNutrition?.meals.find((item) => item.id === dayComposer.id); await planner.saveMeal({ date: todayKey, mealId: meal?.id, name: dayComposer.title, calories: Number(dayComposer.calories) || undefined, protein: meal?.protein, carbs: meal?.carbs, fat: meal?.fat, notes: meal?.notes, completed: meal?.completed ?? true }); }
    else if (dayComposer.kind === "event") { const input = { title: dayComposer.title, startDate: todayKey, time: dayComposer.time || undefined, category: "personal" as const }; if (dayComposer.id) await planner.updateEvent(dayComposer.id, input); else await planner.createEvent(input); }
    else if (dayComposer.id) await planner.updateHabitName(dayComposer.id, dayComposer.title);
    else await planner.createHabit({ name: dayComposer.title, type: "boolean", scheduledDays: [today.getDay()], target: 1, unit: "vez", origin: "experiment" });
    setDayComposer(null);
  };
  const taskItems: TimelineItem[] = todayTasks.map((task) => {
    const goal = snapshot.goals.find((item) => item.id === task.goalId)?.title;
    const project = snapshot.projects.find((item) => item.id === task.projectId)?.name;
    const plan = snapshot.cascadePlans.find((item) => item.id === task.periodPlanId && item.horizon === "monthly");
    const monthlyResult = plan ? `Resultado mensual: ${plan.intention || plan.priority}` : undefined;
    const origin = [goal, project, monthlyResult].filter(Boolean).join(" · ");
    return { id: task.id, type: "tasks", time: task.time, title: task.title, detail: origin || (task.focusPriority ? `Prioridad ${task.focusPriority}` : "Tarea de hoy"), completed: task.status === "completed", action: <div className="timeline-actions"><button type="button" className="timeline-check" onClick={() => planner.toggleTask(task.id)} aria-label={task.status === "completed" ? `Reabrir ${task.title}` : `Completar ${task.title}`}>{task.status === "completed" ? <Check size={16} /> : <Circle size={16} />}</button><button type="button" onClick={() => openDayComposer(task.focusPriority ? "priority" : "task", task.id)} aria-label={`Editar ${task.title}`}><Pencil size={15} /></button></div> };
  });
  const workoutItems: TimelineItem[] = todayWorkout ? [{ id: todayWorkout.id, type: "training", title: todayWorkout.name ?? todayWorkout.goal ?? "Entrenamiento de hoy", detail: `${todayWorkout.exercises.length ? `${todayWorkout.exercises.length} ejercicios` : "Actividad general"}${todayWorkout.durationMinutes ? ` · ${todayWorkout.durationMinutes} min` : ""}`, action: <button type="button" onClick={() => openDayComposer("workout", todayWorkout.id)} aria-label="Editar entrenamiento"><Pencil size={15} /></button> }] : [];
  const mealItems: TimelineItem[] = (todayNutrition?.meals ?? []).map((meal) => ({ id: meal.id, type: "meals", title: meal.name, detail: `${meal.calories ?? 0} kcal`, completed: meal.completed, action: <button type="button" onClick={() => openDayComposer("meal", meal.id)} aria-label={`Editar ${meal.name}`}><Pencil size={15} /></button> }));
  const eventItems: TimelineItem[] = todayEvents.map((event) => ({ id: event.id, type: "events", time: event.time, title: event.title, detail: event.category, action: <button type="button" onClick={() => openDayComposer("event", event.id)} aria-label={`Editar ${event.title}`}><Pencil size={15} /></button> }));
  const timeline = [...taskItems, ...workoutItems, ...mealItems, ...eventItems].sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
  const visibleTimeline = timelineFilter === "all" ? timeline : timeline.filter((item) => item.type === timelineFilter);
  const saveIntention = async () => { await planner.updateDailyIntention(intention); setIntentionEditing(false); };
  const saveClose = async (event: FormEvent) => {
    event.preventDefault();
    if (!advancedToday.trim() && !rememberToday.trim()) return;
    await planner.saveJournal(`¿Qué avancé hoy?\n${advancedToday.trim() || "—"}\n\n¿Qué quiero recordar de hoy?\n${rememberToday.trim() || "—"}`, { title: "Cierre del día", type: "free" });
    setCloseSaved(true);
  };

  return <div className={`page-stack today-command-center ${minimumMode ? "is-minimum" : ""}`}>
    <SectionHeading eyebrow="Un día a la vez, un gran futuro" title={`Buenos días, ${snapshot.profile?.name ?? "Mi mejor versión"} 👋`} description={formatLongDate(today)} action={<span className="today-header-note">Tu potencial inspira <Heart size={15} /></span>} />

    {minimumMode && <Card className="minimum-banner"><HeartPulse size={22} /><div><p className="eyebrow">Modo mínimo</p><h2>Hoy también cuenta en pequeño.</h2><p>Una prioridad y una acción de bienestar pueden ser suficientes.</p></div><Button variant="ghost" onClick={() => setMinimumMode(false)}>Ver mi día completo</Button></Card>}

    <Card className={`today-next-action ${nextAction ? "" : "is-empty"}`}>
      <div><p className="eyebrow">Siguiente acción</p>{nextAction ? <><h2>{nextAction.title}</h2><p>{nextAction.focusPriority ? `Es tu prioridad ${nextAction.focusPriority}.` : "Una acción concreta para avanzar sin abrir más frentes."}</p></> : <><h2>Tu día está despejado</h2><p>Puedes dejarlo así o elegir una acción que te gustaría avanzar.</p></>}</div>
      {nextAction ? <div className="today-next-action__actions"><Button onClick={() => planner.toggleTask(nextAction.id)}><Check size={16} /> Marcar como hecha</Button><Button variant="ghost" onClick={() => openDayComposer(nextAction.focusPriority ? "priority" : "task", nextAction.id)}><Pencil size={15} /> Editar</Button></div> : <div className="today-empty-actions"><Button onClick={() => onQuickCapture({ source: "today", date: todayKey })}>Añadir una tarea</Button><Button variant="secondary" onClick={() => onQuickCapture({ source: "today", date: todayKey, focusPriority: 1 })}>Elegir una prioridad</Button><Button variant="ghost" onClick={onNeedHelp}>Ayúdame a decidir</Button></div>}
    </Card>

    <section className="today-work-grid">
      <h3 className="sr-only">Qué hago ahora</h3>
      <Card className="today-priorities-card"><header><h2>Mis 3 prioridades</h2><button type="button" className="today-text-action" onClick={() => onQuickCapture({ source: "today", date: todayKey, focusPriority: (focusTasks.length + 1 > 3 ? 3 : focusTasks.length + 1) as 1 | 2 | 3 })}><Plus size={15} /> Añadir</button></header>{!focusTasks.length && <p className="today-priority-question">¿Qué 3 cosas harían que hoy valiera la pena?</p>}<div className="today-priority-list">{Array.from({ length: minimumMode ? 1 : 3 }, (_, index) => { const task = focusTasks[index]; const priority = (index + 1) as 1 | 2 | 3; return task ? <div className="today-priority-row" key={task.id}><GripVertical className="priority-grip" size={15} aria-hidden="true" /><button type="button" className="priority-toggle" onClick={() => planner.toggleTask(task.id)} aria-label={task.status === "completed" ? `Reabrir prioridad: ${task.title}` : `Completar prioridad: ${task.title}`}><span>{task.status === "completed" ? <Check size={16} /> : task.focusPriority ?? priority}</span><strong className={task.status === "completed" ? "is-complete" : ""}>{task.title}</strong><Circle size={17} className={task.status === "completed" ? "is-complete" : ""} /></button><button type="button" className="priority-edit" onClick={() => openDayComposer("priority", task.id)} aria-label={`Editar prioridad ${task.title}`}><Pencil size={15} /></button></div> : <button type="button" className="today-priority-slot--empty" key={`priority-${priority}`} onClick={() => onQuickCapture({ source: "today", date: todayKey, focusPriority: priority })} aria-label={`Añadir prioridad ${priority}`}><GripVertical className="priority-grip" size={15} aria-hidden="true" /><span>{priority}</span><strong>Añadir prioridad</strong><Plus size={16} aria-hidden="true" /></button>; })}</div><div className="today-priority-callout"><Lightbulb size={18} /><p>Pequeñas acciones diarias crean grandes cambios a largo plazo.</p></div></Card>

      <Card className="day-timeline-card"><header><h2>Agenda y tareas de hoy</h2><button type="button" className="today-text-action" onClick={() => onQuickCapture({ source: "today", date: todayKey })}><Plus size={15} /> Añadir</button></header><div className="timeline-filters" role="tablist" aria-label="Filtrar Mi día">{([['all','Todo'],['tasks','Tareas'],['training','Entrenamiento'],['meals','Comidas'],['events','Eventos']] as const).map(([id,label]) => <button type="button" role="tab" aria-selected={timelineFilter === id} className={timelineFilter === id ? "is-active" : ""} key={id} onClick={() => setTimelineFilter(id)}>{label}</button>)}</div>{dayComposer && <DayComposerForm draft={dayComposer} onChange={setDayComposer} onSubmit={saveDayItem} onClose={() => setDayComposer(null)} />}{visibleTimeline.length ? <div className="day-timeline-list">{(minimumMode ? visibleTimeline.slice(0, 1) : visibleTimeline).map((item) => <article key={`${item.type}-${item.id}`}><time>{item.time || "Sin hora"}</time><span className={`timeline-kind timeline-kind--${item.type}`}>{item.type === "tasks" ? <Check size={17} /> : item.type === "training" ? <Dumbbell size={17} /> : item.type === "meals" ? <Utensils size={17} /> : <CalendarDays size={17} />}</span><div><strong className={item.completed ? "is-complete" : ""}>{item.title}</strong><small>{item.detail}</small></div>{item.action}</article>)}</div> : <div className="today-timeline-empty"><h3>Tu día está despejado</h3><p>Puedes dejarlo así o elegir una acción que te gustaría avanzar.</p><div className="today-empty-actions"><Button size="sm" onClick={() => onQuickCapture({ source: "today", date: todayKey })}>Añadir una tarea</Button><Button size="sm" variant="secondary" onClick={() => onQuickCapture({ source: "today", date: todayKey, focusPriority: 1 })}>Elegir una prioridad</Button><Button size="sm" variant="ghost" onClick={onNeedHelp}>Ayúdame a decidir</Button></div></div>}<div className="today-timeline-add-menu" aria-label="Añadir a Mi día">{([['task','Tarea'],['priority','Prioridad'],['habit','Hábito'],['workout','Entrenamiento'],['meal','Comida'],['event','Evento']] as const).map(([kind, label]) => <button type="button" key={kind} onClick={() => kind === "task" ? onQuickCapture({ source: "today", date: todayKey }) : kind === "priority" ? onQuickCapture({ source: "today", date: todayKey, focusPriority: 1 }) : openDayComposer(kind)}><Plus size={14} /> {label}</button>)}</div></Card>

      <Card className="today-habits-card"><header><h2>Hábitos de hoy</h2><Link to="/app/habits">Ver todos <ChevronRight size={15} /></Link></header><div className="habit-week-header" aria-hidden="true">{weekDates.map((date) => <span key={toLocalDateKey(date)}>{formatShortDay(date).charAt(0)}</span>)}</div><div>{habits.map((habit) => { const completedDates = new Set(snapshot.habitLogs.filter((log) => log.habitId === habit.id && log.value > 0).map((log) => log.date)); const completed = completedDates.has(todayKey); return <div className="today-habit-row" key={habit.id}><button type="button" onClick={() => planner.toggleHabit(habit.id, todayKey)}><span>{completed ? <Check size={16} /> : <Circle size={16} />}</span><span className="habit-today-copy"><strong>{habit.name}</strong><small>{completed ? "Registrado" : `${habit.target} ${habit.unit}`}</small></span><HabitWeekDots dateKeys={weekDateKeys} completedDates={completedDates} todayKey={todayKey} habitName={habit.name} /></button><button type="button" className="today-habit-edit" onClick={() => openDayComposer("habit", habit.id)} aria-label={`Editar ${habit.name}`}><Pencil size={14} /></button></div>; })}{!habits.length && <div className="today-habits-empty"><p>No tienes hábitos programados hoy.</p><small>Los días libres no reducen tu constancia.</small><button type="button" onClick={() => openDayComposer("habit")}><Plus size={15} /> Crear un hábito</button></div>}</div></Card>
    </section>

    {!minimumMode && overdue.length > 0 && <Card className="overdue-card"><div><p className="eyebrow">Sin culpa</p><h2>Pendientes por decidir</h2><p>Estas tareas quedaron pendientes. Puedes moverlas sin perder el contexto.</p></div>{overdue.slice(0, 4).map((task) => <div className="overdue-row" key={task.id}><strong>{task.title}</strong><Button variant="secondary" onClick={() => planner.rescheduleTask(task.id, todayKey)}>Mover a hoy</Button></div>)}</Card>}

    <Card className={`today-checkin-card ${wellbeingExpanded ? "is-expanded" : ""}`}>
      <button type="button" className="today-checkin-summary" aria-expanded={wellbeingExpanded} onClick={() => setWellbeingExpanded((current) => !current)}><span><HeartPulse size={20} /><span><strong>Intención, ánimo y energía</strong><small>{intention || mood ? `${intention || mood?.mood || "Sin intención"} · ${mood?.mood ?? "Sin ánimo"} · ${mood?.energy ?? "—"}/10` : "Un registro breve y opcional"}</small></span></span><ChevronRight size={18} aria-hidden="true" /></button>
      {wellbeingExpanded && <div className="today-checkin-details">
        <Card className="today-intention-card"><header><h2>Mi intención de hoy ✨</h2><button type="button" className="today-icon-button" onClick={() => setIntentionEditing(true)} aria-label="Editar intención"><Pencil size={17} /></button></header>{intentionEditing ? <div className="today-intention-editor"><textarea value={intention} onChange={(event) => setIntention(event.target.value)} aria-label="Intención del día" rows={3} placeholder="¿Cómo quieres vivir este día?" /><Button variant="secondary" onClick={saveIntention}><Save size={16} /> Guardar</Button></div> : <blockquote className={`today-intention-quote ${intention ? "" : "is-empty"}`}><Quote size={25} /><p>{intention || "¿Cómo quieres vivir este día?"}</p></blockquote>}</Card>
        <Card className="today-wellbeing-card today-wellbeing-card--summary"><header><div><h2>Mi estado hoy</h2><small>Tu bienestar importa</small></div><HeartPulse size={21} /></header><div><span className="today-field-label">Ánimo</span><div className="mood-selector mood-selector--wrap">{moodOptions.map(({ name, label, Icon }) => <button type="button" key={name} aria-label={label} aria-pressed={mood?.mood === name} className={mood?.mood === name ? "mood-option is-selected" : "mood-option"} onClick={() => saveMood(name)}><Icon size={22} strokeWidth={1.5} /><small>{label}</small></button>)}</div></div><fieldset className="today-energy-row"><legend>Energía</legend><div className="energy-segments">{([1,2,3,4,5,6,7,8,9,10] as const).map((level) => <button type="button" key={level} className={(mood?.energy ?? 6) === level ? "is-selected" : ""} aria-pressed={(mood?.energy ?? 6) === level} onClick={() => saveMood(mood?.mood ?? "Calmada", level)}>{level}</button>)}</div><strong>{mood?.energy ?? 6}/10</strong></fieldset><label className="today-mood-note"><span>Nota breve</span><div><input value={moodNote} onChange={(event) => setMoodNote(event.target.value)} onBlur={() => saveMood(mood?.mood ?? "Calmada", mood?.energy ?? 6, moodNote)} placeholder="Puedes escribir una nota breve…" /><Pencil size={15} /></div></label>{(mood?.energy ?? 6) <= 4 && <Button variant="secondary" onClick={() => setMinimumMode(true)}>Activar modo mínimo</Button>}</Card>
      </div>}
    </Card>

    {!minimumMode && <section className="today-closing-grid">
      {(todayNutrition || todayWorkout) && <Card className="today-nutrition-card"><header><h2>Bienestar de hoy</h2><Link to={`/app/health?date=${todayKey}`}>Ver detalle <ChevronRight size={15} /></Link></header>{todayWorkout && <p><Dumbbell size={16} /> {todayWorkout.name ?? todayWorkout.goal ?? "Entrenamiento"}{todayWorkout.durationMinutes ? ` · ${todayWorkout.durationMinutes} min` : ""}</p>}{todayNutrition && <><div className="today-macros"><span><strong>{macros.calories}</strong> kcal</span><span><strong>{macros.protein}g</strong> proteína</span><span><strong>{macros.carbs}g</strong> CH</span><span><strong>{macros.fat}g</strong> grasas</span></div><div className="today-meals">{todayNutrition.meals.map((meal) => <span key={meal.id}>{meal.completed ? <Check size={14} /> : <Circle size={14} />}{meal.name}</span>)}</div></>}<footer><Link className="button button--secondary" to={`/app/health?date=${todayKey}`}>Abrir Bienestar</Link></footer></Card>}

      <Card className="daily-close-card"><header><div><h2>Cierre del día</h2><p>Cuando termines…</p></div><Sparkles size={22} /></header><form onSubmit={saveClose}><label><span>¿Qué avancé hoy?</span><textarea rows={3} value={advancedToday} onChange={(event) => { setAdvancedToday(event.target.value); setCloseSaved(false); }} placeholder="Escribe aquí…" /></label><label><span>¿Qué quiero recordar de hoy?</span><textarea rows={3} value={rememberToday} onChange={(event) => { setRememberToday(event.target.value); setCloseSaved(false); }} placeholder="Escribe aquí…" /></label><Button type="submit"><Save size={16} /> Guardar mi cierre del día</Button>{closeSaved && <small role="status">Tu cierre quedó guardado en Mi diario.</small>}</form></Card>

      <Card className={`weekly-review-prompt ${completedWeeklyReview ? "is-complete" : ""}`}><h2>Revisión semanal</h2><div className="weekly-review-copy"><CalendarDays size={28} /><div><h3>{completedWeeklyReview ? "Revisión semanal completada" : "Tu revisión semanal está pendiente."}</h3><p>{completedWeeklyReview ? "Puedes volver a leer lo que aprendiste y las decisiones que elegiste." : "Dedica 30 minutos para reflexionar, evaluar y planificar tu próxima semana."}</p></div></div><Link className="button button--secondary" to="/app/planning/weekly?reset=1">{completedWeeklyReview ? "Ver revisión" : "Iniciar revisión"}</Link></Card>
    </section>}

    <Card className="today-quote"><Quote size={20} /><p>Tu vida que sueñas se construye con las decisiones que tomas hoy.</p><small>My Best Version <Sparkles size={14} /></small></Card>
  </div>;
}

function DayComposerForm({ draft, onChange, onSubmit, onClose }: { draft: DayComposer; onChange: (draft: DayComposer) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  const labels: Record<DayComposerKind, string> = { task: "tarea", priority: "prioridad", habit: "hábito", workout: "entrenamiento", meal: "comida", event: "evento" };
  return <form className="day-inline-composer" onSubmit={onSubmit}><header><strong>{draft.id ? "Editar" : "Añadir"} {labels[draft.kind]}</strong><button type="button" onClick={onClose} aria-label="Cerrar formulario"><X size={15} /></button></header><label><span>Nombre</span><input required minLength={2} value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder={`Nombre de ${labels[draft.kind]}`} /></label>{(["task", "priority", "event"] as DayComposerKind[]).includes(draft.kind) && <label><span>Hora opcional</span><input type="time" value={draft.time} onChange={(event) => onChange({ ...draft, time: event.target.value })} /></label>}{draft.kind === "priority" && <label><span>Posición</span><select required value={draft.priority} onChange={(event) => onChange({ ...draft, priority: event.target.value as DayComposer["priority"] })}><option value="">Elige una</option><option value="1">Prioridad 1</option><option value="2">Prioridad 2</option><option value="3">Prioridad 3</option></select></label>}{draft.kind === "workout" && <label><span>Duración en minutos</span><input type="number" min="1" value={draft.duration} onChange={(event) => onChange({ ...draft, duration: event.target.value })} /></label>}{draft.kind === "meal" && <label><span>Calorías opcionales</span><input type="number" min="0" value={draft.calories} onChange={(event) => onChange({ ...draft, calories: event.target.value })} /></label>}<Button type="submit" size="sm"><Save size={15} /> Guardar en Mi día</Button></form>;
}

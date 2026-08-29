"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, ChevronRight, Circle, Clock3, Dumbbell, Heart, HeartPulse, Lightbulb, Pencil, Plus, Quote, Save, Sparkles, Utensils } from "lucide-react";
import type { MoodName } from "@/src/domain/planner";
import { isHabitScheduledOn, isTaskOverdue } from "@/src/domain/rules";
import { getDailyTopThree } from "@/src/domain/guidanceRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatLongDate, formatShortDay, getReviewPeriodKey, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";
import { analyticsService } from "@/src/services/analyticsService";
import { HabitWeekDots, TodayProgressRing } from "./TodayVisuals";

const moodOptions: { name: MoodName; symbol: string }[] = [
  { name: "Cansada", symbol: "☹" }, { name: "Calmada", symbol: "🙂" },
  { name: "Enfocada", symbol: "😊" }, { name: "Alegre", symbol: "😄" },
];

type TimelineFilter = "all" | "tasks" | "training" | "meals" | "events";
type TimelineItem = { id: string; type: Exclude<TimelineFilter, "all">; time?: string; title: string; detail: string; completed?: boolean; action: ReactNode };

export function TodayPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  useEffect(() => { analyticsService.track("today_view_opened", { route: "/app/today" }, `today:${todayKey}`); }, [todayKey]);
  const savedIntention = snapshot.journalEntries.find((entry) => entry.date === todayKey && entry.title === "Intención del día")?.text ?? snapshot.profile?.dailyIntention ?? "";
  const [intention, setIntention] = useState(savedIntention);
  const [intentionEditing, setIntentionEditing] = useState(!savedIntention);
  const [newTask, setNewTask] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"" | "1" | "2" | "3">("");
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [minimumMode, setMinimumMode] = useState(false);
  const [moodNote, setMoodNote] = useState(snapshot.moodLogs.find((log) => log.date === todayKey)?.note ?? "");
  const [advancedToday, setAdvancedToday] = useState("");
  const [rememberToday, setRememberToday] = useState("");
  const [closeSaved, setCloseSaved] = useState(false);
  const todayTasks = snapshot.tasks.filter((task) => task.date === todayKey && task.status !== "cancelled");
  const focusTasks = getDailyTopThree(snapshot.tasks, todayKey);
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
  const completedTasks = todayTasks.filter((task) => task.status === "completed").length;
  const taskProgress = todayTasks.length ? Math.round(completedTasks / todayTasks.length * 100) : 0;
  const macros = (todayNutrition?.meals ?? []).reduce((total, meal) => ({ calories: total.calories + (meal.calories ?? 0), protein: total.protein + (meal.protein ?? 0), carbs: total.carbs + (meal.carbs ?? 0), fat: total.fat + (meal.fat ?? 0) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const taskItems: TimelineItem[] = todayTasks.map((task) => ({ id: task.id, type: "tasks", time: task.time, title: task.title, detail: task.focusPriority ? `Prioridad ${task.focusPriority}` : "Tarea de hoy", completed: task.status === "completed", action: <button type="button" className="timeline-check" onClick={() => planner.toggleTask(task.id)} aria-label={task.status === "completed" ? `Reabrir ${task.title}` : `Completar ${task.title}`}>{task.status === "completed" ? <Check size={16} /> : <Circle size={16} />}</button> }));
  const workoutItems: TimelineItem[] = todayWorkout ? [{ id: todayWorkout.id, type: "training", title: todayWorkout.name ?? todayWorkout.goal ?? "Entrenamiento de hoy", detail: `${todayWorkout.exercises.length} ejercicios${todayWorkout.durationMinutes ? ` · ${todayWorkout.durationMinutes} min` : ""}`, action: <Link to={`/app/life-hub/fitness?section=training&date=${todayKey}`}>Abrir</Link> }] : [];
  const mealItems: TimelineItem[] = (todayNutrition?.meals ?? []).map((meal) => ({ id: meal.id, type: "meals", title: meal.name, detail: `${meal.calories ?? 0} kcal`, completed: meal.completed, action: <Link to={`/app/life-hub/fitness?date=${todayKey}`}>Ver</Link> }));
  const eventItems: TimelineItem[] = todayEvents.map((event) => ({ id: event.id, type: "events", time: event.time, title: event.title, detail: event.category, action: <Link to="/app/life-hub?tab=events">Ver</Link> }));
  const timeline = [...taskItems, ...workoutItems, ...mealItems, ...eventItems].sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
  const visibleTimeline = timelineFilter === "all" ? timeline : timeline.filter((item) => item.type === timelineFilter);

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!newTask.trim()) return;
    const priority = newTaskPriority ? Number(newTaskPriority) as 1 | 2 | 3 : undefined;
    const occupied = priority && focusTasks.find((task) => task.focusPriority === priority && task.status !== "completed");
    if (occupied && !window.confirm(`Ya tienes una prioridad ${priority}: “${occupied.title}”. ¿Quieres reemplazarla?`)) return;
    await planner.createTask(newTask, todayKey, priority);
    setNewTask(""); setNewTaskPriority(""); setShowTaskComposer(false);
  };
  const saveMood = (name: MoodName, energy: number = mood?.energy ?? 3, note = moodNote) => planner.saveMood(name, energy as 1 | 2 | 3 | 4 | 5, mood?.factors ?? [], note, mood?.sleep, mood?.concentration);
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

    <section className="today-summary-grid">
      <Card className="today-intention-card"><header><div><p className="eyebrow">Mi intención de hoy ✨</p><h2>Vuelve a lo esencial</h2></div><button type="button" className="today-icon-button" onClick={() => setIntentionEditing(true)} aria-label="Editar intención"><Pencil size={17} /></button></header>{intentionEditing ? <div className="today-intention-editor"><textarea value={intention} onChange={(event) => setIntention(event.target.value)} aria-label="Intención del día" rows={4} placeholder="¿Cómo quieres vivir este día?" /><Button variant="secondary" onClick={saveIntention}><Save size={16} /> Guardar</Button></div> : <blockquote className="today-intention-quote"><Quote size={25} /><p>{intention || "¿Cómo quieres vivir este día?"}</p></blockquote>}<button type="button" className="today-heart-action" onClick={() => setIntentionEditing(true)}><Heart size={18} /> {intention ? "Guárdala en mi corazón" : "Definir mi intención"}</button></Card>

      <Card className="today-wellbeing-card today-wellbeing-card--summary"><header><div><p className="eyebrow">Mi estado hoy</p><h2>Ánimo y energía</h2></div><HeartPulse size={21} /></header><div><span className="today-field-label">Ánimo</span><div className="mood-selector mood-selector--wrap">{moodOptions.map((option) => <button key={option.name} aria-label={option.name} aria-pressed={mood?.mood === option.name} className={mood?.mood === option.name ? "mood-option is-selected" : "mood-option"} onClick={() => saveMood(option.name)}><span>{option.symbol}</span><small>{option.name}</small></button>)}</div></div><label className="today-energy-row"><span>Energía</span><input type="range" min="1" max="5" step="1" value={mood?.energy ?? 3} onChange={(event) => saveMood(mood?.mood ?? "Calmada", Number(event.target.value))} aria-label="Nivel de energía" /><strong>{(mood?.energy ?? 3) * 2}/10</strong></label><label className="today-mood-note"><span>¿Cómo te sientes?</span><div><input value={moodNote} onChange={(event) => setMoodNote(event.target.value)} onBlur={() => saveMood(mood?.mood ?? "Calmada", mood?.energy ?? 3, moodNote)} placeholder="Puedes escribir una nota breve…" /><Pencil size={15} /></div></label>{(mood?.energy ?? 3) <= 2 && <Button variant="secondary" onClick={() => setMinimumMode(true)}>Activar modo mínimo</Button>}</Card>

      <Card className="today-progress-card"><p className="eyebrow">Progreso del día</p><div className="today-progress-visual"><TodayProgressRing value={taskProgress} /><div><strong>{completedTasks} de {todayTasks.length}</strong><p>{taskProgress >= 75 ? "Tu día va muy bien. ¡Sigue así!" : taskProgress > 0 ? "Tu día va tomando forma." : "Empieza por lo que más te importa."}</p><Heart size={19} /></div></div><small>Cuenta únicamente las tareas de hoy; no mide tu valor ni tu esfuerzo.</small></Card>
    </section>

    <section className="today-work-grid">
      <Card className="today-priorities-card"><header><div><p className="eyebrow">Mis 3 prioridades</p><h2>Lo que sí importa hoy</h2></div><button type="button" className="today-text-action" onClick={() => setShowTaskComposer(true)}><Plus size={15} /> Añadir</button></header><div className="today-priority-list">{(minimumMode ? focusTasks.slice(0, 1) : focusTasks).map((task) => <button key={task.id} onClick={() => planner.toggleTask(task.id)}><span>{task.status === "completed" ? <Check size={16} /> : task.focusPriority}</span><strong className={task.status === "completed" ? "is-complete" : ""}>{task.title}</strong><Circle size={17} className={task.status === "completed" ? "is-complete" : ""} /></button>)}{!focusTasks.length && <div className="today-empty-prompt"><p>¿Qué 3 cosas harían que hoy valiera la pena?</p><button type="button" onClick={() => setShowTaskComposer(true)}>Definir prioridades</button></div>}</div>{showTaskComposer && <form className="today-priority-add" onSubmit={addTask}><input aria-label="Nueva prioridad o tarea" value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="Añadir una acción para hoy" /><select aria-label="Lugar entre las prioridades" value={newTaskPriority} onChange={(event) => setNewTaskPriority(event.target.value as typeof newTaskPriority)}><option value="">Sin prioridad</option><option value="1">Prioridad 1</option><option value="2">Prioridad 2</option><option value="3">Prioridad 3</option></select><Button type="submit" variant="secondary"><Plus size={16} /> Añadir</Button></form>}<div className="today-priority-callout"><Lightbulb size={18} /><p>Pequeñas acciones diarias crean grandes cambios a largo plazo.</p></div></Card>

      <Card className="day-timeline-card"><header><div><p className="eyebrow">Mi día</p><h2>Qué hago ahora</h2></div><Clock3 size={21} /></header><div className="timeline-filters" role="tablist" aria-label="Filtrar mi día">{([['all','Todo'],['tasks','Tareas'],['training','Entrenamiento'],['meals','Comidas'],['events','Eventos']] as const).map(([id,label]) => <button type="button" role="tab" aria-selected={timelineFilter === id} className={timelineFilter === id ? "is-active" : ""} key={id} onClick={() => setTimelineFilter(id)}>{label}</button>)}</div>{visibleTimeline.length ? <div className="day-timeline-list">{(minimumMode ? visibleTimeline.slice(0, 1) : visibleTimeline).map((item) => <article key={`${item.type}-${item.id}`}><time>{item.time || "Sin hora"}</time><span className={`timeline-kind timeline-kind--${item.type}`}>{item.type === "tasks" ? <Check size={17} /> : item.type === "training" ? <Dumbbell size={17} /> : item.type === "meals" ? <Utensils size={17} /> : <CalendarDays size={17} />}</span><div><strong className={item.completed ? "is-complete" : ""}>{item.title}</strong><small>{item.detail}</small></div>{item.action}</article>)}</div> : <EmptyState title="Tu día está despejado" text="Puedes conservar este espacio o añadir algo si lo necesitas." />}<Link className="today-timeline-add" to="/app/tasks"><Plus size={15} /> Añadir tarea o evento</Link></Card>

      <Card className="today-habits-card"><header><div><p className="eyebrow">Hábitos de hoy</p><h2>Constancia amable</h2></div><Link to="/app/habits">Ver todos <ChevronRight size={15} /></Link></header><div className="habit-week-header" aria-hidden="true">{weekDates.map((date) => <span key={toLocalDateKey(date)}>{formatShortDay(date).charAt(0)}</span>)}</div><div>{habits.map((habit) => { const completedDates = new Set(snapshot.habitLogs.filter((log) => log.habitId === habit.id && log.value > 0).map((log) => log.date)); const completed = completedDates.has(todayKey); return <button key={habit.id} onClick={() => planner.toggleHabit(habit.id, todayKey)}><span>{completed ? <Check size={16} /> : <Circle size={16} />}</span><span className="habit-today-copy"><strong>{habit.name}</strong><small>{completed ? "Registrado" : `${habit.target} ${habit.unit}`}</small></span><HabitWeekDots dateKeys={weekDateKeys} completedDates={completedDates} todayKey={todayKey} habitName={habit.name} /></button>; })}{!habits.length && <p className="support-copy">No tienes hábitos programados hoy. Los días libres no reducen tu constancia.</p>}</div></Card>
    </section>

    {!minimumMode && <section className="today-closing-grid">
      <Card className="today-nutrition-card"><header><div><p className="eyebrow">Nutrición de hoy</p><h2>Registro del día</h2></div><Link to={`/app/life-hub/fitness?date=${todayKey}`}>Ver detalle <ChevronRight size={15} /></Link></header><div className="today-macros"><span><strong>{macros.calories}</strong> kcal</span><span><strong>{macros.protein}g</strong> proteína</span><span><strong>{macros.carbs}g</strong> CH</span><span><strong>{macros.fat}g</strong> grasas</span></div><div className="today-meals">{(todayNutrition?.meals ?? []).map((meal) => <span key={meal.id}>{meal.completed ? <Check size={14} /> : <Circle size={14} />}{meal.name}</span>)}{!todayNutrition?.meals.length && <p className="support-copy">Aún no has registrado comidas.</p>}</div><footer><Link className="button button--primary" to={`/app/life-hub/fitness?date=${todayKey}`}><Plus size={16} /> Agregar comida</Link></footer></Card>

      <Card className="daily-close-card"><header><div><p className="eyebrow">Cuando termines</p><h2>Cierre del día</h2></div><Sparkles size={22} /></header><form onSubmit={saveClose}><label><span>¿Qué avancé hoy?</span><textarea rows={3} value={advancedToday} onChange={(event) => { setAdvancedToday(event.target.value); setCloseSaved(false); }} placeholder="Escribe aquí…" /></label><label><span>¿Qué quiero recordar de hoy?</span><textarea rows={3} value={rememberToday} onChange={(event) => { setRememberToday(event.target.value); setCloseSaved(false); }} placeholder="Escribe aquí…" /></label><Button type="submit"><Save size={16} /> Guardar mi cierre del día</Button>{closeSaved && <small role="status">Tu cierre quedó guardado en Mi diario.</small>}</form></Card>

      <Card className={`weekly-review-prompt ${completedWeeklyReview ? "is-complete" : ""}`}><CalendarDays size={28} /><div><p className="eyebrow">Revisión semanal</p><h2>{completedWeeklyReview ? "Revisión semanal completada" : "Tu revisión semanal está pendiente."}</h2><p>{completedWeeklyReview ? "Puedes volver a leer lo que aprendiste y las decisiones que elegiste." : "Dedica 30 minutos para reflexionar, evaluar y planificar tu próxima semana."}</p></div><Link className="button button--secondary" to="/app/planning/weekly?reset=1">{completedWeeklyReview ? "Ver revisión" : "Iniciar revisión"}</Link></Card>
    </section>}

    {!minimumMode && overdue.length > 0 && <Card className="overdue-card"><div><p className="eyebrow">Sin culpa</p><h2>Pendientes por decidir</h2><p>Estas tareas quedaron pendientes. Puedes moverlas sin perder el contexto.</p></div>{overdue.slice(0, 4).map((task) => <div className="overdue-row" key={task.id}><strong>{task.title}</strong><Button variant="secondary" onClick={() => planner.rescheduleTask(task.id, todayKey)}>Mover a hoy</Button></div>)}</Card>}

    <Card className="today-quote"><Quote size={20} /><p>Tu vida que sueñas se construye con las decisiones que tomas hoy.</p><small>My Best Version <Sparkles size={14} /></small></Card>
  </div>;
}

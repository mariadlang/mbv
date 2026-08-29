"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, ChevronRight, Circle, Clock3, Dumbbell, HeartPulse, Plus, Save, Sparkles, SunMedium, Utensils } from "lucide-react";
import type { MoodName } from "@/src/domain/planner";
import { isHabitScheduledOn, isTaskOverdue } from "@/src/domain/rules";
import { getDailyTopThree } from "@/src/domain/guidanceRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatLongDate, toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";
import { analyticsService } from "@/src/services/analyticsService";

const moodOptions: { name: MoodName; symbol: string }[] = [
  { name: "Calmada", symbol: "◡" }, { name: "Enfocada", symbol: "◎" },
  { name: "Alegre", symbol: "✦" }, { name: "Cansada", symbol: "◔" },
  { name: "Abrumada", symbol: "≈" },
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
  const [newTask, setNewTask] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"" | "1" | "2" | "3">("");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [minimumMode, setMinimumMode] = useState(false);
  const [advancedToday, setAdvancedToday] = useState("");
  const [rememberToday, setRememberToday] = useState("");
  const [closeSaved, setCloseSaved] = useState(false);
  const todayTasks = snapshot.tasks.filter((task) => task.date === todayKey && task.status !== "cancelled");
  const focusTasks = getDailyTopThree(snapshot.tasks, todayKey);
  const overdue = snapshot.tasks.filter((task) => isTaskOverdue(task, todayKey));
  const habits = snapshot.habits.filter((habit) => habit.status === "active" && isHabitScheduledOn(habit, today));
  const mood = snapshot.moodLogs.find((log) => log.date === todayKey);
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
    setNewTask(""); setNewTaskPriority("");
  };
  const saveMood = (name: MoodName, energy: number = mood?.energy ?? 3) => planner.saveMood(name, energy as 1 | 2 | 3 | 4 | 5);
  const saveClose = async (event: FormEvent) => {
    event.preventDefault();
    if (!advancedToday.trim() && !rememberToday.trim()) return;
    await planner.saveJournal(`¿Qué avancé hoy?\n${advancedToday.trim() || "—"}\n\n¿Qué quiero recordar de hoy?\n${rememberToday.trim() || "—"}`, { title: "Cierre del día", type: "free" });
    setCloseSaved(true);
  };

  return <div className={`page-stack today-command-center ${minimumMode ? "is-minimum" : ""}`}>
    <SectionHeading eyebrow={formatLongDate(today)} title={`Buenos días, ${snapshot.profile?.name ?? "María"} 👋`} description="Un día con propósito: elige lo esencial y deja margen para vivirlo." action={<Badge tone="sage"><SunMedium size={15} /> Hoy</Badge>} />

    {minimumMode && <Card className="minimum-banner"><HeartPulse size={22} /><div><p className="eyebrow">Modo mínimo</p><h2>Hoy también cuenta en pequeño.</h2><p>Una prioridad y una acción de bienestar pueden ser suficientes.</p></div><Button variant="ghost" onClick={() => setMinimumMode(false)}>Ver mi día completo</Button></Card>}

    <section className="today-summary-grid">
      <Card className="today-priorities-card"><header><div><p className="eyebrow">Mis 3 prioridades</p><h2>Lo que sí importa hoy</h2></div><Badge tone="rose">Máximo 3</Badge></header><div className="today-priority-list">{(minimumMode ? focusTasks.slice(0, 1) : focusTasks).map((task) => <button key={task.id} onClick={() => planner.toggleTask(task.id)}><span>{task.status === "completed" ? <Check size={16} /> : task.focusPriority}</span><strong className={task.status === "completed" ? "is-complete" : ""}>{task.title}</strong></button>)}{!focusTasks.length && <p className="support-copy">Elige hasta tres tareas; no hace falta llenar todos los lugares.</p>}</div><form className="today-priority-add" onSubmit={addTask}><input aria-label="Nueva prioridad o tarea" value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="Añadir una acción para hoy" /><select aria-label="Lugar entre las prioridades" value={newTaskPriority} onChange={(event) => setNewTaskPriority(event.target.value as typeof newTaskPriority)}><option value="">Sin prioridad</option><option value="1">Prioridad 1</option><option value="2">Prioridad 2</option><option value="3">Prioridad 3</option></select><Button type="submit" variant="secondary"><Plus size={16} /> Añadir</Button></form></Card>

      <Card className="today-intention-card"><div><p className="eyebrow">Mi intención de hoy</p><h2>Una frase para volver a lo esencial</h2><textarea value={intention} onChange={(event) => setIntention(event.target.value)} aria-label="Intención del día" rows={3} placeholder="Actuar con calma y claridad…" /></div><Button variant="secondary" onClick={() => planner.updateDailyIntention(intention)}><Save size={16} /> Guardar</Button></Card>

      <Card className="today-progress-card"><p className="eyebrow">Progreso del día</p><strong>{taskProgress}%</strong><ProgressBar value={taskProgress} label="Tareas completadas hoy" /><p>{completedTasks} de {todayTasks.length} tareas completadas</p><small>Este porcentaje cuenta tareas de hoy; no mide tu valor ni tu esfuerzo.</small></Card>
    </section>

    <Card className="day-timeline-card"><header><div><p className="eyebrow">Mi día</p><h2>Qué hago ahora</h2></div><Clock3 size={21} /></header><div className="timeline-filters" role="tablist" aria-label="Filtrar mi día">{([['all','Todo'],['tasks','Tareas'],['training','Entrenamiento'],['meals','Comidas'],['events','Eventos']] as const).map(([id,label]) => <button type="button" role="tab" aria-selected={timelineFilter === id} className={timelineFilter === id ? "is-active" : ""} key={id} onClick={() => setTimelineFilter(id)}>{label}</button>)}</div>
      {visibleTimeline.length ? <div className="day-timeline-list">{(minimumMode ? visibleTimeline.slice(0, 1) : visibleTimeline).map((item) => <article key={`${item.type}-${item.id}`}><time>{item.time || "Sin hora"}</time><span className={`timeline-kind timeline-kind--${item.type}`}>{item.type === "tasks" ? <Check size={17} /> : item.type === "training" ? <Dumbbell size={17} /> : item.type === "meals" ? <Utensils size={17} /> : <CalendarDays size={17} />}</span><div><strong className={item.completed ? "is-complete" : ""}>{item.title}</strong><small>{item.detail}</small></div>{item.action}</article>)}</div> : <EmptyState title="No hay elementos en esta vista" text="Puedes dejar este espacio libre o añadir algo solo si lo necesitas." />}
    </Card>

    {!minimumMode && <section className="today-detail-grid">
      <Card className="today-habits-card"><header><div><p className="eyebrow">Hábitos de hoy</p><h2>Estado del día</h2></div><Link to="/app/habits">Ver todos <ChevronRight size={15} /></Link></header><div>{habits.map((habit) => { const completed = snapshot.habitLogs.some((log) => log.habitId === habit.id && log.date === todayKey && log.value > 0); return <button key={habit.id} onClick={() => planner.toggleHabit(habit.id, todayKey)}><span>{completed ? <Check size={16} /> : <Circle size={16} />}</span><strong>{habit.name}</strong><small>{completed ? "Registrado" : `${habit.target} ${habit.unit}`}</small></button>; })}{!habits.length && <p className="support-copy">No tienes hábitos programados hoy.</p>}</div></Card>

      <Card className="today-nutrition-card"><header><div><p className="eyebrow">Nutrición de hoy</p><h2>{macros.calories} kcal</h2></div><Utensils size={21} /></header><div className="today-macros"><span><strong>{macros.protein}g</strong> proteína</span><span><strong>{macros.carbs}g</strong> CH</span><span><strong>{macros.fat}g</strong> grasas</span></div><div className="today-meals">{(todayNutrition?.meals ?? []).map((meal) => <span key={meal.id}>{meal.completed ? <Check size={14} /> : <Circle size={14} />}{meal.name}</span>)}{!todayNutrition?.meals.length && <p className="support-copy">Aún no has registrado comidas.</p>}</div><footer><Link className="button button--primary" to={`/app/life-hub/fitness?date=${todayKey}`}><Plus size={16} /> Agregar comida</Link><Link className="button button--text" to={`/app/life-hub/fitness?date=${todayKey}`}>Ver detalle</Link></footer></Card>

      <Card className="today-wellbeing-card"><header><div><p className="eyebrow">Cómo estoy hoy</p><h2>Un registro breve</h2></div><HeartPulse size={21} /></header><div className="mood-selector mood-selector--wrap">{moodOptions.map((option) => <button key={option.name} aria-pressed={mood?.mood === option.name} className={mood?.mood === option.name ? "mood-option is-selected" : "mood-option"} onClick={() => saveMood(option.name)}><span>{option.symbol}</span><small>{option.name}</small></button>)}</div><label className="energy-quick"><span>Energía</span><select value={mood?.energy ?? 3} onChange={(event) => saveMood(mood?.mood ?? "Calmada", Number(event.target.value))} aria-label="Nivel de energía"><option value="1">1 · Muy baja</option><option value="2">2 · Baja</option><option value="3">3 · Media</option><option value="4">4 · Buena</option><option value="5">5 · Alta</option></select></label>{(mood?.energy ?? 3) <= 2 && <Button variant="secondary" onClick={() => setMinimumMode(true)}>Activar modo mínimo</Button>}<Link className="button button--text" to="/app/habits?checkin=1">Añadir sueño, concentración o nota</Link></Card>
    </section>}

    {!minimumMode && overdue.length > 0 && <Card className="overdue-card"><div><p className="eyebrow">Sin culpa</p><h2>Pendientes por decidir</h2><p>Estas tareas quedaron pendientes. Puedes moverlas sin perder el contexto.</p></div>{overdue.slice(0, 4).map((task) => <div className="overdue-row" key={task.id}><strong>{task.title}</strong><Button variant="secondary" onClick={() => planner.rescheduleTask(task.id, todayKey)}>Mover a hoy</Button></div>)}</Card>}

    <Card className="daily-close-card"><header><div><p className="eyebrow">Reflexión breve</p><h2>Cierre del día</h2><p>Guarda lo que quieres llevar contigo.</p></div><Sparkles size={22} /></header><form onSubmit={saveClose}><label><span>¿Qué avancé hoy?</span><textarea rows={3} value={advancedToday} onChange={(event) => { setAdvancedToday(event.target.value); setCloseSaved(false); }} /></label><label><span>¿Qué quiero recordar de hoy?</span><textarea rows={3} value={rememberToday} onChange={(event) => { setRememberToday(event.target.value); setCloseSaved(false); }} /></label><Button type="submit"><Save size={16} /> Guardar mi cierre del día</Button>{closeSaved && <small role="status">Tu cierre quedó guardado en Mi diario.</small>}</form></Card>

    {(today.getDay() === 0 || today.getDay() === 6) && <Card className="weekly-review-prompt"><CalendarDays size={22} /><div><p className="eyebrow">Revisión semanal</p><h2>Tu semana está lista para ser observada.</h2><p>Revisa con calma qué funcionó y qué quieres ajustar.</p></div><Link className="button button--secondary" to="/app/planning/weekly?reset=1">Iniciar revisión</Link></Card>}
  </div>;
}

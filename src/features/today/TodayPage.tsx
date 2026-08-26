"use client";

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Circle, Clock3, Dumbbell, HeartPulse, Plus, Save, Sparkles, SunMedium, Utensils } from "lucide-react";
import type { MoodName, Task } from "@/src/domain/planner";
import { isHabitScheduledOn, isTaskOverdue } from "@/src/domain/rules";
import { getDailyTopThree, getNextStep } from "@/src/domain/guidanceRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatLongDate, toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";

const moodOptions: { name: MoodName; symbol: string }[] = [
  { name: "Calmada", symbol: "◡" }, { name: "Enfocada", symbol: "◎" },
  { name: "Alegre", symbol: "✦" }, { name: "Cansada", symbol: "◔" },
  { name: "Abrumada", symbol: "≈" },
];

export function TodayPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const savedIntention = snapshot.journalEntries.find((entry) => entry.date === todayKey && entry.title === "Intención del día")?.text ?? "";
  const [intention, setIntention] = useState(savedIntention);
  const [newTask, setNewTask] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"" | "1" | "2" | "3">("");
  const [minimumMode, setMinimumMode] = useState(false);
  const todayTasks = snapshot.tasks.filter((task) => task.date === todayKey && task.status !== "cancelled");
  const focusTasks = getDailyTopThree(snapshot.tasks, todayKey);
  const agendaTasks = todayTasks.filter((task) => task.time && task.status !== "completed").sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const otherTasks = todayTasks.filter((task) => !task.time && task.focusPriority === undefined && task.status !== "completed");
  const visibleOtherTasks = minimumMode ? otherTasks.slice(0, 1) : otherTasks;
  const overdue = snapshot.tasks.filter((task) => isTaskOverdue(task, todayKey));
  const habits = snapshot.habits.filter((habit) => habit.status === "active" && isHabitScheduledOn(habit, today));
  const mood = snapshot.moodLogs.find((log) => log.date === todayKey);
  const nextStep = getNextStep(snapshot, todayKey);
  const todayWorkout = snapshot.workoutLogs.find((item) => item.date === todayKey);
  const todayNutrition = snapshot.nutritionLogs.find((item) => item.date === todayKey);
  const todayCalories = (todayNutrition?.meals ?? []).reduce((total, meal) => total + (meal.calories ?? 0), 0);

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

  return <div className={`page-stack today-page ${minimumMode ? "is-minimum" : ""}`}>
    <SectionHeading eyebrow={formatLongDate(today)} title="Hoy" description="Una vista tranquila para decidir, actuar y ajustar sin repensar todo el día." action={<Badge tone="sage"><SunMedium size={15} /> Día abierto</Badge>} />

    <Card className="today-state-card">
      <div><p className="eyebrow">Mi estado</p><h2>¿Cómo me siento hoy?</h2></div>
      <div className="mood-selector mood-selector--wrap">{moodOptions.map((option) => <button key={option.name} aria-pressed={mood?.mood === option.name} className={mood?.mood === option.name ? "mood-option is-selected" : "mood-option"} onClick={() => saveMood(option.name)}><span>{option.symbol}</span><small>{option.name}</small></button>)}</div>
      <label className="energy-quick"><span>Energía</span><select value={mood?.energy ?? 3} onChange={(event) => saveMood(mood?.mood ?? "Calmada", Number(event.target.value))} aria-label="Nivel de energía"><option value="1">1 · Muy baja</option><option value="2">2 · Baja</option><option value="3">3 · Media</option><option value="4">4 · Buena</option><option value="5">5 · Alta</option></select></label>
      {(mood?.energy ?? 3) <= 2 && <Button variant="secondary" onClick={() => setMinimumMode(true)}>Activar modo mínimo</Button>}
    </Card>

    {minimumMode && <Card className="minimum-banner"><HeartPulse size={22} /><div><p className="eyebrow">Modo mínimo</p><h2>Hoy también cuenta en pequeño.</h2><p>Verás una prioridad, una acción de bienestar y una tarea breve. Nada fue borrado.</p></div><Button variant="ghost" onClick={() => setMinimumMode(false)}>Ver mi día completo</Button></Card>}

    <Card className="today-intention-card"><div><p className="eyebrow">Mi intención</p><h2>¿Qué quiero recordar hoy?</h2><textarea value={intention} onChange={(event) => setIntention(event.target.value)} aria-label="Intención del día" rows={2} placeholder="Una frase breve para volver a lo esencial…" /></div><Button variant="secondary" onClick={() => planner.updateDailyIntention(intention)}><Save size={17} /> Guardar</Button></Card>

    <div className="today-layout"><div className="today-layout__main page-stack">
      <Card><div className="card-heading"><div><p className="eyebrow">Top 3</p><h2>Lo importante</h2></div><Badge tone="rose">1 · 2 · 3</Badge></div><div className="focus-task-list">{(minimumMode ? focusTasks.slice(0, 1) : focusTasks).map((task) => <button key={task.id} className="focus-task" onClick={() => planner.toggleTask(task.id)}><span className={`focus-task__number ${task.status === "completed" ? "is-done" : ""}`}>{task.status === "completed" ? <Check size={17} /> : task.focusPriority}</span><span><strong className={task.status === "completed" ? "is-complete" : ""}>{task.title}</strong><small>{task.time ? `${task.time}` : "Sin hora"}</small></span><ChevronRight size={18} /></button>)}{!focusTasks.length && <EmptyState title="Elige hasta tres prioridades" text="Una tarea normal no entrará aquí hasta que tú le asignes un lugar." />}</div></Card>

      {!minimumMode && <Card><div className="card-heading"><div><p className="eyebrow">Agenda</p><h2>Con hora</h2></div><Clock3 size={20} /></div><TaskRows tasks={agendaTasks} planner={planner} empty="Lo agendado desde Semana aparecerá aquí automáticamente." /></Card>}

      <Card><div className="card-heading"><div><p className="eyebrow">Otras tareas</p><h2>{minimumMode ? "Una cosa pequeña" : "Pendientes de hoy"}</h2></div><span className="metric-serif metric-serif--small">{todayTasks.filter((task) => task.status === "completed").length}/{todayTasks.length}</span></div><form className="quick-add" onSubmit={addTask}><Plus size={18} aria-hidden="true" /><input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="Añadir una tarea para hoy" aria-label="Nueva tarea" /><select value={newTaskPriority} onChange={(event) => setNewTaskPriority(event.target.value as typeof newTaskPriority)} aria-label="Prioridad del día"><option value="">No prioritario</option><option value="1">Prioridad 1</option><option value="2">Prioridad 2</option><option value="3">Prioridad 3</option></select><Button type="submit" variant="secondary">Añadir</Button></form><TaskRows tasks={visibleOtherTasks} planner={planner} empty="Este espacio está libre. Puedes dejarlo así." />{minimumMode && otherTasks.length > visibleOtherTasks.length && <p className="support-copy">Después, si queda energía: {otherTasks.length - visibleOtherTasks.length} tareas siguen guardadas.</p>}</Card>

      {!minimumMode && overdue.length > 0 && <Card className="overdue-card"><div className="card-heading"><div><p className="eyebrow">Sin culpa</p><h2>Pendientes por decidir</h2></div><Clock3 size={20} /></div><p>Estas tareas quedaron pendientes. Puedes moverlas sin perder el contexto.</p>{overdue.map((task) => <div className="overdue-row" key={task.id}><strong>{task.title}</strong><Button variant="secondary" onClick={() => planner.rescheduleTask(task.id, todayKey)}>Mover a hoy</Button></div>)}</Card>}
    </div>

    <aside className="today-layout__aside page-stack">
      <Card><div className="card-heading"><div><p className="eyebrow">Hábitos y bienestar</p><h2>Registro rápido</h2></div></div><div className="habit-quick-list">{(minimumMode ? habits.slice(0, 1) : habits).map((habit) => { const completed = snapshot.habitLogs.some((log) => log.habitId === habit.id && log.date === todayKey); return <button key={habit.id} className={`habit-quick ${completed ? "is-done" : ""}`} onClick={() => planner.toggleHabit(habit.id, todayKey)}><span className="habit-quick__icon"><Check size={16} /></span><span><strong>{habit.name}</strong><small>{habit.target} {habit.unit}</small></span>{completed ? <Check size={18} /> : <Circle size={18} />}</button>; })}{!habits.length && <p className="support-copy">No tienes hábitos programados hoy.</p>}</div><Link className="button button--text" to="/app/habits">Ver hábitos y bienestar</Link></Card>

      {!minimumMode && <Card className="today-fitness-card"><div className="card-heading"><div><p className="eyebrow">Mi espacio · Fitness</p><h2>Alimentación y entrenamiento</h2></div><Dumbbell size={20} /></div><Link to={`/app/life-hub/fitness?section=training&date=${todayKey}`}><span><Dumbbell size={18} /></span><div><strong>{todayWorkout?.name ?? todayWorkout?.goal ?? "Entrenamiento de hoy"}</strong><small>{todayWorkout?.exercises.length ? `${todayWorkout.exercises.length} ejercicios planificados` : "Aún no hay una rutina para hoy"}</small></div><ChevronRight size={17} /></Link><Link to={`/app/life-hub/fitness?date=${todayKey}`}><span><Utensils size={18} /></span><div><strong>{todayNutrition?.meals.length ?? 0} comidas · {todayCalories} kcal</strong><small>{todayNutrition?.meals.length ? "Ver alimentación del día" : "Registrar alimentación"}</small></div><ChevronRight size={17} /></Link></Card>}

      <Card className="next-step-card"><Sparkles size={22} /><div><p className="eyebrow">Tu próximo paso</p><h2>{nextStep.title}</h2><p>Una acción concreta para mantener el día en movimiento.</p></div><Link className="button button--primary" to={nextStep.href}>Empezar <ChevronRight size={16} /></Link></Card>

      <Card className="reflection-card"><p className="eyebrow">¿Necesitas ayuda?</p><h2>Desbloquearme</h2><p>Reduce el ruido, encuentra un primer paso y añádelo a tu día.</p><Link className="button button--secondary" to="/app/help">Abrir herramientas</Link></Card>
      <Link className="button button--text" to="/app/journal">Escribir una nota para cerrar el día</Link>
    </aside></div>
  </div>;
}

function TaskRows({ tasks, planner, empty }: { tasks: Task[]; planner: PlannerController; empty: string }) {
  if (!tasks.length) return <p className="support-copy">{empty}</p>;
  return <div className="task-list task-list--spaced">{tasks.map((task) => <button className="task-row" key={task.id} onClick={() => planner.toggleTask(task.id)}><span className={`task-check ${task.status === "completed" ? "is-done" : ""}`}>{task.status === "completed" ? <Check size={16} /> : <Circle size={15} />}</span><span className="task-row__content"><strong className={task.status === "completed" ? "is-complete" : ""}>{task.title}</strong><small>{task.time || "Sin hora"}</small></span>{task.focusPriority && <Badge tone="rose">P{task.focusPriority}</Badge>}</button>)}</div>;
}

"use client";

import { useState, type FormEvent } from "react";
import { Check, ChevronRight, Circle, Clock3, Plus, Save, SunMedium } from "lucide-react";
import type { MoodName } from "@/src/domain/planner";
import { isHabitScheduledOn, isTaskOverdue } from "@/src/domain/rules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatLongDate, toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, SectionHeading } from "@/src/components/ui/Primitives";

const moodOptions: { name: MoodName; symbol: string }[] = [
  { name: "Calmada", symbol: "◡" },
  { name: "Enfocada", symbol: "◎" },
  { name: "Alegre", symbol: "✦" },
  { name: "Cansada", symbol: "◔" },
  { name: "Abrumada", symbol: "≈" },
];

export function TodayPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const [intention, setIntention] = useState(snapshot.profile?.dailyIntention ?? "");
  const [newTask, setNewTask] = useState("");
  const todayTasks = snapshot.tasks.filter((task) => task.date === todayKey && task.status !== "cancelled");
  const overdue = snapshot.tasks.filter((task) => isTaskOverdue(task, todayKey));
  const habits = snapshot.habits.filter((habit) => isHabitScheduledOn(habit, today));
  const mood = snapshot.moodLogs.find((log) => log.date === todayKey);

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!newTask.trim()) return;
    await planner.createTask(newTask, todayKey);
    setNewTask("");
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow={formatLongDate(today)}
        title="Hoy"
        description="Una vista tranquila para decidir, actuar y ajustar sin repensar todo el día."
        action={<Badge tone="sage"><SunMedium size={15} /> Día abierto</Badge>}
      />

      <Card className="today-intention-card">
        <div>
          <p className="eyebrow">Mi intención de hoy</p>
          <textarea
            value={intention}
            onChange={(event) => setIntention(event.target.value)}
            aria-label="Intención del día"
            rows={2}
          />
        </div>
        <Button variant="secondary" onClick={() => planner.updateDailyIntention(intention)}>
          <Save size={17} /> Guardar cambios
        </Button>
      </Card>

      <div className="today-layout">
        <div className="today-layout__main page-stack">
          <Card>
            <div className="card-heading">
              <div><p className="eyebrow">Enfoque</p><h2>Mis 3 prioridades</h2></div>
              <Badge tone="rose">Lo importante</Badge>
            </div>
            <div className="focus-task-list">
              {todayTasks.slice(0, 3).map((task, index) => (
                <button key={task.id} className="focus-task" onClick={() => planner.toggleTask(task.id)}>
                  <span className={`focus-task__number ${task.status === "completed" ? "is-done" : ""}`}>
                    {task.status === "completed" ? <Check size={17} /> : index + 1}
                  </span>
                  <span><strong className={task.status === "completed" ? "is-complete" : ""}>{task.title}</strong><small>{task.estimatedMinutes ? `${task.estimatedMinutes} min` : "Sin hora"}</small></span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="card-heading">
              <div><p className="eyebrow">Agenda flexible</p><h2>Tareas de hoy</h2></div>
              <span className="metric-serif metric-serif--small">{todayTasks.filter((task) => task.status === "completed").length}/{todayTasks.length}</span>
            </div>
            <form className="quick-add" onSubmit={addTask}>
              <Plus size={18} aria-hidden="true" />
              <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="Añadir una tarea para hoy" aria-label="Nueva tarea" />
              <Button type="submit" variant="secondary">Añadir</Button>
            </form>
            <div className="task-list task-list--spaced">
              {todayTasks.map((task) => (
                <button className="task-row" key={task.id} onClick={() => planner.toggleTask(task.id)}>
                  <span className={`task-check ${task.status === "completed" ? "is-done" : ""}`}>
                    {task.status === "completed" ? <Check size={16} /> : <Circle size={15} />}
                  </span>
                  <span className="task-row__content"><strong className={task.status === "completed" ? "is-complete" : ""}>{task.title}</strong><small>{task.time || "Sin hora"}</small></span>
                  {task.priority === "high" && <Badge tone="rose">Prioridad</Badge>}
                </button>
              ))}
            </div>
          </Card>

          {overdue.length > 0 && (
            <Card className="overdue-card">
              <div className="card-heading">
                <div><p className="eyebrow">Sin culpa</p><h2>Pendientes por decidir</h2></div>
                <Clock3 size={20} />
              </div>
              <p>Esta tarea quedó pendiente. Puedes completarla, moverla o cancelarla.</p>
              {overdue.map((task) => (
                <div className="overdue-row" key={task.id}>
                  <strong>{task.title}</strong>
                  <Button variant="secondary" onClick={() => planner.rescheduleTask(task.id, todayKey)}>Mover a hoy</Button>
                </div>
              ))}
            </Card>
          )}
        </div>

        <aside className="today-layout__aside page-stack">
          <Card>
            <div className="card-heading"><div><p className="eyebrow">Autocuidado</p><h2>Hábitos</h2></div></div>
            <div className="habit-quick-list">
              {habits.map((habit) => {
                const completed = snapshot.habitLogs.some((log) => log.habitId === habit.id && log.date === todayKey);
                return (
                  <button key={habit.id} className={`habit-quick ${completed ? "is-done" : ""}`} onClick={() => planner.toggleHabit(habit.id, todayKey)}>
                    <span className="habit-quick__icon"><Check size={16} /></span>
                    <span><strong>{habit.name}</strong><small>{habit.target} {habit.unit}</small></span>
                    {completed ? <Check size={18} /> : <Circle size={18} />}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="card-heading"><div><p className="eyebrow">Contexto, no diagnóstico</p><h2>Ánimo y energía</h2></div></div>
            <div className="mood-selector mood-selector--wrap">
              {moodOptions.map((option) => (
                <button
                  key={option.name}
                  className={mood?.mood === option.name ? "mood-option is-selected" : "mood-option"}
                  onClick={() => planner.saveMood(option.name, mood?.energy ?? 3)}
                >
                  <span>{option.symbol}</span><small>{option.name}</small>
                </button>
              ))}
            </div>
            <p className="support-copy">{mood ? `Hoy te sientes ${mood.mood.toLowerCase()} con energía ${mood.energy}/5.` : "Registrar cómo te sientes toma menos de un minuto."}</p>
          </Card>

          <Card className="reflection-card">
            <p className="eyebrow">Al cerrar el día</p>
            <h2>¿Qué quiero reconocer hoy?</h2>
            <p>No tiene que ser perfecto para ser valioso.</p>
            <Button variant="secondary">Escribir una nota</Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

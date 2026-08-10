"use client";

import { useState, type FormEvent } from "react";
import { Check, ChevronLeft, ChevronRight, Circle, Plus, Sparkles } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatShortDay, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, SectionHeading } from "@/src/components/ui/Primitives";

export function PlanningPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const dates = getWeekDates(new Date(), snapshot.profile?.weekStartsOn ?? 1);
  const todayKey = toLocalDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [title, setTitle] = useState("");

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await planner.createTask(title, selectedDate);
    setTitle("");
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Tu semana, a tu manera"
        title="Planificación semanal"
        description="Distribuye lo importante entre siete días y deja espacio para vivir."
        action={
          <div className="week-switcher">
            <button aria-label="Semana anterior"><ChevronLeft size={18} /></button>
            <span>Esta semana</span>
            <button aria-label="Semana siguiente"><ChevronRight size={18} /></button>
          </div>
        }
      />

      <Card className="weekly-focus">
        <span className="weekly-focus__icon"><Sparkles size={21} /></span>
        <div>
          <p className="eyebrow">Intención semanal</p>
          <h2>Elegir un ritmo sostenible y terminar lo esencial.</h2>
        </div>
        <div className="weekly-focus__stats">
          <span><strong>{snapshot.tasks.filter((task) => dates.some((date) => toLocalDateKey(date) === task.date)).length}</strong> tareas</span>
          <span><strong>{snapshot.habits.length}</strong> hábitos</span>
        </div>
      </Card>

      <form className="planning-add" onSubmit={addTask}>
        <Plus size={19} aria-hidden="true" />
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="¿Qué quieres hacer esta semana?" aria-label="Nueva tarea semanal" />
        <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="Día para la nueva tarea">
          {dates.map((date) => <option value={toLocalDateKey(date)} key={date.toISOString()}>{formatShortDay(date)} {date.getDate()}</option>)}
        </select>
        <Button type="submit">Añadir</Button>
      </form>

      <section className="week-board" aria-label="Tareas de la semana">
        {dates.map((date) => {
          const dateKey = toLocalDateKey(date);
          const tasks = snapshot.tasks.filter((task) => task.date === dateKey && task.status !== "cancelled");
          const isToday = dateKey === todayKey;
          return (
            <Card className={`day-column ${isToday ? "is-today" : ""}`} key={dateKey}>
              <header className="day-column__header">
                <div><span>{formatShortDay(date)}</span><strong>{date.getDate()}</strong></div>
                {isToday && <Badge tone="rose">Hoy</Badge>}
              </header>
              <div className="day-column__tasks">
                {tasks.map((task) => (
                  <button className={`week-task ${task.status === "completed" ? "is-complete" : ""}`} key={task.id} onClick={() => planner.toggleTask(task.id)}>
                    {task.status === "completed" ? <Check size={15} /> : <Circle size={14} />}
                    <span>{task.title}</span>
                    {task.estimatedMinutes && <small>{task.estimatedMinutes}m</small>}
                  </button>
                ))}
                {tasks.length === 0 && <p className="day-column__empty">Espacio disponible</p>}
              </div>
              <button className="day-column__add" onClick={() => setSelectedDate(dateKey)}><Plus size={15} /> Añadir</button>
            </Card>
          );
        })}
      </section>

      <Card className="planning-note">
        <div><p className="eyebrow">Carga realista</p><h2>Tu semana tiene espacio para ajustar.</h2></div>
        <p>Reprogramar no crea tareas nuevas: mueve la misma acción y conserva su historia.</p>
      </Card>
    </div>
  );
}

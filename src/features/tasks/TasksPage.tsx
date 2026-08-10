"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Check, ChevronDown, Circle, Filter, Flag, Plus, SlidersHorizontal } from "lucide-react";
import { isTaskOverdue } from "@/src/domain/rules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";

type TaskTab = "inbox" | "today" | "upcoming" | "completed";

export function TasksPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const today = toLocalDateKey(new Date());
  const [tab, setTab] = useState<TaskTab>("today");
  const [title, setTitle] = useState("");
  const tasks = useMemo(() => snapshot.tasks.filter((task) => {
    if (tab === "inbox") return task.status === "inbox";
    if (tab === "completed") return task.status === "completed";
    if (tab === "upcoming") return Boolean(task.date && task.date > today && task.status !== "completed");
    return task.date === today && task.status !== "cancelled";
  }), [snapshot.tasks, tab, today]);
  const overdue = snapshot.tasks.filter((task) => isTaskOverdue(task, today));

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await planner.createTask(title, tab === "today" ? today : undefined);
    setTitle("");
  };

  return (
    <div className="page-stack tasks-page">
      <SectionHeading eyebrow="Ejecuta lo que sí importa" title="Tareas" description="Captura, decide y completa sin perder de vista tu energía." action={<Button onClick={() => setTab("inbox")}><Plus size={17} /> Nueva tarea</Button>} />
      <div className="task-tabs" role="tablist">
        {(["inbox", "today", "upcoming", "completed"] as const).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item === "inbox" ? "Inbox" : item === "today" ? "Hoy" : item === "upcoming" ? "Próximas" : "Completadas"}</button>)}
      </div>
      <div className="task-toolbar"><Button variant="secondary"><Filter size={16} /> Filtros</Button><button>Orden: Prioridad <ChevronDown size={15} /></button><button aria-label="Opciones de visualización"><SlidersHorizontal size={16} /></button></div>
      {overdue.length > 0 && tab === "today" && <div className="decision-alert"><Flag size={18} /><div><strong>Decisiones vencidas</strong><span>{overdue.length} {overdue.length === 1 ? "tarea requiere" : "tareas requieren"} tu atención.</span></div></div>}
      <Card className="task-manager-card">
        <header><div><p className="eyebrow">{tab === "today" ? "Hoy" : tab === "upcoming" ? "Próximas" : tab === "completed" ? "Completadas" : "Inbox"}</p><h2>{tasks.length} tareas</h2></div><Badge tone="neutral">Prioridad primero</Badge></header>
        <form className="task-manager-add" onSubmit={add}><Plus size={18} /><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Añadir una tarea…" aria-label="Nueva tarea en el gestor" /><Button type="submit" variant="secondary">Añadir</Button></form>
        <div className="managed-task-list">
          {tasks.map((task) => {
            const area = snapshot.lifeAreas.find((item) => item.id === task.lifeAreaId);
            return <button key={task.id} className={task.status === "completed" ? "is-complete" : ""} onClick={() => planner.toggleTask(task.id)}><span className="managed-task__check">{task.status === "completed" ? <Check size={15} /> : <Circle size={15} />}</span><span><strong>{task.title}</strong><small>{task.date === today ? "Hoy" : task.date ?? "Sin fecha"} · {area?.name ?? "Personal"}</small></span>{task.priority === "high" && <Flag size={16} className="rose-icon" />}{task.date && <CalendarDays size={15} />}</button>;
          })}
          {!tasks.length && <EmptyState title="Este espacio está libre" text="Añade una tarea o cambia de pestaña para revisar lo que viene." />}
        </div>
      </Card>
      <div className="task-footer-metrics"><Card><span>Tareas completas hoy</span><strong>{snapshot.tasks.filter((task) => task.date === today && task.status === "completed").length}/{snapshot.tasks.filter((task) => task.date === today).length}</strong></Card><Card><span>Tiempo estimado</span><strong>{Math.round(tasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0) / 60)}h {tasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0) % 60}m</strong></Card></div>
    </div>
  );
}

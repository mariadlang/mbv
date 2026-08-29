"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BriefcaseBusiness, CalendarDays, Check, Circle, Clock3, Flag, Plus, Sparkles } from "lucide-react";
import { isTaskOverdue } from "@/src/domain/rules";
import { resistanceSuggestion } from "@/src/domain/guidanceRules";
import { calculateProjectProgress, projectNextSuggestion } from "@/src/domain/cascadeRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";

type TaskTab = "inbox" | "today" | "upcoming" | "completed";

export function TasksPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const today = toLocalDateKey(new Date());
  const [tab, setTab] = useState<TaskTab>("today");
  const [title, setTitle] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [resistanceHelp, setResistanceHelp] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState({ title: "", description: "", date: today, time: "", estimatedMinutes: "", priority: "medium" as "low" | "medium" | "high", focusPriority: "" as "" | "1" | "2" | "3", lifeAreaId: "", goalId: "", projectId: "", recurrence: "" as "" | "daily" | "weekly" | "monthly" });
  const [project, setProject] = useState({ name: "", outcome: "", lifeAreaId: "", goalId: "", targetDate: "" });
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

  const addDetailed = async (event: FormEvent) => {
    event.preventDefault();
    if (!advanced.title.trim()) return;
    const focusPriority = advanced.focusPriority ? Number(advanced.focusPriority) as 1 | 2 | 3 : undefined;
    const occupied = focusPriority && snapshot.tasks.find((task) => task.date === advanced.date && task.focusPriority === focusPriority && task.status !== "completed" && task.status !== "cancelled");
    if (occupied && !window.confirm(`Ya tienes una prioridad ${focusPriority}: “${occupied.title}”. ¿Quieres reemplazarla?`)) return;
    await planner.createTaskDetailed({
      ...advanced,
      estimatedMinutes: advanced.estimatedMinutes ? Number(advanced.estimatedMinutes) : undefined,
      focusPriority,
      date: advanced.date || undefined,
      time: advanced.time || undefined,
      lifeAreaId: advanced.lifeAreaId || undefined,
      goalId: advanced.goalId || undefined,
      projectId: advanced.projectId || undefined,
      recurrence: advanced.recurrence || undefined,
    });
    setAdvanced({ ...advanced, title: "", description: "", time: "", estimatedMinutes: "" });
    setAdvancedOpen(false);
  };

  const addProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!project.name.trim() || !project.outcome.trim()) return;
    await planner.createProject({ ...project, lifeAreaId: project.lifeAreaId || undefined, goalId: project.goalId || undefined, targetDate: project.targetDate || undefined });
    setProject({ name: "", outcome: "", lifeAreaId: "", goalId: "", targetDate: "" });
  };

  return <div className="page-stack tasks-page">
    <SectionNavigation section="plan" />
    <SectionHeading eyebrow="Ejecuta lo que sí importa" title="Tareas y proyectos" description="Captura acciones y agrúpalas en entregables concretos." action={<Button onClick={() => setAdvancedOpen(!advancedOpen)}><Plus size={17} /> Nueva tarea</Button>} />
    <div className="task-tabs" role="tablist">{(["inbox", "today", "upcoming", "completed"] as const).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item === "inbox" ? "Inbox" : item === "today" ? "Hoy" : item === "upcoming" ? "Próximas" : "Completadas"}</button>)}</div>
    {overdue.length > 0 && tab === "today" && <div className="decision-alert"><Flag size={18} /><div><strong>Decisiones vencidas</strong><span>{overdue.length} {overdue.length === 1 ? "tarea requiere" : "tareas requieren"} tu atención.</span></div></div>}
    {snapshot.tasks.some((task) => (task.rescheduleCount ?? 0) >= 3) && <Card className="task-resistance-card"><p className="eyebrow">Desbloquearme</p><h2>Parece que una tarea se está resistiendo</h2><p>Elige lo que más se parece a lo que ocurre; no es un juicio, es contexto.</p><div className="factor-chips">{([['too_big','Es muy grande'],['unclear','No sé empezar'],['no_time','No tengo tiempo'],['avoidance','No quiero hacerlo'],['perfectionism','Perfeccionismo']] as const).map(([reason,label]) => <button type="button" key={reason} onClick={() => setResistanceHelp(resistanceSuggestion(reason))}>{label}</button>)}</div>{resistanceHelp && <div className="inline-message" role="status">{resistanceHelp}</div>}</Card>}

    {advancedOpen && <Card className="advanced-task-card"><header><div><p className="eyebrow">Acción conectada</p><h2>Planear una tarea</h2></div><Clock3 size={21} /></header><form className="advanced-task-form" onSubmit={addDetailed}>
      <label className="form-field form-field--full"><span>Tarea</span><input required value={advanced.title} onChange={(event) => setAdvanced({ ...advanced, title: event.target.value })} /></label>
      <label className="form-field form-field--full"><span>Descripción</span><textarea rows={2} value={advanced.description} onChange={(event) => setAdvanced({ ...advanced, description: event.target.value })} /></label>
      <label className="form-field"><span>Fecha</span><input type="date" value={advanced.date} onChange={(event) => setAdvanced({ ...advanced, date: event.target.value })} /></label>
      <label className="form-field"><span>Hora</span><input type="time" value={advanced.time} onChange={(event) => setAdvanced({ ...advanced, time: event.target.value })} /></label>
      <label className="form-field"><span>Duración estimada</span><input type="number" min="1" placeholder="minutos" value={advanced.estimatedMinutes} onChange={(event) => setAdvanced({ ...advanced, estimatedMinutes: event.target.value })} /></label>
      <label className="form-field"><span>Prioridad</span><select value={advanced.priority} onChange={(event) => setAdvanced({ ...advanced, priority: event.target.value as typeof advanced.priority })}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label>
      <label className="form-field"><span>Top 3 del día</span><select value={advanced.focusPriority} onChange={(event) => setAdvanced({ ...advanced, focusPriority: event.target.value as typeof advanced.focusPriority })}><option value="">No es Top 3</option><option value="1">Prioridad 1</option><option value="2">Prioridad 2</option><option value="3">Prioridad 3</option></select></label>
      <label className="form-field"><span>Área</span><select value={advanced.lifeAreaId} onChange={(event) => setAdvanced({ ...advanced, lifeAreaId: event.target.value })}><option value="">Sin área</option>{snapshot.lifeAreas.filter((area) => area.active).map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
      <label className="form-field"><span>Meta</span><select value={advanced.goalId} onChange={(event) => setAdvanced({ ...advanced, goalId: event.target.value })}><option value="">Sin meta</option>{snapshot.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
      <label className="form-field"><span>Proyecto</span><select value={advanced.projectId} onChange={(event) => setAdvanced({ ...advanced, projectId: event.target.value })}><option value="">Sin proyecto</option>{snapshot.projects.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="form-field"><span>Repetición simple</span><select value={advanced.recurrence} onChange={(event) => setAdvanced({ ...advanced, recurrence: event.target.value as typeof advanced.recurrence })}><option value="">No se repite</option><option value="daily">Diaria</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select></label>
      <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setAdvancedOpen(false)}>Cancelar</Button><Button type="submit">Guardar tarea</Button></div>
    </form></Card>}

    <Card className="task-manager-card"><header><div><p className="eyebrow">{tab === "today" ? "Hoy" : tab === "upcoming" ? "Próximas" : tab === "completed" ? "Completadas" : "Inbox"}</p><h2>{tasks.length} tareas</h2></div><Badge tone="neutral">Prioridad primero</Badge></header><form className="task-manager-add" onSubmit={add}><Plus size={18} /><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Añadir una tarea…" aria-label="Nueva tarea en el gestor" /><Button type="submit" variant="secondary">Añadir</Button></form><div className="managed-task-list">{tasks.map((task) => { const area = snapshot.lifeAreas.find((item) => item.id === task.lifeAreaId); const projectName = snapshot.projects.find((item) => item.id === task.projectId)?.name; return <button key={task.id} className={task.status === "completed" ? "is-complete" : ""} onClick={() => planner.toggleTask(task.id)}><span className="managed-task__check">{task.status === "completed" ? <Check size={15} /> : <Circle size={15} />}</span><span><strong>{task.title}</strong><small>{task.date === today ? "Hoy" : task.date ?? "Sin fecha"} · {projectName ?? area?.name ?? "Personal"}</small></span>{task.priority === "high" && <Flag size={16} className="rose-icon" />}{task.date && <CalendarDays size={15} />}</button>; })}{!tasks.length && <EmptyState title="Este espacio está libre" text="Añade una tarea o cambia de pestaña para revisar lo que viene." />}</div></Card>
    <div className="task-footer-metrics"><Card><span>Tareas completas hoy</span><strong>{snapshot.tasks.filter((task) => task.date === today && task.status === "completed").length}/{snapshot.tasks.filter((task) => task.date === today).length}</strong></Card><Card><span>Tiempo estimado</span><strong>{Math.round(tasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0) / 60)}h {tasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0) % 60}m</strong></Card></div>

    <section className="projects-section"><header><div><p className="eyebrow">Entregables</p><h2>Proyectos</h2></div><BriefcaseBusiness size={23} /></header><div className="projects-layout"><form className="card project-create" onSubmit={addProject}><label className="form-field"><span>Nombre del proyecto</span><input required value={project.name} onChange={(event) => setProject({ ...project, name: event.target.value })} /></label><label className="form-field"><span>Resultado esperado</span><textarea required rows={3} value={project.outcome} onChange={(event) => setProject({ ...project, outcome: event.target.value })} /></label><label className="form-field"><span>Área</span><select value={project.lifeAreaId} onChange={(event) => setProject({ ...project, lifeAreaId: event.target.value })}><option value="">Sin área</option>{snapshot.lifeAreas.filter((area) => area.active).map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label className="form-field"><span>Meta</span><select value={project.goalId} onChange={(event) => setProject({ ...project, goalId: event.target.value })}><option value="">Sin meta</option>{snapshot.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label><label className="form-field"><span>Fecha objetivo</span><input type="date" value={project.targetDate} onChange={(event) => setProject({ ...project, targetDate: event.target.value })} /></label><Button type="submit"><Plus size={16} /> Crear proyecto</Button></form><div className="project-card-grid">{snapshot.projects.map((item) => { const linkedTasks = snapshot.tasks.filter((task) => task.projectId === item.id); const done = linkedTasks.filter((task) => task.status === "completed").length; return <Card className="project-card" key={item.id}><Badge tone={item.status === "active" ? "warm" : "neutral"}>{item.status === "active" ? "En curso" : item.status}</Badge><h3>{item.name}</h3><p>{item.outcome}</p><small>{done}/{linkedTasks.length} tareas completas · {item.targetDate ?? "Sin fecha"}</small></Card>; })}</div></div></section>
    <ProjectIntelligence planner={planner} />
  </div>;
}

function ProjectIntelligence({ planner }: { planner: PlannerController }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  return <section className="project-database"><header><div><p className="eyebrow">Base de datos de proyectos</p><h2>Checklist, avance y siguiente semana</h2></div><Sparkles size={23} /></header><div>{planner.snapshot.projects.map((project) => { const progress = calculateProjectProgress(planner.snapshot, project.id); const checks = planner.snapshot.projectChecklistItems.filter((item) => item.projectId === project.id); return <Card className="project-intelligence-card" key={project.id}><header><div><Badge tone="rose">{progress}%</Badge><h2>{project.name}</h2></div><small>{project.targetDate || "Sin fecha objetivo"}</small></header><p>{project.outcome}</p><div className="project-checklist">{checks.map((item) => <button key={item.id} onClick={() => planner.toggleProjectChecklistItem(item.id)}>{item.completed ? <Check size={15} /> : <Circle size={15} />}<span>{item.title}</span></button>)}</div><form onSubmit={async (event) => { event.preventDefault(); const title = drafts[project.id]?.trim(); if (!title) return; await planner.addProjectChecklistItem(project.id, title); setDrafts({ ...drafts, [project.id]: "" }); }}><input value={drafts[project.id] ?? ""} onChange={(event) => setDrafts({ ...drafts, [project.id]: event.target.value })} placeholder="Añadir paso al checklist" /><Button type="submit" variant="secondary"><Plus size={14} /> Añadir</Button></form><div className="project-ai-suggestion"><Sparkles size={16} /><div><strong>Sugerencia inteligente local</strong><span>{projectNextSuggestion(planner.snapshot, project.id)}</span></div></div></Card>; })}</div></section>;
}

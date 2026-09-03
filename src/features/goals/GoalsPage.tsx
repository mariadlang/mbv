"use client";

/* eslint-disable jsx-a11y/no-autofocus -- Contextual editors open after an explicit user action. */

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Circle, Flag, Pause, Pencil, Plus, Sparkles, Target, Trash2 } from "lucide-react";
import { calculateGoalProgress } from "@/src/domain/rules";
import type { EntityStatus, Task } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { goalFormSchema, type GoalFormInput } from "@/src/lib/schemas";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";

type GoalFilter = "active" | "paused" | "completed" | "all";
type DateMode = "date" | "month" | "flexible";
type LocationState = { openGoal?: boolean; areaId?: string; title?: string; reason?: string };

export function GoalsPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [filter, setFilter] = useState<GoalFilter>("active");
  const [areaFilter, setAreaFilter] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("flexible");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [successGoalId, setSuccessGoalId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskEdit, setTaskEdit] = useState({ title: "", date: "", projectId: "" });
  const [milestones, setMilestones] = useState(() => [
    { id: crypto.randomUUID(), title: "" },
    { id: crypto.randomUUID(), title: "" },
  ]);
  const selectedGoal = snapshot.goals.find((goal) => goal.id === selectedGoalId);
  const form = useForm<GoalFormInput>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: { title: "", reason: "", targetDate: "", targetMonth: "", lifeAreaId: "", priority: "medium", progressType: "tasks" },
  });
  const title = useWatch({ control: form.control, name: "title" }) ?? "";
  const progressType = useWatch({ control: form.control, name: "progressType" });
  const inferredMethod = /\b(ahorrar|km|kilos?|kg|páginas?|cop|usd|euros?|\$|\d+)\b/i.test(title)
    ? "Valor numérico"
    : "Tareas vinculadas";
  const selectedMethod = advancedOpen
    ? (progressType === "numeric" ? "Valor numérico" : progressType === "tasks" ? "Tareas vinculadas" : progressType === "manual" ? "Avance manual" : "Hitos")
    : inferredMethod;

  const toggleProgressSettings = () => {
    if (!advancedOpen) {
      form.setValue("progressType", inferredMethod === "Valor numérico" ? "numeric" : "tasks");
    }
    setAdvancedOpen((current) => !current);
  };

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (!state?.openGoal) return;
    queueMicrotask(() => {
      setOpen(true);
      form.reset({
        title: state.title ?? "",
        reason: state.reason ?? "",
        lifeAreaId: state.areaId ?? "",
        targetDate: "",
        targetMonth: "",
        priority: "medium",
      });
      navigate(location.pathname, { replace: true, state: null });
    });
  }, [form, location.pathname, location.state, navigate]);

  const visibleGoals = useMemo(() => snapshot.goals.filter((goal) => {
    if (filter !== "all" && goal.status !== filter) return false;
    return !areaFilter || goal.lifeAreaId === areaFilter;
  }), [snapshot.goals, filter, areaFilter]);

  const closeCreate = () => {
    setOpen(false);
    setSuccessGoalId(null);
    setDateMode("flexible");
    setAdvancedOpen(false);
    setMilestones([{ id: crypto.randomUUID(), title: "" }, { id: crypto.randomUUID(), title: "" }]);
    form.reset({ title: "", reason: "", targetDate: "", targetMonth: "", lifeAreaId: "", priority: "medium" });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const normalized: GoalFormInput = {
      ...values,
      targetDate: dateMode === "date" ? values.targetDate : "",
      targetMonth: dateMode === "month" ? values.targetMonth : "",
      progressType: advancedOpen ? values.progressType : undefined,
    };
    const next = await planner.createGoal(normalized, milestones.map((item) => item.title));
    setSuccessGoalId(next.goals.at(-1)?.id ?? null);
  });

  const openTaskEditor = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskEdit({ title: task.title, date: task.date ?? "", projectId: task.projectId ?? "" });
  };

  const saveTaskEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingTaskId || !taskEdit.title.trim()) return;
    await planner.updateTask(editingTaskId, { ...taskEdit, goalId: selectedGoalId ?? "" });
    setEditingTaskId(null);
  };

  if (selectedGoal) {
    const area = snapshot.lifeAreas.find((item) => item.id === selectedGoal.lifeAreaId);
    const progress = calculateGoalProgress(selectedGoal, snapshot.milestones, snapshot.tasks);
    const goalMilestones = snapshot.milestones.filter((item) => item.goalId === selectedGoal.id);
    const linkedTasks = snapshot.tasks.filter((task) => task.goalId === selectedGoal.id);
    const next = linkedTasks.find((task) => task.status !== "completed" && task.status !== "cancelled");
    return <div className="page-stack goal-detail-page">
      <SectionNavigation section="plan" />
      <button className="back-link" onClick={() => setSelectedGoalId(null)}><ArrowLeft size={16} /> Volver a metas</button>
      <header className="goal-detail-hero"><span className="goal-detail-icon"><Target size={29} /></span><div><Badge tone="rose">{area?.name ?? "Personal"}</Badge><h1>{selectedGoal.title}</h1><p><CalendarDays size={15} /> {selectedGoal.targetDate ? `Fecha objetivo: ${selectedGoal.targetDate}` : selectedGoal.targetMonth ? `Mes deseado: ${selectedGoal.targetMonth}` : "Ritmo flexible"} · En progreso</p></div><div className="goal-detail-progress"><strong>{progress}%</strong><span>completado</span><ProgressBar value={progress} label="Progreso de la meta" /></div></header>
      <div className="goal-status-actions"><Badge tone="neutral">{selectedGoal.progressType === "numeric" ? "Progreso numérico" : selectedGoal.progressType === "tasks" ? "Por tareas" : selectedGoal.progressType === "manual" ? "Progreso manual" : "Por hitos"}</Badge><Button variant="secondary" onClick={() => planner.updateGoalStatus(selectedGoal.id, selectedGoal.status === "paused" ? "active" : "paused")}>{selectedGoal.status === "paused" ? "Reanudar" : "Pausar"}</Button><Button variant="ghost" onClick={() => planner.updateGoalStatus(selectedGoal.id, "completed")}>Marcar completa</Button></div>
      <Card className="goal-why"><p className="eyebrow">Por qué importa</p><p>{selectedGoal.reason}</p></Card>
      <Card className="goal-next-step"><div><p className="eyebrow">Próximo paso</p><h2>{next?.title ?? "Elegir una acción concreta"}</h2><p>{next ? "Esta acción está vinculada con esta meta." : "Haz visible lo siguiente antes de añadir más complejidad."}</p></div><Link className="button button--primary" to={`/app/planning?view=year&create=month&goal=${selectedGoal.id}`}>Planificar esta meta <ArrowRight size={16} /></Link></Card>
      <div className="goal-detail-grid"><Card><p className="eyebrow">Hitos</p><h2>El camino, paso a paso</h2><div className="detail-milestones">{goalMilestones.length ? goalMilestones.map((milestone) => <button key={milestone.id} onClick={() => planner.toggleMilestone(milestone.id)} className={milestone.status === "completed" ? "is-complete" : ""}>{milestone.status === "completed" ? <Check size={15} /> : <Circle size={15} />}<span>{milestone.title}</span></button>) : <EmptyState title="Sin hitos todavía" text="Puedes avanzar con tareas vinculadas o progreso manual." />}</div></Card><Card><p className="eyebrow">Tareas vinculadas</p><h2>Próximas acciones</h2><div className="detail-milestones detail-task-list">{linkedTasks.length ? linkedTasks.map((task) => <div key={task.id} className={`detail-task-row ${task.status === "completed" ? "is-complete" : ""}`}><button type="button" onClick={() => planner.toggleTask(task.id)} aria-label={task.status === "completed" ? `Reabrir ${task.title}` : `Completar ${task.title}`}>{task.status === "completed" ? <Check size={15} /> : <Circle size={15} />}</button><span>{task.title}</span><button type="button" onClick={() => openTaskEditor(task)} aria-label={`Editar ${task.title}`}><Pencil size={15} /></button></div>) : <EmptyState title="Todavía no hay acciones" text="Planifica la meta para bajarla a este mes y esta semana." />}</div></Card><Card><p className="eyebrow">Periodo</p><h2>{selectedGoal.createdAt.slice(0, 10)}</h2><p>Inicio</p><hr /><strong>{selectedGoal.targetDate ?? selectedGoal.targetMonth ?? "Flexible"}</strong><p>Objetivo</p></Card></div>
      <Card className="goal-timeline"><div className="goal-timeline__line"><span /><i style={{ "--position": `${progress}%` } as CSSProperties} /></div><div><span>Inicio</span><span>Primer paso</span><span>Mitad</span><span>Meta cumplida</span></div></Card>
      <Modal open={Boolean(editingTaskId)} title="Editar acción vinculada" description="El cambio se reflejará en Meta, Mes, Semana y Mi día sin crear otra tarea." onClose={() => setEditingTaskId(null)}>
        <form className="form-grid" onSubmit={saveTaskEdit}>
          <label className="form-field form-field--full"><span>Acción</span><input autoFocus required value={taskEdit.title} onChange={(event) => setTaskEdit({ ...taskEdit, title: event.target.value })} /></label>
          <label className="form-field"><span>Fecha</span><input type="date" value={taskEdit.date} onChange={(event) => setTaskEdit({ ...taskEdit, date: event.target.value })} /></label>
          <label className="form-field"><span>Proyecto</span><select value={taskEdit.projectId} onChange={(event) => setTaskEdit({ ...taskEdit, projectId: event.target.value })}><option value="">Sin proyecto</option>{snapshot.projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setEditingTaskId(null)}>Cancelar</Button><Button type="submit">Guardar cambios</Button></div>
        </form>
      </Modal>
    </div>;
  }

  return <div className="page-stack">
    <SectionNavigation section="plan" />
    <SectionHeading eyebrow="Tu dirección" title="Metas" description="Resultados que conectan la vida que quieres con lo que eliges hacer ahora." action={<Button onClick={() => setOpen(true)}><Plus size={17} /> Crear meta</Button>} />
    <div className="filter-row" role="group" aria-label="Filtrar metas">
      {(["active", "paused", "completed", "all"] as GoalFilter[]).map((item) => <button key={item} className={`filter-chip ${filter === item ? "is-active" : ""}`} onClick={() => setFilter(item)}>{item === "active" ? "Activas" : item === "paused" ? "Pausadas" : item === "completed" ? "Completadas" : "Todas"}</button>)}
      <label className="filter-select"><span className="sr-only">Filtrar por área</span><select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><option value="">Todas las áreas</option>{snapshot.lifeAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
    </div>
    {visibleGoals.length ? <div className="goals-grid">{visibleGoals.map((goal) => { const area = snapshot.lifeAreas.find((item) => item.id === goal.lifeAreaId); const progress = calculateGoalProgress(goal, snapshot.milestones, snapshot.tasks); const completed = snapshot.milestones.filter((item) => item.goalId === goal.id && item.status === "completed").length; const total = snapshot.milestones.filter((item) => item.goalId === goal.id).length; return <Card className="goal-card" key={goal.id}><div className="goal-card__top"><span className="goal-card__icon"><Target size={20} /></span><div className="goal-card__badges"><Badge tone="neutral">{area?.name ?? "Personal"}</Badge>{goal.priority === "high" && <Badge tone="rose">Prioridad</Badge>}</div><button className="icon-button" aria-label={`${goal.status === "paused" ? "Reanudar" : "Pausar"} ${goal.title}`} onClick={() => planner.updateGoalStatus(goal.id, (goal.status === "paused" ? "active" : "paused") as EntityStatus)}><Pause size={17} /></button></div><h2>{goal.title}</h2><p>{total ? `${completed} de ${total} hitos completados` : goal.reason}</p><div className="goal-card__progress"><ProgressBar value={progress} label={`Progreso de ${goal.title}`} /><span className="metric-serif">{progress}%</span></div><div className="goal-card__footer"><span><CalendarDays size={13} /> {goal.targetDate ?? goal.targetMonth ?? "Flexible"}</span><Button variant="ghost" onClick={() => setSelectedGoalId(goal.id)}>Ver mi camino</Button></div></Card>; })}</div> : <EmptyState title="Todavía no hay metas aquí" text="Una meta describe un resultado que importa, no solo una actividad." action={<Button onClick={() => setOpen(true)}>Crear mi primera meta</Button>} />}

    <Modal open={open} title={successGoalId ? "Meta creada" : "Crear una meta"} description={successGoalId ? "Ya sabes adónde quieres llegar. Ahora hagámoslo manejable." : "Empieza por el resultado y su razón. Los detalles técnicos pueden esperar."} onClose={closeCreate}>
      {successGoalId ? <div className="goal-success goal-success--compact"><span><Check size={20} /></span><h2>¿Qué significaría avanzar este mes?</h2><p>Convierte la meta en una prioridad mensual y después elige qué podrías avanzar esta semana.</p><div className="goal-cascade-path" aria-label="Camino desde la meta hasta Mi día"><strong>Meta <Check size={14} /></strong><ArrowRight size={15} /><span>Mes</span><ArrowRight size={15} /><span>Semana</span><ArrowRight size={15} /><span>Mi día</span></div><Link className="button button--primary" to={`/app/planning?view=year&create=month&goal=${successGoalId}`} onClick={closeCreate}>Planificar esta meta <ArrowRight size={16} /></Link><Button variant="ghost" onClick={closeCreate}>Ahora no</Button></div> : <form className="form-grid goal-create-form" onSubmit={onSubmit}>
        <label className="form-field form-field--full"><span>¿Qué quieres lograr?</span><input placeholder="Ej. Completar 21K" {...form.register("title")} />{form.formState.errors.title && <small className="form-error">{form.formState.errors.title.message}</small>}</label>
        <label className="form-field form-field--full"><span>¿Por qué importa para ti?</span><textarea rows={3} placeholder="Conecta con una razón propia…" {...form.register("reason")} />{form.formState.errors.reason && <small className="form-error">{form.formState.errors.reason.message}</small>}</label>
        <label className="form-field form-field--full"><span>¿A qué área pertenece?</span><select {...form.register("lifeAreaId")}><option value="">Sin área por ahora</option>{snapshot.lifeAreas.filter((area) => area.active).map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select></label>
        <fieldset className="form-field form-field--full"><legend>¿Cuándo te gustaría lograrlo?</legend><div className="goal-deadline-choice" role="radiogroup" aria-label="Tipo de fecha objetivo">{(["date", "month", "flexible"] as DateMode[]).map((mode) => <button type="button" role="radio" aria-checked={dateMode === mode} className={dateMode === mode ? "is-selected" : ""} onClick={() => { setDateMode(mode); if (mode !== "date") form.setValue("targetDate", ""); if (mode !== "month") form.setValue("targetMonth", ""); }} key={mode}>{mode === "date" ? "Fecha exacta" : mode === "month" ? "Mes deseado" : "Flexible"}</button>)}</div>{dateMode === "date" && <input type="date" aria-label="Fecha exacta" {...form.register("targetDate")} />}{dateMode === "month" && <input type="month" aria-label="Mes deseado" {...form.register("targetMonth")} />}{form.formState.errors.targetDate && <small className="form-error">{form.formState.errors.targetDate.message}</small>}</fieldset>
        <Card className="context-tip form-field--full"><Sparkles size={17} /><div><strong>Una buena meta describe un resultado</strong><p>“Correr 21K” muestra mejor el destino que “salir a correr”.</p></div></Card>
        <button type="button" className="goal-method-summary form-field--full" onClick={toggleProgressSettings} aria-expanded={advancedOpen}><span><p className="eyebrow">Cómo mediremos el avance</p><strong>{selectedMethod}</strong><small>Selección editable</small></span><b>{advancedOpen ? "Ocultar opciones" : "Cambiar método"} <ArrowRight size={15} /></b></button>
        {advancedOpen && <><label className="form-field"><span>Método</span><select {...form.register("progressType")}><option value="milestones">Hitos</option><option value="numeric">Valor numérico</option><option value="tasks">Tareas vinculadas</option><option value="manual">Avance manual</option></select></label><label className="form-field"><span>Prioridad</span><select {...form.register("priority")}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label>{progressType === "numeric" && <><label className="form-field"><span>Valor objetivo</span><input type="number" min="1" {...form.register("targetValue", { valueAsNumber: true })} /></label><label className="form-field"><span>Unidad</span><input placeholder="km, COP, páginas" {...form.register("unit")} /></label></>}</>}
        {progressType === "milestones" && advancedOpen && <fieldset className="form-field form-field--full milestone-inputs"><legend>Hitos clave</legend>{milestones.map((milestone, index) => <label key={milestone.id}><Flag size={15} /><input value={milestone.title} onChange={(event) => setMilestones((current) => current.map((item) => item.id === milestone.id ? { ...item, title: event.target.value } : item))} placeholder={`Hito ${index + 1}`} /><button type="button" aria-label={`Eliminar hito ${index + 1}`} onClick={() => setMilestones((current) => current.filter((item) => item.id !== milestone.id))}><Trash2 size={15} /></button></label>)}<Button type="button" variant="secondary" onClick={() => setMilestones((current) => [...current, { id: crypto.randomUUID(), title: "" }])}><Plus size={15} /> Añadir hito</Button></fieldset>}
        <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={closeCreate}>Cancelar</Button><Button type="submit">Crear meta</Button></div>
      </form>}
    </Modal>
  </div>;
}

"use client";

import { useState, type CSSProperties } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, CalendarDays, Check, ChevronDown, Circle, Flag, Pause, Plus, Target } from "lucide-react";
import { calculateGoalProgress } from "@/src/domain/rules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { goalFormSchema, type GoalFormInput } from "@/src/lib/schemas";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";

export function GoalsPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const [open, setOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [milestoneTitles, setMilestoneTitles] = useState(["", "", ""]);
  const selectedGoal = snapshot.goals.find((goal) => goal.id === selectedGoalId);
  const form = useForm<GoalFormInput>({ resolver: zodResolver(goalFormSchema), defaultValues: { title: "", reason: "", targetDate: "", lifeAreaId: "", progressType: "milestones", priority: "medium" } });
  const progressType = useWatch({ control: form.control, name: "progressType" }) ?? "milestones";

  const onSubmit = form.handleSubmit(async (values) => {
    await planner.createGoal(values, milestoneTitles);
    form.reset();
    setMilestoneTitles(["", "", ""]);
    setOpen(false);
  });

  if (selectedGoal) {
    const area = snapshot.lifeAreas.find((item) => item.id === selectedGoal.lifeAreaId);
    const progress = calculateGoalProgress(selectedGoal, snapshot.milestones, snapshot.tasks);
    const milestones = snapshot.milestones.filter((item) => item.goalId === selectedGoal.id);
    const linkedTasks = snapshot.tasks.filter((task) => task.goalId === selectedGoal.id);
    return <div className="page-stack goal-detail-page">
      <button className="back-link" onClick={() => setSelectedGoalId(null)}><ArrowLeft size={16}/> Volver a metas</button>
      <header className="goal-detail-hero"><span className="goal-detail-icon"><Target size={29}/></span><div><Badge tone="rose">{area?.name ?? "Personal"}</Badge><h1>{selectedGoal.title}</h1><p><CalendarDays size={15}/> {selectedGoal.targetDate ? `Fecha objetivo: ${selectedGoal.targetDate}` : "Sin fecha límite"} · En progreso</p></div><div className="goal-detail-progress"><strong>{progress}%</strong><span>completado</span><ProgressBar value={progress} label="Progreso de la meta" /></div></header>
      <div className="goal-status-actions"><Badge tone="neutral">{selectedGoal.progressType === "numeric" ? "Progreso numérico" : selectedGoal.progressType === "tasks" ? "Por tareas" : selectedGoal.progressType === "manual" ? "Progreso manual" : "Por hitos"}</Badge><Button variant="secondary" onClick={() => planner.updateGoalStatus(selectedGoal.id, selectedGoal.status === "paused" ? "active" : "paused")}>{selectedGoal.status === "paused" ? "Reanudar" : "Pausar"}</Button><Button variant="ghost" onClick={() => planner.updateGoalStatus(selectedGoal.id, "completed")}>Marcar completa</Button></div>
      <Card className="goal-why"><p className="eyebrow">¿Por qué es importante?</p><p>{selectedGoal.reason}</p></Card>
      <div className="goal-detail-grid"><Card><p className="eyebrow">Hitos</p><h2>El camino, paso a paso</h2><div className="detail-milestones">{milestones.length ? milestones.map((milestone) => <button key={milestone.id} onClick={() => planner.toggleMilestone(milestone.id)} className={milestone.status === "completed" ? "is-complete" : ""}>{milestone.status === "completed" ? <Check size={15}/> : <Circle size={15}/>}<span>{milestone.title}</span></button>) : <EmptyState title="Sin hitos todavía" text="Añade hitos al crear una nueva meta para medir avances concretos." />}</div></Card><Card><p className="eyebrow">Tareas vinculadas</p><h2>Próximas acciones</h2><div className="detail-milestones">{linkedTasks.length ? linkedTasks.map((task)=><button key={task.id} onClick={()=>planner.toggleTask(task.id)} className={task.status === "completed" ? "is-complete" : ""}>{task.status === "completed" ? <Check size={15}/> : <Circle size={15}/>}<span>{task.title}</span></button>) : <p className="support-copy">Las tareas creadas desde el gestor pueden vincularse con esta meta en futuras iteraciones.</p>}</div></Card><Card><p className="eyebrow">Periodo</p><h2>{selectedGoal.createdAt.slice(0,10)}</h2><p>Inicio</p><hr/><strong>{selectedGoal.targetDate ?? "Flexible"}</strong><p>Fecha objetivo</p></Card></div>
      <Card className="goal-timeline"><div className="goal-timeline__line"><span/><i style={{"--position": `${progress}%`} as CSSProperties}/></div><div><span>Inicio</span><span>Primer hito</span><span>Mitad</span><span>Meta cumplida</span></div></Card>
    </div>;
  }

  return <div className="page-stack">
    <SectionHeading eyebrow="Dirección antes que cantidad" title="Metas anuales" description="Tus metas principales para este año, conectadas con la vida que quieres construir." action={<Button onClick={() => setOpen(true)}><Plus size={17} /> Crear meta</Button>} />
    <div className="filter-row"><button className="filter-chip is-active">Activas <span>{snapshot.goals.filter((goal) => goal.status === "active").length}</span></button><button className="filter-chip">Pausadas</button><button className="filter-chip">Completadas</button><button className="filter-chip">Todas las áreas <ChevronDown size={15} /></button></div>
    {snapshot.goals.length ? <div className="goals-grid">{snapshot.goals.map((goal) => { const area = snapshot.lifeAreas.find((item) => item.id === goal.lifeAreaId); const progress = calculateGoalProgress(goal, snapshot.milestones, snapshot.tasks); return <Card className="goal-card" key={goal.id}><div className="goal-card__top"><span className="goal-card__icon"><Target size={20} /></span><div className="goal-card__badges"><Badge tone="neutral">{area?.name ?? "Personal"}</Badge>{goal.priority === "high" && <Badge tone="rose">Prioridad</Badge>}</div><button className="icon-button" aria-label={`${goal.status === "paused" ? "Reanudar" : "Pausar"} ${goal.title}`} onClick={() => planner.updateGoalStatus(goal.id, goal.status === "paused" ? "active" : "paused")}><Pause size={17} /></button></div><h2>{goal.title}</h2><p>{goal.reason}</p><div className="goal-card__progress"><span className="metric-serif">{progress}%</span><ProgressBar value={progress} label="Progreso" /></div><div className="goal-card__footer"><span><CalendarDays size={13}/> {goal.targetDate ? goal.targetDate : "Sin fecha límite"}</span><Button variant="ghost" onClick={() => setSelectedGoalId(goal.id)}>Ver detalle</Button></div></Card>; })}</div> : <EmptyState title="Crea tu primera meta" text="Empieza por un resultado que de verdad importe ahora." action={<Button onClick={() => setOpen(true)}>Crear mi primera meta</Button>} />}

    <Modal open={open} title="Crear nueva meta" description="Aclara el resultado, su razón y los hitos que marcarán el camino." onClose={() => setOpen(false)}>
      <form className="form-grid goal-create-form" onSubmit={onSubmit}>
        <label className="form-field"><span>Título de la meta</span><input placeholder="Ej. Completar 21K" {...form.register("title")} />{form.formState.errors.title && <small className="form-error">{form.formState.errors.title.message}</small>}</label>
        <label className="form-field"><span>Área de vida</span><select {...form.register("lifeAreaId")}><option value="">Selecciona un área</option>{snapshot.lifeAreas.filter((area) => area.active).map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select></label>
        <label className="form-field"><span>Método de progreso</span><select {...form.register("progressType")}><option value="milestones">Hitos</option><option value="numeric">Valor numérico</option><option value="tasks">Tareas vinculadas</option><option value="manual">Porcentaje manual</option></select></label>
        <label className="form-field"><span>Prioridad</span><select {...form.register("priority")}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label>
        <label className="form-field form-field--full"><span>¿Por qué es importante para ti?</span><textarea rows={3} placeholder="Conecta con tu propósito…" {...form.register("reason")} />{form.formState.errors.reason && <small className="form-error">{form.formState.errors.reason.message}</small>}</label>
        {progressType === "milestones" && <fieldset className="form-field form-field--full milestone-inputs"><legend>Hitos clave</legend>{milestoneTitles.map((milestone,index)=><label key={index}><Flag size={15}/><input value={milestone} onChange={(event)=>setMilestoneTitles(milestoneTitles.map((item,i)=>i===index?event.target.value:item))} placeholder={`Hito ${index+1}`} /></label>)}</fieldset>}
        {progressType === "numeric" && <><label className="form-field"><span>Valor objetivo</span><input type="number" min="1" {...form.register("targetValue", { valueAsNumber: true })} /></label><label className="form-field"><span>Unidad</span><input placeholder="Ej. km, COP, páginas" {...form.register("unit")} /></label></>}
        {progressType === "manual" && <label className="form-field"><span>Avance inicial (%)</span><input type="number" min="0" max="100" {...form.register("manualProgress", { valueAsNumber: true })} /></label>}
        <label className="form-field"><span>¿Cuándo quieres lograrla?</span><input type="date" {...form.register("targetDate")} /></label>
        <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Crear meta</Button></div>
      </form>
    </Modal>
  </div>;
}

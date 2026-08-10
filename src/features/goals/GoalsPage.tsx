"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, ChevronDown, Circle, Pause, Plus, Target } from "lucide-react";
import { calculateGoalProgress } from "@/src/domain/rules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { goalFormSchema, type GoalFormInput } from "@/src/lib/schemas";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";

export function GoalsPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const [open, setOpen] = useState(false);
  const form = useForm<GoalFormInput>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: { title: "", reason: "", targetDate: "", lifeAreaId: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await planner.createGoal(values);
    form.reset();
    setOpen(false);
  });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Dirección antes que cantidad"
        title="Metas"
        description="Resultados claros, conectados con la vida que quieres construir."
        action={<Button onClick={() => setOpen(true)}><Plus size={17} /> Crear meta</Button>}
      />

      <div className="filter-row">
        <button className="filter-chip is-active">Activas <span>{snapshot.goals.filter((goal) => goal.status === "active").length}</span></button>
        <button className="filter-chip">Pausadas</button>
        <button className="filter-chip">Completadas</button>
        <button className="filter-chip">Todas las áreas <ChevronDown size={15} /></button>
      </div>

      {snapshot.goals.length ? (
        <div className="goals-grid">
          {snapshot.goals.map((goal) => {
            const area = snapshot.lifeAreas.find((item) => item.id === goal.lifeAreaId);
            const progress = calculateGoalProgress(goal, snapshot.milestones, snapshot.tasks);
            const milestones = snapshot.milestones.filter((item) => item.goalId === goal.id);
            return (
              <Card className="goal-card" key={goal.id}>
                <div className="goal-card__top">
                  <span className="goal-card__icon"><Target size={20} /></span>
                  <div className="goal-card__badges">
                    <Badge tone="neutral">{area?.name ?? "Personal"}</Badge>
                    {goal.priority === "high" && <Badge tone="rose">Prioridad</Badge>}
                  </div>
                  <button className="icon-button" aria-label={`Pausar ${goal.title}`}><Pause size={17} /></button>
                </div>
                <h2>{goal.title}</h2>
                <p>{goal.reason}</p>
                <div className="goal-card__progress">
                  <span className="metric-serif">{progress}%</span>
                  <ProgressBar value={progress} label="Progreso" />
                </div>
                {milestones.length > 0 && (
                  <div className="milestone-list">
                    <p className="eyebrow">Hitos</p>
                    {milestones.map((milestone) => (
                      <button key={milestone.id} onClick={() => planner.toggleMilestone(milestone.id)} className={milestone.status === "completed" ? "is-complete" : ""}>
                        {milestone.status === "completed" ? <Check size={15} /> : <Circle size={14} />}
                        <span>{milestone.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="goal-card__footer">
                  <span>{goal.targetDate ? `Fecha objetivo · ${goal.targetDate}` : "Sin fecha límite"}</span>
                  <strong>En camino</strong>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Crea tu primera meta" text="Empieza por un resultado que de verdad importe ahora." action={<Button onClick={() => setOpen(true)}>Crear mi primera meta</Button>} />
      )}

      <Modal open={open} title="Crear una meta" description="Aclara qué quieres lograr y por qué vale la pena." onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="form-field form-field--full">
            <span>¿Qué quieres lograr?</span>
            <input placeholder="Ej. Completar mi primera media maratón" {...form.register("title")} />
            {form.formState.errors.title && <small className="form-error">{form.formState.errors.title.message}</small>}
          </label>
          <label className="form-field form-field--full">
            <span>¿Por qué es importante para ti?</span>
            <textarea rows={3} placeholder="La razón que quieres recordar en los días difíciles" {...form.register("reason")} />
            {form.formState.errors.reason && <small className="form-error">{form.formState.errors.reason.message}</small>}
          </label>
          <label className="form-field">
            <span>Área de vida</span>
            <select {...form.register("lifeAreaId")}>
              <option value="">Sin área</option>
              {snapshot.lifeAreas.filter((area) => area.active).map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Fecha objetivo</span>
            <input type="date" {...form.register("targetDate")} />
          </label>
          <div className="modal__actions form-field--full">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Ahora no</Button>
            <Button type="submit">Guardar meta</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

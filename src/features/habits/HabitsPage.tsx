"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Check, Flame, Plus, Sprout } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { calculateHabitConsistency, isHabitScheduledOn } from "@/src/domain/rules";
import { getRecentDates, getWeekDates, formatShortDay, toLocalDateKey } from "@/src/lib/dates";
import { habitFormSchema, type HabitFormInput } from "@/src/lib/schemas";
import { Badge, Button, Card, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { MoodPage } from "@/src/features/mood/MoodPage";

const dayOptions = [
  [1, "L"], [2, "M"], [3, "X"], [4, "J"], [5, "V"], [6, "S"], [0, "D"],
] as const;

export function HabitsPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const [searchParams] = useSearchParams();
  const wellbeingRef = useRef<HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const weekDates = getWeekDates(new Date(), snapshot.profile?.weekStartsOn ?? 1);
  const recentDates = useMemo(() => getRecentDates(30), []);

  useEffect(() => {
    if (searchParams.get("checkin") === "1") wellbeingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams]);

  const form = useForm<HabitFormInput>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      name: "",
      type: "boolean",
      target: 1,
      unit: "check",
      scheduledDays: [1, 2, 3, 4, 5],
      lifeAreaId: "",
      origin: "established",
    },
  });

  const selectedDays = useWatch({ control: form.control, name: "scheduledDays" });
  const toggleDay = (day: number) => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((value) => value !== day)
      : [...selectedDays, day];
    form.setValue("scheduledDays", next, { shouldValidate: true });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    await planner.createHabit(values);
    form.reset();
    setDialogOpen(false);
  });

  const aggregate = snapshot.habits.reduce(
    (totals, habit) => {
      const result = calculateHabitConsistency(habit, snapshot.habitLogs, recentDates);
      return { completed: totals.completed + result.completed, scheduled: totals.scheduled + result.scheduled };
    },
    { completed: 0, scheduled: 0 },
  );
  const aggregatePercentage = aggregate.scheduled
    ? Math.round((aggregate.completed / aggregate.scheduled) * 100)
    : 0;

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Constancia sin perfección"
        title="Hábitos"
        description="Registra lo que quieres sostener. Los días no programados no cuentan como fallos."
        action={<Button onClick={() => setDialogOpen(true)}><Plus size={17} /> Crear hábito</Button>}
      />

      <div className="metric-grid">
        <Card className="metric-card metric-card--rose">
          <span className="metric-card__icon"><Sprout size={20} /></span>
          <p>Consistencia mensual</p>
          <strong>{aggregatePercentage}%</strong>
          <small>{aggregate.completed} registros de {aggregate.scheduled} días programados</small>
        </Card>
        <Card className="metric-card">
          <span className="metric-card__icon"><Flame size={20} /></span>
          <p>Hábitos activos</p>
          <strong>{snapshot.habits.filter((habit) => habit.status === "active").length}</strong>
          <small>Un ritmo que puedes ajustar cuando lo necesites</small>
        </Card>
        <Card className="metric-card">
          <span className="metric-card__icon"><Check size={20} /></span>
          <p>Registros esta semana</p>
          <strong>{snapshot.habitLogs.filter((log) => weekDates.some((date) => toLocalDateKey(date) === log.date)).length}</strong>
          <small>Mira lo que sí avanzó</small>
        </Card>
      </div>

      <Card className="habit-matrix-card">
        <div className="card-heading habit-matrix-heading">
          <div>
            <p className="eyebrow">Esta semana</p>
            <h2>Tu ritmo, día a día</h2>
          </div>
          <Badge tone="sage">Semana actual</Badge>
        </div>
        <div className="habit-matrix" role="table" aria-label="Registro semanal de hábitos">
          <div className="habit-matrix__header" role="row">
            <span role="columnheader">Hábito</span>
            {weekDates.map((date) => (
              <span key={date.toISOString()} role="columnheader" className={toLocalDateKey(date) === toLocalDateKey(new Date()) ? "is-today" : ""}>
                <small>{formatShortDay(date)}</small>
                <strong>{date.getDate()}</strong>
              </span>
            ))}
            <span role="columnheader">Mes</span>
          </div>
          {snapshot.habits.map((habit) => {
            const consistency = calculateHabitConsistency(habit, snapshot.habitLogs, recentDates);
            return (
              <div className="habit-matrix__row" role="row" key={habit.id}>
                <div role="rowheader" className="habit-name-cell">
                  <span className="habit-dot" />
                  <div><strong>{habit.name}</strong><small>{habit.target} {habit.unit}</small></div>
                </div>
                {weekDates.map((date) => {
                  const dateKey = toLocalDateKey(date);
                  const scheduled = isHabitScheduledOn(habit, date);
                  const completed = snapshot.habitLogs.some(
                    (log) => log.habitId === habit.id && log.date === dateKey,
                  );
                  return (
                    <div role="cell" key={dateKey}>
                      <button
                        className={`matrix-check ${completed ? "is-complete" : ""} ${!scheduled ? "is-off" : ""}`}
                        disabled={!scheduled}
                        onClick={() => planner.toggleHabit(habit.id, dateKey)}
                        aria-label={`${habit.name}, ${dateKey}: ${completed ? "registrado" : scheduled ? "sin registrar" : "no programado"}`}
                        aria-pressed={completed}
                      >
                        {completed ? <Check size={15} /> : scheduled ? <span /> : "–"}
                      </button>
                    </div>
                  );
                })}
                <div role="cell" className="habit-percentage">
                  <strong>{consistency.percentage}%</strong>
                  <small>{consistency.completed}/{consistency.scheduled}</small>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="habit-card-grid">
        {snapshot.habits.map((habit) => {
          const consistency = calculateHabitConsistency(habit, snapshot.habitLogs, recentDates);
          const area = snapshot.lifeAreas.find((item) => item.id === habit.lifeAreaId);
          return (
            <Card className="habit-detail-card" key={habit.id}>
              <div className="habit-detail-card__top">
                <span className="habit-detail-card__icon"><Sprout size={20} /></span>
                <Badge tone="neutral">{habit.status === "active" ? "Activo" : habit.status}</Badge>
              </div>
              <h3>{habit.name}</h3>
              <p>{habit.description || "Un pequeño gesto que suma a tu bienestar."}</p>
              <ProgressBar value={consistency.percentage} label="Consistencia" />
              <div className="habit-detail-card__meta">
                <Badge tone={habit.origin === "experiment" ? "rose" : "neutral"}>{habit.origin === "experiment" ? "Quiero probar" : area?.name ?? "Ya lo practico"}</Badge>
                <span>{habit.scheduledDays.length === 7 ? "Cada día" : `${habit.scheduledDays.length} días/semana`}</span>
              </div>
              {habit.recommendation && <div className="habit-recommendation"><Sprout size={15} /><span>{habit.recommendation}</span></div>}
            </Card>
          );
        })}
      </div>

      <section ref={wellbeingRef} className="wellbeing-section" aria-label="Bienestar, ánimo y energía"><MoodPage planner={planner} /></section>

      <Modal open={dialogOpen} title="Crear un hábito" description="Empieza con algo pequeño y claro. Siempre podrás ajustarlo." onClose={() => setDialogOpen(false)}>
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="form-field form-field--full">
            <span>Nombre del hábito</span>
            <input placeholder="Ej. Leer antes de dormir" {...form.register("name")} />
            {form.formState.errors.name && <small className="form-error">{form.formState.errors.name.message}</small>}
          </label>
          <label className="form-field">
            <span>Tipo de registro</span>
            <select {...form.register("type")}>
              <option value="boolean">Sí / no</option>
              <option value="quantity">Cantidad</option>
              <option value="duration">Duración</option>
            </select>
          </label>
          <label className="form-field">
            <span>Área de vida</span>
            <select {...form.register("lifeAreaId")}>
              <option value="">Sin área</option>
              {snapshot.lifeAreas.filter((area) => area.active).map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Objetivo</span>
            <input type="number" min="1" {...form.register("target", { valueAsNumber: true })} />
            {form.formState.errors.target && <small className="form-error">{form.formState.errors.target.message}</small>}
          </label>
          <label className="form-field form-field--full">
            <span>¿Cómo llega este hábito a tu vida?</span>
            <select {...form.register("origin")}><option value="established">Ya lo tengo y quiero sostenerlo</option><option value="experiment">Quiero probarlo durante 14 días</option></select>
          </label>
          <label className="form-field">
            <span>Unidad</span>
            <input placeholder="min, pasos, sesión" {...form.register("unit")} />
            {form.formState.errors.unit && <small className="form-error">{form.formState.errors.unit.message}</small>}
          </label>
          <fieldset className="form-field form-field--full">
            <legend>Días programados</legend>
            <div className="day-picker">
              {dayOptions.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={selectedDays.includes(value) ? "is-selected" : ""}
                  onClick={() => toggleDay(value)}
                  aria-pressed={selectedDays.includes(value)}
                >{label}</button>
              ))}
            </div>
            {form.formState.errors.scheduledDays && <small className="form-error">{form.formState.errors.scheduledDays.message}</small>}
          </fieldset>
          <div className="modal__actions form-field--full">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Ahora no</Button>
            <Button type="submit">Guardar hábito</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

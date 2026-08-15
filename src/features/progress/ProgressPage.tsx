"use client";

import { Award, CheckCircle2, HeartPulse, Sparkles, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateGoalProgress } from "@/src/domain/rules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatShortDay, getRecentDates, toLocalDateKey } from "@/src/lib/dates";
import { Badge, Card, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";
import { Link } from "react-router-dom";

export function ProgressPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const dates = getRecentDates(7);
  const chartData = dates.map((date) => {
    const key = toLocalDateKey(date);
    return {
      day: formatShortDay(date),
      hábitos: snapshot.habitLogs.filter((log) => log.date === key).length,
      tareas: snapshot.tasks.filter((task) => task.date === key && task.status === "completed").length,
    };
  });
  const completedTasks = snapshot.tasks.filter((task) => task.status === "completed").length;
  const completedMilestones = snapshot.milestones.filter((milestone) => milestone.status === "completed").length;
  const activeGoalProgress = snapshot.goals.length
    ? Math.round(snapshot.goals.reduce((sum, goal) => sum + calculateGoalProgress(goal, snapshot.milestones, snapshot.tasks), 0) / snapshot.goals.length)
    : 0;

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="EN MOVIMIENTO"
        title="Tu progreso"
        description="Mira lo que has construido, reconoce tu ritmo y descubre cuánto has avanzado."
        action={<Badge tone="sage"><Sparkles size={14} /> Últimos 7 días</Badge>}
      />

      <div className="metric-grid metric-grid--four">
        <Card className="metric-card metric-card--rose"><span className="metric-card__icon"><Target size={20} /></span><p>Avance de metas</p><strong>{activeGoalProgress}%</strong><small>Promedio de metas activas · fuente: metas e hitos</small></Card>
        <Card className="metric-card"><span className="metric-card__icon"><CheckCircle2 size={20} /></span><p>Tareas completadas</p><strong>{completedTasks}</strong><small>Todo el periodo · fuente: tareas</small></Card>
        <Card className="metric-card"><span className="metric-card__icon"><HeartPulse size={20} /></span><p>Registros de hábitos</p><strong>{snapshot.habitLogs.length}</strong><small>Todo el periodo · fuente: hábitos</small></Card>
        <Card className="metric-card"><span className="metric-card__icon"><Award size={20} /></span><p>Hitos alcanzados</p><strong>{completedMilestones}</strong><small>Todo el periodo · fuente: metas</small></Card>
      </div>

      <div className="progress-layout">
        <Card className="progress-chart-card">
          <div className="card-heading">
            <div><p className="eyebrow">Últimos 7 días</p><h2>Acciones que sumaron</h2></div>
            <div className="chart-legend"><span><i className="legend-dot legend-dot--rose" /> Hábitos</span><span><i className="legend-dot legend-dot--sage" /> Tareas</span></div>
          </div>
          <div className="large-chart" aria-label="Hábitos registrados y tareas completadas en los últimos siete días">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="3 5" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "var(--color-surface-muted)" }} contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Bar dataKey="hábitos" fill="var(--color-brand)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="tareas" fill="var(--color-accent-lavender)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-summary">Este gráfico cuenta registros y tareas, no tu valor personal. Los días tranquilos también forman parte de un ritmo sostenible.</p>
        </Card>

        <Card className="achievement-card">
          <span className="achievement-card__icon"><Award size={25} /></span>
          <p className="eyebrow">Logro reciente</p>
          <h2>Tu primera semana con intención</h2>
          <p>Conectaste metas, acciones y hábitos en un mismo lugar. Eso ya es una forma de progreso.</p>
          <span className="achievement-card__date">Esta semana</span>
        </Card>
      </div>

      <Card>
        <div className="card-heading"><div><p className="eyebrow">Tus metas, más cerca</p><h2>El camino que ya estás recorriendo</h2></div><Badge tone="neutral">Metas, hitos y tareas</Badge></div>
        <div className="progress-goal-list">
          {snapshot.goals.map((goal) => {
            const progress = calculateGoalProgress(goal, snapshot.milestones, snapshot.tasks);
            const nextMilestone = snapshot.milestones.find((item) => item.goalId === goal.id && item.status !== "completed");
            return <div key={goal.id}><div><strong>{goal.title}</strong><small>Próximo paso: {nextMilestone?.title ?? "elige una acción pequeña"}</small></div><ProgressBar value={progress} label="Progreso" /><Link className="button button--text" to="/app/goals">Continuar esta meta</Link></div>;
          })}
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Heart,
  Leaf,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { calculateGoalProgress, isHabitScheduledOn, isTaskOverdue } from "@/src/domain/rules";
import type { MoodName } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatLongDate, formatShortDay, getRecentDates, toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";

const moods: { name: MoodName; symbol: string }[] = [
  { name: "Calmada", symbol: "◡" },
  { name: "Enfocada", symbol: "◎" },
  { name: "Alegre", symbol: "✦" },
  { name: "Cansada", symbol: "◔" },
  { name: "Abrumada", symbol: "≈" },
];

export function DashboardPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(4);
  const todayTasks = snapshot.tasks.filter(
    (task) => task.date === todayKey && task.status !== "cancelled",
  );
  const overdueTasks = snapshot.tasks.filter((task) => isTaskOverdue(task, todayKey));
  const todayHabits = snapshot.habits.filter((habit) => isHabitScheduledOn(habit, today));
  const activeGoals = snapshot.goals.filter((goal) => goal.status === "active").slice(0, 3);
  const todayMood = snapshot.moodLogs.find((log) => log.date === todayKey);

  const chartData = useMemo(() => {
    return getRecentDates(7).map((date) => {
      const dateKey = toLocalDateKey(date);
      const scheduled = snapshot.habits.filter((habit) => isHabitScheduledOn(habit, date));
      const completed = scheduled.filter((habit) =>
        snapshot.habitLogs.some((log) => log.habitId === habit.id && log.date === dateKey),
      ).length;
      return {
        day: formatShortDay(date),
        value: scheduled.length ? Math.round((completed / scheduled.length) * 100) : 0,
      };
    });
  }, [snapshot.habitLogs, snapshot.habits]);

  const completedToday = todayHabits.filter((habit) =>
    snapshot.habitLogs.some((log) => log.habitId === habit.id && log.date === todayKey),
  ).length;

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow={formatLongDate(today)}
        title={`Hola, ${snapshot.profile?.name ?? "María"}`}
        description="No necesitas hacerlo todo. Solo elegir qué importa ahora."
        action={<Badge tone="sage"><Leaf size={14} /> Semana en equilibrio</Badge>}
      />

      <section className="intention-banner" aria-label="Intención del día">
        <div className="intention-banner__curve" />
        <div>
          <span className="eyebrow">Mi intención de hoy</span>
          <h2>{snapshot.profile?.dailyIntention || "Elige una intención que puedas sostener hoy."}</h2>
        </div>
        <Link to="/app/today" className="circle-link" aria-label="Editar intención del día">
          <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
      </section>

      <div className="dashboard-grid dashboard-grid--top">
        <Card className="top-three-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Enfoque diario</p>
              <h2>Mis 3 prioridades</h2>
            </div>
            <Link to="/app/today" className="icon-button" aria-label="Abrir el día">
              <ChevronRight size={20} />
            </Link>
          </div>
          {todayTasks.length ? (
            <div className="task-list">
              {todayTasks.slice(0, 3).map((task, index) => (
              <button className="task-row" key={task.id} onClick={() => planner.toggleTask(task.id)}>
                <span className={`task-check ${task.status === "completed" ? "is-done" : ""}`}>
                  {task.status === "completed" ? <Check size={16} /> : <span>{index + 1}</span>}
                </span>
                <span className="task-row__content">
                  <strong className={task.status === "completed" ? "is-complete" : ""}>{task.title}</strong>
                  <small>{task.estimatedMinutes ? `${task.estimatedMinutes} min` : "Sin hora"}</small>
                </span>
                <Badge tone={task.priority === "high" ? "rose" : "neutral"}>
                  {task.priority === "high" ? "Prioridad" : "Hoy"}
                </Badge>
              </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Un día con espacio"
              text="Añade hasta tres prioridades realistas para hoy."
              action={<Link to="/app/today" className="text-link">Planear mi día <ChevronRight size={16} /></Link>}
            />
          )}
        </Card>

        <Card className="habit-today-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Progreso amable</p>
              <h2>Hábitos de hoy</h2>
            </div>
            <span className="metric-serif">{completedToday}/{todayHabits.length}</span>
          </div>
          {todayHabits.length ? (
            <div className="habit-quick-list">
              {todayHabits.slice(0, 4).map((habit) => {
              const completed = snapshot.habitLogs.some(
                (log) => log.habitId === habit.id && log.date === todayKey,
              );
              return (
                <button
                  key={habit.id}
                  className={`habit-quick ${completed ? "is-done" : ""}`}
                  onClick={() => planner.toggleHabit(habit.id, todayKey)}
                  aria-pressed={completed}
                >
                  <span className="habit-quick__icon"><Heart size={17} /></span>
                  <span>
                    <strong>{habit.name}</strong>
                    <small>{completed ? "Registrado" : "Hoy aún no se ha registrado"}</small>
                  </span>
                  {completed ? <Check size={18} /> : <Circle size={18} />}
                </button>
              );
              })}
            </div>
          ) : (
            <EmptyState
              title="Todavía sin hábitos para hoy"
              text="Crea uno pequeño y decide exactamente qué días quieres sostenerlo."
            />
          )}
          <Link to="/app/habits" className="card-link">Ver todos mis hábitos <ChevronRight size={16} /></Link>
        </Card>

        <Card className="mood-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Un minuto para ti</p>
              <h2>¿Cómo te sientes?</h2>
            </div>
            {todayMood && <Badge tone="sage">Registrado</Badge>}
          </div>
          <div className="mood-selector" role="group" aria-label="Selecciona tu ánimo">
            {moods.map((mood) => (
              <button
                key={mood.name}
                className={todayMood?.mood === mood.name ? "mood-option is-selected" : "mood-option"}
                onClick={() => planner.saveMood(mood.name, energy)}
                aria-label={mood.name}
              >
                <span>{mood.symbol}</span>
                <small>{mood.name}</small>
              </button>
            ))}
          </div>
          <div className="energy-row">
            <span>Energía</span>
            <div className="energy-scale" role="group" aria-label="Nivel de energía">
              {([1, 2, 3, 4, 5] as const).map((level) => (
                <button
                  key={level}
                  className={energy === level ? "is-selected" : ""}
                  onClick={() => setEnergy(level)}
                  aria-label={`Energía ${level}`}
                >{level}</button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {overdueTasks.length > 0 && (
        <section className="pending-banner">
          <span className="pending-banner__icon"><RotateCcw size={19} /></span>
          <div>
            <strong>{overdueTasks.length === 1 ? "Una tarea quedó pendiente" : `${overdueTasks.length} tareas quedaron pendientes`}</strong>
            <p>Puedes completarlas, moverlas o cancelarlas. Reprogramar también es avanzar.</p>
          </div>
          <Button variant="secondary" onClick={() => planner.rescheduleTask(overdueTasks[0].id, todayKey)}>
            Mover la primera a hoy
          </Button>
        </section>
      )}

      <div className="dashboard-grid dashboard-grid--bottom">
        <Card className="goals-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Dirección</p>
              <h2>Metas prioritarias</h2>
            </div>
            <Link to="/app/goals" className="icon-button" aria-label="Abrir metas"><Plus size={19} /></Link>
          </div>
          {activeGoals.length ? (
            <div className="goal-list">
              {activeGoals.map((goal) => {
                const progress = calculateGoalProgress(goal, snapshot.milestones, snapshot.tasks);
                return (
                  <Link to="/app/goals" className="goal-row" key={goal.id}>
                    <span className="goal-row__icon"><Target size={18} /></span>
                    <div>
                      <strong>{goal.title}</strong>
                      <ProgressBar value={progress} label="Progreso" />
                    </div>
                    <ChevronRight size={18} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Una dirección para empezar" text="Crea una meta clara y conecta tus hábitos con ella." />
          )}
        </Card>

        <Card className="week-progress-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Últimos 7 días</p>
              <h2>Tu ritmo esta semana</h2>
            </div>
            <Sparkles size={20} className="rose-icon" aria-hidden="true" />
          </div>
          <div className="mini-chart" aria-label="Cumplimiento de hábitos de los últimos siete días">
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="roseArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C98282" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#C98282" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9A8876", fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value}%`, "Hábitos"]} />
                <Area type="monotone" dataKey="value" stroke="#A96363" strokeWidth={2} fill="url(#roseArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-summary">Completaste {completedToday} de {todayHabits.length} hábitos programados hoy. Los días no programados no reducen tu porcentaje.</p>
        </Card>

        <Card className="review-card">
          <span className="review-card__label">Revisión semanal</span>
          <Clock3 size={23} aria-hidden="true" />
          <h2>Mira lo que<br />sí avanzó.</h2>
          <p>Una pausa breve para reconocer, ajustar y elegir la próxima semana.</p>
          <Link to="/app/journal" className="review-card__link">Abrir mi revisión <ArrowUpRight size={17} /></Link>
        </Card>
      </div>
    </div>
  );
}

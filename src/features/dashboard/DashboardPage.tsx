"use client";

import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Circle,
  Compass,
  HeartPulse,
  Landmark,
  Leaf,
  ListTodo,
  Quote,
  Sparkles,
  Target,
} from "lucide-react";
import { calculateFinanceSummary } from "@/src/domain/financeRules";
import { getDailyTopThree, getNextStep } from "@/src/domain/guidanceRules";
import { calculateGoalProgress, isHabitScheduledOn } from "@/src/domain/rules";
import { weeklyPlanningInsight } from "@/src/domain/cascadeRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { Card, EmptyState, ProgressBar } from "@/src/components/ui/Primitives";
import { useI18n } from "@/src/i18n/I18nProvider";

export function DashboardPage({ planner }: { planner: PlannerController }) {
  const { t, locale, formatDate } = useI18n();
  const { snapshot } = planner;
  const todayKey = toLocalDateKey(new Date());
  const mood = snapshot.moodLogs.find((item) => item.date === todayKey);
  const intention = snapshot.journalEntries.find((entry) => entry.date === todayKey && entry.title === "Intención del día")?.text
    ?? snapshot.profile?.dailyIntention
    ?? "";
  const topThree = getDailyTopThree(snapshot.tasks, todayKey);
  const todayTasks = snapshot.tasks.filter((task) => task.date === todayKey && task.status !== "cancelled");
  const primaryGoal = snapshot.goals.find((goal) => goal.status === "active");
  const goalProgress = primaryGoal ? calculateGoalProgress(primaryGoal, snapshot.milestones, snapshot.tasks) : 0;
  const nextStep = getNextStep(snapshot, todayKey);
  const activeHabits = snapshot.habits.filter((habit) => isHabitScheduledOn(habit, new Date()));
  const completedHabits = activeHabits.filter((habit) => snapshot.habitLogs.some((log) => log.habitId === habit.id && log.date === todayKey)).length;
  const finance = calculateFinanceSummary(snapshot, todayKey.slice(0, 7));
  const financeProfile = snapshot.financialProfiles[0];
  const currency = financeProfile?.baseCurrency ?? snapshot.profile?.baseCurrency ?? "COP";
  const privacy = financeProfile?.privacyMode ?? snapshot.profile?.financePrivacy ?? false;
  const money = (value: number) => privacy ? "••••" : new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  const insight = weeklyPlanningInsight(snapshot);
  const completedTasks = todayTasks.filter((task) => task.status === "completed").length;
  const emptyInsight = insight.summary.startsWith("Aún no hay") || insight.summary.startsWith("Todavía no hay");
  const setupSteps = [
    { label: "Define una dirección", done: snapshot.lifeAreas.some((area) => Boolean(area.vision || area.dream)), href: "/app/vision" },
    { label: "Crea tu primera meta", done: snapshot.goals.length > 0, href: "/app/goals" },
    { label: "Convierte la meta en un plan", done: snapshot.cascadePlans.some((plan) => plan.horizon === "monthly"), href: "/app/planning/monthly" },
    { label: "Prepara tu semana", done: snapshot.cascadePlans.some((plan) => plan.horizon === "weekly") || todayTasks.length > 0, href: "/app/planning/weekly" },
    { label: "Mira tu próximo paso", done: topThree.length > 0, href: "/app/today" },
  ];
  const setupDone = setupSteps.filter((step) => step.done).length;

  return <div className="page-stack story-dashboard">
    <header className="dashboard-greeting story-dashboard__header">
      <div><p className="eyebrow">MY BEST VERSION</p><h1>{t("Buenos días, {name}", { name: snapshot.profile?.name ?? "María" })}</h1><p>{formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })} · Life, but more you.</p></div>
      <Link className="button button--secondary" to="/app/today">Abrir mi día <ArrowRight size={16} /></Link>
    </header>

    {snapshot.profile?.activationCompleted === false && <Card className="activation-card">
      <div className="activation-card__intro"><span><Sparkles size={22} /></span><div><p className="eyebrow">Tu espacio está listo</p><h2>Construyamos solo lo necesario</h2><p>No necesitas configurarlo todo ahora. Sigue este recorrido corto para que My Best Version empiece a ayudarte.</p></div></div>
      <ProgressBar value={setupDone / setupSteps.length * 100} label="Progreso de configuración inicial" />
      <div className="activation-steps">{setupSteps.map((step, index) => <Link key={step.label} to={step.href} className={step.done ? "is-done" : ""}><span>{step.done ? <Check size={15} /> : index + 1}</span><strong>{step.label}</strong><ArrowRight size={15} /></Link>)}</div>
      <button className="text-button" onClick={() => planner.updateProfileSettings({ activationCompleted: true })}>Prefiero explorar por mi cuenta</button>
    </Card>}

    <section className="dashboard-state-row" aria-label="Estado actual">
      <Card className="state-card"><p className="eyebrow">Cómo llegas hoy</p><h2>{mood ? `${mood.mood} · Energía ${mood.energy}/5` : "Haz una pausa de un minuto"}</h2><p>{mood ? "Tu registro puede ayudarte a ajustar la carga de hoy." : "Registrar tu estado hace que el plan responda a tu energía real."}</p><Link to="/app/habits?checkin=1">{mood ? "Actualizar mi estado" : "Registrar cómo llego"} <ArrowRight size={15} /></Link></Card>
      <Card className="state-card"><p className="eyebrow">Tu intención</p><Quote size={20} /><h2>{intention || "¿Qué quieres recordar hoy?"}</h2><Link to="/app/today">{intention ? "Editar intención" : "Definir mi intención"} <ArrowRight size={15} /></Link></Card>
    </section>

    <section className="dashboard-direction-grid">
      <Card className="direction-card"><span className="story-icon"><Compass size={22} /></span><div><p className="eyebrow">Tu dirección</p>{primaryGoal ? <><h2>{primaryGoal.title}</h2><p>{primaryGoal.reason}</p><ProgressBar value={goalProgress} label={`Progreso de ${primaryGoal.title}`} /><strong>{goalProgress}%</strong></> : <EmptyState title="Todavía no hay una meta activa" text="Una meta convierte tu visión en una dirección visible." action={<Link className="button button--secondary" to="/app/goals">Crear mi primera meta</Link>} />}</div></Card>
      <Card className="next-action-card"><span className="story-icon"><Target size={22} /></span><div><p className="eyebrow">Tu próximo paso</p><h2>{nextStep.title}</h2><p>{primaryGoal ? `Relacionado con: ${primaryGoal.title}` : "Una acción concreta es suficiente para volver a moverte."}</p><Link className="button button--primary" to={nextStep.href}>Empezar <ArrowRight size={16} /></Link></div></Card>
    </section>

    <Card className="dashboard-today-story"><header><div><p className="eyebrow">Hoy</p><h2>Lo que importa y lo que cabe</h2></div><Link to="/app/today">Ver mi día <ArrowRight size={15} /></Link></header>
      {todayTasks.length ? <div className="dashboard-today-list">{todayTasks.slice(0, 6).map((task) => <button key={task.id} onClick={() => planner.toggleTask(task.id)}><span>{task.status === "completed" ? <Check size={15} /> : task.focusPriority ?? <Circle size={14} />}</span><div><strong className={task.status === "completed" ? "is-complete" : ""}>{task.title}</strong><small>{task.time || (task.focusPriority ? `Prioridad ${task.focusPriority}` : "No prioritaria")}</small></div></button>)}</div> : <EmptyState title="Tu día todavía tiene espacio" text="Añade una tarea desde Semana o crea una acción para hoy." action={<Link className="button button--secondary" to="/app/planning/weekly">Preparar mi semana</Link>} />}
    </Card>

    <section className="rhythm-section"><header><p className="eyebrow">Tu ritmo</p><h2>Señales simples, no otro dashboard</h2></header><div className="rhythm-grid">
      <Card><HeartPulse size={21} /><span>Hábitos de hoy</span>{activeHabits.length ? <strong>{completedHabits} de {activeHabits.length} hábitos</strong> : <small className="rhythm-empty">Aún no tienes hábitos</small>}<Link to="/app/habits">{activeHabits.length ? "Registrar" : "Crear hábito"}</Link></Card>
      <Card><ListTodo size={21} /><span>Tareas de hoy</span>{todayTasks.length ? <strong>{completedTasks} de {todayTasks.length} tareas</strong> : <small className="rhythm-empty">Todavía no hay tareas</small>}<Link to="/app/today">{todayTasks.length ? "Ver día" : "Agregar tarea"}</Link></Card>
      <Card><Landmark size={21} /><span>Ahorro registrado</span>{finance.savingsContributions > 0 ? <strong>{money(finance.savingsContributions)} ahorrados</strong> : <small className="rhythm-empty">Aún no registras ahorros</small>}<Link to="/app/finance">{finance.savingsContributions > 0 ? "Abrir finanzas" : "Ir a finanzas"}</Link></Card>
    </div></section>

    <Card className="dashboard-insight"><span><Sparkles size={21} /></span><div><p className="eyebrow">Lo que estamos notando</p><h2>{emptyInsight ? "Todavía estamos conociendo tu ritmo." : insight.summary}</h2><p>{emptyInsight ? "Con algunos registros más, podremos mostrarte tus avances." : insight.suggestion}</p></div><Link className="button button--secondary" to="/app/planning/weekly">Ajustar mi semana</Link></Card>

    <Card className="dashboard-review-story"><CalendarDays size={24} /><div><p className="eyebrow">Cierra el ciclo</p><h2>Weekly Reset</h2><p>Celebra, observa, suelta, ajusta y elige la próxima semana en un solo flujo.</p></div><Link className="button button--primary" to="/app/planning/weekly?reset=1">Iniciar Weekly Reset</Link></Card>

    <footer className="dashboard-quote"><Quote size={18} /><span>Pequeñas decisiones propias construyen una vida más tuya.</span><Leaf size={26} /></footer>
  </div>;
}

"use client";

import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, Feather, HeartPulse, Leaf, ListPlus, Quote, Sparkles, Target, TrendingUp, Utensils } from "lucide-react";
import { buildDashboardSummary } from "@/src/domain/dashboardSummary";
import { weeklyPlanningInsight } from "@/src/domain/cascadeRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { Card, EmptyState, ProgressBar } from "@/src/components/ui/Primitives";
import { useI18n } from "@/src/i18n/I18nProvider";

export function DashboardPage({ planner }: { planner: PlannerController }) {
  const { t, formatDate } = useI18n();
  const { snapshot } = planner;
  const summary = buildDashboardSummary(snapshot);
  const insight = weeklyPlanningInsight(snapshot);
  const setupSteps = [
    { label: "Define una dirección", done: snapshot.lifeAreas.some((area) => Boolean(area.vision || area.dream)), href: "/app/vision" },
    { label: "Crea tu primera meta", done: snapshot.goals.length > 0, href: "/app/goals" },
    { label: "Convierte la meta en un plan", done: snapshot.cascadePlans.some((plan) => plan.horizon === "monthly"), href: "/app/planning" },
    { label: "Prepara tu semana", done: snapshot.cascadePlans.some((plan) => plan.horizon === "weekly"), href: "/app/planning/weekly" },
  ];
  const setupDone = setupSteps.filter((step) => step.done).length;

  return <div className="page-stack overview-dashboard">
    <header className="overview-dashboard__header">
      <div><p className="eyebrow">MY BEST VERSION</p><h1>{t("Buenos días, {name}", { name: snapshot.profile?.name ?? "María" })} <span aria-hidden="true">👋</span></h1><p>Aquí tienes un vistazo a cómo estás avanzando.</p></div>
      <Link className="button button--secondary" to="/app/today">Ir a Mi día <ArrowRight size={16} /></Link>
    </header>

    <section className="overview-kpis" aria-label="Resumen general">
      <Link to="/app/progress"><Card><span><TrendingUp size={20} /></span><small>Avance de metas</small><strong>{summary.averageGoalProgress}%</strong><p>Promedio de metas activas</p></Card></Link>
      <Link to="/app/goals"><Card><span><Target size={20} /></span><small>Metas activas</small><strong>{summary.activeGoals.length}</strong><p>{summary.activeGoals.length ? "En movimiento" : "Aún sin metas activas"}</p></Card></Link>
      <Link to="/app/habits"><Card><span><Check size={20} /></span><small>Consistencia</small><strong>{summary.habitConsistency}%</strong><p>{summary.habitTotals.completed} de {summary.habitTotals.scheduled} días programados</p></Card></Link>
      <Link to="/app/habits?checkin=1"><Card><span><HeartPulse size={20} /></span><small>Bienestar</small><strong>{summary.wellbeing === null ? "—" : `${summary.wellbeing}/10`}</strong><p>{summary.wellbeing === null ? "Sin registros esta semana" : "Energía media de la semana"}</p></Card></Link>
    </section>

    {snapshot.profile?.activationCompleted === false && <Card className="activation-card overview-activation">
      <div className="activation-card__intro"><span><Sparkles size={22} /></span><div><p className="eyebrow">Tu espacio está listo</p><h2>Construyamos solo lo necesario</h2><p>Avanza por estas cuatro piezas cuando tenga sentido para ti.</p></div></div>
      <ProgressBar value={setupDone / setupSteps.length * 100} label="Progreso de configuración inicial" />
      <div className="activation-steps">{setupSteps.map((step, index) => <Link key={step.label} to={step.href} className={step.done ? "is-done" : ""}><span>{step.done ? <Check size={15} /> : index + 1}</span><strong>{step.label}</strong><ArrowRight size={15} /></Link>)}</div>
      <button className="text-button" onClick={() => planner.updateProfileSettings({ activationCompleted: true })}>Prefiero explorar por mi cuenta</button>
    </Card>}

    <section className="overview-primary-grid">
      <Card className="week-focus-card"><header><div><p className="eyebrow">Esta semana</p><h2>Lo más importante</h2></div><Link to="/app/planning/weekly">Ver mi semana <ArrowRight size={15} /></Link></header>
        <div className="week-focus-list">
          <div><span><Target size={18} /></span><small>Objetivo principal</small><strong>{summary.primaryGoal?.title ?? "Define una meta para darle dirección a tu semana"}</strong></div>
          <div><span><Sparkles size={18} /></span><small>Prioridad</small><strong>{summary.weeklyPlan?.priority || summary.weeklyPlan?.intention || "Elige lo que sí merece espacio"}</strong></div>
          <div><span><Check size={18} /></span><small>Próximo hito</small><strong>{summary.nextMilestone?.title ?? "Aún no hay un hito pendiente"}</strong></div>
        </div>
        <div className="week-progress-summary"><ProgressBar value={summary.weekTasks.percentage} label="Tareas completadas esta semana" /><span>{summary.weekTasks.completed} de {summary.weekTasks.total} tareas</span></div>
      </Card>

      <Card className="upcoming-events-card"><header><div><p className="eyebrow">Agenda</p><h2>Próximos eventos</h2></div><Link to="/app/life-hub?tab=events">Ver calendario <ArrowRight size={15} /></Link></header>
        {summary.upcomingEvents.length ? <div className="upcoming-event-list">{summary.upcomingEvents.map((event) => <article key={event.id}><time dateTime={event.startDate}>{formatDate(new Date(`${event.startDate}T12:00:00`), { weekday: "short", day: "numeric", month: "short" })}</time><div><strong>{event.title}</strong><small>{event.time || "Todo el día"}</small></div></article>)}</div> : <EmptyState title="Tu calendario tiene espacio" text="Cuando guardes un evento, aparecerá aquí sin llenar tu vista." />}
      </Card>
    </section>

    <section className="quick-access-section"><header><p className="eyebrow">Accesos rápidos</p><h2>Ir directo a lo que necesitas</h2></header><div className="quick-access-grid">
      <Link to="/app/tasks"><ListPlus size={20} /><span>Nueva tarea</span></Link>
      <Link to="/app/habits"><Check size={20} /><span>Registrar hábito</span></Link>
      <Link to="/app/health"><Utensils size={20} /><span>Añadir comida</span></Link>
      <Link to="/app/journal"><Feather size={20} /><span>Escribir en mi diario</span></Link>
      <Link to="/app/life-hub?tab=events"><CalendarDays size={20} /><span>Abrir calendario</span></Link>
    </div></section>

    <Card className="dashboard-insight overview-insight"><span><Sparkles size={21} /></span><div><p className="eyebrow">Lo que estamos notando</p><h2>{insight.summary.startsWith("Aún no hay") || insight.summary.startsWith("Todavía no hay") ? "Todavía estamos conociendo tu ritmo." : insight.summary}</h2><p>{insight.summary.startsWith("Aún no hay") || insight.summary.startsWith("Todavía no hay") ? "Con algunos registros más, podremos mostrarte tus avances." : insight.suggestion}</p></div><Link className="button button--secondary" to="/app/progress">Ver progreso</Link></Card>

    <footer className="dashboard-quote"><Quote size={18} /><span>Pequeñas decisiones propias construyen una vida más tuya.</span><Leaf size={26} /></footer>
  </div>;
}

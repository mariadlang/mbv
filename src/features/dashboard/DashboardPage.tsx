"use client";

import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, Feather, HeartPulse, Leaf, ListPlus, Quote, Sparkles, Target, TrendingUp, Utensils } from "lucide-react";
import { buildDashboardSummary } from "@/src/domain/dashboardSummary";
import { weeklyPlanningInsight } from "@/src/domain/cascadeRules";
import { getDailyTopThree } from "@/src/domain/guidanceRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { Card, EmptyState, ProgressBar } from "@/src/components/ui/Primitives";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { QuickCaptureDefaults } from "@/src/features/tasks/QuickCaptureDrawer";
import { toLocalDateKey } from "@/src/lib/dates";

export function DashboardPage({ planner, onQuickCapture }: { planner: PlannerController; onQuickCapture: (defaults: QuickCaptureDefaults) => void }) {
  const { m, formatDate, formatNumber, formatPlural } = useI18n();
  const { snapshot } = planner;
  const summary = buildDashboardSummary(snapshot);
  const insight = weeklyPlanningInsight(snapshot);
  const todayPriorities = getDailyTopThree(snapshot.tasks, toLocalDateKey(new Date()));
  const profileName = snapshot.profile?.name;
  const setupSteps = [
    { label: m("dashboard.setup.step.direction"), done: snapshot.lifeAreas.some((area) => Boolean(area.vision || area.dream)), href: "/app/vision" },
    { label: m("dashboard.setup.step.firstGoal"), done: snapshot.goals.length > 0, href: "/app/goals" },
    { label: m("dashboard.setup.step.goalToPlan"), done: snapshot.cascadePlans.some((plan) => plan.horizon === "monthly"), href: "/app/planning" },
    { label: m("dashboard.setup.step.week"), done: snapshot.cascadePlans.some((plan) => plan.horizon === "weekly"), href: "/app/planning/weekly" },
  ];
  const setupDone = setupSteps.filter((step) => step.done).length;
  const insightSummary = insight.summaryKind === "completed"
    ? formatPlural(insight.total, {
      one: m("dashboard.insight.completedOne", { completed: formatNumber(insight.completed), total: formatNumber(insight.total) }),
      other: m("dashboard.insight.completed", { completed: formatNumber(insight.completed), total: formatNumber(insight.total) }),
    })
    : m("dashboard.insight.learningTitle");
  const insightSuggestion = insight.summaryKind === "insufficient_data"
    ? m("dashboard.insight.learningText")
    : insight.suggestionKind === "sustainable"
      ? m("dashboard.insight.sustainable")
      : insight.suggestionKind === "reduce_project"
        ? m("dashboard.insight.reduceProject", { projectName: insight.projectName ?? "" })
        : m("dashboard.insight.chooseResults");

  return <div className="page-stack overview-dashboard" data-i18n-explicit="true">
    <header className="overview-dashboard__header">
      <div><p className="eyebrow">{m("dashboard.brand.eyebrow")}</p><h1>{m("dashboard.header.greeting")} <span data-no-translate={profileName ? "true" : undefined}>{profileName ?? m("dashboard.header.fallbackName")}</span></h1><p>{m("dashboard.header.description")}</p></div>
      <Link className="button button--secondary" to="/app/today">{m("dashboard.header.todayCta")} <ArrowRight size={16} /></Link>
    </header>

    <section className="overview-kpis" aria-label={m("dashboard.summary.ariaLabel")}>
      <Link to="/app/progress"><Card><span><TrendingUp size={20} /></span><small>{m("dashboard.kpi.goalProgress.label")}</small><strong>{formatNumber(summary.averageGoalProgress)}%</strong><p>{m("dashboard.kpi.goalProgress.helper")}</p></Card></Link>
      <Link to="/app/goals"><Card><span><Target size={20} /></span><small>{m("dashboard.kpi.activeGoals.label")}</small><strong>{formatNumber(summary.activeGoals.length)}</strong><p>{summary.activeGoals.length ? m("dashboard.kpi.activeGoals.moving") : m("dashboard.kpi.activeGoals.empty")}</p></Card></Link>
      <Link to="/app/habits"><Card><span><Check size={20} /></span><small>{m("dashboard.kpi.consistency.label")}</small><strong>{formatNumber(summary.habitConsistency)}%</strong><p>{formatPlural(summary.habitTotals.scheduled, { one: m("dashboard.kpi.consistency.scheduledDay", { completed: formatNumber(summary.habitTotals.completed), scheduled: formatNumber(summary.habitTotals.scheduled) }), other: m("dashboard.kpi.consistency.scheduledDays", { completed: formatNumber(summary.habitTotals.completed), scheduled: formatNumber(summary.habitTotals.scheduled) }) })}</p></Card></Link>
      <Link to="/app/habits?checkin=1"><Card><span><HeartPulse size={20} /></span><small>{m("dashboard.kpi.wellbeing.label")}</small><strong>{summary.wellbeing === null ? "—" : `${formatNumber(summary.wellbeing)}/10`}</strong><p>{summary.wellbeing === null ? m("dashboard.kpi.wellbeing.empty") : m("dashboard.kpi.wellbeing.helper")}</p></Card></Link>
    </section>

    {snapshot.profile?.activationCompleted === false && <Card className="activation-card overview-activation">
      <div className="activation-card__intro"><span><Sparkles size={22} /></span><div><p className="eyebrow">{m("dashboard.activation.eyebrow")}</p><h2>{m("dashboard.activation.title")}</h2><p>{m("dashboard.activation.description")}</p></div></div>
      <ProgressBar value={setupDone / setupSteps.length * 100} label={m("dashboard.activation.progressLabel")} />
      <div className="activation-steps">{setupSteps.map((step, index) => <Link key={step.href} to={step.href} className={step.done ? "is-done" : ""}><span>{step.done ? <Check size={15} /> : index + 1}</span><strong>{step.label}</strong><ArrowRight size={15} /></Link>)}</div>
      <button className="text-button" onClick={() => planner.updateProfileSettings({ activationCompleted: true })}>{m("dashboard.activation.explore")}</button>
    </Card>}

    <section className="overview-primary-grid">
      <Card className="week-focus-card"><header><div><p className="eyebrow">{m("dashboard.week.eyebrow")}</p><h2>{m("dashboard.week.title")}</h2></div><Link to="/app/planning/weekly">{m("dashboard.week.cta")} <ArrowRight size={15} /></Link></header>
        <div className="week-focus-list">
          <div><span><Target size={18} /></span><small>{m("dashboard.week.mainGoal")}</small><strong data-no-translate={summary.primaryGoal ? "true" : undefined}>{summary.primaryGoal?.title ?? m("dashboard.week.mainGoalEmpty")}</strong></div>
          <div><span><Sparkles size={18} /></span><small>{m("dashboard.week.todayPriorities")}</small><strong>{todayPriorities.length ? todayPriorities.map((task, index) => <span key={task.id}>{index > 0 ? " · " : ""}<span data-no-translate="true">{task.title}</span></span>) : m("dashboard.week.todayPrioritiesEmpty")}</strong></div>
          <div><span><Check size={18} /></span><small>{m("dashboard.week.nextMilestone")}</small><strong data-no-translate={summary.nextMilestone ? "true" : undefined}>{summary.nextMilestone?.title ?? m("dashboard.week.nextMilestoneEmpty")}</strong></div>
        </div>
        <div className="week-progress-summary"><ProgressBar value={summary.weekTasks.percentage} label={m("dashboard.week.progressLabel")} /><span>{formatPlural(summary.weekTasks.total, { one: m("dashboard.week.taskCountOne", { completed: formatNumber(summary.weekTasks.completed), total: formatNumber(summary.weekTasks.total) }), other: m("dashboard.week.taskCount", { completed: formatNumber(summary.weekTasks.completed), total: formatNumber(summary.weekTasks.total) }) })}</span></div>
      </Card>

      <Card className="upcoming-events-card"><header><div><p className="eyebrow">{m("dashboard.agenda.eyebrow")}</p><h2>{m("dashboard.agenda.title")}</h2></div><Link to="/app/life-hub?tab=events">{m("dashboard.agenda.cta")} <ArrowRight size={15} /></Link></header>
        {summary.upcomingEvents.length ? <div className="upcoming-event-list">{summary.upcomingEvents.map((event) => <article key={event.id}><time dateTime={event.startDate}>{formatDate(new Date(`${event.startDate}T12:00:00`), { weekday: "short", day: "numeric", month: "short" })}</time><div><strong data-no-translate="true">{event.title}</strong><small>{m("dashboard.agenda.eventHelper")}</small></div></article>)}</div> : <EmptyState title={m("dashboard.agenda.emptyTitle")} text={m("dashboard.agenda.emptyText")} />}
      </Card>
    </section>

    <section className="quick-access-section"><header><p className="eyebrow">{m("dashboard.quickAccess.eyebrow")}</p><h2>{m("dashboard.quickAccess.title")}</h2></header><div className="quick-access-grid">
      <button type="button" onClick={() => onQuickCapture({ source: "dashboard" })}><ListPlus size={20} /><span>{m("dashboard.quickAccess.newTask")}</span></button>
      <Link to="/app/habits"><Check size={20} /><span>{m("dashboard.quickAccess.logHabit")}</span></Link>
      <Link to="/app/health"><Utensils size={20} /><span>{m("dashboard.quickAccess.addMeal")}</span></Link>
      <Link to="/app/journal"><Feather size={20} /><span>{m("dashboard.quickAccess.writeJournal")}</span></Link>
      <Link to="/app/life-hub?tab=events"><CalendarDays size={20} /><span>{m("dashboard.quickAccess.openCalendar")}</span></Link>
    </div></section>

    <Card className="dashboard-insight overview-insight"><span><Sparkles size={21} /></span><div><p className="eyebrow">{m("dashboard.insight.eyebrow")}</p><h2>{insightSummary}</h2><p>{insightSuggestion}</p></div><Link className="button button--secondary" to="/app/progress">{m("dashboard.insight.cta")}</Link></Card>

    <footer className="dashboard-quote"><Quote size={18} /><span>{m("dashboard.quote")}</span><Leaf size={26} /></footer>
  </div>;
}

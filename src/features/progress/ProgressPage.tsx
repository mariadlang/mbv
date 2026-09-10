"use client";

import { Award, CheckCircle2, ChevronRight, HeartPulse, Sparkles, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateGoalProgress } from "@/src/domain/rules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { getRecentDates, toLocalDateKey } from "@/src/lib/dates";
import { Badge, Card, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";
import { Link } from "react-router-dom";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";
import { buildProgressEvidence, type ProgressAchievement } from "@/src/domain/progressEvidence";
import type { GoalProgressType } from "@/src/domain/planner";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { NavigationSpaceProgressMessageKey } from "@/src/i18n/messages/features/navigation-space-progress";

const achievementMessageKeys: Record<ProgressAchievement["id"], {
  title: NavigationSpaceProgressMessageKey;
  description: NavigationSpaceProgressMessageKey;
  condition: NavigationSpaceProgressMessageKey;
}> = {
  "first-task": { title: "progress.achievement.firstTask.title", description: "progress.achievement.firstTask.description", condition: "progress.achievement.firstTask.condition" },
  "first-habit": { title: "progress.achievement.firstHabit.title", description: "progress.achievement.firstHabit.description", condition: "progress.achievement.firstHabit.condition" },
  "connected-action": { title: "progress.achievement.connectedAction.title", description: "progress.achievement.connectedAction.description", condition: "progress.achievement.connectedAction.condition" },
  "intentional-week": { title: "progress.achievement.intentionalDays.title", description: "progress.achievement.intentionalDays.description", condition: "progress.achievement.intentionalDays.condition" },
};

const goalSourceMessageKeys: Record<GoalProgressType, NavigationSpaceProgressMessageKey> = {
  milestones: "progress.goalSource.milestones",
  numeric: "progress.goalSource.numeric",
  tasks: "progress.goalSource.tasks",
  manual: "progress.goalSource.manual",
};

export function ProgressPage({ planner }: { planner: PlannerController }) {
  const { m, formatDate } = useI18n();
  const { snapshot } = planner;
  const dates = getRecentDates(7);
  const chartData = dates.map((date) => {
    const key = toLocalDateKey(date);
    return {
      day: formatDate(date, { weekday: "short" }),
      habits: snapshot.habitLogs.filter((log) => log.date === key).length,
      tasks: snapshot.tasks.filter((task) => task.date === key && task.status === "completed").length,
    };
  });
  const evidence = buildProgressEvidence(snapshot);
  const activeGoals = snapshot.goals.filter((goal) => goal.status === "active");
  const activeGoalProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((sum, goal) => sum + calculateGoalProgress(goal, snapshot.milestones, snapshot.tasks), 0) / activeGoals.length)
    : 0;

  return (
    <div className="page-stack" data-i18n-explicit="true">
      <SectionNavigation section="progress" />
      <SectionHeading
        eyebrow={m("progress.header.eyebrow")}
        title={m("progress.header.title")}
        description={m("progress.header.description")}
        action={<Badge tone="sage"><Sparkles size={14} /> {m("progress.lastSevenDays")}</Badge>}
      />

      <div className="metric-grid metric-grid--four">
        <Card className="metric-card metric-card--rose"><span className="metric-card__icon"><Target size={20} /></span><p>{m("progress.metric.goals")}</p><strong>{activeGoalProgress}%</strong><small>{m("progress.metric.goals.source")}</small></Card>
        <Card className="metric-card"><span className="metric-card__icon"><CheckCircle2 size={20} /></span><p>{m("progress.metric.tasks")}</p><strong>{evidence.completedTasks}</strong><small>{m("progress.metric.tasks.source")}</small></Card>
        <Card className="metric-card"><span className="metric-card__icon"><HeartPulse size={20} /></span><p>{m("progress.metric.habits")}</p><strong>{snapshot.habitLogs.length}</strong><small>{m("progress.metric.habits.source")}</small></Card>
        <Card className="metric-card"><span className="metric-card__icon"><Award size={20} /></span><p>{m("progress.metric.milestones")}</p><strong>{evidence.completedMilestones}</strong><small>{m("progress.metric.milestones.source")}</small></Card>
      </div>

      <div className="progress-layout" id="statistics">
        <Card className="progress-chart-card">
          <div className="card-heading">
            <div><p className="eyebrow">{m("progress.lastSevenDays")}</p><h2>{m("progress.chart.title")}</h2></div>
            <div className="chart-legend"><span><i className="legend-dot legend-dot--rose" /> {m("progress.chart.habits")}</span><span><i className="legend-dot legend-dot--sage" /> {m("progress.chart.tasks")}</span></div>
          </div>
          <div className="large-chart" role="img" aria-label={m("progress.chart.ariaLabel")}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="3 5" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "var(--color-surface-muted)" }} contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Bar dataKey="habits" name={m("progress.chart.habits")} fill="var(--color-brand)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="tasks" name={m("progress.chart.tasks")} fill="var(--color-accent-lavender)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-summary">{m("progress.chart.summary")}</p>
        </Card>

        {evidence.latestAchievement ? <Card className="achievement-card">
          <span className="achievement-card__icon"><Award size={25} /></span>
          <p className="eyebrow">{m("progress.achievement.recent")}</p>
          <h2>{m(achievementMessageKeys[evidence.latestAchievement.id].title)}</h2>
          <p>{m(achievementMessageKeys[evidence.latestAchievement.id].description)}</p>
          <span className="achievement-card__date">{m("progress.achievement.date", { condition: m(achievementMessageKeys[evidence.latestAchievement.id].condition), date: formatDate(evidence.latestAchievement.achievedAt.slice(0, 10), { dateStyle: "medium" }) })}</span>
        </Card> : <Card className="progress-empty-state"><span className="achievement-card__icon"><Sparkles size={25} /></span><p className="eyebrow">{m("progress.empty.eyebrow")}</p><h2>{m("progress.empty.title")}</h2><p>{m("progress.empty.description")}</p><Link className="button button--primary" to="/app/today">{m("progress.empty.action")}</Link></Card>}
      </div>

      <Card className="goals-closer-card">
        <div className="card-heading"><div><p className="eyebrow">{m("progress.goals.eyebrow")}</p><h2>{m("progress.goals.title")}</h2><p>{m("progress.goals.description")}</p></div><Badge tone="neutral">{m("progress.goals.badge")}</Badge></div>
        <div className="progress-goal-list progress-goal-list--editorial">
          {snapshot.goals.map((goal) => {
            const progress = calculateGoalProgress(goal, snapshot.milestones, snapshot.tasks);
            const milestones = snapshot.milestones.filter((item) => item.goalId === goal.id);
            const completed = milestones.filter((item) => item.status === "completed").length;
            const nextMilestone = milestones.find((item) => item.status !== "completed");
            const nextTask = snapshot.tasks.find((item) => item.goalId === goal.id && item.status !== "completed" && item.status !== "cancelled");
            return <article key={goal.id}><span className="goal-editorial-icon"><Target size={20} /></span><div className="goal-editorial-main"><strong>{goal.title}</strong><small>{goal.progressType === "milestones" ? m("progress.goalSource.withCount", { source: m(goalSourceMessageKeys[goal.progressType]), completed, total: milestones.length }) : m(goalSourceMessageKeys[goal.progressType])}</small><ProgressBar value={progress} label={m("progress.goals.progressLabel")} /></div><div className="goal-editorial-next"><small>{m("progress.goals.nextStep")}</small><strong>{nextTask?.title ?? nextMilestone?.title ?? m("progress.goals.defineAction")}</strong><Link to="/app/goals">{m("progress.goals.viewPath")} <ChevronRight size={15} /></Link></div><b>{progress}%</b></article>;
          })}
          {!snapshot.goals.length && <p className="support-copy">{m("progress.goals.empty")}</p>}
        </div>
      </Card>

      <div className="progress-bottom-grid">
        <Card><div className="card-heading"><div><p className="eyebrow">{m("progress.lifeAreas.eyebrow")}</p><h2>{m("progress.lifeAreas.title")}</h2><p>{m("progress.lifeAreas.description")}</p></div></div><div className="life-area-score-list">{snapshot.lifeAreas.filter((area) => area.active).map((area) => <div key={area.id}><span>{area.name}</span><strong>{area.currentScore ?? "—"}/10</strong></div>)}</div></Card>
        <Card className="weekly-review-cta"><Sparkles size={24} /><p className="eyebrow">{m("progress.review.eyebrow")}</p><h2>{evidence.completedTasks ? m("progress.review.withEvidence.title") : m("progress.review.empty.title")}</h2><p>{evidence.completedTasks ? m(evidence.completedTasks === 1 ? "progress.review.withEvidence.one" : "progress.review.withEvidence.many", { count: evidence.completedTasks }) : m("progress.review.empty.description")}</p><Link className="button button--secondary" to="/app/planning/weekly?reset=1">{m("progress.review.action")}</Link></Card>
      </div>
    </div>
  );
}

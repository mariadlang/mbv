"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, ChevronRight, Circle, Heart, Target, Zap, type LucideIcon } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { PlannerSnapshot } from "@/src/domain/planner";
import type { QuickCaptureDefaults } from "@/src/features/tasks/QuickCaptureDrawer";
import { useI18n } from "@/src/i18n/I18nProvider";
import { homePeriod, homeProject, homeWeekPriorities, upcomingCommitments } from "@/src/domain/homeOverview";
import { EditorialCard, PreparationChecklist } from "./PreparationShared";

// Each summary is independent. A rendering failure never hides the other blocks.
class OverviewBoundary extends Component<{ children: ReactNode; fallback: (retry: () => void) => ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback(() => this.setState({ failed: false })) : this.props.children; }
}
function HomeBlock({ children, className }: { children: ReactNode; className: string }) {
  const { m } = useI18n();
  return <div className={className}><OverviewBoundary fallback={(retry) => <EditorialCard><p role="alert">{m("homeOverview.error")}</p><button className="prep-text-link" onClick={retry}>{m("homeOverview.retry")}</button></EditorialCard>}>{children}</OverviewBoundary></div>;
}
function BlockHeading({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return <header className="prep-card-heading"><span className="prep-icon"><Icon aria-hidden="true" /></span><div><h2>{title}</h2>{children}</div></header>;
}
function MonthDirection({ snapshot, month }: { snapshot: PlannerSnapshot; month: string }) {
  const { m, formatDate, formatNumber } = useI18n();
  const plan = snapshot.cascadePlans.find((item) => item.horizon === "monthly" && item.periodKey === month);
  return <EditorialCard className="home-direction"><BlockHeading icon={Target} title={m("homeOverview.month")} /><time dateTime={month}>{formatDate(month + "-01", { month: "long", year: "numeric" })}</time>
    <div className="home-direction-body"><div><span className="prep-eyebrow">{m("preparation.intention")}</span><h3 data-no-translate="true">{plan?.intention || m("preparation.emptyMonth")}</h3>
      {plan?.objectives.length ? <ol className="prep-priorities">{plan.objectives.slice(0, 3).map((title, index) => <li key={index}><span>{formatNumber(index + 1)}</span><span data-no-translate="true">{title}</span></li>)}</ol> : <p className="home-empty">{m("preparation.emptyPriorities")}</p>}
      <Link className="prep-primary" to={"/app/planning?" + (plan ? "view=month" : "create=month") + "&month=" + month}>{m(plan ? "homeOverview.viewMonth" : "homeOverview.defineMonth")}<ArrowRight size={17} aria-hidden="true" /></Link></div>
      <div className="home-stationery" aria-hidden="true"><div className="home-notebook"><span /><span /><span /><span /><span /></div><i className="home-pen" /></div>
    </div>
  </EditorialCard>;
}
function WeekOverview({ snapshot, period }: { snapshot: PlannerSnapshot; period: ReturnType<typeof homePeriod> }) {
  const { m, formatDate, formatNumber } = useI18n();
  const href = "/app/planning/weekly?date=" + period.week;
  const priorities = homeWeekPriorities(snapshot, period.week, period.dates[6]);
  return <EditorialCard className="home-week"><BlockHeading icon={CalendarDays} title={m("homeOverview.week")}><p>{formatDate(period.dates[0], { day: "numeric", month: "short" })} – {formatDate(period.dates[6], { day: "numeric", month: "long" })}</p></BlockHeading>
    <div className="home-week-strip">{period.dates.map((date) => <Link key={date} to={"/app/planning?view=day&date=" + date} aria-current={date === period.today ? "date" : undefined} aria-label={formatDate(date, { weekday: "long", day: "numeric", month: "long" })}><small>{formatDate(date, { weekday: "short" })}</small><strong>{formatDate(date, { day: "numeric" })}</strong></Link>)}</div>
    <h3>{m("homeOverview.priorities")}</h3><ol className="home-week-priorities">{priorities.map((priority, index) => <li key={priority.id}><span className="home-number">{formatNumber(index + 1)}</span><span data-no-translate="true">{priority.title}</span><span className={"home-status " + (priority.status === "completed" ? "is-ready" : "")}>{priority.status === "completed" ? <Check size={14} aria-hidden="true" /> : <Circle size={12} aria-hidden="true" />}{m(priority.status === "completed" ? "homeOverview.completed" : priority.status === "in_progress" ? "homeOverview.inProgress" : priority.status ? "homeOverview.planned" : "homeOverview.pending")}</span></li>)}</ol>
    {!priorities.length && <p className="home-empty">{m("homeOverview.weekEmpty")}</p>}
    <footer><Link className="prep-text-link" to={href + (priorities.length ? "" : "#weekly-priorities")}>{m(priorities.length ? "preparation.viewWeek" : "homeOverview.choosePriorities")} <ArrowRight size={16} aria-hidden="true" /></Link></footer>
  </EditorialCard>;
}
function ActiveProject({ snapshot }: { snapshot: PlannerSnapshot }) {
  const { m, formatNumber } = useI18n();
  const data = homeProject(snapshot);
  return <EditorialCard className="home-project"><BlockHeading icon={Zap} title={m("homeOverview.project")} />
    {data ? <div className="home-project-body"><h3 data-no-translate="true">{data.project.name}</h3><p>{data.execution.total ? m("homeOverview.progress", { completed: formatNumber(data.execution.completed), total: formatNumber(data.execution.total) }) : m("homeOverview.projectNoSteps")}</p><p className="home-next-action">{m("homeOverview.next")} <span data-no-translate="true">{data.execution.nextTitle || m(data.execution.state === "ready_to_close" ? "homeOverview.closeProject" : "homeOverview.defineNext")}</span></p></div> : <p className="home-empty">{m("homeOverview.projectEmpty")}</p>}
    <footer><Link className="prep-text-link" to={data ? "/app/tasks?project=" + encodeURIComponent(data.project.id) : "/app/tasks?create=project"}>{m(data ? "homeOverview.viewProject" : "homeOverview.createProject")} <ArrowRight size={16} aria-hidden="true" /></Link></footer>
  </EditorialCard>;
}
function Upcoming({ snapshot, now }: { snapshot: PlannerSnapshot; now: Date }) {
  const { m, formatDate } = useI18n();
  const events = upcomingCommitments(snapshot.events, now);
  return <EditorialCard className="home-upcoming"><BlockHeading icon={CalendarDays} title={m("homeOverview.upcoming")} />
    {events.length ? <ul>{events.map(({ event, date, time }) => <li key={event.id}><Link to={"/app/life-hub?tab=events&event=" + encodeURIComponent(event.id)}><span className="home-event-date"><small>{formatDate(date, { weekday: "short" })}</small><strong>{formatDate(date, { day: "numeric" })}</strong></span><span><time dateTime={date}>{formatDate(date, { day: "numeric", month: "short" })} · {time || m(event.allDay ? "homeOverview.allDay" : "homeOverview.noTime")}</time><strong data-no-translate="true">{event.title}</strong></span><ChevronRight size={18} aria-hidden="true" /></Link></li>)}</ul> : <p className="home-empty">{m("homeOverview.eventsEmpty")}</p>}
    <footer><Link className="prep-text-link" to="/app/life-hub?tab=events">{m("homeOverview.viewCalendar")} <ArrowRight size={16} aria-hidden="true" /></Link></footer>
  </EditorialCard>;
}
export function EditorialDashboard({ planner }: { planner: PlannerController; onQuickCapture?: (defaults: QuickCaptureDefaults) => void }) {
  const { m, formatDate } = useI18n();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const period = homePeriod(now);
  if (planner.loading) return <p role="status">{m("homeOverview.loading")}</p>;
  return <div className="home-overview" data-i18n-explicit="true">
    <header className="prep-heading home-heading"><div><span className="prep-eyebrow">{m("preparation.home")}</span><h1>{m("preparation.title.home")} <Heart className="prep-drawn-heart" aria-hidden="true" /></h1><p>{m("homeOverview.subtitle")}</p></div><time dateTime={period.today}>{formatDate(period.today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</time></header>
    <div className="home-overview-grid">
      <div className="home-column">
      <HomeBlock className="home-block-preparation"><PreparationChecklist planner={planner} week={period.week} overview /></HomeBlock>
      <HomeBlock className="home-block-month"><MonthDirection snapshot={planner.snapshot} month={period.month} /></HomeBlock>
      </div><div className="home-column">
      <HomeBlock className="home-block-week"><WeekOverview snapshot={planner.snapshot} period={period} /></HomeBlock>
      <HomeBlock className="home-block-project"><ActiveProject snapshot={planner.snapshot} /></HomeBlock>
      <HomeBlock className="home-block-upcoming"><Upcoming snapshot={planner.snapshot} now={now} /></HomeBlock>
      </div>
    </div>
  </div>;
}

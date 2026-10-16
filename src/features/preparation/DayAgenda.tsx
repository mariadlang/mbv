"use client";

import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Circle, Dumbbell, Pencil, Plus, Utensils } from "lucide-react";
import type { Task } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { QuickCaptureDefaults } from "@/src/features/tasks/QuickCaptureDrawer";
import { useCalendarIntegration } from "@/src/hooks/useCalendarIntegration";
import { calendarEventOccursOnDate, calendarEventTimeLabel } from "@/src/domain/calendar";
import { agendaInterval, agendaPoint, layoutAgendaWithPoints, type AgendaSource } from "@/src/domain/hourlyAgenda";
import { isHabitLogComplete, isHabitScheduledOn } from "@/src/domain/rules";
import { getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { useI18n } from "@/src/i18n/I18nProvider";
import { EditorialCard, localDate, usePreparationOperation } from "./PreparationShared";

/** A dated view over canonical records, shared with the daily and weekly editors. */
export function DayAgenda({ planner, date, onDateChange, readOnly = false, onEditTask, onQuickCapture, taskDetail, mode = "day", embedded = false }: {
  planner: PlannerController; date: string; onDateChange: (date: string) => void; readOnly?: boolean;
  onEditTask: (task: Task) => void; onQuickCapture: (defaults: QuickCaptureDefaults) => void;
  taskDetail?: (task: Task) => string;
  mode?: "day" | "week"; embedded?: boolean;
}) {
  const { m, formatDate } = useI18n();
  const { snapshot } = planner;
  const calendar = useCalendarIntegration();
  const operation = usePreparationOperation();
  const dates = getWeekDates(localDate(date), 1);
  const tasks = snapshot.tasks.filter((task) => task.status !== "cancelled" && (task.date === date || (task.date && agendaInterval({ id: task.id, startDate: task.date, startTime: task.time, durationMinutes: task.estimatedMinutes }, date))));
  const events = snapshot.events.filter((event) => event.status !== "cancelled" && event.startDate <= date && (event.endDate || event.startDate) >= date);
  const external = calendar.events.filter((event) => calendarEventOccursOnDate(event, date) && (!event.localEventId || !events.some((local) => local.id === event.localEventId)));
  const habits = snapshot.habits.filter((habit) => habit.status === "active" && isHabitScheduledOn(habit, localDate(date)));
  const nutrition = snapshot.nutritionLogs.find((log) => log.date === date);
  const workout = snapshot.workoutLogs.find((log) => log.date === date);
  const shift = (amount: number) => { const next = localDate(date); next.setDate(next.getDate() + amount); onDateChange(toLocalDateKey(next)); };
  const agenda: Array<AgendaSource & { title: string; kind: "task" | "event" | "external"; content: ReactNode; task?: Task }> = [
    ...tasks.map((task) => ({ id: `task-${task.id}`, startDate: task.date!, startTime: task.time, durationMinutes: task.estimatedMinutes, title: task.title, kind: "task" as const, task, content: <><button className="prep-check" disabled={readOnly || operation.busy} aria-label={m(task.status === "completed" ? "planning.day.reopenTask" : "planning.day.completeTask", { task: task.title, readOnly: "" })} aria-pressed={task.status === "completed"} onClick={() => operation.run(() => planner.toggleTask(task.id))}>{task.status === "completed" ? <Check size={16} /> : <Circle size={16} />}</button><button className="prep-agenda-edit" disabled={readOnly} aria-label={m("editorialDay.move", { title: task.title })} onClick={() => onEditTask(task)}><strong className={task.status === "completed" ? "is-complete" : ""} data-no-translate="true">{task.title}</strong>{(task.description || taskDetail) && <small data-no-translate="true">{[task.description, taskDetail?.(task)].filter(Boolean).join(" · ")}</small>}</button><Pencil size={14} aria-hidden="true" /></> })),
    ...events.map((event) => ({ ...event, id: `event-${event.id}`, startTime: event.startTime || event.time, title: event.title, kind: "event" as const, content: <><CalendarDays size={19} /><Link className="prep-agenda-edit" to={`/app/life-hub?tab=events&date=${date}&event=${encodeURIComponent(event.id)}`}><strong data-no-translate="true">{event.title}</strong><small>{calendarEventTimeLabel({ allDay: event.allDay ?? !(event.startTime || event.time), startTime: event.startTime || event.time, endTime: event.endTime }, m("calendar.event.allDay"))}</small></Link></> })),
    ...external.map((event) => ({ ...event, id: `external-${event.id}`, kind: "external" as const, content: <><CalendarDays size={19} /><div className="prep-agenda-edit"><strong data-no-translate="true">{event.title}</strong><small>{calendarEventTimeLabel(event, m("calendar.event.allDay"))}</small></div></> })),
  ].filter((item) => !("endDate" in item && item.endDate === date && item.startDate < date && "endTime" in item && item.endTime === "00:00" && !item.allDay)).sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
  const minutePixels = 1.5;
  const pointHeightPixels = 52;
  const { intervals, points } = layoutAgendaWithPoints(
    agenda.flatMap((item) => { const interval = agendaInterval(item, date); return interval ? [interval] : []; }),
    agenda.flatMap((item) => { const point = item.task && agendaPoint(item, date); return point ? [point] : []; }),
    { pixelsPerMinute: minutePixels, pointHeightPixels },
  );
  const byId = new Map(agenda.map((item) => [item.id, item]));
  const positionedIds = new Set([...intervals, ...points].map((item) => item.id));
  const untimed = agenda.filter((item) => !positionedIds.has(item.id));
  const startHour = Math.min(6, ...intervals.map((item) => Math.floor(item.start / 60)), ...points.map((item) => Math.floor(item.at / 60)));
  const endHour = Math.max(22, ...intervals.map((item) => Math.ceil(item.end / 60)), ...points.map((item) => Math.ceil(item.at / 60)));
  const positioned = agenda.filter((item) => positionedIds.has(item.id));
  return <section className="prep-day" data-i18n-explicit="true">
    {!embedded && <header className="prep-day-period"><button aria-label={m("preparation.previous")} onClick={() => shift(-7)}><ChevronLeft size={18} /></button><h1>{formatDate(localDate(date), { month: "long", year: "numeric" })}</h1><button aria-label={m("preparation.nextPeriod")} onClick={() => shift(7)}><ChevronRight size={18} /></button></header>}
    <nav className="prep-week-strip" aria-label={m("planning.week.goToDay")}>{dates.map((item) => { const key = toLocalDateKey(item); return <button key={key} aria-pressed={key === date} onClick={() => onDateChange(key)}><small>{formatDate(item, { weekday: "short" })}</small><strong>{formatDate(item, { day: "numeric" })}</strong></button>; })}</nav>
    <nav className="prep-day-switch" aria-label={m("preparation.agendaView")}>{mode === "day" ? <span aria-current="page">{m("preparation.dayTab")}</span> : <Link to={`/app/planning?view=day&date=${date}`}>{m("preparation.dayTab")}</Link>}{mode === "week" ? <span aria-current="page">{m("preparation.weekTab")}</span> : <Link to={`/app/planning/weekly?date=${date}`}>{m("preparation.weekTab")}</Link>}</nav>
    {readOnly && <p role="status">{m("planning.trial.limit")}</p>}
    <EditorialCard><header className="prep-card-heading"><h2>{date === toLocalDateKey(new Date()) ? m("planning.day.title") : formatDate(localDate(date), { weekday: "long", day: "numeric" })}</h2><button className="prep-text-link" disabled={readOnly} onClick={() => onQuickCapture({ source: "today", date })}><Plus size={16} />{m("preparation.add")}</button></header>
      {/* A scroll region must be focusable so keyboard users can reveal every hour. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="editorial-agenda-scroll" role="region" tabIndex={0} aria-label={m("editorialDay.grid")}>
        <div className="editorial-agenda-grid" style={{ height: (endHour - startHour) * 60 * minutePixels + (points.length ? pointHeightPixels : 0) }}>
          {Array.from({ length: endHour - startHour + 1 }, (_, index) => <div className="editorial-agenda-hour" key={index} style={{ top: index * 60 * minutePixels }}><time>{String(startHour + index).padStart(2, "0")}:00</time></div>)}
          <div className="editorial-agenda-lanes">{intervals.map((interval) => { const item = byId.get(interval.id)!; const description = [item.title, item.startTime, item.endTime, interval.continuesBefore ? m("editorialDay.continued") : "", interval.continuesAfter ? m("editorialDay.continues") : ""].filter(Boolean).join(" · "); return <article key={item.id} className={`editorial-agenda-block is-${item.kind} ${item.task?.status === "completed" ? "is-complete" : ""}`} data-record-id={item.id} style={{ top: (interval.start - startHour * 60) * minutePixels, height: (interval.end - interval.start) * minutePixels, left: `${interval.column / interval.columns * 100}%`, width: `${100 / interval.columns}%` }}>
            {item.task ? <button disabled={readOnly} aria-label={m("editorialDay.move", { title: description })} title={description} onClick={() => onEditTask(item.task!)}><strong data-no-translate="true">{item.title}</strong><small>{item.startTime}{item.durationMinutes ? ` · ${item.durationMinutes} ${m("today.unit.minuteShort")}` : ""}</small></button> : item.kind === "event" ? <Link to={`/app/life-hub?tab=events&date=${date}&event=${encodeURIComponent(item.id.slice("event-".length))}`} title={description}><strong data-no-translate="true">{item.title}</strong><small>{calendarEventTimeLabel({ allDay: false, startTime: item.startTime, endTime: item.endTime }, "")}</small></Link> : <div title={description}><strong data-no-translate="true">{item.title}</strong><small>{item.startTime}–{item.endTime}</small></div>}
          </article>; })}{points.map((point) => { const item = byId.get(point.id)!; const description = [item.title, item.startTime, m("editorialDay.noDuration")].join(" · "); return <article key={item.id} className={`editorial-agenda-point ${item.task?.status === "completed" ? "is-complete" : ""}`} data-record-id={item.id} data-agenda-kind="point" style={{ top: (point.at - startHour * 60) * minutePixels, height: pointHeightPixels, left: `${point.column / point.columns * 100}%`, width: `${100 / point.columns}%` }}>
            <button disabled={readOnly} aria-label={m("editorialDay.move", { title: description })} title={description} onClick={() => onEditTask(item.task!)}><strong data-no-translate="true">{item.title}</strong><small><time>{item.startTime}</time> · {m("editorialDay.noDuration")}</small></button>
          </article>; })}</div>
        </div>
      </div>
      {untimed.length > 0 && <section className="editorial-agenda-unplaced"><h3>{m("editorialDay.unscheduled")}</h3><p>{m("editorialDay.unscheduledHelp")}</p>{untimed.map((item) => <article key={item.id} className="prep-hourly-item is-untimed"><time>{item.allDay ? m("calendar.event.allDay") : item.startTime || m("preparation.noTime")}</time><div>{item.content}</div></article>)}</section>}
      {positioned.length > 0 && <details className="editorial-agenda-readable"><summary>{m("editorialDay.list")}</summary>{positioned.map((item) => <article key={item.id} className="prep-hourly-item"><time>{item.startTime}</time><div>{item.content}</div></article>)}</details>}
      {!agenda.length && <p>{m("preparation.emptyDay")}</p>}
      {(nutrition || workout) && <div className="prep-day-health">{workout && <Link to={`/app/health?section=training&date=${date}`}><Dumbbell size={19} /><span data-no-translate="true">{workout.name || workout.goal || m("today.timeline.workoutFallback")}</span><ChevronRight size={16} /></Link>}{nutrition?.meals.map((meal) => <Link key={meal.id} to={`/app/health?section=nutrition&date=${date}`}><Utensils size={19} /><span data-no-translate="true">{meal.name}</span>{meal.completed ? <Check size={16} /> : <ChevronRight size={16} />}</Link>)}</div>}
    </EditorialCard>
    <EditorialCard><header className="prep-card-heading"><h2>{m("today.habits.title")}</h2><Link to="/app/habits">{m("today.habits.viewAll")}</Link></header>{habits.map((habit) => { const log = snapshot.habitLogs.find((item) => item.habitId === habit.id && item.date === date); const complete = isHabitLogComplete(habit, log); return <div className="prep-day-habit" key={habit.id}><span data-no-translate="true">{habit.name}</span>{habit.type === "boolean" ? <button className="prep-check" disabled={readOnly || operation.busy} aria-pressed={complete} aria-label={habit.name} onClick={() => operation.run(() => planner.toggleHabit(habit.id, date))}>{complete ? <Check size={16} /> : <Circle size={16} />}</button> : <Link to={`/app/habits?habit=${encodeURIComponent(habit.id)}&date=${date}#habit-week`} aria-label={habit.name}><ChevronRight size={18} /></Link>}</div>; })}{!habits.length && <p>{m("today.habits.freeDay")}</p>}</EditorialCard>
    {operation.error && <p role="alert">{m("preparation.error")}</p>}
  </section>;
}

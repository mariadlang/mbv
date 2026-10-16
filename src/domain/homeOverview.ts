import type { PlannerEvent, PlannerSnapshot } from "./planner";
import { getProjectExecutionState } from "./cascadeRules";
import { preparationPeriod } from "./weekPreparation";
import { getWeekDates, toLocalDateKey, toLocalDateKeyFromValue } from "@/src/lib/dates";
import { isValidCalendarDateKey, isValidCalendarTimezone } from "./calendar";

/** Planner dates are civil dates. The device's configured zone is the app's local zone. */
export function homePeriod(now: Date, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const today = toLocalDateKeyFromValue(now, timeZone);
  const dates = getWeekDates(new Date(`${today}T12:00:00`), 1).map(toLocalDateKey);
  return { today, month: today.slice(0, 7), week: dates[0], dates, timeZone };
}

// Convert an event's stored wall time to an instant, without inventing an end or duration.
export function eventInstant(date: string, time: string, timeZone: string) {
  if (!isValidCalendarDateKey(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !isValidCalendarTimezone(timeZone)) return undefined;
  const wall = Date.parse(`${date}T${time}:00Z`);
  let instant = wall;
  for (let index = 0; index < 3; index++) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant);
    const part = (key: string) => parts.find((item) => item.type === key)?.value;
    const rendered = Date.parse(`${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:00Z`);
    const correction = wall - rendered;
    instant += correction;
    if (!correction) return new Date(instant);
  }
  return undefined; // Nonexistent DST wall time: show the stored date/time, don't fabricate an instant.
}

export function upcomingCommitments(events: PlannerEvent[], now: Date, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const today = toLocalDateKeyFromValue(now, timeZone);
  return events.filter((event) => event.status !== "cancelled" && isValidCalendarDateKey(event.startDate)).map((event) => {
    const time = event.allDay ? undefined : event.startTime || event.time;
    const start = time ? eventInstant(event.startDate, time, event.timezone || timeZone) : undefined;
    const end = event.endTime ? eventInstant(event.endDate || event.startDate, event.endTime, event.timezone || timeZone) : undefined;
    const date = start ? toLocalDateKeyFromValue(start, timeZone) : event.startDate;
    const clock = start ? new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(start) : time;
    const visible = start ? (end || start).getTime() >= now.getTime() : (event.endDate || date) >= today;
    return { event, date, time: clock, start, visible };
  }).filter((item) => item.visible).sort((a, b) => `${a.date}T${a.time || "00:00"}`.localeCompare(`${b.date}T${b.time || "00:00"}`) || a.event.id.localeCompare(b.event.id)).slice(0, 2);
}

export function homeWeekPriorities(snapshot: PlannerSnapshot, week: string, last: string) {
  const tasks = snapshot.tasks.filter((task) => task.date && task.date >= week && task.date <= last && task.priority === "high" && task.status !== "cancelled")
    .sort((a, b) => `${a.date}${a.time || "99:99"}`.localeCompare(`${b.date}${b.time || "99:99"}`) || a.id.localeCompare(b.id));
  if (tasks.length) return tasks.slice(0, 3).map((task) => ({ id: task.id, title: task.title, status: task.status }));
  const plan = snapshot.cascadePlans.find((item) => item.horizon === "weekly" && item.periodKey === preparationPeriod(week));
  // No inferred completion from a monthly intention, a title match or a preparation flag.
  return (plan?.objectives || []).slice(0, 3).map((title, index) => ({ id: `${plan!.id}-${index}`, title, status: undefined }));
}

export function homeProject(snapshot: PlannerSnapshot) {
  const project = snapshot.projects.filter((item) => item.status === "active").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))[0];
  return project ? { project, execution: getProjectExecutionState(snapshot, project.id) } : undefined;
}

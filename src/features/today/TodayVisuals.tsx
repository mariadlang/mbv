"use client";

import type { CSSProperties } from "react";

export function TodayProgressRing({ value }: { value: number }) {
  const progress = Math.max(0, Math.min(100, value));
  return <div className="today-progress-ring" style={{ "--progress": `${progress}%` } as CSSProperties} role="img" aria-label={`${progress}% del día completado`}><span>{progress}%</span></div>;
}

export function HabitWeekDots({ dateKeys, completedDates, todayKey, habitName }: { dateKeys: string[]; completedDates: Set<string>; todayKey: string; habitName: string }) {
  const completed = dateKeys.filter((date) => completedDates.has(date)).length;
  return <span className="habit-week-dots" role="img" aria-label={`${habitName}: ${completed} de ${dateKeys.length} registros esta semana`}>{dateKeys.map((date) => <span key={date} className={`${completedDates.has(date) ? "is-complete" : ""} ${date === todayKey ? "is-today" : ""}`} aria-hidden="true" />)}</span>;
}

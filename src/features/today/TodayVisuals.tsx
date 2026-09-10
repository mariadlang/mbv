"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/src/i18n/I18nProvider";

export function TodayProgressRing({ value }: { value: number }) {
  const { m, formatNumber } = useI18n();
  const progress = Math.max(0, Math.min(100, value));
  return <div className="today-progress-ring" style={{ "--progress": `${progress}%` } as CSSProperties} role="img" aria-label={m("today.progressRing.aria", { progress: formatNumber(progress) })} data-i18n-explicit="true"><span>{formatNumber(progress)}%</span></div>;
}

export function HabitWeekDots({ dateKeys, completedDates, todayKey, habitName }: { dateKeys: string[]; completedDates: Set<string>; todayKey: string; habitName: string }) {
  const { m, formatNumber, formatPlural } = useI18n();
  const completed = dateKeys.filter((date) => completedDates.has(date)).length;
  const ariaLabel = formatPlural(dateKeys.length, {
    one: m("today.habits.weekAriaOne", { habitName, completed: formatNumber(completed), total: formatNumber(dateKeys.length) }),
    other: m("today.habits.weekAria", { habitName, completed: formatNumber(completed), total: formatNumber(dateKeys.length) }),
  });
  return <span className="habit-week-dots" role="img" aria-label={ariaLabel} data-i18n-explicit="true">{dateKeys.map((date) => <span key={date} className={`${completedDates.has(date) ? "is-complete" : ""} ${date === todayKey ? "is-today" : ""}`} aria-hidden="true" />)}</span>;
}

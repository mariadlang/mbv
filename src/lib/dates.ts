import { addDays, format, getWeek, getWeekYear, startOfWeek, subDays } from "date-fns";
import { es } from "date-fns/locale";

export function toLocalDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getWeekDates(date: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const start = startOfWeek(date, { weekStartsOn });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getRecentDates(total: number, endDate = new Date()): Date[] {
  return Array.from({ length: total }, (_, index) => subDays(endDate, total - index - 1));
}

export function formatLongDate(date: Date): string {
  const value = format(date, "EEEE, d 'de' MMMM", { locale: es });
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatShortDay(date: Date): string {
  return format(date, "EEE", { locale: es }).replace(".", "");
}

export function getReviewPeriodKey(
  type: "daily" | "weekly" | "monthly" | "quarterly" | "annual",
  date: Date,
  weekStartsOn: 0 | 1 = 1,
): string {
  if (type === "daily") return format(date, "yyyy-MM-dd");
  if (type === "monthly") return format(date, "yyyy-MM");
  if (type === "quarterly") return `${format(date, "yyyy")}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  if (type === "annual") return format(date, "yyyy");

  const weekOptions = { weekStartsOn, firstWeekContainsDate: 4 as const };
  const weekYear = getWeekYear(date, weekOptions);
  const week = String(getWeek(date, weekOptions)).padStart(2, "0");
  return `${weekYear}-W${week}`;
}

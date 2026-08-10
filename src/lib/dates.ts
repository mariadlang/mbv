import { addDays, format, startOfWeek, subDays } from "date-fns";
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

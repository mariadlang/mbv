/** Calendar-local times, not UTC instants. These layouts never change records. */
export interface AgendaSource {
  id: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  allDay?: boolean;
}
export interface AgendaInterval { id: string; start: number; end: number; continuesBefore: boolean; continuesAfter: boolean }
export interface AgendaPlacement extends AgendaInterval { column: number; columns: number }
/** A known start time without a known span. It must never acquire a made-up end. */
export interface AgendaPoint { id: string; at: number }
export interface AgendaPointPlacement extends AgendaPoint { column: number; columns: number }

export function clockMinutes(value?: string): number | undefined {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return undefined;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}

/** Clip a spanning event to a day, retaining its canonical id. End is exclusive. */
export function agendaInterval(source: AgendaSource, date: string): AgendaInterval | undefined {
  if (source.allDay || date < source.startDate) return undefined;
  const startClock = clockMinutes(source.startTime);
  if (startClock === undefined) return undefined;
  const days = (a: string, b: string) => (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
  const dayOffset = days(source.startDate, date);
  if (!Number.isFinite(dayOffset)) return undefined;
  const start = dayOffset * 1440 + startClock;
  const endClock = clockMinutes(source.endTime);
  const end = source.durationMinutes && source.durationMinutes > 0
    ? start + source.durationMinutes
    : endClock !== undefined ? days(source.endDate || source.startDate, date) * 1440 + endClock : undefined;
  if (end === undefined || !Number.isFinite(end) || end <= start || start >= 1440 || end <= 0) return undefined;
  return { id: source.id, start: Math.max(0, start), end: Math.min(1440, end), continuesBefore: start < 0, continuesAfter: end > 1440 };
}

/** Keep time-only records on their own local day, without turning them into intervals. */
export function agendaPoint(source: AgendaSource, date: string): AgendaPoint | undefined {
  if (source.allDay || source.startDate !== date || source.durationMinutes !== undefined || source.endTime !== undefined || (source.endDate && source.endDate !== date)) return undefined;
  const at = clockMinutes(source.startTime);
  return at === undefined ? undefined : { id: source.id, at };
}

/** Interval partitioning. Consecutive intervals share a column; overlap groups share a width. */
export function layoutAgenda(intervals: readonly AgendaInterval[]): AgendaPlacement[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start || b.end - a.end || a.id.localeCompare(b.id));
  const result: AgendaPlacement[] = [];
  let group: AgendaPlacement[] = [];
  let groupEnd = -1;
  let columnEnds: number[] = [];
  const flush = () => { for (const item of group) result.push({ ...item, columns: columnEnds.length }); group = []; columnEnds = []; };
  for (const interval of sorted) {
    if (interval.start >= groupEnd) flush();
    let column = columnEnds.findIndex((end) => end <= interval.start);
    if (column < 0) column = columnEnds.length;
    columnEnds[column] = interval.end;
    group.push({ ...interval, column, columns: 1 });
    groupEnd = Math.max(group.length === 1 ? -1 : groupEnd, interval.end);
  }
  flush();
  return result;
}

/**
 * Share columns with point markers using their on-screen hit area only.
 * The collision box is not a duration: returned points have only `at`, while
 * interval start/end values are unchanged. Nothing here updates source records.
 */
export function layoutAgendaWithPoints(
  intervals: readonly AgendaInterval[],
  points: readonly AgendaPoint[],
  geometry: { pixelsPerMinute: number; pointHeightPixels: number },
): { intervals: AgendaPlacement[]; points: AgendaPointPlacement[] } {
  const pointsById = new Map(points.map((point) => [point.id, point]));
  const footprint = geometry.pointHeightPixels / geometry.pixelsPerMinute;
  const placements = layoutAgenda([
    ...intervals,
    ...points.map((point) => ({ id: point.id, start: point.at, end: point.at + footprint, continuesBefore: false, continuesAfter: false })),
  ]);
  return {
    intervals: placements.filter((item) => !pointsById.has(item.id)),
    points: placements.flatMap(({ id, column, columns }) => {
      const point = pointsById.get(id);
      return point ? [{ ...point, column, columns }] : [];
    }),
  };
}

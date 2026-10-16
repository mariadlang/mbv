import { describe, expect, it } from "vitest";
import { agendaInterval, agendaPoint, layoutAgenda, layoutAgendaWithPoints, type AgendaInterval } from "./hourlyAgenda";
const interval = (id: string, start: number, end: number): AgendaInterval => ({ id, start, end, continuesBefore: false, continuesAfter: false });
describe("hourly agenda", () => {
  it("places partial overlaps in separate columns", () => {
    const result = layoutAgenda([interval("a", 480, 570), interval("b", 540, 600)]);
    expect(result.map(({ column, columns }) => [column, columns])).toEqual([[0, 2], [1, 2]]);
  });
  it("handles contained and three simultaneous events without overlay", () => {
    const input = [interval("a", 480, 720), interval("b", 510, 600), interval("c", 540, 570), interval("d", 600, 630)];
    const result = layoutAgenda(input);
    expect(result.map(({ column, columns }) => [column, columns])).toEqual([[0, 3], [1, 3], [2, 3], [1, 3]]);
    expect(input[0]).not.toHaveProperty("column");
  });
  it("does not treat consecutive events as simultaneous", () => {
    expect(layoutAgenda([interval("a", 480, 540), interval("b", 540, 600)]).map(({ column, columns }) => [column, columns])).toEqual([[0, 1], [0, 1]]);
  });
  it("clips midnight locally without changing identity or source", () => {
    const source = { id: "canonical", startDate: "2026-10-02", endDate: "2026-10-03", startTime: "23:30", endTime: "01:15" };
    expect(agendaInterval(source, "2026-10-02")).toEqual({ id: "canonical", start: 1410, end: 1440, continuesBefore: false, continuesAfter: true });
    expect(agendaInterval(source, "2026-10-03")).toEqual({ id: "canonical", start: 0, end: 75, continuesBefore: true, continuesAfter: false });
    expect(agendaInterval(source, "2026-10-04")).toBeUndefined();
  });
  it("excludes all-day, date-only and unspecified duration instead of inventing time", () => {
    expect(agendaInterval({ id: "a", startDate: "2026-10-02", allDay: true, startTime: "09:00", endTime: "10:00" }, "2026-10-02")).toBeUndefined();
    expect(agendaInterval({ id: "a", startDate: "2026-10-02" }, "2026-10-02")).toBeUndefined();
    expect(agendaInterval({ id: "a", startDate: "2026-10-02", startTime: "09:00" }, "2026-10-02")).toBeUndefined();
  });
  it("retains actual task duration and midnight exclusive boundary", () => {
    expect(agendaInterval({ id: "task", startDate: "2026-10-02", startTime: "23:00", durationMinutes: 90 }, "2026-10-03")?.end).toBe(30);
    expect(agendaInterval({ id: "event", startDate: "2026-10-02", endDate: "2026-10-03", startTime: "23:00", endTime: "00:00" }, "2026-10-03")).toBeUndefined();
  });
  it("uses local calendar days across timezone/DST transitions", () => {
    expect(agendaInterval({ id: "dst", startDate: "2026-11-01", startTime: "01:30", endTime: "03:30" }, "2026-11-01")).toMatchObject({ start: 90, end: 210 });
  });
  it("positions time-only records without adding an end or duration", () => {
    const source = Object.freeze({ id: "point", startDate: "2026-10-05", startTime: "09:15" });
    expect(agendaPoint(source, "2026-10-05")).toEqual({ id: "point", at: 555 });
    expect(agendaInterval(source, "2026-10-05")).toBeUndefined();
    expect(source).toEqual({ id: "point", startDate: "2026-10-05", startTime: "09:15" });
    expect(agendaPoint(source, "2026-10-04")).toBeUndefined();
    expect(agendaPoint(source, "2026-10-06")).toBeUndefined();
  });
  it("does not misclassify intervals, all-day records or invalid hours as points", () => {
    const source = { id: "record", startDate: "2026-10-05", startTime: "09:00" };
    for (const record of [
      { ...source, durationMinutes: 30 },
      { ...source, endTime: "10:00" },
      { ...source, allDay: true },
      { ...source, endDate: "2026-10-06" },
      { ...source, startTime: undefined },
      { ...source, startTime: "24:00" },
      { ...source, startTime: "09:60" },
    ]) expect(agendaPoint(record, "2026-10-05")).toBeUndefined();
  });
  it("keeps midnight and late points on their exact local minute", () => {
    expect(agendaPoint({ id: "midnight", startDate: "2026-10-05", startTime: "00:00" }, "2026-10-05")).toEqual({ id: "midnight", at: 0 });
    expect(agendaPoint({ id: "late", startDate: "2026-10-05", startTime: "23:59" }, "2026-10-05")).toEqual({ id: "late", at: 1439 });
  });
  it("reserves visual hit areas for points without changing true interval geometry", () => {
    const intervals = [interval("a", 480, 600), interval("b", 510, 570)];
    const points = [{ id: "point", at: 540 }, { id: "nearby", at: 550 }];
    const before = JSON.stringify({ intervals, points });
    const result = layoutAgendaWithPoints(intervals, points, { pixelsPerMinute: 1.5, pointHeightPixels: 52 });
    expect(result.intervals.map(({ id, start, end }) => ({ id, start, end }))).toEqual([{ id: "a", start: 480, end: 600 }, { id: "b", start: 510, end: 570 }]);
    expect(result.points).toEqual([{ id: "point", at: 540, column: 2, columns: 4 }, { id: "nearby", at: 550, column: 3, columns: 4 }]);
    expect(result.intervals.every(({ columns }) => columns === 4)).toBe(true);
    expect(JSON.stringify({ intervals, points })).toBe(before);
    for (const point of result.points) { expect(point).not.toHaveProperty("end"); expect(point).not.toHaveProperty("durationMinutes"); }
  });
  it("separates simultaneous point markers and reuses width once hit areas no longer collide", () => {
    const result = layoutAgendaWithPoints([], [{ id: "a", at: 540 }, { id: "b", at: 540 }, { id: "c", at: 600 }], { pixelsPerMinute: 1.5, pointHeightPixels: 52 });
    expect(result.points).toEqual([{ id: "a", at: 540, column: 0, columns: 2 }, { id: "b", at: 540, column: 1, columns: 2 }, { id: "c", at: 600, column: 0, columns: 1 }]);
    expect(result.intervals).toEqual([]);
  });
  it("leaves interval-only overlap layouts unchanged", () => {
    const intervals = [interval("a", 480, 570), interval("b", 540, 600)];
    expect(layoutAgendaWithPoints(intervals, [], { pixelsPerMinute: 1.5, pointHeightPixels: 52 })).toEqual({ intervals: layoutAgenda(intervals), points: [] });
  });
});

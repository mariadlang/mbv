import { describe, expect, it } from "vitest";
import { createEmptySnapshot, type PlannerEvent, type PlannerSnapshot } from "./planner";
import { eventInstant, homePeriod, homeProject, homeWeekPriorities, upcomingCommitments } from "./homeOverview";
import { preparationKeys, weekPreparation } from "./weekPreparation";
import { createPlannerService } from "@/src/services/plannerService";

const now = new Date("2026-11-01T02:00:00Z");
const event = (id: string, startDate: string, startTime?: string, extra: Partial<PlannerEvent> = {}): PlannerEvent => ({ id, title: id, startDate, startTime, category: "personal", createdAt: "2026-01-01", updatedAt: "2026-01-01", ...extra });
describe("Inicio real period and summary", () => {
  it("uses the configured device zone, Monday week and current month even at a boundary", () => {
    expect(homePeriod(now, "America/Bogota")).toMatchObject({ today: "2026-10-31", month: "2026-10", week: "2026-10-26" });
    expect(homePeriod(now, "Asia/Tokyo")).toMatchObject({ today: "2026-11-01", month: "2026-11", week: "2026-10-26" });
    expect(homePeriod(new Date("2026-11-02T15:00Z"), "America/Bogota").week).toBe("2026-11-02");
  });
  it("converts event zones, excludes past/cancelled events and sorts two commitments without invented times", () => {
    const events = [event("later", "2026-11-02"), event("past", "2026-10-31", "08:00"), event("cancelled", "2026-11-01", undefined, { status: "cancelled" }), event("tokyo", "2026-11-01", "12:00", { timezone: "Asia/Tokyo" }), event("no-time", "2026-11-01")];
    const result = upcomingCommitments(events, now, "America/Bogota");
    expect(result.map((item) => [item.event.id, item.date, item.time])).toEqual([["tokyo", "2026-10-31", "22:00"], ["no-time", "2026-11-01", undefined]]);
    expect(events[0].startTime).toBeUndefined();
  });
  it("preserves all-day civil dates and includes an ongoing multi-day event", () => {
    const result = upcomingCommitments([event("ongoing", "2026-10-30", undefined, { allDay: true, endDate: "2026-11-02", timezone: "Asia/Tokyo" })], now, "America/Bogota");
    expect(result[0]).toMatchObject({ date: "2026-10-30", time: undefined });
  });
  it("handles winter/summer offsets and rejects invalid DST wall times", () => {
    expect(eventInstant("2026-01-15", "10:00", "America/New_York")?.toISOString()).toBe("2026-01-15T15:00:00.000Z");
    expect(eventInstant("2026-07-15", "10:00", "America/New_York")?.toISOString()).toBe("2026-07-15T14:00:00.000Z");
    expect(eventInstant("2026-03-08", "02:30", "America/New_York")).toBeUndefined();
  });
  it("keeps weekly task identity/status and never borrows a different week's priorities", () => {
    const snapshot = createEmptySnapshot();
    snapshot.tasks = ["2026-10-26", "2026-10-27", "2026-11-02"].map((date, i) => ({ id: String(i), title: `Acción ${i}`, date, status: i ? "planned" : "completed", priority: "high", createdAt: date, updatedAt: date }));
    const priorities = homeWeekPriorities(snapshot, "2026-10-26", "2026-11-01");
    expect(priorities).toHaveLength(2);
    expect(priorities[0]).toMatchObject({ id: "0", status: "completed" });
    expect(homeWeekPriorities(snapshot, "2026-11-09", "2026-11-15")).toEqual([]);
  });
  it("uses the real active project execution summary, excludes archived projects", () => {
    const snapshot = createEmptySnapshot();
    snapshot.projects = [{ id: "one", name: "Mi proyecto", outcome: "Resultado", status: "active", createdAt: "2026-10-01", updatedAt: "2026-10-01" }, { id: "two", name: "Cerrado", outcome: "", status: "archived", createdAt: "2026-10-02", updatedAt: "2026-10-02" }];
    snapshot.projectChecklistItems = [{ id: "check", projectId: "one", title: "Paso concreto", completed: false, createdAt: "2026-10-01", updatedAt: "2026-10-01" }];
    expect(homeProject(snapshot)).toMatchObject({ project: { id: "one" }, execution: { completed: 0, total: 1, nextTitle: "Paso concreto" } });
  });
  it("persists 0, some, all five confirmations without counting execution or copying to next week", async () => {
    let snapshot = createEmptySnapshot();
    const service = createPlannerService({ load: async () => structuredClone(snapshot), replace: async (value: PlannerSnapshot) => { snapshot = structuredClone(value); }, clear: async () => {}, close: () => {} });
    const get = async () => weekPreparation(await service.load(), "2026-10-26", true);
    expect((await get()).ready).toBe(0);
    await service.createTask("Una tarea no prepara", "2026-10-26");
    expect((await get()).ready).toBe(0);
    expect((await get()).rows.find((item) => item.id === "agenda")?.state).toBe("progress");
    for (const id of preparationKeys.slice(0, 3)) await service.saveWeekPreparation({ week: "2026-10-26", item: id, state: "ready" });
    expect((await get()).ready).toBe(3);
    for (const id of preparationKeys.slice(3)) await service.saveWeekPreparation({ week: "2026-10-26", item: id, state: "ready" });
    expect((await get()).ready).toBe(5);
    await service.saveWeekPreparation({ week: "2026-10-26", item: "agenda", state: "pending" });
    expect((await get()).ready).toBe(4);
    expect(weekPreparation(await service.load(), "2026-11-02", true).ready).toBe(0);
    expect(snapshot.tasks[0].status).toBe("planned");
  });
  it("always shows five in Inicio without changing custom guide preferences", () => {
    const snapshot = createEmptySnapshot();
    snapshot.profile = { preparationItems: [{ id: "finance" }] } as PlannerSnapshot["profile"];
    expect(weekPreparation(snapshot, "2026-10-26", true).rows.map((row) => row.id)).toEqual([...preparationKeys]);
    expect(weekPreparation(snapshot, "2026-10-26").rows.map((row) => row.id)).toEqual(["finance"]);
  });
});

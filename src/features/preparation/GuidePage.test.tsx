// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import { weekPreparation, type PreparationPatch } from "@/src/domain/weekPreparation";
import { createPlannerService } from "@/src/services/plannerService";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { GuidePage } from "./GuidePage";

afterEach(cleanup);

function setup(beforeSave?: () => Promise<void>) {
  let stored = createEmptySnapshot();
  const service = createPlannerService({
    load: async () => structuredClone(stored),
    replace: async (next) => { stored = structuredClone(next); },
    clear: async () => { stored = createEmptySnapshot(); },
    close: () => undefined,
  });
  const saveWeekPreparation = vi.fn(async (input: PreparationPatch) => {
    await beforeSave?.();
    return service.saveWeekPreparation(input);
  });
  function Harness() {
    const [snapshot, setSnapshot] = useState<PlannerSnapshot>(() => stored);
    const planner = { snapshot, saveWeekPreparation: async (input: PreparationPatch) => {
      const next = await saveWeekPreparation(input);
      setSnapshot(next);
      return next;
    } } as unknown as PlannerController;
    return <GuidePage planner={planner} />;
  }
  const mount = () => render(<I18nProvider><MemoryRouter initialEntries={["/app/guide?week=2026-10-05"]}><Harness /></MemoryRouter></I18nProvider>);
  return { view: mount(), mount, saveWeekPreparation, read: () => stored };
}

describe("guide review compact state", () => {
  it("compacts only after a persisted skip, preserves readiness and can reopen the review", async () => {
    let resolve!: () => void;
    const pending = new Promise<void>((accept) => { resolve = accept; });
    const fixture = setup(() => pending);
    const { view } = fixture;
    expect(view.container.querySelector(".prep-review-invitation")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Omitir y planificar" }));
    expect(view.container.querySelector(".prep-review-summary")).toBeNull();
    expect(view.getByRole("button", { name: "Omitir y planificar" }).matches(":disabled")).toBe(true);
    await act(async () => resolve());
    await view.findByRole("button", { name: "Reabrir revisión" });
    expect(view.container.querySelector(".prep-review-invitation")).toBeNull();
    expect(view.getByRole("status").textContent).toContain("Revisión omitida");
    expect(document.activeElement).toBe(view.getByRole("status"));
    expect(weekPreparation(fixture.read(), "2026-10-05")).toMatchObject({ review: "skipped", ready: 0, percent: 0 });
    expect(fixture.read().tasks).toHaveLength(0);
    fireEvent.click(view.getByRole("button", { name: "Reabrir revisión" }));
    expect(view.getByRole("dialog", { name: "Revisar semana anterior" })).toBeTruthy();
    expect(fixture.saveWeekPreparation).toHaveBeenCalledOnce();
    view.unmount();
    const reloaded = fixture.mount();
    expect(reloaded.getByRole("button", { name: "Reabrir revisión" })).toBeTruthy();
    expect(reloaded.container.querySelector(".prep-review-invitation")).toBeNull();
  });
  it("keeps the expanded invitation after a failed skip and allows retry", async () => {
    const beforeSave = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    const { view } = setup(beforeSave);
    fireEvent.click(view.getByRole("button", { name: "Omitir y planificar" }));
    await view.findByRole("alert");
    expect(view.container.querySelector(".prep-review-invitation")).toBeTruthy();
    expect(view.queryByRole("button", { name: "Reabrir revisión" })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Omitir y planificar" }));
    await view.findByRole("button", { name: "Reabrir revisión" });
  });
  it("compacts a completed review without completing preparation sections", async () => {
    const { view, read } = setup();
    fireEvent.click(view.getAllByRole("button", { name: "Revisar semana anterior" })[1]);
    const dialog = view.getByRole("dialog", { name: "Revisar semana anterior" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Terminar revisión" }));
    await view.findByRole("button", { name: "Reabrir revisión" });
    expect(view.queryByRole("dialog")).toBeNull();
    expect(weekPreparation(read(), "2026-10-05")).toMatchObject({ review: "reviewed", ready: 0 });
  });
});

// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { useUiStore } from "@/src/stores/useUiStore";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import { preparationKeys, type PreparationPatch } from "@/src/domain/weekPreparation";
import { createPlannerService } from "@/src/services/plannerService";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { PreparationChecklist } from "./PreparationShared";

afterEach(() => { cleanup(); useUiStore.setState({ language: "es" }); });
async function setup(excluded: string[] = [], items?: { id: string; label?: string }[]) {
  let stored = createEmptySnapshot();
  stored.profile = { preparationItems: items } as PlannerSnapshot["profile"];
  const service = createPlannerService({
    load: async () => structuredClone(stored), replace: async (next) => { stored = structuredClone(next); },
    clear: async () => {}, close: () => {},
  });
  for (const item of preparationKeys.slice(0, 3)) await service.saveWeekPreparation({ week: "2026-10-19", item, state: "ready" });
  for (const item of excluded) await service.saveWeekPreparation({ week: "2026-10-19", item, state: "excluded" });
  function Harness() {
    const [snapshot, setSnapshot] = useState(stored);
    const planner = { snapshot, saveWeekPreparation: async (patch: PreparationPatch) => {
      const next = await service.saveWeekPreparation(patch); setSnapshot(next); return next;
    } } as PlannerController;
    return <><div data-testid="home"><PreparationChecklist planner={planner} week="2026-10-19" overview /></div><div data-testid="guide"><PreparationChecklist planner={planner} week="2026-10-19" guide /></div></>;
  }
  const mount = () => render(<I18nProvider><MemoryRouter><Harness /></MemoryRouter></I18nProvider>);
  return { view: mount(), read: () => stored, mount };
}
describe("H03 single preparation rule in both views", () => {
  it("shows 3 of 4 and exclusion in both, explicitly re-includes without confirming and survives remount", async () => {
    const fixture = await setup(["priorities"]);
    const { view } = fixture;
    expect(view.getAllByText("3 de 4 preparados")).toHaveLength(2);
    expect(view.getAllByRole("button", { name: "No aplica esta semana" })).toHaveLength(2);
    fireEvent.click(within(view.getByTestId("home")).getByRole("button", { name: "No aplica esta semana" }));
    const dialog = view.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "Confirmar preparación" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Incluir esta semana" }));
    await view.findAllByText("3 de 5 preparados");
    expect(view.getAllByText("3 de 5 preparados")).toHaveLength(2);
    expect(fixture.read().cascadePlans[0].details?.["preparation.v1.item.priorities"]).toBe("pending");
    view.unmount();
    expect(fixture.mount().getAllByText("3 de 5 preparados")).toHaveLength(2);
  });
  it.each(["excluded", "disabled"] as const)("renders a neutral state with no percentage for all %s", async (mode) => {
    const { view } = await setup(mode === "excluded" ? [...preparationKeys] : [], mode === "disabled" ? [] : undefined);
    expect(view.getAllByText("Sin apartados activos esta semana")).toHaveLength(2);
    expect(view.queryByRole("progressbar")).toBeNull();
    expect(view.container.textContent).not.toMatch(/0\/0|0%|0 de 0/);
    if (mode === "disabled") {
      expect(view.getAllByText("Desactivado en Mi guía")).toHaveLength(5);
      expect(view.queryByText("Por preparar")).toBeNull();
    }
  });
  it("counts custom selections without adding a sixth Inicio row or translating their label", async () => {
    const { view } = await setup([], [{ id: "nutrition" }, { id: "custom-id", label: "Mi creación" }]);
    expect(view.getAllByText("1 de 2 preparado")).toHaveLength(2);
    expect(view.getByTestId("home").querySelectorAll(".prep-checklist-row")).toHaveLength(5);
    expect(within(view.getByTestId("home")).queryByText("Mi creación")).toBeNull();
    expect(view.getByText("Mi creación").getAttribute("data-no-translate")).toBe("true");
    expect(view.getByRole("link", { name: /El total considera/ }).getAttribute("href")).toBe("/app/guide?week=2026-10-19");
    expect(view.getAllByText("Desactivado en Mi guía")).toHaveLength(4);
  });
  it("uses stable English states and the same denominator", async () => {
    useUiStore.setState({ language: "en" });
    const { view } = await setup(["priorities"], [{ id: "nutrition" }, { id: "training" }, { id: "habits" }, { id: "priorities" }]);
    expect(view.getAllByText("3 of 3 prepared")).toHaveLength(2);
    expect(view.getAllByRole("button", { name: "Not applicable this week" })).toHaveLength(2);
    expect(view.getByText("Disabled in My guide")).toBeTruthy();
  });
});

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { UserAccess } from "@/src/domain/access";
import { EditorialYear } from "./EditorialYear";

afterEach(cleanup);
const access = { role: "superadmin", accessStatus: "active" } as UserAccess;

describe("Mi año reuses the twelve months", () => {
  it("shows twelve months once, changes year and opens each exact empty period", async () => {
    const user = userEvent.setup(), onCreate = vi.fn(), onOpen = vi.fn();
    const snapshot = createEmptySnapshot();
    function Screen() {
      const [year, setYear] = useState(2026);
      return <EditorialYear planner={{ snapshot } as PlannerController} access={access} year={year} onYearChange={setYear} onCreate={onCreate} onOpen={onOpen} />;
    }
    const view = render(<I18nProvider><Screen /></I18nProvider>);
    expect(view.getByRole("heading", { level: 1 })).toHaveTextContent("Mi año 2026");
    expect(view.container.querySelectorAll(".prep-month-grid > button")).toHaveLength(12);
    expect(view.container.querySelector(".prep-year-areas, .prep-category-tabs, .prep-legacy-plans")).toBeNull();
    await user.selectOptions(view.getByLabelText("Año"), "2027");
    expect(view.getByRole("heading", { level: 1 })).toHaveTextContent("Mi año 2027");
    const buttons = view.container.querySelectorAll<HTMLButtonElement>(".prep-month-grid > button");
    for (const [index, button] of Array.from(buttons).entries()) {
      await user.click(button);
      expect(onCreate).toHaveBeenLastCalledWith(`2027-${String(index + 1).padStart(2, "0")}`);
    }
    expect(onCreate).toHaveBeenCalledTimes(12);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("opens the saved month's identity without changing any legacy data", async () => {
    const user = userEvent.setup(), onCreate = vi.fn(), onOpen = vi.fn();
    const snapshot = createEmptySnapshot();
    const base = { intention: "Conservar", priority: "", objectives: ["Mi prioridad"], activities: [], createdAt: "2026-10-01", updatedAt: "2026-10-01" };
    snapshot.cascadePlans = [
      { ...base, id: "annual", horizon: "annual", periodKey: "2027", details: { areaGoals: '{"health":"Mi meta"}' } },
      { ...base, id: "long", horizon: "pathways", periodKey: "five-year-vision" },
      { ...base, id: "three", horizon: "three_years", periodKey: "three-year-priorities" },
      { ...base, id: "march", horizon: "monthly", periodKey: "2027-03" },
    ];
    const before = JSON.stringify(snapshot);
    const view = render(<I18nProvider><EditorialYear planner={{ snapshot } as PlannerController} access={access} year={2027} onYearChange={vi.fn()} onCreate={onCreate} onOpen={onOpen} /></I18nProvider>);
    await user.click(view.container.querySelector<HTMLButtonElement>('[data-period="2027-03"]')!);
    expect(onOpen).toHaveBeenCalledWith(snapshot.cascadePlans[3]);
    expect(onCreate).not.toHaveBeenCalled();
    expect(JSON.stringify(snapshot)).toBe(before);
  });
});

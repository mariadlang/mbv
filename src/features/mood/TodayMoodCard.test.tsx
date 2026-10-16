// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { TodayMoodCard } from "./TodayMoodCard";
afterEach(cleanup);
describe("wellbeing save protection", () => {
  it("retains keyboard focus while the selected mood is saving", async () => {
    let finishSave!: () => void;
    const saveMood = vi.fn(() => new Promise<void>((resolve) => { finishSave = resolve; }));
    const planner = { snapshot: createEmptySnapshot(), saveMood } as unknown as PlannerController;
    const view = render(<I18nProvider><MemoryRouter><TodayMoodCard planner={planner} saveOnChange /></MemoryRouter></I18nProvider>);
    const balanced = view.getByRole("radio", { name: "Equilibrada" });
    balanced.focus();
    fireEvent.keyDown(balanced, { key: "ArrowRight" });
    const good = view.getByRole("radio", { name: "Buena" });
    expect(document.activeElement).toBe(good);
    expect(good.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(good, { key: "ArrowRight" });
    expect(saveMood).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(good);
    finishSave();
    await waitFor(() => expect(view.container.querySelector("fieldset")?.getAttribute("aria-busy")).toBe("false"));
    expect(document.activeElement).toBe(good);
  });
  it("does not create a default mood by merely focusing and leaving an unchanged note", () => {
    const saveMood = vi.fn();
    const planner = { snapshot: createEmptySnapshot(), saveMood } as unknown as PlannerController;
    const view = render(<I18nProvider><MemoryRouter><TodayMoodCard planner={planner} saveOnChange /></MemoryRouter></I18nProvider>);
    fireEvent.blur(view.getByRole("textbox"));
    expect(saveMood).not.toHaveBeenCalled();
  });
  it("retains a failed note save, displays the error, and permits a retry", async () => {
    const saveMood = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    const planner = { snapshot: createEmptySnapshot(), saveMood } as unknown as PlannerController;
    const view = render(<I18nProvider><MemoryRouter><TodayMoodCard planner={planner} saveOnChange /></MemoryRouter></I18nProvider>);
    fireEvent.change(view.getByRole("textbox"), { target: { value: "Hoy necesito calma" } });
    fireEvent.blur(view.getByRole("textbox"));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Conservamos"));
    expect((view.getByRole("textbox") as HTMLInputElement).value).toBe("Hoy necesito calma");
    fireEvent.submit(view.container.querySelector("form")!);
    await waitFor(() => expect(saveMood).toHaveBeenCalledTimes(2));
    expect(saveMood.mock.calls[1][3]).toBe("Hoy necesito calma");
  });
});

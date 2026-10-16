// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { UserAccess } from "@/src/domain/access";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { QuickCaptureDrawer } from "./QuickCaptureDrawer";

afterEach(cleanup);
describe("quick capture draft lifetime", () => {
  it("keeps typed text across parent saving rerenders and a failed persistence attempt", async () => {
    const createTaskDetailed = vi.fn().mockRejectedValue(new Error("Local storage unavailable"));
    const planner = { snapshot: createEmptySnapshot(), createTaskDetailed } as unknown as PlannerController;
    const access = { role: "superadmin", accessStatus: "paid_annual" } as UserAccess;
    const onClose = vi.fn();
    const screen = (saving = false) => <I18nProvider><MemoryRouter><QuickCaptureDrawer open defaults={{ source: "today", date: "2026-10-02" }} planner={{ ...planner, saving }} access={access} onClose={() => onClose()} /></MemoryRouter></I18nProvider>;
    const view = render(screen());
    await waitFor(() => expect((view.getByLabelText("Nombre") as HTMLInputElement).value).toBe(""));
    fireEvent.change(view.getByLabelText("Nombre"), { target: { value: "No borrar mi acción" } });
    view.rerender(screen(true));
    await waitFor(() => expect((view.getByLabelText("Nombre") as HTMLInputElement).value).toBe("No borrar mi acción"));
    fireEvent.click(view.getByRole("button", { name: "Guardar" }));
    await view.findByRole("alert");
    expect((view.getByLabelText("Nombre") as HTMLInputElement).value).toBe("No borrar mi acción");
    expect(onClose).not.toHaveBeenCalled();
    expect(createTaskDetailed).toHaveBeenCalledTimes(1);
  });
});

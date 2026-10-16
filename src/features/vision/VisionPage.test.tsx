// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { UnsavedDraftProvider } from "@/src/components/navigation/UnsavedDraftProvider";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { VisionPage } from "./VisionPage";
afterEach(cleanup);
function fixture() {
  const snapshot = createEmptySnapshot();
  snapshot.lifeAreas = ["Salud propia", "Vida creativa"].map((name, index) => ({ id: `area-${index}`, name, color: "rose", order: index, active: true, dream: "", vision: "", createdAt: "", updatedAt: "" }));
  const updateLifeArea = vi.fn().mockResolvedValue(snapshot);
  const planner = { snapshot, updateLifeArea } as unknown as PlannerController;
  const router = createMemoryRouter([{ path: "*", element: <I18nProvider><UnsavedDraftProvider><VisionPage planner={planner} /></UnsavedDraftProvider></I18nProvider> }]);
  return { ...render(<RouterProvider router={router} />), updateLifeArea };
}
describe("editorial vision", () => {
  it("protects a reflection when choosing another area and keeps the draft on cancel", async () => {
    const view = fixture();
    fireEvent.change(view.getByRole("textbox", { name: "Visión del área" }), { target: { value: "Una vida con energía" } });
    fireEvent.click(view.getByRole("button", { name: /Vida creativa/ }));
    const dialog = await view.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Seguir editando" }));
    expect((view.getByRole("textbox", { name: "Visión del área" }) as HTMLTextAreaElement).value).toBe("Una vida con energía");
    expect(view.updateLifeArea).not.toHaveBeenCalled();
  });
  it("keeps a failed save editable and retries against the same area id", async () => {
    const view = fixture();
    view.updateLifeArea.mockRejectedValueOnce(new Error("offline"));
    fireEvent.change(view.getByRole("textbox", { name: "Visión del área" }), { target: { value: "Caminar en calma" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar mi visión" }));
    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Conservamos"));
    expect((view.getByRole("textbox", { name: "Visión del área" }) as HTMLTextAreaElement).value).toBe("Caminar en calma");
    fireEvent.click(view.getByRole("button", { name: "Guardar mi visión" }));
    await waitFor(() => expect(view.updateLifeArea).toHaveBeenCalledTimes(2));
    expect(view.updateLifeArea.mock.calls[1][0]).toBe("area-0");
    expect(view.updateLifeArea.mock.calls[1][1]).not.toHaveProperty("confirmScores");
  });
});

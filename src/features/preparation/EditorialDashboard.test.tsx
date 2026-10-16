// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { UnsavedDraftProvider } from "@/src/components/navigation/UnsavedDraftProvider";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { createEmptySnapshot, type PlannerSnapshot } from "@/src/domain/planner";
import { EditorialDashboard } from "./EditorialDashboard";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function harness(snapshot = createEmptySnapshot(), loading = false) {
  const planner = { snapshot, loading } as PlannerController;
  const router = createMemoryRouter([{ element: <I18nProvider><UnsavedDraftProvider><Outlet /></UnsavedDraftProvider></I18nProvider>, children: [{ path: "*", element: <EditorialDashboard planner={planner} /> }] }]);
  return render(<RouterProvider router={router} />);
}
describe("Inicio is an overview, not daily execution", () => {
  it("renders all five preparation rows, five blocks and useful empty links", () => {
    const view = harness();
    expect(view.container.querySelectorAll(".prep-checklist-row")).toHaveLength(5);
    expect(view.container.querySelectorAll(".home-column > div")).toHaveLength(5);
    expect(view.getByText("0 de 5 preparados")).toBeVisible();
    expect(view.getByRole("link", { name: "Crear un proyecto" })).toHaveAttribute("href", "/app/tasks?create=project");
    expect(view.getByRole("link", { name: "Definir mi intención" })).toHaveAttribute("href", expect.stringContaining("create=month&month="));
    expect(view.container.querySelector(".prep-agenda-items, .prep-next, .prep-quote, .prep-focus-photo")).toBeNull();
  });
  it("uses a loading state without fabricated counters", () => {
    const view = harness(createEmptySnapshot(), true);
    expect(view.getByRole("status")).toHaveTextContent("Cargando tu panorama");
    expect(view.queryByText("0 de 5 preparados")).toBeNull();
  });
  it("contains a failed project block while the other summaries remain usable, and offers retry", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const snapshot = { ...createEmptySnapshot(), projects: null } as unknown as PlannerSnapshot;
    const view = harness(snapshot);
    expect(view.getByRole("alert")).toHaveTextContent("No pudimos mostrar este bloque");
    expect(view.getByRole("heading", { name: "Esta semana" })).toBeVisible();
    expect(view.getByRole("link", { name: "Ver calendario" })).toBeVisible();
    fireEvent.click(view.getByRole("button", { name: "Intentar de nuevo" }));
    expect(view.getByRole("alert")).toBeVisible();
  });
});

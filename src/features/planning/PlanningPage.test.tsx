// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { UserAccess } from "@/src/domain/access";
import { createEmptySnapshot, type CascadePlan, type PlannerSnapshot } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { useUiStore } from "@/src/stores/useUiStore";
import { PlanningPage } from "./PlanningPage";

vi.mock("@/src/components/access/PremiumFeatureGate", () => ({
  PremiumFeatureGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const access: UserAccess = {
  userId: "planner-test-user",
  email: "persona@example.com",
  displayName: "Persona",
  role: "user",
  accessStatus: "free",
  subscriptionStatus: "none",
  trialStartedAt: null,
  trialEndsAt: null,
  serverNow: "2026-09-24T12:00:00.000Z",
  eligibilityStatus: "tracking",
  planInterval: null,
  premiumSource: null,
  campaignKey: null,
  currentStreakDays: 0,
  eligibleAt: null,
  currentPeriodStartsAt: null,
  currentPeriodEndsAt: null,
  nextPaymentAt: null,
  cancelAtPeriodEnd: false,
};

function monthlyPlan(periodKey: string, activities: CascadePlan["activities"] = []): CascadePlan {
  return {
    id: `plan-${periodKey}`,
    horizon: "monthly",
    periodKey,
    intention: "Avanzar con calma",
    priority: "",
    objectives: [],
    activities,
    status: "active",
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z",
  };
}

function plannerWith(snapshot: PlannerSnapshot, overrides: Partial<PlannerController> = {}): PlannerController {
  return {
    snapshot,
    saving: false,
    saveCascadePlan: vi.fn().mockResolvedValue(snapshot),
    upsertPlanActions: vi.fn().mockResolvedValue(snapshot),
    ...overrides,
  } as unknown as PlannerController;
}

function renderPlanning(planner: PlannerController, path = "/app/planning", currentAccess: UserAccess = access) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <PlanningPage planner={planner} access={currentAccess} onQuickCapture={vi.fn()} />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("monthly planning safeguards", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-24T12:00:00.000Z"));
    useUiStore.setState({ language: "es" });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps a titled important date unsaved until its accessible day field is complete", async () => {
    const snapshot = createEmptySnapshot();
    const planner = plannerWith(snapshot);
    const view = renderPlanning(planner, "/app/planning?create=month");
    const title = view.getByLabelText("Fecha importante 1");
    const day = view.getByLabelText("Día de la fecha importante 1");

    fireEvent.change(title, { target: { value: "Conversación importante" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar plan" }));

    await waitFor(() => expect(view.getByRole("alert").textContent).toContain("Elige un día"));
    expect(day.getAttribute("aria-invalid")).toBe("true");
    expect(day.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.activeElement).toBe(day);
    expect(planner.saveCascadePlan).not.toHaveBeenCalled();
  });

  it("locks the complete month save while its first submission is pending", async () => {
    const snapshot = createEmptySnapshot();
    let resolveSave!: (value: PlannerSnapshot) => void;
    const pendingSave = new Promise<PlannerSnapshot>((resolve) => { resolveSave = resolve; });
    const saveCascadePlan = vi.fn().mockReturnValue(pendingSave);
    const upsertPlanActions = vi.fn().mockResolvedValue(snapshot);
    const planner = plannerWith(snapshot, { saveCascadePlan, upsertPlanActions });
    const view = renderPlanning(planner, "/app/planning?create=month");

    fireEvent.change(view.getByLabelText("Acción 1"), { target: { value: "Preparar propuesta" } });
    const saveButton = view.getByRole("button", { name: "Guardar plan" });
    const form = saveButton.closest("form");
    if (!form) throw new Error("Expected the monthly plan form");

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(saveCascadePlan).toHaveBeenCalledTimes(1);
    expect(saveButton.getAttribute("aria-busy")).toBe("true");
    const input = saveCascadePlan.mock.calls[0][0];
    const savedPlan = monthlyPlan(input.periodKey);
    await act(async () => resolveSave({ ...snapshot, cascadePlans: [savedPlan] }));

    await waitFor(() => expect(upsertPlanActions).toHaveBeenCalledTimes(1));
    expect(upsertPlanActions.mock.calls[0][2][0]).toMatchObject({
      title: "Preparar propuesta",
      actionKey: expect.any(String),
    });
  });

  it("opens editable and read-only legacy months with missing or invalid days without throwing", () => {
    const snapshot = createEmptySnapshot();
    snapshot.cascadePlans = [monthlyPlan("2026-09", [
      { id: "legacy-event", title: "Conversación importante", type: "event" },
      { id: "invalid-event", title: "Fecha importada", date: "not-a-date", type: "event" },
    ])];
    const view = renderPlanning(plannerWith(snapshot));

    fireEvent.click(view.getByRole("button", { name: /Ver plan de septiembre 2026/i }));

    expect(view.getByText("Conversación importante")).toBeTruthy();
    expect(view.getByText("Fecha importada")).toBeTruthy();
    expect(view.getAllByText("Fecha pendiente")).toHaveLength(2);

    cleanup();
    const readOnlySnapshot = createEmptySnapshot();
    readOnlySnapshot.cascadePlans = [monthlyPlan("2026-01", [
      { id: "read-only-event", title: "Historia conservada", type: "event" },
    ])];
    const readOnlyAccess: UserAccess = {
      ...access,
      accessStatus: "trial",
      trialStartedAt: "2026-09-01T12:00:00.000Z",
      trialEndsAt: "2026-09-30T12:00:00.000Z",
    };
    const readOnlyView = renderPlanning(plannerWith(readOnlySnapshot), "/app/planning", readOnlyAccess);
    fireEvent.click(readOnlyView.getByRole("button", { name: /Ver plan de enero 2026/i }));

    expect(readOnlyView.getByText("Historia conservada")).toBeTruthy();
    expect(readOnlyView.getByText("Fecha pendiente")).toBeTruthy();
  });

  it("requires an explicit decision before linking a goal to an existing month", async () => {
    const snapshot = createEmptySnapshot();
    snapshot.goals = [
      { id: "requested", title: "Preparar mi carrera", reason: "Crecer", progressType: "tasks", priority: "high", status: "active", createdAt: "2026-09-01T12:00:00.000Z", updatedAt: "2026-09-01T12:00:00.000Z" },
      { id: "existing", title: "Cuidar mi salud", reason: "Bienestar", progressType: "tasks", priority: "medium", status: "active", createdAt: "2026-09-01T12:00:00.000Z", updatedAt: "2026-09-01T12:00:00.000Z" },
    ];
    snapshot.cascadePlans = [{ ...monthlyPlan("2026-09"), details: { sourceGoalId: "existing", sourceGoalTitle: "Cuidar mi salud", legacyKey: "preservar" } }];
    const saveCascadePlan = vi.fn().mockImplementation(async (input: Parameters<PlannerController["saveCascadePlan"]>[0]) => ({ ...snapshot, cascadePlans: [{ ...snapshot.cascadePlans[0], ...input, details: input.details }] }));
    const planner = plannerWith(snapshot, { saveCascadePlan });
    const view = renderPlanning(planner, "/app/planning?view=year&create=month&goal=requested");

    expect(view.getByText("Estás planificando esta meta")).toBeTruthy();
    expect(view.getByText(/Este mes ya tiene un plan/)).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Guardar plan" }));
    expect(view.getByRole("alert").textContent).toContain("Elige qué hacer");
    expect(saveCascadePlan).not.toHaveBeenCalled();

    fireEvent.click(view.getByRole("button", { name: "Vincular esta meta al mes" }));
    fireEvent.click(view.getByRole("button", { name: "Guardar plan" }));

    await waitFor(() => expect(saveCascadePlan).toHaveBeenCalledTimes(1));
    expect(saveCascadePlan.mock.calls[0][0].details).toMatchObject({
      sourceGoalId: "requested",
      sourceGoalTitle: "Preparar mi carrera",
      legacyKey: "preservar",
    });
    await waitFor(() => expect(view.getByRole("status").textContent).toContain("Preparar mi carrera quedó vinculada"));
  });

  it("cancels a goal-to-month conflict without changing persisted data", () => {
    const snapshot = createEmptySnapshot();
    snapshot.goals = [{ id: "requested", title: "Preparar mi carrera", reason: "Crecer", progressType: "tasks", priority: "high", status: "active", createdAt: "2026-09-01T12:00:00.000Z", updatedAt: "2026-09-01T12:00:00.000Z" }];
    snapshot.cascadePlans = [monthlyPlan("2026-09")];
    const planner = plannerWith(snapshot);
    const view = renderPlanning(planner, "/app/planning?view=year&create=month&goal=requested");

    fireEvent.click(view.getByRole("button", { name: "Cancelar" }));

    expect(planner.saveCascadePlan).not.toHaveBeenCalled();
    expect(view.queryByText("Estás planificando esta meta")).toBeNull();
  });

  it("reports the relationship actually saved after changing an earlier conflict choice", async () => {
    const snapshot = createEmptySnapshot();
    snapshot.goals = [
      { id: "requested", title: "Preparar mi carrera", reason: "Crecer", progressType: "tasks", priority: "high", status: "active", createdAt: "2026-09-01T12:00:00.000Z", updatedAt: "2026-09-01T12:00:00.000Z" },
      { id: "existing", title: "Cuidar mi salud", reason: "Bienestar", progressType: "tasks", priority: "medium", status: "active", createdAt: "2026-09-01T12:00:00.000Z", updatedAt: "2026-09-01T12:00:00.000Z" },
    ];
    const existingPlan = { ...monthlyPlan("2026-09"), details: { sourceGoalId: "existing", sourceGoalTitle: "Cuidar mi salud" } };
    snapshot.cascadePlans = [existingPlan];
    const saveCascadePlan = vi.fn().mockImplementation(async (input: Parameters<PlannerController["saveCascadePlan"]>[0]) => ({ ...snapshot, cascadePlans: [{ ...existingPlan, ...input, details: input.details }] }));
    const view = renderPlanning(plannerWith(snapshot, { saveCascadePlan }), "/app/planning?view=year&create=month&goal=requested");

    fireEvent.click(view.getByRole("button", { name: "Conservar lo existente" }));
    fireEvent.change(view.getByLabelText("Meta activa (opcional)"), { target: { value: "requested" } });
    fireEvent.click(view.getByRole("button", { name: "Guardar plan" }));

    await waitFor(() => expect(view.getByRole("status").textContent).toContain("Preparar mi carrera quedó vinculada"));
    expect(view.getByRole("status").textContent).not.toContain("conservando su vínculo anterior");
  });
});

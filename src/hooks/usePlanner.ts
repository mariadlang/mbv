"use client";

import { useCallback, useEffect, useState } from "react";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { EntityStatus, MoodName, PlannerSnapshot, ReviewType } from "@/src/domain/planner";
import type {
  DebtFormInput,
  GoalFormInput,
  HabitFormInput,
  OnboardingInput,
  ProjectFormInput,
  RecurringItemFormInput,
  SavingsFundFormInput,
  TaskFormInput,
  TransactionFormInput,
} from "@/src/lib/schemas";

type PlannerService = (typeof import("@/src/services/plannerService"))["plannerService"];

async function getService(): Promise<PlannerService> {
  const loadedService = await import("@/src/services/plannerService");
  return loadedService.plannerService;
}

export function usePlanner() {
  const [snapshot, setSnapshot] = useState<PlannerSnapshot>(createEmptySnapshot());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const service = await getService();
      setSnapshot(await service.load());
      setError(null);
    } catch {
      setError("No pudimos abrir tus datos locales. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getService()
      .then((service) => service.load())
      .then((data) => {
        if (!active) return;
        setSnapshot(data);
        setError(null);
      })
      .catch(() => {
        if (active) setError("No pudimos abrir tus datos locales. Inténtalo de nuevo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const commit = useCallback(
    async (operation: (service: PlannerService) => Promise<PlannerSnapshot>) => {
      setSaving(true);
      try {
        const service = await getService();
        const next = await operation(service);
        setSnapshot(next);
        setError(null);
        return next;
      } catch {
        setError("No pudimos guardar este cambio. Inténtalo de nuevo.");
        throw new Error("Planner operation failed");
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const downloadBackup = useCallback(async () => {
    const service = await getService();
    const json = await service.exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `my-best-version-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const importBackup = useCallback(
    async (file: File) => {
      const json = await file.text();
      return commit((service) => service.importBackup(json));
    },
    [commit],
  );

  const previewBackup = useCallback(async (file: File) => {
    const service = await getService();
    return service.previewBackup(await file.text());
  }, []);

  return {
    snapshot,
    loading,
    saving,
    error,
    retry: load,
    completeOnboarding: (
      input: OnboardingInput & { selectedAreaNames: string[]; priorities?: string[] },
    ) => commit((service) => service.completeOnboarding(input)),
    loadDemo: () => commit((service) => service.loadDemo()),
    createHabit: (input: HabitFormInput) => commit((service) => service.createHabit(input)),
    toggleHabit: (habitId: string, date: string) =>
      commit((service) => service.toggleHabit(habitId, date)),
    createTask: (title: string, date?: string) =>
      commit((service) => service.createTask(title, date)),
    createTaskDetailed: (input: TaskFormInput) =>
      commit((service) => service.createTaskDetailed(input)),
    createProject: (input: ProjectFormInput) =>
      commit((service) => service.createProject(input)),
    toggleTask: (taskId: string) => commit((service) => service.toggleTask(taskId)),
    rescheduleTask: (taskId: string, date: string) =>
      commit((service) => service.rescheduleTask(taskId, date)),
    saveMood: (mood: MoodName, energy: 1 | 2 | 3 | 4 | 5, factors: string[] = [], note?: string) =>
      commit((service) => service.saveMood(mood, energy, factors, note)),
    createGoal: (input: GoalFormInput, milestoneTitles: string[] = []) =>
      commit((service) => service.createGoal(input, milestoneTitles)),
    updateGoalStatus: (goalId: string, status: EntityStatus) =>
      commit((service) => service.updateGoalStatus(goalId, status)),
    updateGoalProgress: (goalId: string, value: number) =>
      commit((service) => service.updateGoalProgress(goalId, value)),
    updateLifeArea: (lifeAreaId: string, input: { currentScore: number; desiredScore: number; vision: string }) =>
      commit((service) => service.updateLifeArea(lifeAreaId, input)),
    updateProfileSettings: (input: { name?: string; weekStartsOn?: 0 | 1; theme?: "light" | "rose" | "taupe"; baseCurrency?: "COP" | "USD" | "EUR" | "MXN"; financePrivacy?: boolean }) =>
      commit((service) => service.updateProfileSettings(input)),
    updateLifeAreaSettings: (lifeAreaId: string, input: { name?: string; active?: boolean; direction?: "up" | "down" }) =>
      commit((service) => service.updateLifeAreaSettings(lifeAreaId, input)),
    toggleMilestone: (milestoneId: string) =>
      commit((service) => service.toggleMilestone(milestoneId)),
    saveJournal: (text: string, options: { title?: string; type?: "free" | "gratitude" | "weekly_review" | "monthly_reset"; goalId?: string } = {}) =>
      commit((service) => service.saveJournal(text, options)),
    updateDailyIntention: (value: string) =>
      commit((service) => service.updateDailyIntention(value)),
    saveReview: (type: ReviewType, summary: string, decisions: string[] = []) =>
      commit((service) => service.saveReview(type, summary, decisions)),
    saveMonthlyBudget: (input: { monthKey: string; plannedIncome: number; notes?: string; lines: { categoryId: string; plannedAmount: number }[] }) =>
      commit((service) => service.saveMonthlyBudget(input)),
    createTransaction: (input: TransactionFormInput) =>
      commit((service) => service.createTransaction(input)),
    createSavingsFund: (input: SavingsFundFormInput) =>
      commit((service) => service.createSavingsFund(input)),
    createDebt: (input: DebtFormInput) => commit((service) => service.createDebt(input)),
    createRecurringItem: (input: RecurringItemFormInput) =>
      commit((service) => service.createRecurringItem(input)),
    saveFinancialReview: (monthKey: string, summary: string, decisions: string[]) =>
      commit((service) => service.saveFinancialReview(monthKey, summary, decisions)),
    clearAll: () => commit((service) => service.clear()),
    downloadBackup,
    importBackup,
    previewBackup,
  };
}

export type PlannerController = ReturnType<typeof usePlanner>;

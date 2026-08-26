"use client";

import { useCallback, useEffect, useState } from "react";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { EntityStatus, MoodName, PlannerSnapshot, ReviewType } from "@/src/domain/planner";
import type {
  BodyCheckInFormInput,
  BrainDumpFormInput,
  CascadePlanFormInput,
  ChallengeFormInput,
  DebtFormInput,
  EventFormInput,
  FitnessSettingsFormInput,
  FinancialAccountFormInput,
  GoalFormInput,
  HabitFormInput,
  MealFormInput,
  OnboardingInput,
  PendingPurchaseFormInput,
  ProjectFormInput,
  RecurringItemFormInput,
  RoutineFormInput,
  SavingsFundFormInput,
  TaskFormInput,
  TransactionFormInput,
  WorkoutFormInput,
  WorkoutPlanFormInput,
} from "@/src/lib/schemas";
import { backupFileSchema } from "@/src/lib/schemas";

type PlannerService = (typeof import("@/src/services/plannerService"))["plannerService"];

async function getService(): Promise<PlannerService> {
  const loadedService = await import("@/src/services/plannerService");
  return loadedService.plannerService;
}

function reportPlannerError(context: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[planner] ${context}`, error);
  }
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
    } catch (caught) {
      reportPlannerError("load", caught);
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
      .catch((caught) => {
        reportPlannerError("initial load", caught);
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
      } catch (caught) {
        reportPlannerError("save", caught);
        setError("No pudimos guardar este cambio. Inténtalo de nuevo.");
        throw caught;
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
      backupFileSchema.parse({ type: file.type, size: file.size });
      const json = await file.text();
      return commit((service) => service.importBackup(json));
    },
    [commit],
  );

  const previewBackup = useCallback(async (file: File) => {
    backupFileSchema.parse({ type: file.type, size: file.size });
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
    createTask: (title: string, date?: string, focusPriority?: 1 | 2 | 3) =>
      commit((service) => service.createTask(title, date, focusPriority)),
    createTaskDetailed: (input: TaskFormInput) =>
      commit((service) => service.createTaskDetailed(input)),
    assignTaskFocusPriority: (taskId: string, date: string, focusPriority?: 1 | 2 | 3) =>
      commit((service) => service.assignTaskFocusPriority(taskId, date, focusPriority)),
    createProject: (input: ProjectFormInput) =>
      commit((service) => service.createProject(input)),
    toggleTask: (taskId: string) => commit((service) => service.toggleTask(taskId)),
    rescheduleTask: (taskId: string, date: string) =>
      commit((service) => service.rescheduleTask(taskId, date)),
    saveMood: (mood: MoodName, energy: 1 | 2 | 3 | 4 | 5, factors: string[] = [], note?: string, sleep?: 1 | 2 | 3 | 4 | 5, concentration?: 1 | 2 | 3 | 4 | 5) =>
      commit((service) => service.saveMood(mood, energy, factors, note, sleep, concentration)),
    createGoal: (input: GoalFormInput, milestoneTitles: string[] = []) =>
      commit((service) => service.createGoal(input, milestoneTitles)),
    updateGoalStatus: (goalId: string, status: EntityStatus) =>
      commit((service) => service.updateGoalStatus(goalId, status)),
    updateGoalProgress: (goalId: string, value: number) =>
      commit((service) => service.updateGoalProgress(goalId, value)),
    updateLifeArea: (lifeAreaId: string, input: { currentScore: number; desiredScore: number; vision: string; dream?: string; imageDataUrl?: string }) =>
      commit((service) => service.updateLifeArea(lifeAreaId, input)),
    createLifeArea: (input: { name: string; category: string; vision?: string; dream?: string; currentScore?: number; desiredScore?: number; imageDataUrl?: string }) =>
      commit((service) => service.createLifeArea(input)),
    updateProfileSettings: (input: { name?: string; weekStartsOn?: 0 | 1; theme?: "light" | "rose" | "taupe"; baseCurrency?: "COP" | "USD" | "EUR" | "MXN"; financePrivacy?: boolean; fitnessEnabled?: boolean; fitnessProfile?: FitnessSettingsFormInput; usePurpose?: string; avatarDataUrl?: string; activationCompleted?: boolean }) =>
      commit((service) => service.updateProfileSettings(input)),
    updateLifeAreaSettings: (lifeAreaId: string, input: { name?: string; active?: boolean; direction?: "up" | "down" }) =>
      commit((service) => service.updateLifeAreaSettings(lifeAreaId, input)),
    toggleMilestone: (milestoneId: string) =>
      commit((service) => service.toggleMilestone(milestoneId)),
    saveJournal: (text: string, options: { title?: string; type?: "free" | "gratitude" | "weekly_review" | "monthly_reset"; goalId?: string; imageDataUrl?: string } = {}) =>
      commit((service) => service.saveJournal(text, options)),
    updateDailyIntention: (value: string) =>
      commit((service) => service.updateDailyIntention(value)),
    saveReview: (type: ReviewType, summary: string, decisions: string[] = []) =>
      commit((service) => service.saveReview(type, summary, decisions)),
    saveStructuredReview: (type: ReviewType, responses: Record<string, string>, decisions: string[] = []) =>
      commit((service) => service.saveStructuredReview(type, responses, decisions)),
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
    saveCascadePlan: (input: CascadePlanFormInput) =>
      commit((service) => service.saveCascadePlan(input)),
    deleteCascadePlan: (planId: string) =>
      commit((service) => service.deleteCascadePlan(planId)),
    toggleCascadeObjective: (planId: string, objectiveIndex: number) =>
      commit((service) => service.toggleCascadeObjective(planId, objectiveIndex)),
    createBrainDumpItem: (input: BrainDumpFormInput) =>
      commit((service) => service.createBrainDumpItem(input)),
    updateBrainDumpItem: (itemId: string, input: { status?: "idea" | "planned" | "completed" | "released"; tentativeDate?: string }) =>
      commit((service) => service.updateBrainDumpItem(itemId, input)),
    scheduleBrainDumpItem: (itemId: string, date: string) =>
      commit((service) => service.scheduleBrainDumpItem(itemId, date)),
    createRoutine: (input: RoutineFormInput) => commit((service) => service.createRoutine(input)),
    createEvent: (input: EventFormInput) => commit((service) => service.createEvent(input)),
    createVisionBoardItem: (input: { type: "quote" | "image" | "mixed"; content: string; caption?: string; reminderEnabled?: boolean; reminderFrequency?: "daily" | "weekly" | "monthly" | "quarterly" }) =>
      commit((service) => service.createVisionBoardItem(input)),
    toggleVisionReminder: (itemId: string) => commit((service) => service.toggleVisionReminder(itemId)),
    saveWorkout: (input: WorkoutFormInput) => commit((service) => service.saveWorkout(input)),
    saveWorkoutPlan: (input: WorkoutPlanFormInput) => commit((service) => service.saveWorkoutPlan(input)),
    completeWorkout: (date: string) => commit((service) => service.completeWorkout(date)),
    duplicateWorkout: (sourceDate: string, targetDate: string) => commit((service) => service.duplicateWorkout(sourceDate, targetDate)),
    saveMeal: (input: MealFormInput) => commit((service) => service.saveMeal(input)),
    deleteMeal: (date: string, mealId: string) => commit((service) => service.deleteMeal(date, mealId)),
    copyMeals: (sourceDate: string, targetDate: string) => commit((service) => service.copyMeals(sourceDate, targetDate)),
    saveBodyCheckIn: (input: BodyCheckInFormInput) => commit((service) => service.saveBodyCheckIn(input)),
    createChallenge: (input: ChallengeFormInput) => commit((service) => service.createChallenge(input)),
    toggleChallengeDate: (challengeId: string, date: string) => commit((service) => service.toggleChallengeDate(challengeId, date)),
    updateChallengeStatus: (challengeId: string, status: "active" | "completed" | "archived") =>
      commit((service) => service.updateChallengeStatus(challengeId, status)),
    createFinancialAccount: (input: FinancialAccountFormInput) => commit((service) => service.createFinancialAccount(input)),
    updateFinancialAccountBalance: (accountId: string, initialBalance: number) => commit((service) => service.updateFinancialAccountBalance(accountId, initialBalance)),
    adjustFinancialAccountBalance: (accountId: string, desiredBalance: number) => commit((service) => service.adjustFinancialAccountBalance(accountId, desiredBalance)),
    createPendingPurchase: (input: PendingPurchaseFormInput) => commit((service) => service.createPendingPurchase(input)),
    updatePendingPurchase: (itemId: string, status: "pending" | "purchased" | "released") =>
      commit((service) => service.updatePendingPurchase(itemId, status)),
    addProjectChecklistItem: (projectId: string, title: string) =>
      commit((service) => service.addProjectChecklistItem(projectId, title)),
    toggleProjectChecklistItem: (itemId: string) =>
      commit((service) => service.toggleProjectChecklistItem(itemId)),
    clearAll: () => commit((service) => service.clear()),
    downloadBackup,
    importBackup,
    previewBackup,
  };
}

export type PlannerController = ReturnType<typeof usePlanner>;

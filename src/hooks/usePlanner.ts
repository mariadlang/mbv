"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { BrainDumpType, EntityStatus, Habit, MoodName, PlannerEvent, PlannerEventSyncOptions, PlannerSnapshot, ReviewType } from "@/src/domain/planner";
import type { CalendarEvent } from "@/src/domain/calendar";
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
import { analyticsService } from "@/src/services/analyticsService";
import type { ClientProductEventName } from "@/src/domain/productAnalytics";
import { isTrialPlanningDateAllowed, isTrialPlanningMonthAllowed, TRIAL_PLANNING_LIMIT_MESSAGE, type UserAccess } from "@/src/domain/access";
import { toLocalDateKey } from "@/src/lib/dates";
import { participationService } from "@/src/services/participationService";
import type { QualifyingActivityType } from "@/src/domain/participation";

type PlannerService = import("@/src/services/plannerService").PlannerService;
type LocalPlannerClaimService = import("@/src/services/localPlannerClaimService").LocalPlannerClaimService;
type LegacyPlannerSummary = import("@/src/services/localPlannerClaimService").LegacyPlannerSummary;

function reportPlannerError(context: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[planner] ${context}`, error);
  }
}

export function usePlanner(ownerId: string | null, access: UserAccess | null = null) {
  const [loaded, setLoaded] = useState<{ ownerId: string | null; snapshot: PlannerSnapshot }>({ ownerId: null, snapshot: createEmptySnapshot() });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legacyState, setLegacyState] = useState<{ ownerId: string; summary: LegacyPlannerSummary } | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const generationRef = useRef(0);
  const activeRef = useRef<{ ownerId: string; service: PlannerService; claimService: LocalPlannerClaimService } | null>(null);
  const snapshot = useMemo(
    () => loaded.ownerId === ownerId ? loaded.snapshot : createEmptySnapshot(),
    [loaded, ownerId],
  );
  const visibleLoading = Boolean(ownerId && (loading || loaded.ownerId !== ownerId));
  const legacyData = legacyState?.ownerId === ownerId ? legacyState.summary : null;

  const getActiveService = useCallback(() => {
    const active = activeRef.current;
    if (!ownerId || !active || active.ownerId !== ownerId) throw new Error("PLANNER_OWNER_NOT_READY");
    return active;
  }, [ownerId]);

  useEffect(() => {
    const generation = ++generationRef.current;
    let active = true;
    queueMicrotask(() => {
      if (!active || generationRef.current !== generation) return;
      setSaving(false);
      setError(null);
      setLegacyState(null);
      setLoading(Boolean(ownerId));
      if (!ownerId) setLoaded({ ownerId: null, snapshot: createEmptySnapshot() });
    });
    if (!ownerId) {
      activeRef.current = null;
      return () => { active = false; };
    }

    void Promise.all([
      import("@/src/services/plannerService"),
      import("@/src/services/localPlannerClaimService"),
    ]).then(async ([plannerModule, claimModule]) => {
      const service = plannerModule.createLocalPlannerService(ownerId);
      const claimService = claimModule.createIndexedDbLocalPlannerClaimService(ownerId);
      if (!active || generationRef.current !== generation) {
        void service.close();
        claimService.close();
        return;
      }
      activeRef.current = { ownerId, service, claimService };
      const legacySummary = await claimService.inspect();
      const data = legacySummary ? createEmptySnapshot() : await service.load();
      if (!active || generationRef.current !== generation) return;
      setLoaded({ ownerId, snapshot: data });
      setLegacyState(legacySummary ? { ownerId, summary: legacySummary } : null);
      setError(null);
    }).catch((caught) => {
      reportPlannerError("initial load", caught);
      if (active && generationRef.current === generation) setError("No pudimos abrir tus datos locales. Inténtalo de nuevo.");
    }).finally(() => {
      if (active && generationRef.current === generation) setLoading(false);
    });

    return () => {
      active = false;
      const current = activeRef.current;
      if (current?.ownerId === ownerId) {
        activeRef.current = null;
        void current.service.close();
        current.claimService.close();
      }
    };
  }, [ownerId, reloadNonce]);

  const commit = useCallback(
    async (operation: (service: PlannerService) => Promise<PlannerSnapshot>) => {
      const current = getActiveService();
      const generation = generationRef.current;
      setSaving(true);
      try {
        const next = await operation(current.service);
        if (generationRef.current === generation && activeRef.current === current) {
          setLoaded({ ownerId: current.ownerId, snapshot: next });
          setError(null);
        }
        return next;
      } catch (caught) {
        reportPlannerError("save", caught);
        if (generationRef.current === generation && activeRef.current === current) {
          setError("No pudimos guardar este cambio. Inténtalo de nuevo.");
        }
        throw caught;
      } finally {
        if (generationRef.current === generation && activeRef.current === current) setSaving(false);
      }
    },
    [getActiveService],
  );

  const downloadBackup = useCallback(async () => {
    const json = await getActiveService().service.exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `my-best-version-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [getActiveService]);

  const commitTracked = useCallback(async (event: ClientProductEventName, operation: (service: PlannerService) => Promise<PlannerSnapshot>, properties: Record<string, string | number | boolean> = {}, dedupeKey?: string) => {
    const next = await commit(operation);
    analyticsService.track(event, properties, dedupeKey);
    return next;
  }, [commit]);

  const recordParticipation = useCallback((activity: QualifyingActivityType) => {
    if (ownerId) participationService.record(ownerId, activity);
  }, [ownerId]);

  const commitParticipating = useCallback(async (activity: QualifyingActivityType, operation: (service: PlannerService) => Promise<PlannerSnapshot>) => {
    const next = await commit(operation);
    recordParticipation(activity);
    return next;
  }, [commit, recordParticipation]);

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
    return getActiveService().service.previewBackup(await file.text());
  }, [getActiveService]);

  const claimLegacyData = useCallback(async () => {
    const current = getActiveService();
    const generation = generationRef.current;
    setSaving(true);
    try {
      const next = await current.claimService.claim();
      if (generationRef.current === generation && activeRef.current === current) {
        setLoaded({ ownerId: current.ownerId, snapshot: next });
        setLegacyState(null);
        setError(null);
      }
      return next;
    } catch (caught) {
      reportPlannerError("claim legacy data", caught);
      if (generationRef.current === generation && activeRef.current === current) {
        setError("No pudimos copiar los datos locales. No se eliminó nada; puedes intentarlo de nuevo.");
      }
      throw caught;
    } finally {
      if (generationRef.current === generation && activeRef.current === current) setSaving(false);
    }
  }, [getActiveService]);

  const startFresh = useCallback(async () => {
    const current = getActiveService();
    await current.claimService.startFresh();
    if (activeRef.current === current) setLegacyState(null);
  }, [getActiveService]);

  const resumeExistingSpace = useCallback(
    (name: string) => commit((service) => service.resumeExistingSpace(name)),
    [commit],
  );

  const assertPlanningDateAllowed = (date?: string | null) => {
    if (access && date && !isTrialPlanningDateAllowed(access, date)) throw new Error(TRIAL_PLANNING_LIMIT_MESSAGE);
  };
  const assertTaskWritable = (taskId: string, nextDate?: string | null) => {
    assertPlanningDateAllowed(snapshot.tasks.find((task) => task.id === taskId)?.date);
    assertPlanningDateAllowed(nextDate);
  };
  const assertPlanWritable = (planId: string) => {
    const plan = snapshot.cascadePlans.find((item) => item.id === planId);
    if (access && plan?.horizon === "monthly" && !isTrialPlanningMonthAllowed(access, plan.periodKey)) throw new Error(TRIAL_PLANNING_LIMIT_MESSAGE);
  };
  const assertTentativeDateAllowed = (date?: string | null) => {
    if (!access || !date) return;
    const allowed = date.length === 7
      ? isTrialPlanningMonthAllowed(access, date)
      : isTrialPlanningDateAllowed(access, date);
    if (!allowed) throw new Error(TRIAL_PLANNING_LIMIT_MESSAGE);
  };
  const assertBrainDumpWritable = (itemId: string, nextDate?: string | null) => {
    assertTentativeDateAllowed(snapshot.brainDumpItems.find((item) => item.id === itemId)?.tentativeDate);
    assertTentativeDateAllowed(nextDate);
  };

  return {
    snapshot,
    loading: visibleLoading,
    saving,
    error,
    legacyData,
    claimLegacyData,
    startFresh,
    retry: () => setReloadNonce((value) => value + 1),
    completeOnboarding: (
      input: OnboardingInput & { selectedAreaNames: string[]; priorities?: string[]; focus?: "today" | "goal" | "week" | "habit"; result?: string; action?: string },
    ) => commitTracked("onboarding_completed", (service) => service.completeOnboarding(input), { result: "completed", version: 2 }, "completed:v2"),
    resumeExistingSpace,
    loadDemo: () => commit((service) => service.loadDemo()),
    createHabit: async (input: HabitFormInput) => {
      const next = await commit((service) => service.createHabit(input));
      analyticsService.track("first_action_created", { source: "habit", result: "connected", version: 2 }, "first:v2");
      return next;
    },
    updateHabitName: (habitId: string, name: string) => commit((service) => service.updateHabitName(habitId, name)),
    updateHabit: (habitId: string, input: { name: string; scheduledDays: number[]; oneOffDate?: string | null; type?: Habit["type"]; target?: number; unit?: string; lifeAreaId?: string; origin?: Habit["origin"] }) =>
      commit((service) => service.updateHabit(habitId, input)),
    toggleHabit: async (habitId: string, date: string) => {
      assertPlanningDateAllowed(date);
      const next = await commit((service) => service.toggleHabit(habitId, date));
      if (next.habitLogs.some((log) => log.habitId === habitId && log.date === date && log.value > 0)) {
        analyticsService.track("first_habit_recorded", { source: "habit_toggle", version: 2 }, "recorded:v2");
        recordParticipation("habit_recorded");
      }
      return next;
    },
    setHabitProgress: async (habitId: string, date: string, value: number) => {
      assertPlanningDateAllowed(date);
      const next = await commit((service) => service.setHabitProgress(habitId, date, value));
      if (next.habitLogs.some((log) => log.habitId === habitId && log.date === date && log.value > 0)) {
        analyticsService.track("first_habit_recorded", { source: "habit_progress", version: 2 }, "recorded:v2");
        recordParticipation("habit_recorded");
      }
      return next;
    },
    createTask: async (title: string, date?: string, focusPriority?: 1 | 2 | 3) => {
      assertPlanningDateAllowed(date);
      const next = await commitTracked("task_created", (service) => service.createTask(title, date, focusPriority), { source: "quick_add" });
      if (date) {
        analyticsService.track("first_action_created", { source: "today", result: "connected", version: 2 }, "first:v2");
        recordParticipation("daily_action_created");
      }
      return next;
    },
    createTaskDetailed: async (input: TaskFormInput) => {
      assertPlanningDateAllowed(input.date);
      const next = await commitTracked("task_created", (service) => service.createTaskDetailed(input), { source: "task_form" });
      if (input.date || input.goalId || input.projectId || input.periodPlanId || input.focusPriority) {
        analyticsService.track("first_action_created", { source: input.periodPlanId ? "monthly_planning" : input.goalId ? "goal" : "today", result: "connected", version: 2 }, "first:v2");
      }
      if (input.date) recordParticipation("daily_action_created");
      return next;
    },
    updateTask: async (taskId: string, input: Pick<TaskFormInput, "title"> & Partial<Pick<TaskFormInput, "date" | "focusPriority" | "goalId" | "projectId" | "periodPlanId" | "priority" | "description">>) => {
      assertTaskWritable(taskId, input.date);
      const previousDate = snapshot.tasks.find((task) => task.id === taskId)?.date;
      const next = await commit((service) => service.updateTask(taskId, input));
      if (!previousDate && input.date) analyticsService.track("first_action_created", { source: "today", result: "connected", version: 2 }, "first:v2");
      else if (previousDate && input.date !== undefined && input.date !== previousDate) analyticsService.track("action_rescheduled", { source: "task_edit", version: 2 }, "first:v2");
      if (previousDate || input.date) recordParticipation("daily_action_updated");
      return next;
    },
    assignTaskFocusPriority: async (taskId: string, date: string, focusPriority?: 1 | 2 | 3) => {
      assertTaskWritable(taskId, date);
      const previousDate = snapshot.tasks.find((task) => task.id === taskId)?.date;
      const next = await commit((service) => service.assignTaskFocusPriority(taskId, date, focusPriority));
      if (!previousDate) analyticsService.track("first_action_created", { source: "today", result: "connected", version: 2 }, "first:v2");
      else if (date !== previousDate) analyticsService.track("action_rescheduled", { source: "priority_assignment", version: 2 }, "first:v2");
      recordParticipation("daily_action_updated");
      return next;
    },
    createProject: (input: ProjectFormInput) =>
      commit((service) => service.createProject(input)),
    toggleTask: async (taskId: string) => { assertTaskWritable(taskId); const next = await commit((service) => service.toggleTask(taskId)); const completedTask = next.tasks.find((task) => task.id === taskId); if (completedTask?.status === "completed") { analyticsService.track("task_completed", { source: "task_toggle" }); analyticsService.track("first_action_completed", { source: "task_toggle", version: 2 }, "completed:v2"); if (completedTask.date) recordParticipation("daily_action_completed"); } return next; },
    deleteTask: (taskId: string) => { assertTaskWritable(taskId); return commit((service) => service.deleteTask(taskId)); },
    cancelTask: (taskId: string) => { assertTaskWritable(taskId); return commit((service) => service.cancelTask(taskId)); },
    rescheduleTask: async (taskId: string, date: string) => {
      assertTaskWritable(taskId, date);
      const previousDate = snapshot.tasks.find((task) => task.id === taskId)?.date;
      const next = await commit((service) => service.rescheduleTask(taskId, date));
      if (!previousDate) analyticsService.track("first_action_created", { source: "today", result: "connected", version: 2 }, "first:v2");
      else if (previousDate !== date) analyticsService.track("action_rescheduled", { source: "reschedule", version: 2 }, "first:v2");
      recordParticipation("daily_action_updated");
      return next;
    },
    saveMood: (mood: MoodName, energy: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, factors: string[] = [], note?: string, sleep?: 1 | 2 | 3 | 4 | 5, concentration?: 1 | 2 | 3 | 4 | 5) =>
      commit((service) => service.saveMood(mood, energy, factors, note, sleep, concentration)),
    createGoal: async (input: GoalFormInput, milestoneTitles: string[] = []) => {
      const next = await commitTracked("goal_created", (service) => service.createGoal(input, milestoneTitles));
      recordParticipation("goal_created");
      return next;
    },
    updateGoalStatus: (goalId: string, status: EntityStatus) =>
      commitParticipating("goal_updated", (service) => service.updateGoalStatus(goalId, status)),
    updateGoalProgress: (goalId: string, value: number) =>
      commitParticipating("goal_updated", (service) => service.updateGoalProgress(goalId, value)),
    updateLifeArea: (lifeAreaId: string, input: { currentScore: number; desiredScore: number; vision: string; dream?: string; imageDataUrl?: string; category?: string }) =>
      commitParticipating("vision_updated", (service) => service.updateLifeArea(lifeAreaId, input)),
    createLifeArea: (input: { name: string; category: string; vision?: string; dream?: string; currentScore?: number; desiredScore?: number; imageDataUrl?: string }) =>
      commitParticipating("vision_updated", (service) => service.createLifeArea(input)),
    updateProfileSettings: (input: { name?: string; weekStartsOn?: 0 | 1; theme?: "light" | "rose" | "taupe"; baseCurrency?: "COP" | "USD" | "EUR" | "MXN"; financePrivacy?: boolean; fitnessEnabled?: boolean; fitnessProfile?: FitnessSettingsFormInput; usePurpose?: string; avatarDataUrl?: string; activationCompleted?: boolean }) =>
      commitTracked("settings_updated", (service) => service.updateProfileSettings(input), { section: "profile" }),
    updateLifeAreaSettings: (lifeAreaId: string, input: { name?: string; active?: boolean; direction?: "up" | "down" }) =>
      commit((service) => service.updateLifeAreaSettings(lifeAreaId, input)),
    toggleMilestone: (milestoneId: string) =>
      commit((service) => service.toggleMilestone(milestoneId)),
    saveJournal: (text: string, options: { title?: string; type?: "free" | "gratitude" | "weekly_review" | "monthly_reset"; goalId?: string; imageDataUrl?: string } = {}) =>
      commitTracked("journal_entry_created", (service) => service.saveJournal(text, options)),
    updateJournal: (entryId: string, input: { title?: string; text: string; type: "free" | "gratitude" | "weekly_review" | "monthly_reset"; goalId?: string }) =>
      commit((service) => service.updateJournal(entryId, input)),
    updateDailyIntention: (value: string) =>
      commit((service) => service.updateDailyIntention(value)),
    saveReview: (type: ReviewType, summary: string, decisions: string[] = []) =>
      commitTracked("progress_review_created", (service) => service.saveReview(type, summary, decisions), { period: type }),
    saveStructuredReview: (type: ReviewType, responses: Record<string, string>, decisions: string[] = [], referenceDate?: Date) => {
      if (type === "weekly" && referenceDate) assertPlanningDateAllowed(toLocalDateKey(referenceDate));
      return commitTracked("progress_review_created", (service) => service.saveStructuredReview(type, responses, decisions, referenceDate), { period: type });
    },
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
    saveCascadePlan: (input: CascadePlanFormInput) => {
      if (access && input.horizon === "monthly" && !isTrialPlanningMonthAllowed(access, input.periodKey)) throw new Error(TRIAL_PLANNING_LIMIT_MESSAGE);
      if (input.horizon === "monthly" || input.horizon === "weekly") input.activities?.forEach((activity) => assertPlanningDateAllowed(activity.date));
      const event = input.horizon === "annual" ? "annual_plan_updated" : input.horizon === "monthly" ? "monthly_plan_updated" : input.horizon === "weekly" ? "week_planned" : null;
      return event ? commitTracked(event, (service) => service.saveCascadePlan(input), { period: input.horizon }) : commit((service) => service.saveCascadePlan(input));
    },
    upsertPlanActions: async (planId: string, goalId: string | undefined, actions: Array<{ taskId?: string; title: string; date?: string }>) => {
      assertPlanWritable(planId);
      actions.forEach((action) => assertPlanningDateAllowed(action.date));
      const next = await commit((service) => service.upsertPlanActions(planId, goalId, actions));
      if (actions.some((action) => !action.taskId && action.title.trim())) analyticsService.track("first_action_created", { source: "monthly_planning", result: "connected", version: 2 }, "first:v2");
      if (actions.some((action) => action.date && action.title.trim())) recordParticipation("daily_action_updated");
      return next;
    },
    deleteCascadePlan: (planId: string) => { assertPlanWritable(planId); return commit((service) => service.deleteCascadePlan(planId)); },
    toggleCascadeObjective: (planId: string, objectiveIndex: number) => { assertPlanWritable(planId); return commit((service) => service.toggleCascadeObjective(planId, objectiveIndex)); },
    createBrainDumpItem: (input: BrainDumpFormInput) =>
      commit((service) => service.createBrainDumpItem(input)),
    updateBrainDumpItem: (itemId: string, input: { title?: string; type?: BrainDumpType; priority?: "low" | "medium" | "high"; status?: "idea" | "planned" | "completed" | "released"; tentativeDate?: string | null; goalId?: string | null; projectId?: string | null }) => {
      assertBrainDumpWritable(itemId, input.tentativeDate);
      return commit((service) => service.updateBrainDumpItem(itemId, input));
    },
    scheduleBrainDumpItem: (itemId: string, date: string, destination: "monthly" | "weekly" | "daily" = "daily") => {
      assertBrainDumpWritable(itemId);
      assertPlanningDateAllowed(date);
      return commit((service) => service.scheduleBrainDumpItem(itemId, date, destination));
    },
    createRoutine: (input: RoutineFormInput) => commitTracked("routine_created", (service) => service.createRoutine(input)),
    updateRoutine: (routineId: string, input: RoutineFormInput) => commit((service) => service.updateRoutine(routineId, input)),
    createEvent: (input: EventFormInput, sync: PlannerEventSyncOptions = {}) => { assertPlanningDateAllowed(input.startDate); assertPlanningDateAllowed(input.endDate); return commit((service) => service.createEvent(input, sync)); },
    updateEvent: (eventId: string, input: EventFormInput, sync: PlannerEventSyncOptions = {}) => {
      assertPlanningDateAllowed(snapshot.events.find((item) => item.id === eventId)?.startDate);
      assertPlanningDateAllowed(input.startDate);
      assertPlanningDateAllowed(input.endDate);
      return commit((service) => service.updateEvent(eventId, input, sync));
    },
    updateEventSync: (eventId: string, patch: Partial<PlannerEvent>) => commit((service) => service.updateEventSync(eventId, patch)),
    reconcileCalendarEvents: (events: CalendarEvent[], connection?: { integrationId: string | null; visibleCalendarIds: string[] }) => commit((service) => service.reconcileCalendarEvents(events, connection)),
    deleteEvent: (eventId: string) => commit((service) => service.deleteEvent(eventId)),
    detachGoogleCalendar: () => commit((service) => service.detachGoogleCalendar()),
    createVisionBoardItem: (input: { type: "quote" | "image" | "mixed"; content: string; caption?: string; reminderEnabled?: boolean; reminderFrequency?: "daily" | "weekly" | "monthly" | "quarterly" }) =>
      commit((service) => service.createVisionBoardItem(input)),
    toggleVisionReminder: (itemId: string) => commit((service) => service.toggleVisionReminder(itemId)),
    saveWorkout: (input: WorkoutFormInput) => commit((service) => service.saveWorkout(input)),
    saveWorkoutPlan: (input: WorkoutPlanFormInput) => commit((service) => service.saveWorkoutPlan(input)),
    deleteWorkoutPlan: (date: string) => commit((service) => service.deleteWorkoutPlan(date)),
    completeWorkout: (date: string) => commitTracked("workout_completed", (service) => service.completeWorkout(date)),
    duplicateWorkout: (sourceDate: string, targetDate: string) => commit((service) => service.duplicateWorkout(sourceDate, targetDate)),
    saveMeal: (input: MealFormInput) => commitTracked("meal_logged", (service) => service.saveMeal(input)),
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
    clearAll: async () => {
      const current = getActiveService();
      await current.claimService.startFresh();
      const next = await commit((service) => service.clear());
      if (activeRef.current === current) setLegacyState(null);
      return next;
    },
    downloadBackup,
    importBackup,
    previewBackup,
  };
}

export type PlannerController = ReturnType<typeof usePlanner>;

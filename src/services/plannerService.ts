import { createDemoSnapshot } from "@/src/domain/demo";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { BrainDumpType, EntityStatus, MoodName, PlannerSnapshot, ReviewType } from "@/src/domain/planner";
import { habitRecommendation } from "@/src/domain/cascadeRules";
import { applyDailyFocusPriority } from "@/src/domain/guidanceRules";
import { defaultFinanceCategories, mergeDefaultFinanceCategories } from "@/src/domain/financeRules";
import { defaultLifeAreaNames, mergeDefaultLifeAreas } from "@/src/domain/lifeAreaRules";
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
import { cascadePlanFormSchema, eventFormSchema, fitnessSettingsFormSchema, mealFormSchema, parseBackupEnvelope, plannerSnapshotSchema, workoutPlanFormSchema } from "@/src/lib/schemas";
import { getReviewPeriodKey, toLocalDateKey } from "@/src/lib/dates";
import { IndexedDbPlannerRepository } from "@/src/repositories/local/IndexedDbPlannerRepository";
import { createSnapshotWriteQueue } from "@/src/services/snapshotWriteQueue";

const repository = new IndexedDbPlannerRepository();
const writes = createSnapshotWriteQueue(repository);
const id = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

async function updateSnapshot(
  updater: (snapshot: PlannerSnapshot) => PlannerSnapshot,
): Promise<PlannerSnapshot> {
  return writes.update(updater);
}

export const plannerService = {
  async load(): Promise<PlannerSnapshot> {
    const snapshot = await repository.load();
    const financeCategories = mergeDefaultFinanceCategories(snapshot.financeCategories, id, nowIso());
    const lifeAreas = snapshot.profile ? mergeDefaultLifeAreas(snapshot.lifeAreas, id, nowIso()) : snapshot.lifeAreas;
    if (financeCategories.length === snapshot.financeCategories.length && lifeAreas === snapshot.lifeAreas) return snapshot;
    const migrated = { ...snapshot, financeCategories, lifeAreas };
    await repository.replace(migrated);
    return migrated;
  },

  async completeOnboarding(
    input: OnboardingInput & { selectedAreaNames: string[]; priorities?: string[]; focus?: "today" | "goal" | "week" | "habit"; result?: string; action?: string },
  ): Promise<PlannerSnapshot> {
    const now = new Date().toISOString();
    const colors = ["rose", "sage", "taupe", "blush", "charcoal"] as const;
    const selectedNames = new Set(input.selectedAreaNames);
    const lifeAreas = defaultLifeAreaNames.map((name, index) => ({
      id: id(),
      name,
      color: colors[index % colors.length],
      order: index,
      active: true,
      currentScore: 6,
      desiredScore: 8,
      vision: "",
      createdAt: now,
      updatedAt: now,
    }));
    const financeCategories = defaultFinanceCategories.map(({ name, type }) => ({
      id: id(), name, type,
      active: true, createdAt: now, updatedAt: now,
    }));
    const firstGoalId = input.focus === "goal" && input.result ? id() : undefined;
    const firstWeeklyPlanId = input.focus === "week" && input.result ? id() : undefined;
    const firstTaskId = input.action ? id() : undefined;
    const today = toLocalDateKey(new Date());
    const snapshot: PlannerSnapshot = {
      ...createEmptySnapshot(),
      profile: {
        id: id(),
        name: input.name.trim(),
        intention: input.intention.trim(),
        usePurpose: input.usePurpose.trim(),
        dailyIntention: "",
        startDate: today,
        weekStartsOn: input.weekStartsOn,
        priorityAreaIds: lifeAreas.filter((area) => selectedNames.has(area.name)).map((area) => area.id),
        mainPriorities: [],
        theme: "light",
        baseCurrency: "COP",
        financePrivacy: false,
        fitnessEnabled: false,
        activationCompleted: false,
        onboardingCompleted: true,
        createdAt: now,
        updatedAt: now,
      },
      lifeAreas,
      financialProfiles: [{
        id: id(), baseCurrency: "COP", privacyMode: false, monthStartsOn: 1,
        status: "active", createdAt: now, updatedAt: now,
      }],
      financeCategories,
      goals: firstGoalId ? [{
        id: firstGoalId, title: input.result!.trim(), reason: "Elegida durante la configuración inicial.",
        progressType: "tasks", priority: "medium", status: "active", createdAt: now, updatedAt: now,
      }] : [],
      habits: input.focus === "habit" && input.result ? [{
        id: id(), name: input.result.trim(), type: "boolean", scheduledDays: [new Date().getDay()],
        target: 1, unit: "vez", origin: "experiment", status: "active", createdAt: now, updatedAt: now,
      }] : [],
      cascadePlans: firstWeeklyPlanId ? [{
        id: firstWeeklyPlanId, horizon: "weekly", periodKey: getReviewPeriodKey("weekly", new Date(), input.weekStartsOn),
        intention: input.result!.trim(), priority: input.result!.trim(), objectives: [input.result!.trim()], activities: [],
        status: "active", createdAt: now, updatedAt: now,
      }] : [],
      tasks: firstTaskId ? [{
        id: firstTaskId, title: input.action!.trim(), date: today, priority: "medium", focusPriority: 1,
        goalId: firstGoalId, periodPlanId: firstWeeklyPlanId, status: "planned", createdAt: now, updatedAt: now,
      }] : [],
    };
    return writes.run(async () => {
      await repository.replace(snapshot);
      return snapshot;
    });
  },

  loadDemo(): Promise<PlannerSnapshot> {
    const snapshot = createDemoSnapshot({
      name: "María",
      intention: "Construir una semana que se sienta posible y propia.",
      weekStartsOn: 1,
    });
    return writes.run(async () => {
      await repository.replace(snapshot);
      return snapshot;
    });
  },

  createHabit(input: HabitFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = new Date().toISOString();
      return {
        ...snapshot,
        habits: [
          ...snapshot.habits,
          {
            id: id(),
            name: input.name,
            type: input.type,
            scheduledDays: input.scheduledDays,
            target: input.target,
            unit: input.unit,
            lifeAreaId: input.lifeAreaId || undefined,
            origin: input.origin ?? "established",
            recommendation: habitRecommendation(input.name, input.origin ?? "established"),
            status: "active",
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
    });
  },

  toggleHabit(habitId: string, date: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const existing = snapshot.habitLogs.find(
        (log) => log.habitId === habitId && log.date === date,
      );
      if (existing) {
        return {
          ...snapshot,
          habitLogs: snapshot.habitLogs.filter((log) => log.id !== existing.id),
        };
      }
      const habit = snapshot.habits.find((item) => item.id === habitId);
      if (!habit) return snapshot;
      const now = new Date().toISOString();
      return {
        ...snapshot,
        habitLogs: [
          ...snapshot.habitLogs,
          {
            id: id(),
            habitId,
            date,
            value: habit.target,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
    });
  },

  createTask(title: string, date?: string, focusPriority?: 1 | 2 | 3): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = new Date().toISOString();
      const taskId = id();
      const tasks = [
        ...snapshot.tasks,
        {
          id: taskId,
          title: title.trim(),
          date,
          priority: "medium" as const,
          focusPriority,
          status: date ? "planned" as const : "inbox" as const,
          createdAt: now,
          updatedAt: now,
        },
      ];
      return {
        ...snapshot,
        tasks: date && focusPriority
          ? applyDailyFocusPriority(tasks, taskId, date, focusPriority)
          : tasks,
      };
    });
  },

  resumeExistingSpace(name: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const lifeAreas = mergeDefaultLifeAreas(snapshot.lifeAreas, id, now);
      const profile = snapshot.profile
        ? { ...snapshot.profile, onboardingCompleted: true, updatedAt: now }
        : {
            id: id(),
            name: name.trim() || "Mi espacio",
            intention: "",
            usePurpose: "",
            dailyIntention: "",
            startDate: toLocalDateKey(new Date()),
            weekStartsOn: 1 as const,
            priorityAreaIds: [],
            mainPriorities: [],
            theme: "light" as const,
            baseCurrency: "COP" as const,
            financePrivacy: false,
            fitnessEnabled: false,
            activationCompleted: false,
            onboardingCompleted: true,
            createdAt: now,
            updatedAt: now,
          };
      return {
        ...snapshot,
        profile,
        lifeAreas,
        financialProfiles: snapshot.financialProfiles.length ? snapshot.financialProfiles : [{
          id: id(), baseCurrency: "COP", privacyMode: false, monthStartsOn: 1,
          status: "active", createdAt: now, updatedAt: now,
        }],
      };
    });
  },

  updateHabitName(habitId: string, name: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      habits: snapshot.habits.map((habit) => habit.id === habitId
        ? { ...habit, name: name.trim(), recommendation: habitRecommendation(name, habit.origin ?? "established"), updatedAt: nowIso() }
        : habit),
    }));
  },

  createTaskDetailed(input: TaskFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const taskId = id();
      const tasks = [...snapshot.tasks, {
        id: taskId,
        title: input.title.trim(),
        description: input.description || undefined,
        date: input.date || undefined,
        time: input.time || undefined,
        estimatedMinutes: input.estimatedMinutes,
        priority: input.priority ?? "medium",
        focusPriority: input.focusPriority,
        lifeAreaId: input.lifeAreaId || undefined,
        goalId: input.goalId || undefined,
        milestoneId: input.milestoneId || undefined,
        projectId: input.projectId || undefined,
        periodPlanId: input.periodPlanId || undefined,
        financialCategoryId: input.financialCategoryId || undefined,
        recurrence: input.recurrence,
        status: input.date ? "planned" as const : "inbox" as const,
        createdAt: now,
        updatedAt: now,
      }];
      return {
        ...snapshot,
        tasks: input.date && input.focusPriority
          ? applyDailyFocusPriority(tasks, taskId, input.date, input.focusPriority)
          : tasks,
      };
    });
  },

  updateTask(taskId: string, input: Pick<TaskFormInput, "title" | "date" | "time" | "focusPriority">): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const current = snapshot.tasks.find((task) => task.id === taskId);
      if (!current) return snapshot;
      const date = input.date || current.date;
      const tasks = snapshot.tasks.map((task) => task.id === taskId
        ? { ...task, title: input.title.trim(), date, time: input.time || undefined, focusPriority: input.focusPriority, updatedAt: nowIso() }
        : task);
      return { ...snapshot, tasks: date && input.focusPriority ? applyDailyFocusPriority(tasks, taskId, date, input.focusPriority) : tasks };
    });
  },

  assignTaskFocusPriority(taskId: string, date: string, focusPriority?: 1 | 2 | 3): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      tasks: applyDailyFocusPriority(snapshot.tasks, taskId, date, focusPriority),
    }));
  },

  createProject(input: ProjectFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        projects: [...snapshot.projects, {
          id: id(),
          name: input.name.trim(),
          outcome: input.outcome.trim(),
          lifeAreaId: input.lifeAreaId || undefined,
          goalId: input.goalId || undefined,
          targetDate: input.targetDate || undefined,
          status: "active",
          createdAt: now,
          updatedAt: now,
        }],
      };
    });
  },

  toggleTask(taskId: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = new Date().toISOString();
      return {
        ...snapshot,
        tasks: snapshot.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: task.status === "completed" ? "planned" : "completed",
                completedAt: task.status === "completed" ? undefined : now,
                updatedAt: now,
              }
            : task,
        ),
      };
    });
  },

  deleteTask(taskId: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      tasks: snapshot.tasks.filter((task) => task.id !== taskId),
    }));
  },

  rescheduleTask(taskId: string, date: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      tasks: snapshot.tasks.map((task) =>
        task.id === taskId
          ? { ...task, date, status: "postponed", rescheduleCount: (task.rescheduleCount ?? 0) + 1, updatedAt: new Date().toISOString() }
          : task,
      ),
    }));
  },

  saveMood(
    mood: MoodName,
    energy: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
    factors: string[] = [],
    note?: string,
    sleep?: 1 | 2 | 3 | 4 | 5,
    concentration?: 1 | 2 | 3 | 4 | 5,
  ): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const date = toLocalDateKey(new Date());
      const now = new Date().toISOString();
      const existing = snapshot.moodLogs.find((log) => log.date === date);
      const moodLogs = existing
        ? snapshot.moodLogs.map((log) =>
            log.id === existing.id ? { ...log, mood, energy, factors, note, sleep, concentration, updatedAt: now } : log,
          )
        : [
            ...snapshot.moodLogs,
            { id: id(), date, mood, energy, factors, note, sleep, concentration, createdAt: now, updatedAt: now },
          ];
      return { ...snapshot, moodLogs };
    });
  },

  createGoal(input: GoalFormInput, milestoneTitles: string[] = []): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = new Date().toISOString();
      const goalId = id();
      const cleanMilestones = milestoneTitles.map((title) => title.trim()).filter(Boolean);
      const inferredProgressType = /\b(ahorrar|km|kilos?|kg|páginas?|cop|usd|euros?|\$|\d+)\b/i.test(input.title)
        ? "numeric"
        : /\b(lanzar|crear|publicar|terminar|completar|organizar)\b/i.test(input.title)
          ? "milestones"
          : "manual";
      const progressType = input.progressType ?? (cleanMilestones.length ? "milestones" : inferredProgressType);
      return {
        ...snapshot,
        goals: [
          ...snapshot.goals,
          {
            id: goalId,
            title: input.title,
            reason: input.reason,
            lifeAreaId: input.lifeAreaId || undefined,
            targetDate: input.targetDate || undefined,
            targetMonth: input.targetMonth || undefined,
            progressType,
            targetValue: input.targetValue,
            currentValue: progressType === "numeric" ? 0 : undefined,
            unit: input.unit || undefined,
            manualProgress: progressType === "manual" ? (input.manualProgress ?? 0) : undefined,
            priority: input.priority ?? "medium",
            status: "active",
            createdAt: now,
            updatedAt: now,
          },
        ],
        milestones: [
          ...snapshot.milestones,
          ...(progressType === "milestones" ? cleanMilestones : []).map((title) => ({
            id: id(),
            goalId,
            title,
            weight: 100 / cleanMilestones.length,
            status: "active" as const,
            createdAt: now,
            updatedAt: now,
          })),
        ],
      };
    });
  },

  updateGoalStatus(goalId: string, status: EntityStatus): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      goals: snapshot.goals.map((goal) => goal.id === goalId
        ? { ...goal, status, updatedAt: nowIso() }
        : goal),
    }));
  },

  updateGoalProgress(goalId: string, value: number): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      goals: snapshot.goals.map((goal) => goal.id === goalId
        ? {
            ...goal,
            ...(goal.progressType === "numeric"
              ? { currentValue: Math.max(0, value) }
              : { manualProgress: Math.max(0, Math.min(100, value)) }),
            updatedAt: nowIso(),
          }
        : goal),
    }));
  },

  updateLifeArea(
    lifeAreaId: string,
    input: { currentScore: number; desiredScore: number; vision: string; dream?: string; imageDataUrl?: string; category?: string },
  ): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      lifeAreas: snapshot.lifeAreas.map((area) =>
        area.id === lifeAreaId
          ? { ...area, ...input, updatedAt: new Date().toISOString() }
          : area,
      ),
    }));
  },

  createLifeArea(input: {
    name: string;
    category: string;
    vision?: string;
    dream?: string;
    currentScore?: number;
    desiredScore?: number;
    imageDataUrl?: string;
  }): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        lifeAreas: [...snapshot.lifeAreas, {
          id: id(),
          name: input.name.trim(),
          category: input.category,
          color: "blush",
          order: snapshot.lifeAreas.length,
          active: true,
          currentScore: input.currentScore,
          desiredScore: input.desiredScore,
          vision: input.vision?.trim() || undefined,
          dream: input.dream?.trim() || undefined,
          imageDataUrl: input.imageDataUrl,
          custom: true,
          createdAt: now,
          updatedAt: now,
        }],
      };
    });
  },

  updateProfileSettings(input: {
    name?: string;
    weekStartsOn?: 0 | 1;
    theme?: "light" | "rose" | "taupe";
    baseCurrency?: "COP" | "USD" | "EUR" | "MXN";
    financePrivacy?: boolean;
    fitnessEnabled?: boolean;
    fitnessProfile?: FitnessSettingsFormInput;
    usePurpose?: string;
    avatarDataUrl?: string;
    activationCompleted?: boolean;
  }): Promise<PlannerSnapshot> {
    const parsedInput = input.fitnessProfile ? { ...input, fitnessProfile: fitnessSettingsFormSchema.parse(input.fitnessProfile) } : input;
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const financialProfile = snapshot.financialProfiles[0];
      return {
        ...snapshot,
        profile: snapshot.profile ? { ...snapshot.profile, ...parsedInput, updatedAt: now } : null,
        financialProfiles: financialProfile
          ? snapshot.financialProfiles.map((item, index) => index === 0 ? {
              ...item,
              baseCurrency: parsedInput.baseCurrency ?? item.baseCurrency,
              privacyMode: parsedInput.financePrivacy ?? item.privacyMode,
              updatedAt: now,
            } : item)
          : [{
              id: id(), baseCurrency: parsedInput.baseCurrency ?? "COP",
              privacyMode: parsedInput.financePrivacy ?? false, monthStartsOn: 1,
              status: "active", createdAt: now, updatedAt: now,
            }],
      };
    });
  },

  updateLifeAreaSettings(
    lifeAreaId: string,
    input: { name?: string; active?: boolean; direction?: "up" | "down" },
  ): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const areas = [...snapshot.lifeAreas].sort((a, b) => a.order - b.order);
      const index = areas.findIndex((area) => area.id === lifeAreaId);
      if (index < 0) return snapshot;
      const target = input.direction === "up" ? index - 1 : input.direction === "down" ? index + 1 : index;
      if (target >= 0 && target < areas.length && target !== index) {
        [areas[index], areas[target]] = [areas[target], areas[index]];
      }
      const now = nowIso();
      return {
        ...snapshot,
        lifeAreas: areas.map((area, order) => area.id === lifeAreaId
          ? { ...area, name: input.name?.trim() || area.name, active: input.active ?? area.active, order, updatedAt: now }
          : { ...area, order }),
      };
    });
  },

  toggleMilestone(milestoneId: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      milestones: snapshot.milestones.map((milestone) =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              status: milestone.status === "completed" ? "active" : "completed",
              updatedAt: new Date().toISOString(),
            }
          : milestone,
      ),
    }));
  },

  saveJournal(
    text: string,
    options: { title?: string; type?: "free" | "gratitude" | "weekly_review" | "monthly_reset"; goalId?: string; imageDataUrl?: string } = {},
  ): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = new Date().toISOString();
      return {
        ...snapshot,
        journalEntries: [
          {
            id: id(),
            date: toLocalDateKey(new Date()),
            type: options.type ?? "free",
            title: options.title,
            text: text.trim(),
            imageDataUrl: options.imageDataUrl,
            goalId: options.goalId,
            status: "saved",
            createdAt: now,
            updatedAt: now,
          },
          ...snapshot.journalEntries,
        ],
      };
    });
  },

  saveReview(
    type: ReviewType,
    summary: string,
    decisions: string[] = [],
  ): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const periodKey = getReviewPeriodKey(type, new Date(), snapshot.profile?.weekStartsOn ?? 1);
      return {
        ...snapshot,
        reviews: [{
          id: id(), type, periodKey, summary: summary.trim(), responses: {},
          decisions: decisions.map((item) => item.trim()).filter(Boolean),
          status: "completed", createdAt: now, updatedAt: now,
        }, ...snapshot.reviews],
      };
    });
  },

  saveStructuredReview(
    type: ReviewType,
    responses: Record<string, string>,
    decisions: string[] = [],
  ): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const periodKey = getReviewPeriodKey(type, new Date(), snapshot.profile?.weekStartsOn ?? 1);
      const summary = Object.values(responses).map((value) => value.trim()).filter(Boolean).join(" · ");
      const existing = snapshot.reviews.find((review) => review.type === type && review.periodKey === periodKey);
      const review = {
        id: existing?.id ?? id(), type, periodKey, summary, responses,
        decisions: decisions.map((item) => item.trim()).filter(Boolean),
        status: "completed" as const, createdAt: existing?.createdAt ?? now, updatedAt: now,
      };
      return {
        ...snapshot,
        reviews: existing
          ? snapshot.reviews.map((item) => item.id === existing.id ? review : item)
          : [review, ...snapshot.reviews],
      };
    });
  },

  saveMonthlyBudget(input: {
    monthKey: string;
    plannedIncome: number;
    notes?: string;
    lines: { categoryId: string; plannedAmount: number }[];
  }): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const existing = snapshot.monthlyBudgets.find((budget) => budget.monthKey === input.monthKey);
      const budgetId = existing?.id ?? id();
      const budget = {
        id: budgetId, monthKey: input.monthKey, plannedIncome: Math.round(input.plannedIncome),
        notes: input.notes?.trim(), status: "active" as const,
        createdAt: existing?.createdAt ?? now, updatedAt: now,
      };
      return {
        ...snapshot,
        monthlyBudgets: existing
          ? snapshot.monthlyBudgets.map((item) => item.id === budgetId ? budget : item)
          : [...snapshot.monthlyBudgets, budget],
        budgetLines: [
          ...snapshot.budgetLines.filter((line) => line.budgetId !== budgetId),
          ...input.lines.filter((line) => line.plannedAmount >= 0).map((line) => ({
            id: id(), budgetId, categoryId: line.categoryId,
            plannedAmount: Math.round(line.plannedAmount), createdAt: now, updatedAt: now,
          })),
        ],
      };
    });
  },

  createTransaction(input: TransactionFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        transactions: [{
          ...input,
          id: id(),
          amount: Math.round(input.amount),
          categoryId: input.categoryId || undefined,
          accountId: input.accountId || undefined,
          destinationAccountId: input.destinationAccountId || undefined,
          fundId: input.fundId || undefined,
          debtId: input.debtId || undefined,
          goalId: input.goalId || undefined,
          taskId: input.taskId || undefined,
          projectId: input.projectId || undefined,
          note: input.note || undefined,
          status: "active",
          createdAt: now,
          updatedAt: now,
        }, ...snapshot.transactions],
      };
    });
  },

  createSavingsFund(input: SavingsFundFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        savingsFunds: [...snapshot.savingsFunds, {
          id: id(), name: input.name.trim(), targetAmount: Math.round(input.targetAmount),
          initialAmount: Math.round(input.initialAmount ?? 0), targetDate: input.targetDate || undefined,
          goalId: input.goalId || undefined, status: "active", createdAt: now, updatedAt: now,
        }],
      };
    });
  },

  createDebt(input: DebtFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        debts: [...snapshot.debts, {
          ...input, id: id(), name: input.name.trim(), initialBalance: Math.round(input.initialBalance),
          minimumPayment: input.minimumPayment ? Math.round(input.minimumPayment) : undefined,
          goalId: input.goalId || undefined, status: "active",
          createdAt: now, updatedAt: now,
        }],
      };
    });
  },

  createRecurringItem(input: RecurringItemFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        recurringItems: [...snapshot.recurringItems, {
          ...input, id: id(), name: input.name.trim(), amount: Math.round(input.amount),
          categoryId: input.categoryId || undefined, fundId: input.fundId || undefined,
          debtId: input.debtId || undefined, active: true, createdAt: now, updatedAt: now,
        }],
      };
    });
  },

  saveFinancialReview(monthKey: string, summary: string, decisions: string[]): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const existing = snapshot.financialReviews.find((review) => review.monthKey === monthKey);
      const next = {
        id: existing?.id ?? id(), monthKey, summary: summary.trim(),
        decisions: decisions.map((item) => item.trim()).filter(Boolean),
        status: "completed" as const, createdAt: existing?.createdAt ?? now, updatedAt: now,
      };
      return {
        ...snapshot,
        financialReviews: existing
          ? snapshot.financialReviews.map((item) => item.id === existing.id ? next : item)
          : [next, ...snapshot.financialReviews],
      };
    });
  },

  saveCascadePlan(input: CascadePlanFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const validated = cascadePlanFormSchema.parse(input);
      const now = nowIso();
      const existing = snapshot.cascadePlans.find(
        (item) => item.horizon === validated.horizon && item.periodKey === validated.periodKey,
      );
      const plan = {
        id: existing?.id ?? id(),
        horizon: validated.horizon,
        periodKey: validated.periodKey,
        parentPlanId: validated.parentPlanId || undefined,
        intention: validated.intention,
        priority: validated.priority,
        objectives: validated.objectives.filter(Boolean),
        activities: validated.activities.map((item) => ({ ...item, id: id(), date: item.date || undefined })),
        areaIds: validated.areaIds,
        details: validated.details ?? existing?.details,
        reflection: validated.reflection ?? existing?.reflection,
        completedObjectiveIndexes: (existing?.completedObjectiveIndexes ?? []).filter((index) => index < validated.objectives.filter(Boolean).length),
        status: validated.status ?? existing?.status ?? "active" as const,
        suggestion: existing?.suggestion,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      return {
        ...snapshot,
        cascadePlans: existing
          ? snapshot.cascadePlans.map((item) => item.id === existing.id ? plan : item)
          : [...snapshot.cascadePlans, plan],
      };
    });
  },

  upsertPlanActions(
    planId: string,
    goalId: string | undefined,
    actions: Array<{ taskId?: string; title: string; date?: string }>,
  ): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const validActions = actions.filter((action) => action.title.trim().length >= 2);
      const existingIds = new Set(validActions.map((action) => action.taskId).filter(Boolean));
      const updatedTasks = snapshot.tasks.map((task) => {
        const action = validActions.find((item) => item.taskId === task.id);
        if (!action) return task;
        const date = action.date || undefined;
        return {
          ...task,
          title: action.title.trim(),
          date,
          goalId: goalId || undefined,
          periodPlanId: planId,
          status: task.status === "completed" ? task.status : date ? "planned" as const : "inbox" as const,
          updatedAt: now,
        };
      });
      const createdTasks = validActions.filter((action) => !action.taskId || !existingIds.has(action.taskId) || !snapshot.tasks.some((task) => task.id === action.taskId)).map((action) => ({
        id: id(),
        title: action.title.trim(),
        date: action.date || undefined,
        priority: "medium" as const,
        goalId: goalId || undefined,
        periodPlanId: planId,
        status: action.date ? "planned" as const : "inbox" as const,
        createdAt: now,
        updatedAt: now,
      }));
      return { ...snapshot, tasks: [...updatedTasks, ...createdTasks] };
    });
  },

  createBrainDumpItem(input: BrainDumpFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        brainDumpItems: [{
          id: id(), title: input.title.trim(), type: input.type,
          tentativeDate: input.tentativeDate || undefined, priority: input.priority ?? "medium",
          status: "idea", createdAt: now, updatedAt: now,
        }, ...snapshot.brainDumpItems],
      };
    });
  },

  updateBrainDumpItem(
    itemId: string,
    input: { title?: string; type?: BrainDumpType; priority?: "low" | "medium" | "high"; status?: "idea" | "planned" | "completed" | "released"; tentativeDate?: string | null },
  ): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      brainDumpItems: snapshot.brainDumpItems.map((item) => item.id === itemId
        ? { ...item, ...input, title: input.title?.trim() || item.title, tentativeDate: input.tentativeDate === null ? undefined : input.tentativeDate ?? item.tentativeDate, updatedAt: nowIso() }
        : item),
    }));
  },

  scheduleBrainDumpItem(itemId: string, date: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const item = snapshot.brainDumpItems.find((candidate) => candidate.id === itemId);
      if (!item) return snapshot;
      const now = nowIso();
      return {
        ...snapshot,
        brainDumpItems: snapshot.brainDumpItems.map((candidate) => candidate.id === itemId
          ? { ...candidate, tentativeDate: date, status: "planned", updatedAt: now }
          : candidate),
        tasks: [{
          id: id(), title: item.title, date, priority: item.priority, status: "planned",
          createdAt: now, updatedAt: now,
        }, ...snapshot.tasks],
      };
    });
  },

  createRoutine(input: RoutineFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        routines: [...snapshot.routines, {
          id: id(), name: input.name.trim(), period: input.period,
          scheduledDays: input.scheduledDays,
          steps: input.steps.map((title) => ({ id: id(), title: title.trim() })),
          status: "active", createdAt: now, updatedAt: now,
        }],
      };
    });
  },

  createEvent(input: EventFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        events: [...snapshot.events, {
          id: id(), title: input.title.trim(), startDate: input.startDate,
          endDate: input.endDate || undefined, time: input.time || undefined,
          category: input.category, notes: input.notes || undefined,
          createdAt: now, updatedAt: now,
        }],
      };
    });
  },

  createVisionBoardItem(input: {
    type: "quote" | "image" | "mixed";
    content: string;
    caption?: string;
    reminderEnabled?: boolean;
    reminderFrequency?: "daily" | "weekly" | "monthly" | "quarterly";
  }): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        visionBoardItems: [{
          id: id(), type: input.type, content: input.content,
          caption: input.caption?.trim() || undefined,
          reminderEnabled: input.reminderEnabled ?? false,
          reminderFrequency: input.reminderEnabled ? input.reminderFrequency : undefined,
          createdAt: now, updatedAt: now,
        }, ...snapshot.visionBoardItems],
      };
    });
  },

  toggleVisionReminder(itemId: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      visionBoardItems: snapshot.visionBoardItems.map((item) => item.id === itemId
        ? { ...item, reminderEnabled: !item.reminderEnabled, updatedAt: nowIso() }
        : item),
    }));
  },

  saveWorkout(input: WorkoutFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const date = new Date(`${input.date}T12:00:00`);
      const first = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil((((date.getTime() - first.getTime()) / 86400000) + first.getDay() + 1) / 7);
      const weekKey = `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
      const existing = snapshot.workoutLogs.find((item) => item.date === input.date);
      const exercise = { id: id(), name: input.exercise.trim(), sets: input.sets, reps: input.reps, weight: input.weight };
      return {
        ...snapshot,
        workoutLogs: existing
          ? snapshot.workoutLogs.map((item) => item.id === existing.id
              ? { ...item, goal: input.goal || item.goal, exercises: [...item.exercises, exercise], updatedAt: now }
              : item)
          : [{ id: id(), date: input.date, weekKey, goal: input.goal || undefined, exercises: [exercise], createdAt: now, updatedAt: now }, ...snapshot.workoutLogs],
      };
    });
  },

  saveWorkoutPlan(input: WorkoutPlanFormInput): Promise<PlannerSnapshot> {
    const parsed = workoutPlanFormSchema.parse(input);
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const date = new Date(`${parsed.date}T12:00:00`);
      const first = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil((((date.getTime() - first.getTime()) / 86400000) + first.getDay() + 1) / 7);
      const weekKey = `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
      const existing = snapshot.workoutLogs.find((item) => item.date === parsed.date);
      const exercises = parsed.exercises.map((exercise) => {
        const setDetails = exercise.sets.map((set, index) => ({
          id: set.id ?? id(), setNumber: index + 1, reps: set.reps, weight: set.weight,
        }));
        return {
          id: exercise.id ?? id(), name: exercise.name, sets: setDetails.length,
          reps: setDetails[0]?.reps ?? 0, weight: setDetails[0]?.weight ?? 0, setDetails,
        };
      });
      const plan = {
        id: existing?.id ?? id(), date: parsed.date, weekKey, goal: existing?.goal,
        name: parsed.name, durationMinutes: parsed.durationMinutes, exercises,
        completedSessions: existing?.completedSessions ?? [], createdAt: existing?.createdAt ?? now, updatedAt: now,
      };
      return {
        ...snapshot,
        workoutLogs: existing
          ? snapshot.workoutLogs.map((item) => item.id === existing.id ? plan : item)
          : [plan, ...snapshot.workoutLogs],
      };
    });
  },

  updateEvent(eventId: string, input: EventFormInput): Promise<PlannerSnapshot> {
    const parsed = eventFormSchema.parse(input);
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      events: snapshot.events.map((event) => event.id === eventId ? {
        ...event,
        title: parsed.title.trim(), startDate: parsed.startDate, endDate: parsed.endDate || undefined,
        time: parsed.time || undefined, category: parsed.category, notes: parsed.notes || undefined, updatedAt: nowIso(),
      } : event),
    }));
  },

  deleteWorkoutPlan(date: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      workoutLogs: snapshot.workoutLogs.filter((item) => item.date !== date),
    }));
  },

  completeWorkout(date: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const existing = snapshot.workoutLogs.find((item) => item.date === date);
      if (!existing) return snapshot;
      const now = nowIso();
      const exercises = existing.exercises.map((exercise) => ({
        id: id(), name: exercise.name,
        sets: (exercise.setDetails?.length ? exercise.setDetails : Array.from({ length: exercise.sets }, (_, index) => ({
          id: id(), setNumber: index + 1, reps: exercise.reps, weight: exercise.weight,
        }))).map((set, index) => ({ ...set, id: id(), setNumber: index + 1 })),
      }));
      const session = {
        id: id(), date, workoutName: existing.name ?? existing.goal ?? "Entrenamiento",
        durationMinutes: existing.durationMinutes, exercises, completedAt: now,
      };
      return {
        ...snapshot,
        workoutLogs: snapshot.workoutLogs.map((item) => item.id === existing.id
          ? { ...item, completedSessions: [...(item.completedSessions ?? []), session], updatedAt: now }
          : item),
      };
    });
  },

  duplicateWorkout(sourceDate: string, targetDate: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const source = snapshot.workoutLogs.find((item) => item.date === sourceDate);
      if (!source || sourceDate === targetDate) return snapshot;
      const now = nowIso();
      const date = new Date(`${targetDate}T12:00:00`);
      const first = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil((((date.getTime() - first.getTime()) / 86400000) + first.getDay() + 1) / 7);
      const target = snapshot.workoutLogs.find((item) => item.date === targetDate);
      const copy = {
        ...source, id: target?.id ?? id(), date: targetDate,
        weekKey: `${date.getFullYear()}-W${String(week).padStart(2, "0")}`,
        exercises: source.exercises.map((exercise) => ({ ...exercise, id: id(), setDetails: exercise.setDetails?.map((set) => ({ ...set, id: id() })) })),
        completedSessions: target?.completedSessions ?? [], createdAt: target?.createdAt ?? now, updatedAt: now,
      };
      return {
        ...snapshot,
        workoutLogs: target
          ? snapshot.workoutLogs.map((item) => item.id === target.id ? copy : item)
          : [copy, ...snapshot.workoutLogs],
      };
    });
  },

  saveMeal(input: MealFormInput): Promise<PlannerSnapshot> {
    const parsed = mealFormSchema.parse(input);
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const existing = snapshot.nutritionLogs.find((item) => item.date === parsed.date);
      const meal = {
        id: parsed.mealId ?? id(), name: parsed.name.trim(), calories: parsed.calories,
        protein: parsed.protein, carbs: parsed.carbs, fat: parsed.fat,
        notes: parsed.notes || undefined, completed: parsed.completed ?? true,
      };
      return {
        ...snapshot,
        nutritionLogs: existing
          ? snapshot.nutritionLogs.map((item) => item.id === existing.id
              ? { ...item, meals: parsed.mealId ? item.meals.map((current) => current.id === parsed.mealId ? meal : current) : [...item.meals, meal], updatedAt: now }
              : item)
          : [{ id: id(), date: parsed.date, meals: [meal], createdAt: now, updatedAt: now }, ...snapshot.nutritionLogs],
      };
    });
  },

  deleteMeal(date: string, mealId: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      nutritionLogs: snapshot.nutritionLogs.map((item) => item.date === date
        ? { ...item, meals: item.meals.filter((meal) => meal.id !== mealId), updatedAt: nowIso() }
        : item),
    }));
  },

  copyMeals(sourceDate: string, targetDate: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const source = snapshot.nutritionLogs.find((item) => item.date === sourceDate);
      if (!source?.meals.length || sourceDate === targetDate) return snapshot;
      const now = nowIso();
      const target = snapshot.nutritionLogs.find((item) => item.date === targetDate);
      const meals = source.meals.map((meal) => ({ ...meal, id: id() }));
      const next = { id: target?.id ?? id(), date: targetDate, meals, createdAt: target?.createdAt ?? now, updatedAt: now };
      return {
        ...snapshot,
        nutritionLogs: target
          ? snapshot.nutritionLogs.map((item) => item.id === target.id ? next : item)
          : [next, ...snapshot.nutritionLogs],
      };
    });
  },

  saveBodyCheckIn(input: BodyCheckInFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const existing = snapshot.bodyCheckIns.find((item) => item.date === input.date);
      const checkIn = {
        id: existing?.id ?? id(), date: input.date, weight: input.weight,
        measurements: {
          ...(input.waist ? { cintura: input.waist } : {}),
          ...(input.hip ? { cadera: input.hip } : {}),
        },
        photoDataUrl: input.photoDataUrl || undefined,
        createdAt: existing?.createdAt ?? now, updatedAt: now,
      };
      return {
        ...snapshot,
        bodyCheckIns: existing
          ? snapshot.bodyCheckIns.map((item) => item.id === existing.id ? checkIn : item)
          : [checkIn, ...snapshot.bodyCheckIns],
      };
    });
  },

  createChallenge(input: ChallengeFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        challenges: [{
          id: id(), title: input.title.trim(), type: input.type, intention: input.intention.trim(),
          startDate: input.startDate, endDate: input.endDate || undefined,
          completedDates: [], status: "active", createdAt: now, updatedAt: now,
        }, ...snapshot.challenges],
      };
    });
  },

  toggleChallengeDate(challengeId: string, date: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      challenges: snapshot.challenges.map((challenge) => {
        if (challenge.id !== challengeId) return challenge;
        const completedDates = challenge.completedDates.includes(date)
          ? challenge.completedDates.filter((item) => item !== date)
          : [...challenge.completedDates, date];
        return { ...challenge, completedDates, updatedAt: nowIso() };
      }),
    }));
  },

  updateChallengeStatus(challengeId: string, status: "active" | "completed" | "archived"): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      challenges: snapshot.challenges.map((challenge) => challenge.id === challengeId
        ? { ...challenge, status, updatedAt: nowIso() }
        : challenge),
    }));
  },

  createFinancialAccount(input: FinancialAccountFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        financialAccounts: [...snapshot.financialAccounts, {
          id: id(), name: input.name.trim(), type: input.type,
          initialBalance: Math.round(input.initialBalance), status: "active",
          createdAt: now, updatedAt: now,
        }],
      };
    });
  },

  updateFinancialAccountBalance(accountId: string, initialBalance: number): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      financialAccounts: snapshot.financialAccounts.map((account) => account.id === accountId
        ? { ...account, initialBalance: Math.round(initialBalance), updatedAt: nowIso() }
        : account),
    }));
  },

  adjustFinancialAccountBalance(accountId: string, desiredBalance: number): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const account = snapshot.financialAccounts.find((item) => item.id === accountId);
      if (!account) return snapshot;
      const transactionEffect = snapshot.transactions
        .filter((transaction) => transaction.status === "active")
        .reduce((balance, transaction) => {
          if (transaction.type === "transfer") {
            if (transaction.accountId === accountId) balance -= transaction.amount;
            if (transaction.destinationAccountId === accountId) balance += transaction.amount;
            return balance;
          }
          if (transaction.accountId !== accountId) return balance;
          return transaction.type === "income" ? balance + transaction.amount : balance - transaction.amount;
        }, 0);
      return {
        ...snapshot,
        financialAccounts: snapshot.financialAccounts.map((item) => item.id === accountId
          ? {
              ...item,
              balanceAdjustment: Math.round(desiredBalance) - item.initialBalance - transactionEffect,
              updatedAt: nowIso(),
            }
          : item),
      };
    });
  },

  deleteCascadePlan(planId: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      cascadePlans: snapshot.cascadePlans
        .filter((plan) => plan.id !== planId)
        .map((plan) => plan.parentPlanId === planId ? { ...plan, parentPlanId: undefined, updatedAt: nowIso() } : plan),
    }));
  },

  toggleCascadeObjective(planId: string, objectiveIndex: number): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      cascadePlans: snapshot.cascadePlans.map((plan) => {
        if (plan.id !== planId || objectiveIndex < 0 || objectiveIndex >= plan.objectives.length) return plan;
        const completed = new Set(plan.completedObjectiveIndexes ?? []);
        if (completed.has(objectiveIndex)) completed.delete(objectiveIndex);
        else completed.add(objectiveIndex);
        return { ...plan, completedObjectiveIndexes: [...completed].sort((a, b) => a - b), updatedAt: nowIso() };
      }),
    }));
  },

  createPendingPurchase(input: PendingPurchaseFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const tentativeDate = input.tentativeDate || undefined;
      const taskDate = tentativeDate?.length === 7 ? `${tentativeDate}-01` : tentativeDate;
      const taskId = taskDate ? id() : undefined;
      return {
        ...snapshot,
        pendingPurchases: [{
          id: id(), title: input.title.trim(), estimatedAmount: Math.round(input.estimatedAmount),
          accountId: input.accountId || undefined, tentativeDate: input.tentativeDate || undefined,
          taskId,
          priority: input.priority ?? "medium", status: "pending", createdAt: now, updatedAt: now,
        }, ...snapshot.pendingPurchases],
        tasks: taskDate && taskId ? [{
          id: taskId, title: `Comprar: ${input.title.trim()}`, date: taskDate,
          priority: input.priority ?? "medium", status: "planned", createdAt: now, updatedAt: now,
        }, ...snapshot.tasks] : snapshot.tasks,
      };
    });
  },

  updatePendingPurchase(itemId: string, status: "pending" | "purchased" | "released"): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      pendingPurchases: snapshot.pendingPurchases.map((item) => item.id === itemId
        ? { ...item, status, updatedAt: nowIso() }
        : item),
    }));
  },

  addProjectChecklistItem(projectId: string, title: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        projectChecklistItems: [...snapshot.projectChecklistItems, {
          id: id(), projectId, title: title.trim(), completed: false,
          createdAt: now, updatedAt: now,
        }],
      };
    });
  },

  toggleProjectChecklistItem(itemId: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      projectChecklistItems: snapshot.projectChecklistItems.map((item) => item.id === itemId
        ? { ...item, completed: !item.completed, updatedAt: nowIso() }
        : item),
    }));
  },

  updateDailyIntention(dailyIntention: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      if (!snapshot.profile) return snapshot;
      const now = nowIso();
      const text = dailyIntention.trim();
      const today = toLocalDateKey(new Date());
      const existing = snapshot.journalEntries.find((entry) => entry.date === today && entry.title === "Intención del día");
      return {
        ...snapshot,
        profile: { ...snapshot.profile, dailyIntention: text, updatedAt: now },
        journalEntries: existing
          ? snapshot.journalEntries.map((entry) => entry.id === existing.id ? { ...entry, text, updatedAt: now } : entry)
          : [{ id: id(), date: today, type: "free", title: "Intención del día", text, status: "saved", createdAt: now, updatedAt: now }, ...snapshot.journalEntries],
      };
    });
  },

  async exportBackup(): Promise<string> {
    const data = await repository.load();
    plannerSnapshotSchema.parse(data);
    return JSON.stringify({ schemaVersion: 3, exportedAt: nowIso(), data }, null, 2);
  },

  previewBackup(json: string) {
    const parsed: unknown = JSON.parse(json);
    const backup = parseBackupEnvelope(parsed);
    return {
      json,
      exportedAt: backup.exportedAt,
      name: backup.data.profile?.name ?? "Sin perfil",
      areas: backup.data.lifeAreas.length,
      goals: backup.data.goals.length,
      habits: backup.data.habits.length,
      tasks: backup.data.tasks.length,
      transactions: backup.data.transactions.length,
      migrated: ((parsed as { schemaVersion?: number }).schemaVersion ?? 1) < 3,
    };
  },

  async importBackup(json: string): Promise<PlannerSnapshot> {
    const parsed: unknown = JSON.parse(json);
    const backup = parseBackupEnvelope(parsed);
    return writes.run(async () => {
      await repository.replace(backup.data);
      return backup.data;
    });
  },

  clear(): Promise<PlannerSnapshot> {
    return writes.run(async () => {
      await repository.clear();
      return createEmptySnapshot();
    });
  },
};

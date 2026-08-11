import { createDemoSnapshot } from "@/src/domain/demo";
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
import { parseBackupEnvelope, plannerSnapshotSchema } from "@/src/lib/schemas";
import { toLocalDateKey } from "@/src/lib/dates";
import { IndexedDbPlannerRepository } from "@/src/repositories/local/IndexedDbPlannerRepository";

const repository = new IndexedDbPlannerRepository();
const id = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

async function updateSnapshot(
  updater: (snapshot: PlannerSnapshot) => PlannerSnapshot,
): Promise<PlannerSnapshot> {
  const current = await repository.load();
  const next = updater(current);
  await repository.replace(next);
  return next;
}

export const plannerService = {
  load(): Promise<PlannerSnapshot> {
    return repository.load();
  },

  async completeOnboarding(
    input: OnboardingInput & { selectedAreaNames: string[]; priorities?: string[] },
  ): Promise<PlannerSnapshot> {
    const now = new Date().toISOString();
    const colors = ["rose", "sage", "taupe", "blush", "charcoal"] as const;
    const lifeAreas = input.selectedAreaNames.map((name, index) => ({
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
    const financeCategories = [
      ["Ingresos", "income"], ["Hogar", "expense"], ["Bienestar", "expense"],
      ["Ahorro", "savings"], ["Pago de deuda", "debt"],
    ].map(([name, type]) => ({
      id: id(), name, type: type as "income" | "expense" | "savings" | "debt",
      active: true, createdAt: now, updatedAt: now,
    }));
    const snapshot: PlannerSnapshot = {
      ...createEmptySnapshot(),
      profile: {
        id: id(),
        name: input.name.trim(),
        intention: input.intention.trim(),
        dailyIntention: input.intention.trim(),
        startDate: toLocalDateKey(new Date()),
        weekStartsOn: input.weekStartsOn,
        priorityAreaIds: lifeAreas.map((area) => area.id),
        mainPriorities: (input.priorities ?? []).filter(Boolean).slice(0, 3),
        theme: "light",
        baseCurrency: "COP",
        financePrivacy: false,
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
      tasks: (input.priorities ?? []).filter(Boolean).slice(0, 3).map((title) => ({
        id: id(),
        title,
        date: toLocalDateKey(new Date()),
        priority: "high" as const,
        status: "planned" as const,
        createdAt: now,
        updatedAt: now,
      })),
    };
    await repository.replace(snapshot);
    return snapshot;
  },

  loadDemo(): Promise<PlannerSnapshot> {
    const snapshot = createDemoSnapshot({
      name: "María",
      intention: "Construir una semana que se sienta posible y propia.",
      weekStartsOn: 1,
    });
    return repository.replace(snapshot).then(() => snapshot);
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

  createTask(title: string, date?: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = new Date().toISOString();
      return {
        ...snapshot,
        tasks: [
          ...snapshot.tasks,
          {
            id: id(),
            title: title.trim(),
            date,
            priority: "medium",
            status: date ? "planned" : "inbox",
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
    });
  },

  createTaskDetailed(input: TaskFormInput): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      return {
        ...snapshot,
        tasks: [...snapshot.tasks, {
          id: id(),
          title: input.title.trim(),
          description: input.description || undefined,
          date: input.date || undefined,
          time: input.time || undefined,
          estimatedMinutes: input.estimatedMinutes,
          priority: input.priority ?? "medium",
          lifeAreaId: input.lifeAreaId || undefined,
          goalId: input.goalId || undefined,
          milestoneId: input.milestoneId || undefined,
          projectId: input.projectId || undefined,
          periodPlanId: input.periodPlanId || undefined,
          financialCategoryId: input.financialCategoryId || undefined,
          recurrence: input.recurrence,
          status: input.date ? "planned" : "inbox",
          createdAt: now,
          updatedAt: now,
        }],
      };
    });
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

  rescheduleTask(taskId: string, date: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      tasks: snapshot.tasks.map((task) =>
        task.id === taskId
          ? { ...task, date, status: "postponed", updatedAt: new Date().toISOString() }
          : task,
      ),
    }));
  },

  saveMood(
    mood: MoodName,
    energy: 1 | 2 | 3 | 4 | 5,
    factors: string[] = [],
    note?: string,
  ): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const date = toLocalDateKey(new Date());
      const now = new Date().toISOString();
      const existing = snapshot.moodLogs.find((log) => log.date === date);
      const moodLogs = existing
        ? snapshot.moodLogs.map((log) =>
            log.id === existing.id ? { ...log, mood, energy, factors, note, updatedAt: now } : log,
          )
        : [
            ...snapshot.moodLogs,
            { id: id(), date, mood, energy, factors, note, createdAt: now, updatedAt: now },
          ];
      return { ...snapshot, moodLogs };
    });
  },

  createGoal(input: GoalFormInput, milestoneTitles: string[] = []): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = new Date().toISOString();
      const goalId = id();
      const cleanMilestones = milestoneTitles.map((title) => title.trim()).filter(Boolean);
      const progressType = input.progressType ?? (cleanMilestones.length ? "milestones" : "manual");
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
    input: { currentScore: number; desiredScore: number; vision: string },
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

  updateProfileSettings(input: {
    name?: string;
    weekStartsOn?: 0 | 1;
    theme?: "light" | "rose" | "taupe";
    baseCurrency?: "COP" | "USD" | "EUR" | "MXN";
    financePrivacy?: boolean;
  }): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => {
      const now = nowIso();
      const financialProfile = snapshot.financialProfiles[0];
      return {
        ...snapshot,
        profile: snapshot.profile ? { ...snapshot.profile, ...input, updatedAt: now } : null,
        financialProfiles: financialProfile
          ? snapshot.financialProfiles.map((item, index) => index === 0 ? {
              ...item,
              baseCurrency: input.baseCurrency ?? item.baseCurrency,
              privacyMode: input.financePrivacy ?? item.privacyMode,
              updatedAt: now,
            } : item)
          : [{
              id: id(), baseCurrency: input.baseCurrency ?? "COP",
              privacyMode: input.financePrivacy ?? false, monthStartsOn: 1,
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
    options: { title?: string; type?: "free" | "gratitude" | "weekly_review" | "monthly_reset"; goalId?: string } = {},
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
      const periodKey = type === "annual"
        ? toLocalDateKey(new Date()).slice(0, 4)
        : toLocalDateKey(new Date()).slice(0, 7);
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

  updateDailyIntention(dailyIntention: string): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) =>
      snapshot.profile
        ? {
            ...snapshot,
            profile: {
              ...snapshot.profile,
              dailyIntention: dailyIntention.trim(),
              updatedAt: new Date().toISOString(),
            },
          }
        : snapshot,
    );
  },

  async exportBackup(): Promise<string> {
    const data = await repository.load();
    plannerSnapshotSchema.parse(data);
    return JSON.stringify({ schemaVersion: 2, exportedAt: nowIso(), data }, null, 2);
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
      migrated: (parsed as { schemaVersion?: number }).schemaVersion === 1,
    };
  },

  async importBackup(json: string): Promise<PlannerSnapshot> {
    const parsed: unknown = JSON.parse(json);
    const backup = parseBackupEnvelope(parsed);
    await repository.replace(backup.data);
    return backup.data;
  },

  async clear(): Promise<PlannerSnapshot> {
    await repository.clear();
    return createEmptySnapshot();
  },
};

import { createDemoSnapshot } from "@/src/domain/demo";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { MoodName, PlannerSnapshot } from "@/src/domain/planner";
import type { GoalFormInput, HabitFormInput, OnboardingInput } from "@/src/lib/schemas";
import { backupEnvelopeSchema } from "@/src/lib/schemas";
import { toLocalDateKey } from "@/src/lib/dates";
import { IndexedDbPlannerRepository } from "@/src/repositories/local/IndexedDbPlannerRepository";

const repository = new IndexedDbPlannerRepository();
const id = () => crypto.randomUUID();

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
        onboardingCompleted: true,
        createdAt: now,
        updatedAt: now,
      },
      lifeAreas,
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
            progressType: cleanMilestones.length ? "milestones" : "manual",
            manualProgress: 0,
            priority: "medium",
            status: "active",
            createdAt: now,
            updatedAt: now,
          },
        ],
        milestones: [
          ...snapshot.milestones,
          ...cleanMilestones.map((title) => ({
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
  }): Promise<PlannerSnapshot> {
    return updateSnapshot((snapshot) => ({
      ...snapshot,
      profile: snapshot.profile
        ? { ...snapshot.profile, ...input, updatedAt: new Date().toISOString() }
        : null,
    }));
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
    return JSON.stringify(
      backupEnvelopeSchema.parse({ schemaVersion: 1, exportedAt: new Date().toISOString(), data }),
      null,
      2,
    );
  },

  async importBackup(json: string): Promise<PlannerSnapshot> {
    const parsed: unknown = JSON.parse(json);
    const backup = backupEnvelopeSchema.parse(parsed);
    await repository.replace(backup.data);
    return backup.data;
  },

  async clear(): Promise<PlannerSnapshot> {
    await repository.clear();
    return createEmptySnapshot();
  },
};

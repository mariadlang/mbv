import Dexie, { type Table } from "dexie";
import { createEmptySnapshot } from "@/src/domain/planner";
import type {
  BudgetLine,
  Debt,
  FinanceCategory,
  FinancialAccount,
  FinancialProfile,
  FinancialReview,
  Goal,
  Habit,
  HabitLog,
  JournalEntry,
  LifeArea,
  Milestone,
  MoodLog,
  PlannerSnapshot,
  PeriodPlan,
  Profile,
  Project,
  RecurringItem,
  Review,
  SavingsFund,
  Task,
  Transaction,
  MonthlyBudget,
} from "@/src/domain/planner";
import type { PlannerRepository } from "../interfaces/PlannerRepository";

interface MetadataRecord {
  key: "planner";
  schemaVersion: 1 | 2;
  updatedAt: string;
}

class PlannerDatabase extends Dexie {
  profiles!: Table<Profile, string>;
  lifeAreas!: Table<LifeArea, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  tasks!: Table<Task, string>;
  goals!: Table<Goal, string>;
  milestones!: Table<Milestone, string>;
  moodLogs!: Table<MoodLog, string>;
  journalEntries!: Table<JournalEntry, string>;
  projects!: Table<Project, string>;
  periodPlans!: Table<PeriodPlan, string>;
  reviews!: Table<Review, string>;
  financialProfiles!: Table<FinancialProfile, string>;
  financialAccounts!: Table<FinancialAccount, string>;
  financeCategories!: Table<FinanceCategory, string>;
  monthlyBudgets!: Table<MonthlyBudget, string>;
  budgetLines!: Table<BudgetLine, string>;
  transactions!: Table<Transaction, string>;
  savingsFunds!: Table<SavingsFund, string>;
  debts!: Table<Debt, string>;
  recurringItems!: Table<RecurringItem, string>;
  financialReviews!: Table<FinancialReview, string>;
  metadata!: Table<MetadataRecord, string>;

  constructor() {
    super("my-best-version-planner");
    this.version(1).stores({
      profiles: "id",
      lifeAreas: "id, active, order",
      habits: "id, status, lifeAreaId, goalId",
      habitLogs: "id, habitId, date, [habitId+date]",
      tasks: "id, status, date, goalId, lifeAreaId",
      goals: "id, status, priority, lifeAreaId",
      milestones: "id, goalId, status",
      moodLogs: "id, date",
      journalEntries: "id, date, type, status",
      metadata: "key",
    });
    this.version(2).stores({
      profiles: "id",
      lifeAreas: "id, active, order",
      habits: "id, status, lifeAreaId, goalId",
      habitLogs: "id, habitId, date, [habitId+date]",
      tasks: "id, status, date, goalId, lifeAreaId, projectId, periodPlanId",
      goals: "id, status, priority, lifeAreaId",
      milestones: "id, goalId, status",
      moodLogs: "id, date",
      journalEntries: "id, date, type, status, goalId, lifeAreaId, periodPlanId",
      projects: "id, status, goalId, lifeAreaId, targetDate",
      periodPlans: "id, type, periodKey, status",
      reviews: "id, type, periodKey, status",
      financialProfiles: "id, status",
      financialAccounts: "id, status, type",
      financeCategories: "id, type, active",
      monthlyBudgets: "id, &monthKey, status",
      budgetLines: "id, budgetId, categoryId",
      transactions: "id, type, date, categoryId, fundId, debtId, status",
      savingsFunds: "id, status, goalId",
      debts: "id, status, goalId",
      recurringItems: "id, type, active, dayOfMonth",
      financialReviews: "id, &monthKey, status",
      metadata: "key",
    });
  }
}

export class IndexedDbPlannerRepository implements PlannerRepository {
  private readonly db = new PlannerDatabase();

  async load(): Promise<PlannerSnapshot> {
    const metadata = await this.db.metadata.get("planner");
    if (!metadata) return createEmptySnapshot();

    const [
      profiles, lifeAreas, habits, habitLogs, tasks, goals, milestones, moodLogs, journalEntries,
      projects, periodPlans, reviews, financialProfiles, financialAccounts, financeCategories,
      monthlyBudgets, budgetLines, transactions, savingsFunds, debts, recurringItems, financialReviews,
    ] =
      await Promise.all([
        this.db.profiles.toArray(),
        this.db.lifeAreas.orderBy("order").toArray(),
        this.db.habits.toArray(),
        this.db.habitLogs.toArray(),
        this.db.tasks.toArray(),
        this.db.goals.toArray(),
        this.db.milestones.toArray(),
        this.db.moodLogs.toArray(),
        this.db.journalEntries.toArray(),
        this.db.projects.toArray(),
        this.db.periodPlans.toArray(),
        this.db.reviews.toArray(),
        this.db.financialProfiles.toArray(),
        this.db.financialAccounts.toArray(),
        this.db.financeCategories.toArray(),
        this.db.monthlyBudgets.toArray(),
        this.db.budgetLines.toArray(),
        this.db.transactions.toArray(),
        this.db.savingsFunds.toArray(),
        this.db.debts.toArray(),
        this.db.recurringItems.toArray(),
        this.db.financialReviews.toArray(),
      ]);

    return {
      schemaVersion: 2,
      profile: profiles[0] ?? null,
      lifeAreas,
      habits,
      habitLogs,
      tasks,
      goals,
      milestones,
      moodLogs,
      journalEntries,
      projects,
      periodPlans,
      reviews,
      financialProfiles,
      financialAccounts,
      financeCategories,
      monthlyBudgets,
      budgetLines,
      transactions,
      savingsFunds,
      debts,
      recurringItems,
      financialReviews,
    };
  }

  async replace(snapshot: PlannerSnapshot): Promise<void> {
    await this.db.transaction("rw", this.db.tables, async () => {
      await Promise.all(this.db.tables.map((table) => table.clear()));
      if (snapshot.profile) await this.db.profiles.add(snapshot.profile);
      if (snapshot.lifeAreas.length) await this.db.lifeAreas.bulkAdd(snapshot.lifeAreas);
      if (snapshot.habits.length) await this.db.habits.bulkAdd(snapshot.habits);
      if (snapshot.habitLogs.length) await this.db.habitLogs.bulkAdd(snapshot.habitLogs);
      if (snapshot.tasks.length) await this.db.tasks.bulkAdd(snapshot.tasks);
      if (snapshot.goals.length) await this.db.goals.bulkAdd(snapshot.goals);
      if (snapshot.milestones.length) await this.db.milestones.bulkAdd(snapshot.milestones);
      if (snapshot.moodLogs.length) await this.db.moodLogs.bulkAdd(snapshot.moodLogs);
      if (snapshot.journalEntries.length) await this.db.journalEntries.bulkAdd(snapshot.journalEntries);
      if (snapshot.projects.length) await this.db.projects.bulkAdd(snapshot.projects);
      if (snapshot.periodPlans.length) await this.db.periodPlans.bulkAdd(snapshot.periodPlans);
      if (snapshot.reviews.length) await this.db.reviews.bulkAdd(snapshot.reviews);
      if (snapshot.financialProfiles.length) await this.db.financialProfiles.bulkAdd(snapshot.financialProfiles);
      if (snapshot.financialAccounts.length) await this.db.financialAccounts.bulkAdd(snapshot.financialAccounts);
      if (snapshot.financeCategories.length) await this.db.financeCategories.bulkAdd(snapshot.financeCategories);
      if (snapshot.monthlyBudgets.length) await this.db.monthlyBudgets.bulkAdd(snapshot.monthlyBudgets);
      if (snapshot.budgetLines.length) await this.db.budgetLines.bulkAdd(snapshot.budgetLines);
      if (snapshot.transactions.length) await this.db.transactions.bulkAdd(snapshot.transactions);
      if (snapshot.savingsFunds.length) await this.db.savingsFunds.bulkAdd(snapshot.savingsFunds);
      if (snapshot.debts.length) await this.db.debts.bulkAdd(snapshot.debts);
      if (snapshot.recurringItems.length) await this.db.recurringItems.bulkAdd(snapshot.recurringItems);
      if (snapshot.financialReviews.length) await this.db.financialReviews.bulkAdd(snapshot.financialReviews);
      await this.db.metadata.add({
        key: "planner",
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  async clear(): Promise<void> {
    await this.db.transaction("rw", this.db.tables, async () => {
      await Promise.all(this.db.tables.map((table) => table.clear()));
    });
  }
}

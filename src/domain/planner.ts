export type EntityStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type TaskStatus =
  | "inbox"
  | "planned"
  | "in_progress"
  | "completed"
  | "postponed"
  | "cancelled";

export interface Profile {
  id: string;
  name: string;
  intention: string;
  dailyIntention: string;
  startDate: string;
  weekStartsOn: 0 | 1;
  priorityAreaIds: string[];
  mainPriorities?: string[];
  theme?: "light" | "rose" | "taupe";
  baseCurrency?: "COP" | "USD" | "EUR" | "MXN";
  financePrivacy?: boolean;
  lastBackupAt?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LifeArea {
  id: string;
  name: string;
  color: "rose" | "sage" | "taupe" | "charcoal" | "blush";
  order: number;
  active: boolean;
  currentScore?: number;
  desiredScore?: number;
  vision?: string;
  icon?: string;
  reflection?: string;
  createdAt: string;
  updatedAt: string;
}

export type HabitType = "boolean" | "quantity" | "duration";

export interface Habit {
  id: string;
  name: string;
  description?: string;
  type: HabitType;
  scheduledDays: number[];
  target: number;
  unit: string;
  lifeAreaId?: string;
  goalId?: string;
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  value: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  lifeAreaId?: string;
  goalId?: string;
  milestoneId?: string;
  projectId?: string;
  periodPlanId?: string;
  financialCategoryId?: string;
  date?: string;
  time?: string;
  estimatedMinutes?: number;
  recurrence?: "daily" | "weekly" | "monthly";
  priority: "low" | "medium" | "high";
  status: TaskStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type GoalProgressType = "milestones" | "numeric" | "manual" | "tasks";

export interface Goal {
  id: string;
  title: string;
  reason: string;
  lifeAreaId?: string;
  progressType: GoalProgressType;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  targetDate?: string;
  priority: "low" | "medium" | "high";
  status: EntityStatus;
  manualProgress?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  targetDate?: string;
  weight: number;
  status: "active" | "completed";
  createdAt: string;
  updatedAt: string;
}

export type MoodName = "Calmada" | "Enfocada" | "Alegre" | "Cansada" | "Abrumada";

export interface MoodLog {
  id: string;
  date: string;
  mood: MoodName;
  energy: 1 | 2 | 3 | 4 | 5;
  factors: string[];
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  type: "free" | "gratitude" | "weekly_review" | "monthly_reset";
  title?: string;
  text: string;
  goalId?: string;
  lifeAreaId?: string;
  periodPlanId?: string;
  financialReviewId?: string;
  status: "draft" | "saved";
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  outcome: string;
  lifeAreaId?: string;
  goalId?: string;
  targetDate?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export type PeriodPlanType = "annual" | "quarterly" | "monthly" | "weekly" | "daily";

export interface PeriodPlan {
  id: string;
  type: PeriodPlanType;
  periodKey: string;
  startDate: string;
  endDate: string;
  intention: string;
  priorityIds: string[];
  status: "draft" | "active" | "closed";
  createdAt: string;
  updatedAt: string;
}

export type ReviewType = "daily" | "weekly" | "monthly" | "quarterly" | "annual";

export interface Review {
  id: string;
  type: ReviewType;
  periodKey: string;
  summary: string;
  responses: Record<string, string>;
  decisions: string[];
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
}

export type FinanceCategoryType = "income" | "expense" | "savings" | "debt";
export type TransactionType =
  | "income"
  | "expense"
  | "contribution"
  | "withdrawal"
  | "debt_payment"
  | "transfer";

export interface FinancialProfile {
  id: string;
  baseCurrency: "COP" | "USD" | "EUR" | "MXN";
  privacyMode: boolean;
  monthStartsOn: number;
  status: "active";
  createdAt: string;
  updatedAt: string;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: "cash" | "bank" | "wallet" | "other";
  initialBalance: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: FinanceCategoryType;
  group?: string;
  color?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBudget {
  id: string;
  monthKey: string;
  plannedIncome: number;
  notes?: string;
  status: "draft" | "active" | "closed";
  createdAt: string;
  updatedAt: string;
}

export interface BudgetLine {
  id: string;
  budgetId: string;
  categoryId: string;
  plannedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  categoryId?: string;
  accountId?: string;
  destinationAccountId?: string;
  fundId?: string;
  debtId?: string;
  goalId?: string;
  taskId?: string;
  projectId?: string;
  note?: string;
  status: "active" | "void";
  createdAt: string;
  updatedAt: string;
}

export interface SavingsFund {
  id: string;
  name: string;
  targetAmount: number;
  initialAmount: number;
  targetDate?: string;
  goalId?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Debt {
  id: string;
  name: string;
  initialBalance: number;
  informativeRate?: number;
  minimumPayment?: number;
  dueDay?: number;
  goalId?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringItem {
  id: string;
  name: string;
  type: Exclude<TransactionType, "transfer" | "withdrawal">;
  amount: number;
  dayOfMonth: number;
  categoryId?: string;
  fundId?: string;
  debtId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialReview {
  id: string;
  monthKey: string;
  summary: string;
  decisions: string[];
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface PlannerSnapshot {
  schemaVersion: 2;
  profile: Profile | null;
  lifeAreas: LifeArea[];
  habits: Habit[];
  habitLogs: HabitLog[];
  tasks: Task[];
  goals: Goal[];
  milestones: Milestone[];
  moodLogs: MoodLog[];
  journalEntries: JournalEntry[];
  projects: Project[];
  periodPlans: PeriodPlan[];
  reviews: Review[];
  financialProfiles: FinancialProfile[];
  financialAccounts: FinancialAccount[];
  financeCategories: FinanceCategory[];
  monthlyBudgets: MonthlyBudget[];
  budgetLines: BudgetLine[];
  transactions: Transaction[];
  savingsFunds: SavingsFund[];
  debts: Debt[];
  recurringItems: RecurringItem[];
  financialReviews: FinancialReview[];
}

export interface BackupEnvelope {
  schemaVersion: 2;
  exportedAt: string;
  data: PlannerSnapshot;
}

export function createEmptySnapshot(): PlannerSnapshot {
  return {
    schemaVersion: 2,
    profile: null,
    lifeAreas: [],
    habits: [],
    habitLogs: [],
    tasks: [],
    goals: [],
    milestones: [],
    moodLogs: [],
    journalEntries: [],
    projects: [],
    periodPlans: [],
    reviews: [],
    financialProfiles: [],
    financialAccounts: [],
    financeCategories: [],
    monthlyBudgets: [],
    budgetLines: [],
    transactions: [],
    savingsFunds: [],
    debts: [],
    recurringItems: [],
    financialReviews: [],
  };
}

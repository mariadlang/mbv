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
  usePurpose?: string;
  dailyIntention: string;
  startDate: string;
  weekStartsOn: 0 | 1;
  priorityAreaIds: string[];
  mainPriorities?: string[];
  theme?: "light" | "rose" | "taupe";
  baseCurrency?: "COP" | "USD" | "EUR" | "MXN";
  financePrivacy?: boolean;
  fitnessEnabled?: boolean;
  fitnessProfile?: FitnessProfile;
  avatarDataUrl?: string;
  activationCompleted?: boolean;
  lastBackupAt?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FitnessProfile {
  physicalGoal: string;
  dailyCalories: number;
  mealsPerDay: number;
  workoutsPerWeek: number;
  trainingDays: number[];
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
  dream?: string;
  imageDataUrl?: string;
  category?: string;
  custom?: boolean;
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
  origin?: "established" | "experiment";
  recommendation?: string;
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
  focusPriority?: 1 | 2 | 3;
  rescheduleCount?: number;
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
  targetMonth?: string;
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
  energy: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  sleep?: 1 | 2 | 3 | 4 | 5;
  concentration?: 1 | 2 | 3 | 4 | 5;
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
  imageDataUrl?: string;
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

export interface ProjectChecklistItem {
  id: string;
  projectId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CascadeHorizon =
  | "pathways"
  | "three_years"
  | "annual"
  | "six_months"
  | "quarterly"
  | "monthly"
  | "weekly"
  | "daily";

export interface PlanActivity {
  id: string;
  title: string;
  date?: string;
  type: "objective" | "activity" | "event";
}

export interface CascadePlan {
  id: string;
  horizon: CascadeHorizon;
  periodKey: string;
  parentPlanId?: string;
  intention: string;
  priority: string;
  objectives: string[];
  activities: PlanActivity[];
  areaIds?: string[];
  details?: Record<string, string>;
  reflection?: {
    advanced?: string;
    pending?: string;
    next?: string;
  };
  completedObjectiveIndexes?: number[];
  status?: "draft" | "active" | "closed";
  suggestion?: string;
  createdAt: string;
  updatedAt: string;
}

export type BrainDumpType =
  | "wishlist"
  | "want_to_do"
  | "must_do"
  | "shopping"
  | "want_to_learn"
  | "want_to_read"
  | "watch_list";

export interface BrainDumpItem {
  id: string;
  title: string;
  type: BrainDumpType;
  tentativeDate?: string;
  priority: "low" | "medium" | "high";
  status: "idea" | "planned" | "completed" | "released";
  createdAt: string;
  updatedAt: string;
}

export interface RoutineStep {
  id: string;
  title: string;
}

export interface Routine {
  id: string;
  name: string;
  period: "am" | "afternoon" | "pm";
  scheduledDays: number[];
  steps: RoutineStep[];
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface PlannerEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  time?: string;
  category: "medical" | "birthday" | "social" | "work" | "wellness" | "personal";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisionBoardItem {
  id: string;
  type: "quote" | "image" | "mixed";
  content: string;
  caption?: string;
  reminderEnabled: boolean;
  reminderFrequency?: "daily" | "weekly" | "monthly" | "quarterly";
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  setDetails?: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
}

export interface WorkoutSession {
  id: string;
  date: string;
  workoutName: string;
  durationMinutes?: number;
  exercises: Array<{
    id: string;
    name: string;
    sets: WorkoutSet[];
  }>;
  completedAt: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  weekKey: string;
  goal?: string;
  name?: string;
  durationMinutes?: number;
  exercises: WorkoutExercise[];
  completedSessions?: WorkoutSession[];
  createdAt: string;
  updatedAt: string;
}

export interface MealLog {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  notes?: string;
  completed?: boolean;
}

export interface NutritionLog {
  id: string;
  date: string;
  meals: MealLog[];
  createdAt: string;
  updatedAt: string;
}

export interface BodyCheckIn {
  id: string;
  date: string;
  weight?: number;
  measurements: Record<string, number>;
  photoDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  type: "fear" | "intermittent_fasting" | "no_sugar" | "custom";
  intention: string;
  startDate: string;
  endDate?: string;
  completedDates: string[];
  status: "active" | "completed" | "archived";
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
  balanceAdjustment?: number;
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

export interface PendingPurchase {
  id: string;
  title: string;
  estimatedAmount: number;
  accountId?: string;
  tentativeDate?: string;
  taskId?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "purchased" | "released";
  createdAt: string;
  updatedAt: string;
}

export interface PlannerSnapshot {
  schemaVersion: 3;
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
  projectChecklistItems: ProjectChecklistItem[];
  cascadePlans: CascadePlan[];
  brainDumpItems: BrainDumpItem[];
  routines: Routine[];
  events: PlannerEvent[];
  visionBoardItems: VisionBoardItem[];
  workoutLogs: WorkoutLog[];
  nutritionLogs: NutritionLog[];
  bodyCheckIns: BodyCheckIn[];
  challenges: Challenge[];
  pendingPurchases: PendingPurchase[];
}

export interface BackupEnvelope {
  schemaVersion: 3;
  exportedAt: string;
  data: PlannerSnapshot;
}

export function createEmptySnapshot(): PlannerSnapshot {
  return {
    schemaVersion: 3,
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
    projectChecklistItems: [],
    cascadePlans: [],
    brainDumpItems: [],
    routines: [],
    events: [],
    visionBoardItems: [],
    workoutLogs: [],
    nutritionLogs: [],
    bodyCheckIns: [],
    challenges: [],
    pendingPurchases: [],
  };
}

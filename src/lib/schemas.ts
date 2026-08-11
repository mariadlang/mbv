import { z } from "zod";
import type { BackupEnvelope, PlannerSnapshot } from "@/src/domain/planner";

const timestampSchema = z.string().min(1);
const optionalId = z.string().optional();
const entityStatusSchema = z.enum(["draft", "active", "paused", "completed", "archived"]);

export const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Cuéntanos cómo quieres que te llamemos."),
  intention: z.string().trim().min(4, "Escribe una intención breve para comenzar."),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
});

export const habitFormSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del hábito."),
  type: z.enum(["boolean", "quantity", "duration"]),
  target: z.number().positive("El objetivo debe ser mayor que cero."),
  unit: z.string().trim().min(1, "Indica una unidad."),
  scheduledDays: z.array(z.number().int().min(0).max(6)).min(1, "Elige al menos un día."),
  lifeAreaId: optionalId,
});

export const goalFormSchema = z.object({
  title: z.string().trim().min(3, "Escribe un resultado concreto."),
  reason: z.string().trim().min(4, "Añade una razón que te conecte con esta meta."),
  targetDate: z.string().optional(),
  lifeAreaId: optionalId,
  progressType: z.enum(["milestones", "numeric", "manual", "tasks"]).default("milestones"),
  targetValue: z.number().positive().optional(),
  unit: z.string().trim().optional(),
  manualProgress: z.number().min(0).max(100).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const taskFormSchema = z.object({
  title: z.string().trim().min(2, "Escribe una tarea concreta."),
  description: z.string().trim().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  lifeAreaId: optionalId,
  goalId: optionalId,
  milestoneId: optionalId,
  projectId: optionalId,
  periodPlanId: optionalId,
  financialCategoryId: optionalId,
  recurrence: z.enum(["daily", "weekly", "monthly"]).optional(),
});

export const projectFormSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del proyecto."),
  outcome: z.string().trim().min(4, "Describe el entregable que indicará que está listo."),
  lifeAreaId: optionalId,
  goalId: optionalId,
  targetDate: z.string().optional(),
});

export const transactionFormSchema = z.object({
  type: z.enum(["income", "expense", "contribution", "withdrawal", "debt_payment", "transfer"]),
  amount: z.number().int().positive("El valor debe ser mayor que cero."),
  date: z.string().min(1),
  categoryId: optionalId,
  accountId: optionalId,
  destinationAccountId: optionalId,
  fundId: optionalId,
  debtId: optionalId,
  goalId: optionalId,
  taskId: optionalId,
  projectId: optionalId,
  note: z.string().trim().optional(),
});

export const savingsFundFormSchema = z.object({
  name: z.string().trim().min(2),
  targetAmount: z.number().int().positive(),
  initialAmount: z.number().int().min(0).default(0),
  targetDate: z.string().optional(),
  goalId: optionalId,
});

export const debtFormSchema = z.object({
  name: z.string().trim().min(2),
  initialBalance: z.number().int().positive(),
  informativeRate: z.number().min(0).optional(),
  minimumPayment: z.number().int().min(0).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  goalId: optionalId,
});

export const recurringItemFormSchema = z.object({
  name: z.string().trim().min(2),
  type: z.enum(["income", "expense", "contribution", "debt_payment"]),
  amount: z.number().int().positive(),
  dayOfMonth: z.number().int().min(1).max(31),
  categoryId: optionalId,
  fundId: optionalId,
  debtId: optionalId,
});

const profileSchema = z.object({
  id: z.string(), name: z.string(), intention: z.string(), dailyIntention: z.string(),
  startDate: z.string(), weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  priorityAreaIds: z.array(z.string()), mainPriorities: z.array(z.string()).optional(),
  theme: z.enum(["light", "rose", "taupe"]).optional(),
  baseCurrency: z.enum(["COP", "USD", "EUR", "MXN"]).optional(),
  financePrivacy: z.boolean().optional(), lastBackupAt: z.string().optional(),
  onboardingCompleted: z.boolean(), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const lifeAreaSchema = z.object({
  id: z.string(), name: z.string(), color: z.enum(["rose", "sage", "taupe", "charcoal", "blush"]),
  order: z.number(), active: z.boolean(), currentScore: z.number().min(0).max(10).optional(),
  desiredScore: z.number().min(0).max(10).optional(), vision: z.string().optional(),
  icon: z.string().optional(), reflection: z.string().optional(),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const habitSchema = z.object({
  id: z.string(), name: z.string(), description: z.string().optional(),
  type: z.enum(["boolean", "quantity", "duration"]),
  scheduledDays: z.array(z.number().int().min(0).max(6)), target: z.number().positive(), unit: z.string(),
  lifeAreaId: optionalId, goalId: optionalId, status: z.enum(["active", "paused", "archived"]),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const habitLogSchema = z.object({
  id: z.string(), habitId: z.string(), date: z.string(), value: z.number(), note: z.string().optional(),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const taskSchema = z.object({
  id: z.string(), title: z.string(), description: z.string().optional(), lifeAreaId: optionalId,
  goalId: optionalId, milestoneId: optionalId, projectId: optionalId, periodPlanId: optionalId,
  financialCategoryId: optionalId, date: z.string().optional(), time: z.string().optional(),
  estimatedMinutes: z.number().optional(), recurrence: z.enum(["daily", "weekly", "monthly"]).optional(),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["inbox", "planned", "in_progress", "completed", "postponed", "cancelled"]),
  completedAt: z.string().optional(), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const goalSchema = z.object({
  id: z.string(), title: z.string(), reason: z.string(), lifeAreaId: optionalId,
  progressType: z.enum(["milestones", "numeric", "manual", "tasks"]),
  targetValue: z.number().optional(), currentValue: z.number().optional(), unit: z.string().optional(),
  targetDate: z.string().optional(), priority: z.enum(["low", "medium", "high"]),
  status: entityStatusSchema, manualProgress: z.number().optional(),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const milestoneSchema = z.object({
  id: z.string(), goalId: z.string(), title: z.string(), targetDate: z.string().optional(),
  weight: z.number().positive(), status: z.enum(["active", "completed"]),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const moodLogSchema = z.object({
  id: z.string(), date: z.string(), mood: z.enum(["Calmada", "Enfocada", "Alegre", "Cansada", "Abrumada"]),
  energy: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  factors: z.array(z.string()), note: z.string().optional(), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const journalEntrySchema = z.object({
  id: z.string(), date: z.string(), type: z.enum(["free", "gratitude", "weekly_review", "monthly_reset"]),
  title: z.string().optional(), text: z.string(), goalId: optionalId, lifeAreaId: optionalId,
  periodPlanId: optionalId, financialReviewId: optionalId, status: z.enum(["draft", "saved"]),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const projectSchema = z.object({
  id: z.string(), name: z.string(), outcome: z.string(), lifeAreaId: optionalId, goalId: optionalId,
  targetDate: z.string().optional(), status: entityStatusSchema,
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const periodPlanSchema = z.object({
  id: z.string(), type: z.enum(["annual", "quarterly", "monthly", "weekly", "daily"]),
  periodKey: z.string(), startDate: z.string(), endDate: z.string(), intention: z.string(),
  priorityIds: z.array(z.string()), status: z.enum(["draft", "active", "closed"]),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const reviewSchema = z.object({
  id: z.string(), type: z.enum(["daily", "weekly", "monthly", "quarterly", "annual"]),
  periodKey: z.string(), summary: z.string(), responses: z.record(z.string(), z.string()),
  decisions: z.array(z.string()), status: z.enum(["draft", "completed"]),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const financialProfileSchema = z.object({
  id: z.string(), baseCurrency: z.enum(["COP", "USD", "EUR", "MXN"]), privacyMode: z.boolean(),
  monthStartsOn: z.number().int().min(1).max(28), status: z.literal("active"),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const financialAccountSchema = z.object({
  id: z.string(), name: z.string(), type: z.enum(["cash", "bank", "wallet", "other"]),
  initialBalance: z.number().int(), status: z.enum(["active", "archived"]),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const financeCategorySchema = z.object({
  id: z.string(), name: z.string(), type: z.enum(["income", "expense", "savings", "debt"]),
  group: z.string().optional(), color: z.string().optional(), active: z.boolean(),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const monthlyBudgetSchema = z.object({
  id: z.string(), monthKey: z.string(), plannedIncome: z.number().int(), notes: z.string().optional(),
  status: z.enum(["draft", "active", "closed"]), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const budgetLineSchema = z.object({
  id: z.string(), budgetId: z.string(), categoryId: z.string(), plannedAmount: z.number().int(),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const transactionSchema = z.object({
  id: z.string(), type: z.enum(["income", "expense", "contribution", "withdrawal", "debt_payment", "transfer"]),
  amount: z.number().int().positive(), date: z.string(), categoryId: optionalId, accountId: optionalId,
  destinationAccountId: optionalId, fundId: optionalId, debtId: optionalId, goalId: optionalId,
  taskId: optionalId, projectId: optionalId, note: z.string().optional(), status: z.enum(["active", "void"]),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const savingsFundSchema = z.object({
  id: z.string(), name: z.string(), targetAmount: z.number().int().positive(), initialAmount: z.number().int(),
  targetDate: z.string().optional(), goalId: optionalId, status: entityStatusSchema,
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const debtSchema = z.object({
  id: z.string(), name: z.string(), initialBalance: z.number().int().positive(), informativeRate: z.number().optional(),
  minimumPayment: z.number().int().optional(), dueDay: z.number().int().optional(), goalId: optionalId,
  status: entityStatusSchema, createdAt: timestampSchema, updatedAt: timestampSchema,
});

const recurringItemSchema = z.object({
  id: z.string(), name: z.string(), type: z.enum(["income", "expense", "contribution", "debt_payment"]),
  amount: z.number().int().positive(), dayOfMonth: z.number().int().min(1).max(31), categoryId: optionalId,
  fundId: optionalId, debtId: optionalId, active: z.boolean(), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const financialReviewSchema = z.object({
  id: z.string(), monthKey: z.string(), summary: z.string(), decisions: z.array(z.string()),
  status: z.enum(["draft", "completed"]), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const snapshotFields = {
  profile: profileSchema.nullable(), lifeAreas: z.array(lifeAreaSchema), habits: z.array(habitSchema),
  habitLogs: z.array(habitLogSchema), tasks: z.array(taskSchema), goals: z.array(goalSchema),
  milestones: z.array(milestoneSchema), moodLogs: z.array(moodLogSchema), journalEntries: z.array(journalEntrySchema),
};

const legacyPlannerSnapshotSchema = z.object({ schemaVersion: z.literal(1), ...snapshotFields });

export const plannerSnapshotSchema = z.object({
  schemaVersion: z.literal(2), ...snapshotFields,
  projects: z.array(projectSchema), periodPlans: z.array(periodPlanSchema), reviews: z.array(reviewSchema),
  financialProfiles: z.array(financialProfileSchema), financialAccounts: z.array(financialAccountSchema),
  financeCategories: z.array(financeCategorySchema), monthlyBudgets: z.array(monthlyBudgetSchema),
  budgetLines: z.array(budgetLineSchema), transactions: z.array(transactionSchema),
  savingsFunds: z.array(savingsFundSchema), debts: z.array(debtSchema), recurringItems: z.array(recurringItemSchema),
  financialReviews: z.array(financialReviewSchema),
});

const backupV1Schema = z.object({ schemaVersion: z.literal(1), exportedAt: z.string(), data: legacyPlannerSnapshotSchema });
const backupV2Schema = z.object({ schemaVersion: z.literal(2), exportedAt: z.string(), data: plannerSnapshotSchema });

export const backupEnvelopeSchema = z.union([backupV2Schema, backupV1Schema]);

export function parseBackupEnvelope(input: unknown): BackupEnvelope {
  const parsed = backupEnvelopeSchema.parse(input);
  if (parsed.schemaVersion === 2) return parsed as BackupEnvelope;
  const now = new Date().toISOString();
  const profile = parsed.data.profile
    ? { ...parsed.data.profile, baseCurrency: "COP" as const, financePrivacy: false, updatedAt: now }
    : null;
  return {
    schemaVersion: 2,
    exportedAt: parsed.exportedAt,
    data: {
      ...parsed.data,
      schemaVersion: 2,
      profile,
      projects: [], periodPlans: [], reviews: [], financialProfiles: [], financialAccounts: [],
      financeCategories: [], monthlyBudgets: [], budgetLines: [], transactions: [], savingsFunds: [],
      debts: [], recurringItems: [], financialReviews: [],
    } as PlannerSnapshot,
  };
}

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type HabitFormInput = z.infer<typeof habitFormSchema>;
export type GoalFormInput = z.input<typeof goalFormSchema>;
export type TaskFormInput = z.input<typeof taskFormSchema>;
export type ProjectFormInput = z.infer<typeof projectFormSchema>;
export type TransactionFormInput = z.infer<typeof transactionFormSchema>;
export type SavingsFundFormInput = z.input<typeof savingsFundFormSchema>;
export type DebtFormInput = z.infer<typeof debtFormSchema>;
export type RecurringItemFormInput = z.infer<typeof recurringItemFormSchema>;

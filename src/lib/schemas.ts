import { z } from "zod";
import type { BackupEnvelope, PlannerSnapshot } from "@/src/domain/planner";

const timestampSchema = z.string().min(1);
const optionalId = z.string().optional();
const entityStatusSchema = z.enum(["draft", "active", "paused", "completed", "archived"]);
const imageDataUrlSchema = z.string()
  .max(2_100_000, "La imagen es demasiado grande.")
  .regex(/^data:image\/(png|jpeg|webp);base64,/i, "La imagen no tiene un formato compatible.");

export const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Cuéntanos cómo quieres que te llamemos."),
  intention: z.string().trim().min(4, "Escribe una intención breve para comenzar."),
  usePurpose: z.string().trim().min(4, "Cuéntanos para qué quieres usar tu planner."),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
});

export const habitFormSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del hábito."),
  type: z.enum(["boolean", "quantity", "duration"]),
  target: z.number().positive("El objetivo debe ser mayor que cero."),
  unit: z.string().trim().min(1, "Indica una unidad."),
  scheduledDays: z.array(z.number().int().min(0).max(6)).min(1, "Elige al menos un día."),
  lifeAreaId: optionalId,
  origin: z.enum(["established", "experiment"]).optional(),
});

export const goalFormSchema = z.object({
  title: z.string().trim().min(3, "Escribe un resultado concreto."),
  reason: z.string().trim().min(4, "Añade una razón que te conecte con esta meta."),
  targetDate: z.string().optional(),
  targetMonth: z.string().optional(),
  lifeAreaId: optionalId,
  progressType: z.enum(["milestones", "numeric", "manual", "tasks"]).default("milestones"),
  targetValue: z.number().positive().optional(),
  unit: z.string().trim().optional(),
  manualProgress: z.number().min(0).max(100).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
}).superRefine((value, context) => {
  if (value.targetDate && value.targetMonth) {
    context.addIssue({
      code: "custom",
      path: ["targetDate"],
      message: "Elige una fecha exacta o un mes deseado, no ambos.",
    });
  }
});

export const taskFormSchema = z.object({
  title: z.string().trim().min(2, "Escribe una tarea concreta."),
  description: z.string().trim().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  focusPriority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
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

export const cascadePlanFormSchema = z.object({
  horizon: z.enum(["pathways", "three_years", "annual", "six_months", "quarterly", "monthly", "weekly", "daily"]),
  periodKey: z.string().min(1),
  parentPlanId: optionalId,
  intention: z.string().trim().min(2),
  priority: z.string().trim().min(2),
  objectives: z.array(z.string().trim()).default([]),
  activities: z.array(z.object({ title: z.string().trim().min(2), date: z.string().optional(), type: z.enum(["objective", "activity", "event"]) })).default([]),
});

export const brainDumpFormSchema = z.object({
  title: z.string().trim().min(2),
  type: z.enum(["wishlist", "want_to_do", "must_do", "shopping", "want_to_learn", "want_to_read", "watch_list"]),
  tentativeDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const routineFormSchema = z.object({
  name: z.string().trim().min(2),
  period: z.enum(["am", "afternoon", "pm"]),
  scheduledDays: z.array(z.number().int().min(0).max(6)).min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
});

export const eventFormSchema = z.object({
  title: z.string().trim().min(2), startDate: z.string().min(1), endDate: z.string().optional(),
  time: z.string().optional(), category: z.enum(["medical", "birthday", "social", "work", "wellness", "personal"]),
  notes: z.string().trim().optional(),
});

export const workoutFormSchema = z.object({
  date: z.string().min(1), goal: z.string().trim().optional(),
  exercise: z.string().trim().min(2), sets: z.number().int().positive(), reps: z.number().int().positive(), weight: z.number().min(0),
});

export const mealFormSchema = z.object({
  date: z.string().min(1), name: z.string().trim().min(2), calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(), carbs: z.number().min(0).optional(), fat: z.number().min(0).optional(),
});

export const bodyCheckInFormSchema = z.object({
  date: z.string().min(1), weight: z.number().positive().optional(),
  waist: z.number().positive().optional(), hip: z.number().positive().optional(), photoDataUrl: imageDataUrlSchema.optional(),
});

export const challengeFormSchema = z.object({
  title: z.string().trim().min(2), type: z.enum(["fear", "intermittent_fasting", "no_sugar", "custom"]),
  intention: z.string().trim().min(2), startDate: z.string().min(1), endDate: z.string().optional(),
}).refine((value) => !value.endDate || value.endDate >= value.startDate, {
  path: ["endDate"],
  message: "La fecha final debe ser igual o posterior al inicio.",
});

export const financialAccountFormSchema = z.object({
  name: z.string().trim().min(2), type: z.enum(["cash", "bank", "wallet", "other"]), initialBalance: z.number().int(),
});

export const pendingPurchaseFormSchema = z.object({
  title: z.string().trim().min(2), estimatedAmount: z.number().int().positive(), accountId: optionalId,
  tentativeDate: z.string().optional(), priority: z.enum(["low", "medium", "high"]).default("medium"),
});

const profileSchema = z.object({
  id: z.string(), name: z.string(), intention: z.string(), usePurpose: z.string().optional(), dailyIntention: z.string(),
  startDate: z.string(), weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  priorityAreaIds: z.array(z.string()), mainPriorities: z.array(z.string()).optional(),
  theme: z.enum(["light", "rose", "taupe"]).optional(),
  baseCurrency: z.enum(["COP", "USD", "EUR", "MXN"]).optional(),
  financePrivacy: z.boolean().optional(), fitnessEnabled: z.boolean().optional(), avatarDataUrl: imageDataUrlSchema.optional(), activationCompleted: z.boolean().optional(), lastBackupAt: z.string().optional(),
  onboardingCompleted: z.boolean(), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const lifeAreaSchema = z.object({
  id: z.string(), name: z.string(), color: z.enum(["rose", "sage", "taupe", "charcoal", "blush"]),
  order: z.number(), active: z.boolean(), currentScore: z.number().min(0).max(10).optional(),
  desiredScore: z.number().min(0).max(10).optional(), vision: z.string().optional(),
  icon: z.string().optional(), reflection: z.string().optional(), dream: z.string().optional(), imageDataUrl: imageDataUrlSchema.optional(),
  category: z.string().optional(), custom: z.boolean().optional(),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const habitSchema = z.object({
  id: z.string(), name: z.string(), description: z.string().optional(),
  type: z.enum(["boolean", "quantity", "duration"]),
  scheduledDays: z.array(z.number().int().min(0).max(6)), target: z.number().positive(), unit: z.string(),
  lifeAreaId: optionalId, goalId: optionalId, origin: z.enum(["established", "experiment"]).optional(),
  recommendation: z.string().optional(), status: z.enum(["active", "paused", "archived"]),
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
  focusPriority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(), rescheduleCount: z.number().int().min(0).optional(),
  status: z.enum(["inbox", "planned", "in_progress", "completed", "postponed", "cancelled"]),
  completedAt: z.string().optional(), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const goalSchema = z.object({
  id: z.string(), title: z.string(), reason: z.string(), lifeAreaId: optionalId,
  progressType: z.enum(["milestones", "numeric", "manual", "tasks"]),
  targetValue: z.number().optional(), currentValue: z.number().optional(), unit: z.string().optional(),
  targetDate: z.string().optional(), targetMonth: z.string().optional(), priority: z.enum(["low", "medium", "high"]),
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
  sleep: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  concentration: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  factors: z.array(z.string()), note: z.string().optional(), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const journalEntrySchema = z.object({
  id: z.string(), date: z.string(), type: z.enum(["free", "gratitude", "weekly_review", "monthly_reset"]),
  title: z.string().optional(), text: z.string(), imageDataUrl: z.string().optional(), goalId: optionalId, lifeAreaId: optionalId,
  periodPlanId: optionalId, financialReviewId: optionalId, status: z.enum(["draft", "saved"]),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const projectSchema = z.object({
  id: z.string(), name: z.string(), outcome: z.string(), lifeAreaId: optionalId, goalId: optionalId,
  targetDate: z.string().optional(), status: entityStatusSchema,
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const projectChecklistItemSchema = z.object({
  id: z.string(), projectId: z.string(), title: z.string(), completed: z.boolean(),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const cascadePlanSchema = z.object({
  id: z.string(), horizon: z.enum(["pathways", "three_years", "annual", "six_months", "quarterly", "monthly", "weekly", "daily"]),
  periodKey: z.string(), parentPlanId: optionalId, intention: z.string(), priority: z.string(), objectives: z.array(z.string()),
  activities: z.array(z.object({ id: z.string(), title: z.string(), date: z.string().optional(), type: z.enum(["objective", "activity", "event"]) })),
  suggestion: z.string().optional(), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const brainDumpItemSchema = z.object({
  id: z.string(), title: z.string(), type: z.enum(["wishlist", "want_to_do", "must_do", "shopping", "want_to_learn", "want_to_read", "watch_list"]),
  tentativeDate: z.string().optional(), priority: z.enum(["low", "medium", "high"]), status: z.enum(["idea", "planned", "completed", "released"]),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const routineSchema = z.object({
  id: z.string(), name: z.string(), period: z.enum(["am", "afternoon", "pm"]),
  scheduledDays: z.array(z.number().int().min(0).max(6)), steps: z.array(z.object({ id: z.string(), title: z.string() })),
  status: z.enum(["active", "paused", "archived"]), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const plannerEventSchema = z.object({
  id: z.string(), title: z.string(), startDate: z.string(), endDate: z.string().optional(), time: z.string().optional(),
  category: z.enum(["medical", "birthday", "social", "work", "wellness", "personal"]), notes: z.string().optional(),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const visionBoardItemSchema = z.object({
  id: z.string(), type: z.enum(["quote", "image", "mixed"]), content: z.string(), caption: z.string().optional(),
  reminderEnabled: z.boolean(), reminderFrequency: z.enum(["daily", "weekly", "monthly", "quarterly"]).optional(), createdAt: timestampSchema, updatedAt: timestampSchema,
});

export const imageUploadSchema = z.object({
  type: z.enum(["image/png", "image/jpeg", "image/webp"], { message: "Usa una imagen PNG, JPG o WebP." }),
  size: z.number().max(1_500_000, "La imagen debe pesar menos de 1,5 MB."),
});

export const backupFileSchema = z.object({
  type: z.string().refine(
    (value) => value === "application/json" || value === "text/json" || value === "",
    "Selecciona un archivo JSON.",
  ),
  size: z.number().max(10_000_000, "El respaldo debe pesar menos de 10 MB."),
});

const workoutLogSchema = z.object({
  id: z.string(), date: z.string(), weekKey: z.string(), goal: z.string().optional(),
  exercises: z.array(z.object({ id: z.string(), name: z.string(), sets: z.number().int(), reps: z.number().int(), weight: z.number() })),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const nutritionLogSchema = z.object({
  id: z.string(), date: z.string(), meals: z.array(z.object({ id: z.string(), name: z.string(), calories: z.number().optional(), protein: z.number().optional(), carbs: z.number().optional(), fat: z.number().optional() })),
  createdAt: timestampSchema, updatedAt: timestampSchema,
});

const bodyCheckInSchema = z.object({
  id: z.string(), date: z.string(), weight: z.number().optional(), measurements: z.record(z.string(), z.number()),
  photoDataUrl: imageDataUrlSchema.optional(), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const challengeSchema = z.object({
  id: z.string(), title: z.string(), type: z.enum(["fear", "intermittent_fasting", "no_sugar", "custom"]),
  intention: z.string(), startDate: z.string(), endDate: z.string().optional(), completedDates: z.array(z.string()),
  status: z.enum(["active", "completed", "archived"]), createdAt: timestampSchema, updatedAt: timestampSchema,
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
  initialBalance: z.number().int(), balanceAdjustment: z.number().int().optional(), status: z.enum(["active", "archived"]),
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

const pendingPurchaseSchema = z.object({
  id: z.string(), title: z.string(), estimatedAmount: z.number().int().positive(), accountId: z.string().optional(),
  tentativeDate: z.string().optional(), taskId: z.string().optional(), priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["pending", "purchased", "released"]), createdAt: timestampSchema, updatedAt: timestampSchema,
});

const snapshotFields = {
  profile: profileSchema.nullable(), lifeAreas: z.array(lifeAreaSchema), habits: z.array(habitSchema),
  habitLogs: z.array(habitLogSchema), tasks: z.array(taskSchema), goals: z.array(goalSchema),
  milestones: z.array(milestoneSchema), moodLogs: z.array(moodLogSchema), journalEntries: z.array(journalEntrySchema),
};

const legacyPlannerSnapshotSchema = z.object({ schemaVersion: z.literal(1), ...snapshotFields });

const plannerSnapshotV2Schema = z.object({
  schemaVersion: z.literal(2), ...snapshotFields,
  projects: z.array(projectSchema), periodPlans: z.array(periodPlanSchema), reviews: z.array(reviewSchema),
  financialProfiles: z.array(financialProfileSchema), financialAccounts: z.array(financialAccountSchema),
  financeCategories: z.array(financeCategorySchema), monthlyBudgets: z.array(monthlyBudgetSchema),
  budgetLines: z.array(budgetLineSchema), transactions: z.array(transactionSchema),
  savingsFunds: z.array(savingsFundSchema), debts: z.array(debtSchema), recurringItems: z.array(recurringItemSchema),
  financialReviews: z.array(financialReviewSchema),
});

export const plannerSnapshotSchema = z.object({
  ...plannerSnapshotV2Schema.omit({ schemaVersion: true }).shape,
  schemaVersion: z.literal(3),
  projectChecklistItems: z.array(projectChecklistItemSchema), cascadePlans: z.array(cascadePlanSchema),
  brainDumpItems: z.array(brainDumpItemSchema), routines: z.array(routineSchema), events: z.array(plannerEventSchema),
  visionBoardItems: z.array(visionBoardItemSchema), workoutLogs: z.array(workoutLogSchema),
  nutritionLogs: z.array(nutritionLogSchema), bodyCheckIns: z.array(bodyCheckInSchema),
  challenges: z.array(challengeSchema), pendingPurchases: z.array(pendingPurchaseSchema),
});

const backupV1Schema = z.object({ schemaVersion: z.literal(1), exportedAt: z.string(), data: legacyPlannerSnapshotSchema });
const backupV2Schema = z.object({ schemaVersion: z.literal(2), exportedAt: z.string(), data: plannerSnapshotV2Schema });
const backupV3Schema = z.object({ schemaVersion: z.literal(3), exportedAt: z.string(), data: plannerSnapshotSchema });

export const backupEnvelopeSchema = z.union([backupV3Schema, backupV2Schema, backupV1Schema]);

export function parseBackupEnvelope(input: unknown): BackupEnvelope {
  const parsed = backupEnvelopeSchema.parse(input);
  if (parsed.schemaVersion === 3) return parsed as BackupEnvelope;
  const now = new Date().toISOString();
  const profile = parsed.data.profile
    ? { ...parsed.data.profile, baseCurrency: "COP" as const, financePrivacy: false, updatedAt: now }
    : null;
  const v2Data = parsed.schemaVersion === 2 ? parsed.data : {
    ...parsed.data,
    schemaVersion: 2 as const,
    profile,
    projects: [], periodPlans: [], reviews: [], financialProfiles: [], financialAccounts: [],
    financeCategories: [], monthlyBudgets: [], budgetLines: [], transactions: [], savingsFunds: [],
    debts: [], recurringItems: [], financialReviews: [],
  };
  return {
    schemaVersion: 3,
    exportedAt: parsed.exportedAt,
    data: {
      ...v2Data,
      schemaVersion: 3,
      projectChecklistItems: [], cascadePlans: [], brainDumpItems: [], routines: [], events: [],
      visionBoardItems: [], workoutLogs: [], nutritionLogs: [], bodyCheckIns: [], challenges: [], pendingPurchases: [],
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
export type CascadePlanFormInput = z.input<typeof cascadePlanFormSchema>;
export type BrainDumpFormInput = z.input<typeof brainDumpFormSchema>;
export type RoutineFormInput = z.infer<typeof routineFormSchema>;
export type EventFormInput = z.infer<typeof eventFormSchema>;
export type WorkoutFormInput = z.infer<typeof workoutFormSchema>;
export type MealFormInput = z.infer<typeof mealFormSchema>;
export type BodyCheckInFormInput = z.infer<typeof bodyCheckInFormSchema>;
export type ChallengeFormInput = z.infer<typeof challengeFormSchema>;
export type FinancialAccountFormInput = z.infer<typeof financialAccountFormSchema>;
export type PendingPurchaseFormInput = z.input<typeof pendingPurchaseFormSchema>;

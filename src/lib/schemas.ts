import { z } from "zod";

const timestampSchema = z.string().min(1);

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
  lifeAreaId: z.string().optional(),
});

export const goalFormSchema = z.object({
  title: z.string().trim().min(3, "Escribe un resultado concreto."),
  reason: z.string().trim().min(4, "Añade una razón que te conecte con esta meta."),
  targetDate: z.string().optional(),
  lifeAreaId: z.string().optional(),
});

const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  intention: z.string(),
  dailyIntention: z.string(),
  startDate: z.string(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  priorityAreaIds: z.array(z.string()),
  mainPriorities: z.array(z.string()).optional(),
  theme: z.enum(["light", "rose", "taupe"]).optional(),
  onboardingCompleted: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const lifeAreaSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.enum(["rose", "sage", "taupe", "charcoal", "blush"]),
  order: z.number(),
  active: z.boolean(),
  currentScore: z.number().min(0).max(10).optional(),
  desiredScore: z.number().min(0).max(10).optional(),
  vision: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const habitSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["boolean", "quantity", "duration"]),
  scheduledDays: z.array(z.number().int().min(0).max(6)),
  target: z.number().positive(),
  unit: z.string(),
  lifeAreaId: z.string().optional(),
  goalId: z.string().optional(),
  status: z.enum(["active", "paused", "archived"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const habitLogSchema = z.object({
  id: z.string(),
  habitId: z.string(),
  date: z.string(),
  value: z.number(),
  note: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  lifeAreaId: z.string().optional(),
  goalId: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  estimatedMinutes: z.number().optional(),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["inbox", "planned", "in_progress", "completed", "postponed", "cancelled"]),
  completedAt: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const goalSchema = z.object({
  id: z.string(),
  title: z.string(),
  reason: z.string(),
  lifeAreaId: z.string().optional(),
  progressType: z.enum(["milestones", "numeric", "manual", "tasks"]),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().optional(),
  targetDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["active", "paused", "completed", "archived"]),
  manualProgress: z.number().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const milestoneSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  title: z.string(),
  targetDate: z.string().optional(),
  weight: z.number().positive(),
  status: z.enum(["active", "completed"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const moodLogSchema = z.object({
  id: z.string(),
  date: z.string(),
  mood: z.enum(["Calmada", "Enfocada", "Alegre", "Cansada", "Abrumada"]),
  energy: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  factors: z.array(z.string()),
  note: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const journalEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  type: z.enum(["free", "gratitude", "weekly_review", "monthly_reset"]),
  title: z.string().optional(),
  text: z.string(),
  goalId: z.string().optional(),
  status: z.enum(["draft", "saved"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const plannerSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  profile: profileSchema.nullable(),
  lifeAreas: z.array(lifeAreaSchema),
  habits: z.array(habitSchema),
  habitLogs: z.array(habitLogSchema),
  tasks: z.array(taskSchema),
  goals: z.array(goalSchema),
  milestones: z.array(milestoneSchema),
  moodLogs: z.array(moodLogSchema),
  journalEntries: z.array(journalEntrySchema),
});

export const backupEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  data: plannerSnapshotSchema,
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type HabitFormInput = z.infer<typeof habitFormSchema>;
export type GoalFormInput = z.infer<typeof goalFormSchema>;

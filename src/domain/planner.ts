export type EntityStatus = "active" | "paused" | "completed" | "archived";
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
  date?: string;
  time?: string;
  estimatedMinutes?: number;
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
  status: "draft" | "saved";
  createdAt: string;
  updatedAt: string;
}

export interface PlannerSnapshot {
  schemaVersion: 1;
  profile: Profile | null;
  lifeAreas: LifeArea[];
  habits: Habit[];
  habitLogs: HabitLog[];
  tasks: Task[];
  goals: Goal[];
  milestones: Milestone[];
  moodLogs: MoodLog[];
  journalEntries: JournalEntry[];
}

export interface BackupEnvelope {
  schemaVersion: 1;
  exportedAt: string;
  data: PlannerSnapshot;
}

export function createEmptySnapshot(): PlannerSnapshot {
  return {
    schemaVersion: 1,
    profile: null,
    lifeAreas: [],
    habits: [],
    habitLogs: [],
    tasks: [],
    goals: [],
    milestones: [],
    moodLogs: [],
    journalEntries: [],
  };
}

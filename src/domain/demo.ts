import { addDays, subDays } from "date-fns";
import { toLocalDateKey } from "@/src/lib/dates";
import type {
  Goal,
  Habit,
  HabitLog,
  JournalEntry,
  LifeArea,
  Milestone,
  MoodLog,
  PlannerSnapshot,
  Profile,
  Task,
} from "./planner";

const areaNames = [
  ["Salud y bienestar", "sage"],
  ["Carrera", "rose"],
  ["Finanzas", "taupe"],
  ["Relaciones", "blush"],
  ["Hogar", "charcoal"],
  ["Crecimiento", "sage"],
  ["Proyectos creativos", "rose"],
  ["Experiencias", "taupe"],
] as const;

const id = () => crypto.randomUUID();

export interface DemoOptions {
  name: string;
  intention: string;
  weekStartsOn: 0 | 1;
  selectedAreaNames?: string[];
}

export function createDemoSnapshot(options: DemoOptions): PlannerSnapshot {
  const now = new Date();
  const timestamp = now.toISOString();
  const today = toLocalDateKey(now);
  const selected = new Set(options.selectedAreaNames ?? areaNames.map(([name]) => name));
  const lifeAreas: LifeArea[] = areaNames.map(([name, color], order) => ({
    id: id(),
    name,
    color,
    order,
    active: selected.has(name),
    currentScore: [7, 6, 5, 8, 7, 7, 6, 8][order] ?? 6,
    desiredScore: [9, 8, 8, 9, 8, 9, 8, 9][order] ?? 8,
    vision: [
      "Me muevo a diario, como con calma y cuido mi energía.",
      "Creo proyectos con propósito y trabajo con enfoque.",
      "Construyo seguridad y elijo con intención.",
      "Cultivo conversaciones presentes y tiempo de calidad.",
      "Mi hogar se siente simple, cálido y en orden.",
      "Aprendo, leo y pruebo algo que me expande.",
      "Doy forma a ideas útiles y bellas.",
      "Vivo experiencias que me conectan con el mundo.",
    ][order],
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  const areaId = (name: string) => lifeAreas.find((area) => area.name === name)?.id;

  const profile: Profile = {
    id: id(),
    name: options.name,
    intention: options.intention,
    dailyIntention: "Avanzar con calma y claridad.",
    startDate: today,
    weekStartsOn: options.weekStartsOn,
    priorityAreaIds: lifeAreas.filter((area) => area.active).slice(0, 3).map((area) => area.id),
    mainPriorities: ["Avanzar en el lanzamiento del planner", "Entrenamiento + movimiento", "Tiempo de calidad en familia"],
    theme: "light",
    baseCurrency: "COP",
    financePrivacy: false,
    onboardingCompleted: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const runningGoalId = id();
  const plannerGoalId = id();
  const launchProjectId = id();
  const goals: Goal[] = [
    {
      id: runningGoalId,
      title: "Completar 21K",
      reason: "Sentirme fuerte, ligera y capaz de sostener el proceso.",
      lifeAreaId: areaId("Salud y bienestar"),
      progressType: "milestones",
      targetDate: toLocalDateKey(addDays(now, 120)),
      priority: "high",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: plannerGoalId,
      title: "Lanzar la primera versión del planner",
      reason: "Convertir una idea útil en una experiencia real.",
      lifeAreaId: areaId("Proyectos creativos"),
      progressType: "manual",
      manualProgress: 46,
      targetDate: toLocalDateKey(addDays(now, 60)),
      priority: "high",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const milestones: Milestone[] = [
    ["Correr 10K con comodidad", "completed", 25],
    ["Alcanzar 15K continuos", "completed", 25],
    ["Completar una tirada de 18K", "active", 25],
    ["Cruzar la meta de 21K", "active", 25],
  ].map(([title, status, weight], index) => ({
    id: id(),
    goalId: runningGoalId,
    title: String(title),
    targetDate: toLocalDateKey(addDays(now, 21 + index * 21)),
    weight: Number(weight),
    status: status as "active" | "completed",
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const habits: Habit[] = [
    {
      id: id(),
      name: "Entrenamiento",
      description: "Movimiento que sostiene mi energía.",
      type: "boolean",
      scheduledDays: [1, 3, 5, 0],
      target: 1,
      unit: "sesión",
      lifeAreaId: areaId("Salud y bienestar"),
      goalId: runningGoalId,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      name: "Lectura",
      description: "Un espacio corto para aprender sin prisa.",
      type: "duration",
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      target: 20,
      unit: "min",
      lifeAreaId: areaId("Crecimiento"),
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      name: "Planificación nocturna",
      type: "boolean",
      scheduledDays: [0, 1, 2, 3, 4],
      target: 1,
      unit: "check",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      name: "Pausa de comida",
      type: "boolean",
      scheduledDays: [1, 2, 3, 4, 5],
      target: 1,
      unit: "pausa",
      lifeAreaId: areaId("Salud y bienestar"),
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const habitLogs: HabitLog[] = [];
  habits.forEach((habit, habitIndex) => {
    for (let offset = 1; offset <= 8; offset += 1) {
      const date = subDays(now, offset);
      const shouldLog = habit.scheduledDays.includes(date.getDay()) && (offset + habitIndex) % 4 !== 0;
      if (shouldLog) {
        habitLogs.push({
          id: id(),
          habitId: habit.id,
          date: toLocalDateKey(date),
          value: habit.target,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }
  });

  const tasks: Task[] = [
    {
      id: id(),
      title: "Preparar la semana con tres prioridades",
      date: today,
      priority: "high",
      status: "planned",
      estimatedMinutes: 20,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      title: "Correr 8K suave",
      date: today,
      priority: "high",
      status: "planned",
      estimatedMinutes: 55,
      goalId: runningGoalId,
      lifeAreaId: areaId("Salud y bienestar"),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      title: "Revisar el flujo del Dashboard",
      date: today,
      priority: "medium",
      status: "planned",
      estimatedMinutes: 45,
      goalId: plannerGoalId,
      projectId: launchProjectId,
      lifeAreaId: areaId("Proyectos creativos"),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      title: "Llamar a mamá",
      date: toLocalDateKey(addDays(now, 1)),
      priority: "medium",
      status: "planned",
      lifeAreaId: areaId("Relaciones"),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      title: "Transferir ahorro del mes",
      date: toLocalDateKey(subDays(now, 1)),
      priority: "medium",
      status: "planned",
      lifeAreaId: areaId("Finanzas"),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const moodLogs: MoodLog[] = [
    {
      id: id(),
      date: toLocalDateKey(subDays(now, 1)),
      mood: "Calmada",
      energy: 4,
      factors: ["Sueño", "Movimiento"],
      note: "Menos tareas y más foco hicieron la diferencia.",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const journalEntries: JournalEntry[] = [
    {
      id: id(),
      date: toLocalDateKey(subDays(now, 2)),
      type: "weekly_review",
      title: "Lo que sí avanzó",
      text: "Cuando elijo tres prioridades realistas, termino la semana con más claridad y menos ruido.",
      status: "saved",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const projects: PlannerSnapshot["projects"] = [
    {
      id: launchProjectId,
      name: "Lanzamiento del planner",
      outcome: "Publicar una primera versión útil y probarla con personas reales.",
      lifeAreaId: areaId("Proyectos creativos"),
      goalId: plannerGoalId,
      targetDate: toLocalDateKey(addDays(now, 60)),
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const incomeCategoryId = id();
  const homeCategoryId = id();
  const wellbeingCategoryId = id();
  const savingsCategoryId = id();
  const debtCategoryId = id();
  const travelFundId = id();
  const cardDebtId = id();
  const monthKey = today.slice(0, 7);
  const budgetId = id();

  const financeCategories: PlannerSnapshot["financeCategories"] = [
    { id: incomeCategoryId, name: "Ingresos", type: "income", active: true, createdAt: timestamp, updatedAt: timestamp },
    { id: homeCategoryId, name: "Hogar", type: "expense", active: true, createdAt: timestamp, updatedAt: timestamp },
    { id: wellbeingCategoryId, name: "Bienestar", type: "expense", active: true, createdAt: timestamp, updatedAt: timestamp },
    { id: savingsCategoryId, name: "Ahorro viaje", type: "savings", active: true, createdAt: timestamp, updatedAt: timestamp },
    { id: debtCategoryId, name: "Pago de deuda", type: "debt", active: true, createdAt: timestamp, updatedAt: timestamp },
  ];

  const monthlyBudgets: PlannerSnapshot["monthlyBudgets"] = [
    { id: budgetId, monthKey, plannedIncome: 8_500_000, notes: "Un plan flexible para elegir con claridad.", status: "active", createdAt: timestamp, updatedAt: timestamp },
  ];

  const budgetLines: PlannerSnapshot["budgetLines"] = [
    { id: id(), budgetId, categoryId: homeCategoryId, plannedAmount: 3_200_000, createdAt: timestamp, updatedAt: timestamp },
    { id: id(), budgetId, categoryId: wellbeingCategoryId, plannedAmount: 1_100_000, createdAt: timestamp, updatedAt: timestamp },
    { id: id(), budgetId, categoryId: savingsCategoryId, plannedAmount: 1_500_000, createdAt: timestamp, updatedAt: timestamp },
    { id: id(), budgetId, categoryId: debtCategoryId, plannedAmount: 600_000, createdAt: timestamp, updatedAt: timestamp },
  ];

  const transactions: PlannerSnapshot["transactions"] = [
    { id: id(), type: "income", amount: 8_500_000, date: `${monthKey}-01`, categoryId: incomeCategoryId, note: "Ingreso del mes", status: "active", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), type: "expense", amount: 2_460_000, date: `${monthKey}-03`, categoryId: homeCategoryId, note: "Gastos del hogar", status: "active", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), type: "expense", amount: 620_000, date: `${monthKey}-06`, categoryId: wellbeingCategoryId, note: "Bienestar y movimiento", status: "active", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), type: "contribution", amount: 1_200_000, date: `${monthKey}-07`, categoryId: savingsCategoryId, fundId: travelFundId, note: "Aporte al viaje", status: "active", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), type: "debt_payment", amount: 600_000, date: `${monthKey}-08`, categoryId: debtCategoryId, debtId: cardDebtId, note: "Pago mensual", status: "active", createdAt: timestamp, updatedAt: timestamp },
  ];

  const savingsFunds: PlannerSnapshot["savingsFunds"] = [
    { id: travelFundId, name: "Viaje familiar", targetAmount: 13_000_000, initialAmount: 6_050_000, targetDate: toLocalDateKey(addDays(now, 240)), status: "active", createdAt: timestamp, updatedAt: timestamp },
  ];

  const debts: PlannerSnapshot["debts"] = [
    { id: cardDebtId, name: "Tarjeta de estudio", initialBalance: 4_800_000, informativeRate: 22.4, minimumPayment: 450_000, dueDay: 18, status: "active", createdAt: timestamp, updatedAt: timestamp },
  ];

  return {
    schemaVersion: 2,
    profile,
    lifeAreas,
    habits,
    habitLogs,
    tasks,
    goals,
    milestones,
    moodLogs,
    journalEntries,
    projects,
    periodPlans: [],
    reviews: [],
    financialProfiles: [{ id: id(), baseCurrency: "COP", privacyMode: false, monthStartsOn: 1, status: "active", createdAt: timestamp, updatedAt: timestamp }],
    financialAccounts: [],
    financeCategories,
    monthlyBudgets,
    budgetLines,
    transactions,
    savingsFunds,
    debts,
    recurringItems: [
      { id: id(), name: "Aporte viaje", type: "contribution", amount: 1_200_000, dayOfMonth: 7, categoryId: savingsCategoryId, fundId: travelFundId, active: true, createdAt: timestamp, updatedAt: timestamp },
      { id: id(), name: "Pago tarjeta", type: "debt_payment", amount: 600_000, dayOfMonth: 18, categoryId: debtCategoryId, debtId: cardDebtId, active: true, createdAt: timestamp, updatedAt: timestamp },
    ],
    financialReviews: [],
  };
}

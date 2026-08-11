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
    usePurpose: "Convertir mi visión en acciones sostenibles sin perder mi bienestar.",
    dailyIntention: "Avanzar con calma y claridad.",
    startDate: today,
    weekStartsOn: options.weekStartsOn,
    priorityAreaIds: lifeAreas.filter((area) => area.active).slice(0, 3).map((area) => area.id),
    mainPriorities: ["Avanzar en el lanzamiento del planner", "Entrenamiento + movimiento", "Tiempo de calidad en familia"],
    theme: "light",
    baseCurrency: "COP",
    financePrivacy: false,
    fitnessEnabled: false,
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
  const primaryAccountId = id();
  const cashAccountId = id();

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
    { id: id(), type: "income", amount: 8_500_000, date: `${monthKey}-01`, categoryId: incomeCategoryId, accountId: primaryAccountId, note: "Ingreso del mes", status: "active", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), type: "expense", amount: 2_460_000, date: `${monthKey}-03`, categoryId: homeCategoryId, accountId: primaryAccountId, note: "Gastos del hogar", status: "active", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), type: "expense", amount: 620_000, date: `${monthKey}-06`, categoryId: wellbeingCategoryId, accountId: primaryAccountId, note: "Bienestar y movimiento", status: "active", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), type: "contribution", amount: 1_200_000, date: `${monthKey}-07`, categoryId: savingsCategoryId, accountId: primaryAccountId, fundId: travelFundId, note: "Aporte al viaje", status: "active", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), type: "debt_payment", amount: 600_000, date: `${monthKey}-08`, categoryId: debtCategoryId, accountId: primaryAccountId, debtId: cardDebtId, note: "Pago mensual", status: "active", createdAt: timestamp, updatedAt: timestamp },
  ];

  const savingsFunds: PlannerSnapshot["savingsFunds"] = [
    { id: travelFundId, name: "Viaje familiar", targetAmount: 13_000_000, initialAmount: 6_050_000, targetDate: toLocalDateKey(addDays(now, 240)), status: "active", createdAt: timestamp, updatedAt: timestamp },
  ];

  const debts: PlannerSnapshot["debts"] = [
    { id: cardDebtId, name: "Tarjeta de estudio", initialBalance: 4_800_000, informativeRate: 22.4, minimumPayment: 450_000, dueDay: 18, status: "active", createdAt: timestamp, updatedAt: timestamp },
  ];

  const currentYear = now.getFullYear();
  const cascadePlans: PlannerSnapshot["cascadePlans"] = [
    {
      id: id(),
      horizon: "pathways",
      periodKey: "vision",
      intention: "Elegir los caminos que acercan mi vida diaria a mi Dream Life.",
      priority: "Bienestar, libertad y un proyecto con propósito",
      objectives: ["Cuidar mi energía", "Crear con constancia", "Construir libertad financiera"],
      activities: [],
      suggestion: "Cada camino debe convertirse en una decisión visible en tu agenda.",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      horizon: "three_years",
      periodKey: String(currentYear + 3),
      intention: "Vivir de un proyecto sostenible, con tiempo para mi salud y mi familia.",
      priority: "Consolidar una vida que se sienta tan bien como se ve",
      objectives: ["Negocio rentable", "21K con bienestar", "Fondo familiar completo"],
      activities: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      horizon: "annual",
      periodKey: String(currentYear),
      intention: "Construir la base con enfoque y calma.",
      priority: "Lanzar, validar y sostener",
      objectives: ["Lanzar el planner", "Completar 21K", "Ahorrar para el viaje"],
      activities: [
        { id: id(), title: "Lanzamiento del planner", date: `${currentYear}-10-15`, type: "event" },
      ],
      suggestion: "Protege una prioridad principal por trimestre.",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      horizon: "six_months",
      periodKey: `${currentYear}-H2`,
      intention: "Convertir avances dispersos en sistemas sostenibles.",
      priority: "Validar el producto y cuidar mi energía",
      objectives: ["Primera versión publicada", "Rutina de entrenamiento estable", "20% más de ahorro"],
      activities: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      horizon: "quarterly",
      periodKey: `${currentYear}-Q3`,
      intention: "Construir la base del siguiente nivel.",
      priority: "Completar el MVP",
      objectives: ["Flujo principal terminado", "Pruebas con cinco personas", "Plan de lanzamiento"],
      activities: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      horizon: "monthly",
      periodKey: monthKey,
      intention: "Avanzar con intención, sin llenar cada espacio.",
      priority: "Terminar la experiencia esencial",
      objectives: ["Cerrar Dashboard", "Completar cuatro entrenamientos semanales", "Revisar el presupuesto"],
      activities: [
        { id: id(), title: "Revisión mensual", date: `${monthKey}-28`, type: "event" },
      ],
      suggestion: "Deja una semana con menos carga para integrar y ajustar.",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      horizon: "weekly",
      periodKey: `${currentYear}-W33`,
      intention: "Hacer menos, pero terminar lo importante.",
      priority: "Probar el flujo principal",
      objectives: ["Una prueba completa", "Tres entrenamientos", "Una tarde libre"],
      activities: [],
      suggestion: "La semana anterior avanzaste mejor cuando reservaste bloques de enfoque.",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: id(),
      horizon: "daily",
      periodKey: today,
      intention: "Avanzar con calma y claridad.",
      priority: "Revisar el flujo del Dashboard",
      objectives: ["Bloque de enfoque", "Mover el cuerpo", "Cerrar el día con una nota"],
      activities: [
        { id: id(), title: "Bloque de enfoque", date: today, type: "activity" },
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const projectChecklistItems: PlannerSnapshot["projectChecklistItems"] = [
    { id: id(), projectId: launchProjectId, title: "Definir alcance del MVP", completed: true, createdAt: timestamp, updatedAt: timestamp },
    { id: id(), projectId: launchProjectId, title: "Probar el flujo principal", completed: false, createdAt: timestamp, updatedAt: timestamp },
    { id: id(), projectId: launchProjectId, title: "Preparar lanzamiento", completed: false, createdAt: timestamp, updatedAt: timestamp },
  ];

  const brainDumpItems: PlannerSnapshot["brainDumpItems"] = [
    { id: id(), title: "Aprender fotografía con el celular", type: "want_to_learn", tentativeDate: toLocalDateKey(addDays(now, 18)), priority: "low", status: "idea", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), title: "Comprar tenis para entrenamiento", type: "shopping", tentativeDate: toLocalDateKey(addDays(now, 9)), priority: "medium", status: "idea", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), title: "Leer Hábitos atómicos", type: "want_to_read", priority: "medium", status: "planned", createdAt: timestamp, updatedAt: timestamp },
  ];

  const routines: PlannerSnapshot["routines"] = [
    { id: id(), name: "Rutina AM", period: "am", scheduledDays: [1, 2, 3, 4, 5], steps: [{ id: id(), title: "Agua y luz natural" }, { id: id(), title: "Escribir mis Top 3" }], status: "active", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), name: "Pausa de la tarde", period: "afternoon", scheduledDays: [1, 2, 3, 4, 5], steps: [{ id: id(), title: "Caminar diez minutos" }], status: "active", createdAt: timestamp, updatedAt: timestamp },
    { id: id(), name: "Rutina PM", period: "pm", scheduledDays: [0, 1, 2, 3, 4, 5, 6], steps: [{ id: id(), title: "Preparar mañana" }, { id: id(), title: "Leer sin pantalla" }], status: "active", createdAt: timestamp, updatedAt: timestamp },
  ];

  return {
    schemaVersion: 3,
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
    financialAccounts: [
      { id: primaryAccountId, name: "Banco principal", type: "bank", initialBalance: 5_600_000, status: "active", createdAt: timestamp, updatedAt: timestamp },
      { id: cashAccountId, name: "Efectivo", type: "cash", initialBalance: 350_000, status: "active", createdAt: timestamp, updatedAt: timestamp },
    ],
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
    projectChecklistItems,
    cascadePlans,
    brainDumpItems,
    routines,
    events: [
      { id: id(), title: "Cita médica", startDate: toLocalDateKey(addDays(now, 5)), time: "09:30", category: "medical", createdAt: timestamp, updatedAt: timestamp },
      { id: id(), title: "Cumpleaños de Ana", startDate: toLocalDateKey(addDays(now, 12)), category: "birthday", createdAt: timestamp, updatedAt: timestamp },
    ],
    visionBoardItems: [
      { id: id(), type: "quote", content: "Pequeñas acciones diarias crean grandes cambios.", caption: "Mi recordatorio de hoy", reminderEnabled: true, createdAt: timestamp, updatedAt: timestamp },
    ],
    workoutLogs: [
      { id: id(), date: today, weekKey: `${currentYear}-W33`, goal: "Fuerza y constancia", exercises: [{ id: id(), name: "Sentadilla", sets: 3, reps: 10, weight: 30 }, { id: id(), name: "Remo", sets: 3, reps: 12, weight: 18 }], createdAt: timestamp, updatedAt: timestamp },
    ],
    nutritionLogs: [
      { id: id(), date: today, meals: [{ id: id(), name: "Comida 1", calories: 420, protein: 28, carbs: 45, fat: 14 }, { id: id(), name: "Snack", calories: 180, protein: 12, carbs: 22, fat: 5 }], createdAt: timestamp, updatedAt: timestamp },
    ],
    bodyCheckIns: [
      { id: id(), date: today, weight: 62.4, measurements: { cintura: 72, cadera: 96 }, createdAt: timestamp, updatedAt: timestamp },
    ],
    challenges: [
      { id: id(), title: "Pierde el miedo", type: "fear", intention: "Hacer una acción valiente cada semana.", startDate: today, completedDates: [], status: "active", createdAt: timestamp, updatedAt: timestamp },
      { id: id(), title: "Reto no sugar", type: "no_sugar", intention: "Observar mi energía durante 14 días.", startDate: today, endDate: toLocalDateKey(addDays(now, 14)), completedDates: [], status: "active", createdAt: timestamp, updatedAt: timestamp },
    ],
    pendingPurchases: [
      { id: id(), title: "Curso de ilustración", estimatedAmount: 850_000, accountId: primaryAccountId, tentativeDate: toLocalDateKey(addDays(now, 25)), priority: "medium", status: "pending", createdAt: timestamp, updatedAt: timestamp },
    ],
  };
}

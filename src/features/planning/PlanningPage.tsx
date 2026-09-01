"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, CalendarDays, Check, ChevronRight, Circle, Clock3, Edit3, ListChecks, Plus, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import type { CascadePlan, PlannerSnapshot } from "@/src/domain/planner";
import { monthlyBrainDumpSummary, weeklyPlanningInsight } from "@/src/domain/cascadeRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatShortDay, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { cascadePlanFormSchema } from "@/src/lib/schemas";
import { buildYearMonthSlots, monthPeriodKey, parseAreaGoals, serializeAreaGoals } from "@/src/domain/monthPlanning";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";
import type { UserAccess } from "@/src/domain/access";
import { canAccessFeature } from "@/src/domain/access";
import { PremiumFeatureGate } from "@/src/components/access/PremiumFeatureGate";

type PlanningView = "year" | "month" | "week" | "day" | "reset";
type LongTermMode = "five" | "three";

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const fiveYearAreas = [["wellbeing", "Bienestar"], ["career", "Carrera y propósito"], ["finances", "Finanzas"], ["relationships", "Relaciones"], ["lifestyle", "Estilo de vida"]] as const;

type MonthDraft = {
  month: string;
  year: string;
  focus: string;
  priorities: string[];
  linkedPriority: string;
  areaIds: string[];
  areaGoals: Record<string, string>;
  actions: MonthEntryDraft[];
  importantDates: MonthEntryDraft[];
  status: "draft" | "active" | "closed";
};

type MonthEntryDraft = { title: string; date: string };

const emptyEntry = (): MonthEntryDraft => ({ title: "", date: "" });
const emptyMonthDraft = (date = new Date()): MonthDraft => ({ month: String(date.getMonth() + 1), year: String(date.getFullYear()), focus: "", priorities: ["", "", ""], linkedPriority: "", areaIds: [], areaGoals: {}, actions: [emptyEntry()], importantDates: [emptyEntry()], status: "active" });
const monthDraftFromPlan = (plan: CascadePlan): MonthDraft => {
  const actions = plan.activities.filter((activity) => activity.type !== "event").map((activity) => ({ title: activity.title, date: activity.date ?? "" }));
  const importantDates = plan.activities.filter((activity) => activity.type === "event").map((activity) => ({ title: activity.title, date: activity.date ?? "" }));
  return { month: String(Number(plan.periodKey.slice(5, 7))), year: plan.periodKey.slice(0, 4), focus: plan.intention, priorities: [...plan.objectives.slice(0, 3), "", ""].slice(0, 3), linkedPriority: plan.details?.linkedThreeYearPriority ?? "", areaIds: plan.areaIds ?? [], areaGoals: parseAreaGoals(plan.details?.areaGoals), actions: actions.length ? actions : [emptyEntry()], importantDates: importantDates.length ? importantDates : [emptyEntry()], status: plan.status ?? "active" };
};
const monthDate = (periodKey: string) => new Date(`${periodKey}-01T12:00:00`);
const monthProgress = (plan: CascadePlan) => plan.objectives.length ? Math.round(((plan.completedObjectiveIndexes?.length ?? 0) / plan.objectives.length) * 100) : 0;

function monthState(plan: CascadePlan, todayKey: string) {
  const currentMonth = todayKey.slice(0, 7);
  if (plan.status === "closed") return { label: "Cerrado", tone: "neutral" as const };
  if (plan.periodKey === currentMonth) return { label: "Mes actual", tone: "rose" as const };
  if (plan.status === "draft") return { label: "Borrador", tone: "warm" as const };
  return { label: "Plan guardado", tone: "sage" as const };
}

export function PlanningPage({ planner, access, initialView = "year" }: { planner: PlannerController; access: UserAccess; initialView?: PlanningView }) {
  const { snapshot } = planner;
  const location = useLocation();
  const todayKey = toLocalDateKey(new Date());
  const requestedView = new URLSearchParams(location.search).get("view") as PlanningView | null;
  const createMonthRequested = new URLSearchParams(location.search).get("create") === "month";
  const requestedGoalId = new URLSearchParams(location.search).get("goal");
  const requestedGoal = snapshot.goals.find((goal) => goal.id === requestedGoalId);
  const requestedMonthPlan = snapshot.cascadePlans.find((plan) => plan.horizon === "monthly" && plan.periodKey === todayKey.slice(0, 7));
  const firstView = requestedView && ["year", "month", "week", "day", "reset"].includes(requestedView) ? requestedView : initialView === "month" ? "year" : initialView;
  const [view, setView] = useState<PlanningView>(firstView);
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthModalOpen, setMonthModalOpen] = useState(createMonthRequested);
  const [editingMonthId, setEditingMonthId] = useState<string | null>(createMonthRequested ? requestedMonthPlan?.id ?? null : null);
  const [monthDraft, setMonthDraft] = useState<MonthDraft>(() => {
    if (createMonthRequested && requestedMonthPlan) return monthDraftFromPlan(requestedMonthPlan);
    const draft = emptyMonthDraft();
    if (requestedGoal) { draft.focus = requestedGoal.title; draft.priorities[0] = requestedGoal.title; }
    return draft;
  });
  const [monthError, setMonthError] = useState("");
  const [longTermMode, setLongTermMode] = useState<LongTermMode | null>(null);
  const [longTermSummary, setLongTermSummary] = useState("");
  const [longTermPriorities, setLongTermPriorities] = useState(["", "", ""]);
  const [fiveYearDetails, setFiveYearDetails] = useState<Record<string, string>>({});
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskFocusPriority, setTaskFocusPriority] = useState<"" | "1" | "2" | "3">("");
  const [monthMode, setMonthMode] = useState<"calendar" | "agenda">("calendar");
  const [monthlyReset, setMonthlyReset] = useState({ advanced: "", learned: "", release: "", adjust: "", next: "" });
  const [monthlyResetSaved, setMonthlyResetSaved] = useState(false);
  const [weeklyResetOpen, setWeeklyResetOpen] = useState(new URLSearchParams(location.search).get("reset") === "1");
  const [weeklyReset, setWeeklyReset] = useState({ celebrate: "", release: "", adjust: "", priorities: ["", "", ""] });
  const [weeklyResetSaved, setWeeklyResetSaved] = useState(false);
  const [weekDetailsOpen, setWeekDetailsOpen] = useState(false);
  const [reflection, setReflection] = useState({ advanced: "", pending: "", next: "" });
  const [reflectionSaved, setReflectionSaved] = useState(false);

  const fiveYearPlan = snapshot.cascadePlans.find((plan) => plan.horizon === "pathways");
  const threeYearPlan = snapshot.cascadePlans.find((plan) => plan.horizon === "three_years");
  const monthPlans = useMemo(() => snapshot.cascadePlans.filter((plan) => plan.horizon === "monthly").sort((a, b) => a.periodKey.localeCompare(b.periodKey)), [snapshot.cascadePlans]);
  const monthSlots = useMemo(() => buildYearMonthSlots(selectedYear, monthPlans), [monthPlans, selectedYear]);
  const selectedMonthPlan = monthPlans.find((plan) => plan.id === selectedMonthId);
  const weekDates = getWeekDates(anchorDate, snapshot.profile?.weekStartsOn ?? 1);
  const weeklyInsight = weeklyPlanningInsight(snapshot);
  const brainSummary = monthlyBrainDumpSummary(snapshot, format(anchorDate, "yyyy-MM"));
  const monthlyContext = snapshot.cascadePlans.find((plan) => plan.horizon === "monthly" && plan.periodKey === format(anchorDate, "yyyy-MM"));
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearRange = Array.from({ length: 16 }, (_, index) => currentYear - 5 + index);
    return Array.from(new Set([...yearRange, ...monthPlans.map((plan) => Number(plan.periodKey.slice(0, 4)))] )).sort((a, b) => a - b);
  }, [monthPlans]);
  const calendarDates = useMemo(() => {
    const weekStartsOn = snapshot.profile?.weekStartsOn ?? 1;
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(anchorDate), { weekStartsOn }), end: endOfWeek(endOfMonth(anchorDate), { weekStartsOn }) });
  }, [anchorDate, snapshot.profile?.weekStartsOn]);

  useEffect(() => {
    if (!selectedMonthPlan) return;
    queueMicrotask(() => {
      setAnchorDate(monthDate(selectedMonthPlan.periodKey));
      setReflection({ advanced: selectedMonthPlan.reflection?.advanced ?? "", pending: selectedMonthPlan.reflection?.pending ?? "", next: selectedMonthPlan.reflection?.next ?? "" });
      setReflectionSaved(false);
    });
  }, [selectedMonthPlan]);

  useEffect(() => { if (new URLSearchParams(location.search).get("reset") === "1") queueMicrotask(() => setWeeklyResetOpen(true)); }, [location.search]);
  useEffect(() => { if (window.matchMedia("(max-width: 700px)").matches) queueMicrotask(() => setMonthMode("agenda")); }, []);

  const openLongTerm = (mode: LongTermMode) => {
    if (mode === "five" && !canAccessFeature(access, "five_year_planning")) return;
    const plan = mode === "five" ? fiveYearPlan : threeYearPlan;
    setLongTermMode(mode);
    setLongTermSummary(plan?.intention ?? "");
    setLongTermPriorities([...(plan?.objectives.slice(0, 3) ?? []), "", ""].slice(0, 3));
    setFiveYearDetails(plan?.details ?? {});
  };

  const saveLongTerm = async (event: FormEvent) => {
    event.preventDefault();
    if (!longTermMode) return;
    if (longTermMode === "five" && !canAccessFeature(access, "five_year_planning")) return;
    const existing = longTermMode === "five" ? fiveYearPlan : threeYearPlan;
    const priorities = longTermPriorities.map((item) => item.trim()).filter(Boolean);
    await planner.saveCascadePlan({ horizon: longTermMode === "five" ? "pathways" : "three_years", periodKey: existing?.periodKey ?? (longTermMode === "five" ? "five-year-vision" : "three-year-priorities"), intention: longTermSummary, priority: priorities[0] ?? "", objectives: priorities, activities: existing?.activities.map(({ title, date, type }) => ({ title, date, type })) ?? [], areaIds: existing?.areaIds ?? [], details: longTermMode === "five" ? fiveYearDetails : existing?.details, status: "active" });
    setLongTermMode(null);
  };

  const openCreateMonth = (year = selectedYear, monthIndex = new Date().getMonth()) => {
    setEditingMonthId(null);
    setMonthDraft(emptyMonthDraft(new Date(year, monthIndex, 1)));
    setMonthError("");
    setMonthModalOpen(true);
  };

  const openEditMonth = (plan: CascadePlan) => {
    setEditingMonthId(plan.id);
    setMonthDraft(monthDraftFromPlan(plan));
    setMonthError("");
    setMonthModalOpen(true);
  };

  const saveMonth = async (event: FormEvent) => {
    event.preventDefault();
    setMonthError("");
    const periodKey = `${monthDraft.year}-${monthDraft.month.padStart(2, "0")}`;
    if (monthPlans.some((plan) => plan.periodKey === periodKey && plan.id !== editingMonthId)) {
      setMonthError("Ese mes ya existe. Puedes abrirlo y editarlo desde Mis meses.");
      return;
    }
    const priorities = monthDraft.priorities.map((item) => item.trim()).filter(Boolean).slice(0, 3);
    const activities = [
      ...monthDraft.actions.filter((item) => item.title.trim()).map((item) => ({ title: item.title.trim(), date: item.date || undefined, type: "activity" as const })),
      ...monthDraft.importantDates.filter((item) => item.title.trim()).map((item) => ({ title: item.title.trim(), date: item.date || undefined, type: "event" as const })),
    ];
    const areaGoals = serializeAreaGoals(monthDraft.areaGoals);
    if (!monthDraft.focus.trim() && !priorities.length && !activities.length && !areaGoals && !monthDraft.linkedPriority) {
      setMonthError("Añade al menos un enfoque, prioridad, objetivo por área, acción o fecha importante.");
      return;
    }
    const existingDetails = editingMonthId ? monthPlans.find((plan) => plan.id === editingMonthId)?.details : undefined;
    const details = {
      ...(existingDetails?.sourceGoalId ? { sourceGoalId: existingDetails.sourceGoalId, sourceGoalTitle: existingDetails.sourceGoalTitle ?? "" } : {}),
      ...(monthDraft.linkedPriority ? { linkedThreeYearPriority: monthDraft.linkedPriority } : {}),
      ...(areaGoals ? { areaGoals } : {}),
      ...(requestedGoal ? { sourceGoalId: requestedGoal.id, sourceGoalTitle: requestedGoal.title } : {}),
    };
    const parsed = cascadePlanFormSchema.safeParse({ horizon: "monthly", periodKey, parentPlanId: threeYearPlan?.id, intention: monthDraft.focus, priority: priorities[0] ?? "", objectives: priorities, activities, areaIds: monthDraft.areaIds, details, status: monthDraft.status });
    if (!parsed.success) { setMonthError("Revisa los datos del mes e inténtalo de nuevo."); return; }
    const next = await planner.saveCascadePlan(parsed.data);
    const savedPlan = next.cascadePlans.find((plan) => plan.horizon === "monthly" && plan.periodKey === periodKey);
    setSelectedYear(Number(monthDraft.year));
    if (editingMonthId && selectedMonthId === editingMonthId && savedPlan) setSelectedMonthId(savedPlan.id);
    setMonthModalOpen(false);
  };

  const openMonthDetail = (plan: CascadePlan) => { setSelectedMonthId(plan.id); setAnchorDate(monthDate(plan.periodKey)); setView("month"); };

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    const focusPriority = taskFocusPriority ? Number(taskFocusPriority) as 1 | 2 | 3 : undefined;
    const occupied = focusPriority && snapshot.tasks.find((task) => task.date === selectedDate && task.focusPriority === focusPriority && task.status !== "completed" && task.status !== "cancelled");
    if (occupied && !window.confirm(`Ya tienes una prioridad ${focusPriority}: “${occupied.title}”. ¿Quieres reemplazarla?`)) return;
    await planner.createTaskDetailed({ title: taskTitle, date: selectedDate, time: taskTime || undefined, priority: "medium", focusPriority });
    setTaskTitle(""); setTaskTime(""); setTaskFocusPriority(""); setWeekDetailsOpen(false);
  };

  const saveReflection = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedMonthPlan) return;
    await planner.saveCascadePlan({ horizon: "monthly", periodKey: selectedMonthPlan.periodKey, parentPlanId: selectedMonthPlan.parentPlanId, intention: selectedMonthPlan.intention, priority: selectedMonthPlan.priority, objectives: selectedMonthPlan.objectives, activities: selectedMonthPlan.activities.map(({ title, date, type }) => ({ title, date, type })), areaIds: selectedMonthPlan.areaIds ?? [], details: selectedMonthPlan.details, reflection, status: selectedMonthPlan.status });
    setReflectionSaved(true);
  };

  const saveReset = async () => {
    if (!monthlyReset.advanced.trim()) return;
    const summary = Object.values(monthlyReset).filter(Boolean).join(" · ");
    await planner.saveJournal(summary, { type: "monthly_reset", title: `Reset mensual · ${format(anchorDate, "MMMM yyyy", { locale: es })}` });
    await planner.saveStructuredReview("monthly", monthlyReset, [monthlyReset.adjust, monthlyReset.next]);
    setMonthlyResetSaved(true);
  };

  const updateMonthEntry = (group: "actions" | "importantDates", index: number, patch: Partial<MonthEntryDraft>) => {
    setMonthDraft((current) => ({ ...current, [group]: current[group].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  };

  const addMonthEntry = (group: "actions" | "importantDates") => {
    setMonthDraft((current) => ({ ...current, [group]: [...current[group], emptyEntry()] }));
  };

  return <div className="page-stack cascade-page planning-v2">
    <SectionNavigation section="plan" />
    {view === "year" && <PlanningOverview access={access} snapshot={snapshot} fiveYearPlan={fiveYearPlan} threeYearPlan={threeYearPlan} monthSlots={monthSlots} selectedYear={selectedYear} availableYears={availableYears} todayKey={todayKey} onYearChange={setSelectedYear} onAddPlan={(periodKey) => openCreateMonth(Number(periodKey.slice(0, 4)), Number(periodKey.slice(5, 7)) - 1)} onEditLongTerm={openLongTerm} onOpenMonth={openMonthDetail} onEditMonth={openEditMonth} onOpenWeek={() => setView("week")} onOpenDay={() => setView("day")} onOpenReset={() => setView("reset")} />}

    {view === "month" && selectedMonthPlan && <MonthDetail plan={selectedMonthPlan} snapshot={snapshot} todayKey={todayKey} anchorDate={anchorDate} calendarDates={calendarDates} monthMode={monthMode} reflection={reflection} reflectionSaved={reflectionSaved} onBack={() => { setView("year"); setSelectedMonthId(null); }} onEdit={() => openEditMonth(selectedMonthPlan)} onDelete={async () => { if (!window.confirm(`¿Eliminar ${format(monthDate(selectedMonthPlan.periodKey), "MMMM yyyy", { locale: es })}? Esta acción no elimina tus tareas ni eventos.`)) return; await planner.deleteCascadePlan(selectedMonthPlan.id); setSelectedMonthId(null); setView("year"); }} onMonthMode={setMonthMode} onSelectDay={(key) => { setSelectedDate(key); setView("day"); }} onTogglePriority={(index) => planner.toggleCascadeObjective(selectedMonthPlan.id, index)} onReflectionChange={(next) => { setReflection(next); setReflectionSaved(false); }} onSaveReflection={saveReflection} onPlanWeek={() => setView("week")} />}
    {view === "month" && !selectedMonthPlan && <EmptyState title="Elige un mes" text="Vuelve a Mis meses para abrir el periodo que quieres planificar." action={<Button onClick={() => setView("year")}>Volver a Mis meses</Button>} />}

    {view === "week" && <>
      <PlanningSubheader title="Plan semanal" description="Elige tus prioridades y ubícalas en días reales, con margen para ajustar." onBack={() => setView("year")} />
      <div className="weekly-planner-assistant"><Card><p className="eyebrow">Así te fue la semana pasada</p><strong>{weeklyInsight.completionRate}% completado</strong><p>{weeklyInsight.summary}</p></Card><Card><Sparkles size={20} /><p className="eyebrow">Sugerencia para esta semana</p><strong>{weeklyInsight.suggestion}</strong></Card><Card className="weekly-brain-dump"><p className="eyebrow">Ubica tus ideas pendientes</p>{snapshot.brainDumpItems.filter((item) => item.status === "idea").slice(0, 3).map((item, index) => { const target = weekDates[Math.min(index + 1, 6)]; return <div key={item.id}><span>{item.title}</span><Button type="button" variant="secondary" onClick={() => planner.scheduleBrainDumpItem(item.id, toLocalDateKey(target))}>Poner {formatShortDay(target)}</Button></div>; })}{!snapshot.brainDumpItems.some((item) => item.status === "idea") && <p>No hay ideas pendientes por ubicar.</p>}</Card></div>
      <Card className="week-context-card"><header><div><p className="eyebrow">Lo que llega desde el mes</p><h2>Esto es lo que tu mes está enviando a esta semana</h2></div><CalendarDays size={22} /></header>{monthlyContext ? <div className="week-context-focus"><strong>{monthlyContext.priority || monthlyContext.intention || "Un mes con espacio"}</strong><p>{monthlyContext.intention}</p><ul>{monthlyContext.objectives.slice(0, 3).map((objective) => <li key={objective}>{objective}</li>)}</ul></div> : <p>Este mes todavía no tiene una prioridad definida. Puedes preparar la semana y completar el mes después.</p>}<div className="week-context-metrics"><article><strong>{snapshot.goals.filter((goal) => goal.status === "active").length}</strong><span>Metas activas</span><small>Direcciones abiertas</small></article><article><strong>{snapshot.events.filter((event) => weekDates.some((date) => event.startDate === toLocalDateKey(date))).length}</strong><span>Eventos</span><small>Compromisos de esta semana</small></article><article><strong>{snapshot.tasks.filter((task) => task.date && weekDates.some((date) => task.date === toLocalDateKey(date)) && task.status !== "completed").length}</strong><span>Pendientes</span><small>Acciones ya ubicadas</small></article></div></Card>
      <form className={`planning-add ${weekDetailsOpen ? "is-expanded" : ""}`} onSubmit={addTask}><Plus size={19} /><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="¿Qué quieres hacer esta semana?" aria-label="Nueva tarea semanal" /><Button type="submit">Añadir</Button><button type="button" className="planning-add__details" aria-expanded={weekDetailsOpen} onClick={() => setWeekDetailsOpen((current) => !current)}>{weekDetailsOpen ? "Ocultar detalles" : "Añadir detalles"}</button>{weekDetailsOpen && <div className="planning-add__options"><label><span>Día</span><select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="Día de la tarea">{weekDates.map((date) => <option value={toLocalDateKey(date)} key={date.toISOString()}>{formatShortDay(date)} {date.getDate()}</option>)}</select></label><label><span>Hora opcional</span><input type="time" value={taskTime} onChange={(event) => setTaskTime(event.target.value)} aria-label="Hora opcional" /></label><label><span>Enfoque</span><select value={taskFocusPriority} onChange={(event) => setTaskFocusPriority(event.target.value as typeof taskFocusPriority)} aria-label="Prioridad de enfoque"><option value="">No prioritario</option><option value="1">Prioridad 1</option><option value="2">Prioridad 2</option><option value="3">Prioridad 3</option></select></label></div>}</form>
      <div className="mobile-week-selector" role="tablist" aria-label="Días de la semana">{weekDates.map((date) => { const key = toLocalDateKey(date); return <button type="button" role="tab" aria-selected={selectedDate === key} className={selectedDate === key ? "is-active" : ""} key={key} onClick={() => setSelectedDate(key)}><span>{formatShortDay(date)}</span><strong>{date.getDate()}</strong></button>; })}</div>
      <section className="week-board">{weekDates.map((date) => { const key = toLocalDateKey(date); const tasks = snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled"); return <Card className={`day-column ${key === todayKey ? "is-today" : ""} ${key === selectedDate ? "is-selected" : ""}`} key={key}><header className="day-column__header"><div><span>{formatShortDay(date)}</span><strong>{date.getDate()}</strong></div>{key === todayKey && <Badge tone="rose">Hoy</Badge>}</header><div className="day-column__tasks">{tasks.map((task) => <button type="button" className={`week-task ${task.status === "completed" ? "is-complete" : ""}`} key={task.id} onClick={() => planner.toggleTask(task.id)}>{task.status === "completed" ? <Check size={15} /> : <Circle size={14} />}<span>{task.title}</span>{task.time && <small>{task.time}</small>}</button>)}{!tasks.length && <p className="day-column__empty">Espacio disponible</p>}</div></Card>; })}</section>
      <Card className="weekly-reset-card"><div><p className="eyebrow">Revisión semanal · un solo flujo</p><h2>{weeklyResetSaved ? "Tu semana está lista." : "Prepara una semana que se sienta posible"}</h2><p>Este mismo reset se abre desde Inicio, Semana, Tu progreso y Mi diario.</p></div>{!weeklyResetOpen && !weeklyResetSaved ? <Button onClick={() => setWeeklyResetOpen(true)}>Iniciar revisión semanal</Button> : weeklyResetOpen ? <form className="weekly-reset-form" onSubmit={async (event) => { event.preventDefault(); await planner.saveStructuredReview("weekly", { celebrate: weeklyReset.celebrate, observe: weeklyInsight.summary, release: weeklyReset.release, adjust: weeklyReset.adjust, priority1: weeklyReset.priorities[0], priority2: weeklyReset.priorities[1], priority3: weeklyReset.priorities[2] }, weeklyReset.priorities); setWeeklyResetOpen(false); setWeeklyResetSaved(true); }}><label><span>1. Celebra · ¿Qué sí avanzó?</span><textarea required rows={2} value={weeklyReset.celebrate} onChange={(event) => setWeeklyReset({ ...weeklyReset, celebrate: event.target.value })} /></label><div className="weekly-observation"><strong>2. Observa</strong><span>{weeklyInsight.summary}</span><span>{completedHabitSummary(snapshot)}</span><span>Balance del mes disponible en Finanzas.</span></div><label><span>3. Suelta · ¿Qué ya no importa?</span><textarea rows={2} value={weeklyReset.release} onChange={(event) => setWeeklyReset({ ...weeklyReset, release: event.target.value })} /></label><label><span>4. Ajusta · ¿Qué quieres mover o cambiar?</span><textarea rows={2} value={weeklyReset.adjust} onChange={(event) => setWeeklyReset({ ...weeklyReset, adjust: event.target.value })} /></label><fieldset><legend>5. Elige tus tres prioridades de la próxima semana</legend>{weeklyReset.priorities.map((value, index) => <input key={index} value={value} onChange={(event) => setWeeklyReset({ ...weeklyReset, priorities: weeklyReset.priorities.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} placeholder={`Prioridad ${index + 1}`} />)}</fieldset><div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setWeeklyResetOpen(false)}>Ahora no</Button><Button type="submit">Guardar revisión semanal</Button></div></form> : null}<Link className="button button--secondary" to="/app/today">Ver mi lunes</Link></Card>
    </>}

    {view === "day" && <><PlanningSubheader title="Plan diario y horarios" description="Protege lo esencial del día con bloques de tiempo flexibles." onBack={() => setView("year")} /><div className="daily-schedule-layout"><Card className="daily-schedule-card"><header><div><p className="eyebrow">Horario flexible</p><h2>{format(new Date(`${selectedDate}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })}</h2></div><input type="date" aria-label="Fecha del plan diario" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></header><div className="schedule-grid">{[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map((hour) => { const tasks = snapshot.tasks.filter((task) => task.date === selectedDate && Number(task.time?.slice(0,2)) === hour); return <div key={hour}><time>{String(hour).padStart(2,"0")}:00</time><span>{tasks.map((task) => <button type="button" key={task.id} onClick={() => planner.toggleTask(task.id)}>{task.title}</button>)}</span></div>; })}</div></Card><Card className="daily-unscheduled"><Clock3 size={22} /><h2>Sin horario todavía</h2><p>Pon una hora desde Tareas o usa estos pendientes como margen flexible.</p>{snapshot.tasks.filter((task) => task.date === selectedDate && !task.time && task.status !== "completed").map((task) => <button type="button" key={task.id} onClick={() => planner.toggleTask(task.id)}><Circle size={14} />{task.title}</button>)}</Card></div></>}

    {view === "reset" && <><PlanningSubheader title="Revisión mensual" description="Cierra el ciclo con calma y decide qué quieres llevar al siguiente mes." onBack={() => setView("year")} /><div className="monthly-reset-grid"><Card className="reset-reflection"><RotateCcw size={22} /><p className="eyebrow">Revisión mensual · {format(anchorDate, "MMMM yyyy", { locale: es })}</p><h2>Cierra este ciclo y prepara el siguiente</h2><div className="monthly-reset-questions">{([['advanced','¿Qué avanzó?'],['learned','¿Qué aprendiste?'],['release','¿Qué quieres soltar?'],['adjust','¿Qué debes ajustar?'],['next','¿Qué importa el próximo mes?']] as const).map(([key,label]) => <label key={key}><span>{label}</span><textarea required={key === "advanced"} rows={3} value={monthlyReset[key]} onChange={(event) => { setMonthlyReset({ ...monthlyReset, [key]: event.target.value }); setMonthlyResetSaved(false); }} /></label>)}</div><Button onClick={saveReset}><Save size={16} /> Guardar revisión mensual</Button>{monthlyResetSaved && <div className="reset-next-actions" role="status"><strong>Tu próximo ciclo está listo.</strong><Button onClick={() => openCreateMonth()}>Preparar mi próximo mes</Button><Button variant="secondary" onClick={() => setView("week")}>Preparar mi primera semana</Button></div>}</Card><div className="reset-summary"><Card className="brain-summary-card"><Sparkles size={23} /><div><p className="eyebrow">Lo que ya está en tu planner</p><strong>{snapshot.goals.filter((goal) => goal.status === "active").length} metas · {snapshot.habitLogs.length} registros de hábitos · {snapshot.journalEntries.length} páginas</strong><span>Finanzas, ánimo, pendientes y proyectos siguen disponibles para observar sin duplicarlos.</span></div></Card><Card className="brain-summary-card"><Sparkles size={23} /><div><p className="eyebrow">Resumen de tus listas</p><strong>{brainSummary.captured} pensamientos capturados · {brainSummary.pending} abiertos</strong><span>{brainSummary.message}</span></div></Card><Card className="release-note"><p>Lo que elijo llevar al próximo mes</p><span>Conserva solo lo que todavía apoya tu visión y tus prioridades.</span></Card></div></div></>}

    <Modal open={Boolean(longTermMode)} title={longTermMode === "five" ? "Mi vida en 5 años" : "Mis prioridades a 3 años"} description={longTermMode === "five" ? "Describe la vida que quieres construir. Puedes completar solo lo que hoy tenga sentido." : "Elige hasta tres prioridades que acerquen esa visión a la realidad."} onClose={() => setLongTermMode(null)}><form className="form-grid long-term-form" onSubmit={saveLongTerm}><label className="form-field form-field--full"><span>{longTermMode === "five" ? "¿Cómo se ve y se siente esa vida?" : "¿Qué quieres haber construido en tres años?"}</span><textarea rows={5} value={longTermSummary} onChange={(event) => setLongTermSummary(event.target.value)} placeholder="Escribe con tus propias palabras…" /></label><fieldset className="form-field form-field--full priority-stack"><legend>{longTermMode === "five" ? "Pilares que quieres cuidar (opcionales)" : "Hasta tres prioridades"}</legend>{longTermPriorities.map((value, index) => <input key={index} value={value} onChange={(event) => setLongTermPriorities((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Prioridad ${index + 1}`} />)}</fieldset>{longTermMode === "five" && <fieldset className="form-field form-field--full five-year-areas"><legend>Detalles por área (opcionales)</legend>{fiveYearAreas.map(([key, label]) => <label key={key}><span>{label}</span><textarea rows={2} value={fiveYearDetails[key] ?? ""} onChange={(event) => setFiveYearDetails((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</fieldset>}<div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setLongTermMode(null)}>Cancelar</Button><Button type="submit"><Save size={16} /> Guardar</Button></div></form></Modal>

    <Modal open={monthModalOpen} title={`${editingMonthId ? "Editar" : "Planificar"} ${monthNames[Number(monthDraft.month) - 1]} ${monthDraft.year}`} description="Completa solo lo que hoy tenga sentido. Podrás editarlo después." onClose={() => setMonthModalOpen(false)}>
      <form className="form-grid month-create-form" onSubmit={saveMonth}>
        <div className="month-period-summary form-field--full" aria-label={`Plan de ${monthNames[Number(monthDraft.month) - 1]} ${monthDraft.year}`}><CalendarDays size={19} /><strong>{monthNames[Number(monthDraft.month) - 1]} {monthDraft.year}</strong></div>
        {requestedGoal && <Card className="month-goal-context form-field--full"><Check size={17} /><div><p className="eyebrow">Meta que quieres acercar</p><strong>{requestedGoal.title}</strong><small>El enfoque mensual queda preparado con esta meta; puedes ajustarlo antes de guardar.</small></div></Card>}
        <label className="form-field form-field--full"><span>¿Qué es lo más importante que quieres avanzar?</span><input value={monthDraft.focus} onChange={(event) => setMonthDraft({ ...monthDraft, focus: event.target.value })} placeholder="Enfoque principal del mes" /></label>
        <fieldset className="form-field form-field--full priority-stack"><legend>Prioridades principales (hasta 3)</legend>{monthDraft.priorities.map((value, index) => <input key={index} value={value} onChange={(event) => setMonthDraft({ ...monthDraft, priorities: monthDraft.priorities.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} placeholder={`Prioridad ${index + 1}`} />)}</fieldset>
        {threeYearPlan?.objectives.length ? <label className="form-field form-field--full"><span>Vincular con una meta a 3 años (opcional)</span><select value={monthDraft.linkedPriority} onChange={(event) => setMonthDraft({ ...monthDraft, linkedPriority: event.target.value })}><option value="">Sin conexión por ahora</option>{threeYearPlan.objectives.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label> : null}
        <fieldset className="form-field form-field--full month-area-goals"><legend>Objetivos por área (opcionales)</legend>{snapshot.lifeAreas.filter((area) => area.active).map((area) => { const selected = monthDraft.areaIds.includes(area.id); return <div key={area.id}><label><input type="checkbox" checked={selected} onChange={() => setMonthDraft((current) => ({ ...current, areaIds: selected ? current.areaIds.filter((id) => id !== area.id) : [...current.areaIds, area.id] }))} /><span>{area.name}</span></label>{selected ? <input value={monthDraft.areaGoals[area.id] ?? ""} onChange={(event) => setMonthDraft((current) => ({ ...current, areaGoals: { ...current.areaGoals, [area.id]: event.target.value } }))} placeholder={`Objetivo para ${area.name}`} aria-label={`Objetivo mensual de ${area.name}`} /> : null}</div>; })}</fieldset>
        <fieldset className="form-field form-field--full month-entry-list"><legend>Acciones o tareas (opcionales)</legend>{monthDraft.actions.map((item, index) => <div key={`action-${index}`}><input value={item.title} onChange={(event) => updateMonthEntry("actions", index, { title: event.target.value })} placeholder="Acción del mes" aria-label={`Acción ${index + 1}`} /><input type="date" value={item.date} onChange={(event) => updateMonthEntry("actions", index, { date: event.target.value })} aria-label={`Fecha de la acción ${index + 1}`} /></div>)}<Button type="button" variant="ghost" onClick={() => addMonthEntry("actions")}><Plus size={15} /> Añadir acción</Button></fieldset>
        <fieldset className="form-field form-field--full month-entry-list"><legend>Fechas importantes (opcionales)</legend>{monthDraft.importantDates.map((item, index) => <div key={`date-${index}`}><input value={item.title} onChange={(event) => updateMonthEntry("importantDates", index, { title: event.target.value })} placeholder="Evento, viaje, reunión, entrega o cita" aria-label={`Fecha importante ${index + 1}`} /><input type="date" value={item.date} onChange={(event) => updateMonthEntry("importantDates", index, { date: event.target.value })} aria-label={`Día de la fecha importante ${index + 1}`} /></div>)}<Button type="button" variant="ghost" onClick={() => addMonthEntry("importantDates")}><Plus size={15} /> Añadir fecha</Button></fieldset>
        {editingMonthId ? <label className="form-field form-field--full"><span>Estado</span><select value={monthDraft.status} onChange={(event) => setMonthDraft({ ...monthDraft, status: event.target.value as MonthDraft["status"] })}><option value="active">Activo</option><option value="draft">Borrador</option><option value="closed">Cerrado</option></select></label> : null}
        {monthError ? <p className="form-error form-field--full" role="alert">{monthError}</p> : null}
        <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setMonthModalOpen(false)}>Cancelar</Button><Button type="submit">Guardar plan</Button></div>
      </form>
    </Modal>
  </div>;
}

function PlanningOverview({ access, snapshot, fiveYearPlan, threeYearPlan, monthSlots, selectedYear, availableYears, todayKey, onYearChange, onAddPlan, onEditLongTerm, onOpenMonth, onEditMonth, onOpenWeek, onOpenDay, onOpenReset }: { access: UserAccess; snapshot: PlannerSnapshot; fiveYearPlan?: CascadePlan; threeYearPlan?: CascadePlan; monthSlots: ReturnType<typeof buildYearMonthSlots>; selectedYear: number; availableYears: number[]; todayKey: string; onYearChange: (year: number) => void; onAddPlan: (periodKey: string) => void; onEditLongTerm: (mode: LongTermMode) => void; onOpenMonth: (plan: CascadePlan) => void; onEditMonth: (plan: CascadePlan) => void; onOpenWeek: () => void; onOpenDay: () => void; onOpenReset: () => void }) {
  const fiveYearCard = <Card className="direction-card"><div className="direction-card__icon"><Sparkles size={21} /></div><div><p className="eyebrow">Horizonte personal</p><h2>Mi vida en 5 años</h2>{fiveYearPlan?.intention ? <p>{fiveYearPlan.intention}</p> : <p>Describe cómo quieres vivir, sentirte y relacionarte con lo que importa.</p>}{fiveYearPlan?.objectives.length ? <ul>{fiveYearPlan.objectives.map((item) => <li key={item}>{item}</li>)}</ul> : null}</div><Button variant="secondary" onClick={() => onEditLongTerm("five")}><Edit3 size={15} /> {fiveYearPlan ? "Editar" : "Definir visión"}</Button></Card>;
  const currentYear = new Date().getFullYear();
  return <>
    <SectionHeading eyebrow="Tu dirección" title="Planificación" description="Define hacia dónde quieres ir y convierte esa visión en decisiones para cada mes." />
    <section className="planning-direction-grid" aria-label="Dirección de largo plazo">{canAccessFeature(access, "five_year_planning") ? fiveYearCard : <PremiumFeatureGate access={access} feature="five_year_planning" compact>{fiveYearCard}</PremiumFeatureGate>}<Card className="direction-card"><div className="direction-card__icon"><ListChecks size={21} /></div><div><p className="eyebrow">Puente estratégico</p><h2>Mis prioridades a 3 años</h2>{threeYearPlan?.intention ? <p>{threeYearPlan.intention}</p> : <p>Elige hasta tres prioridades que conviertan tu visión en una dirección clara.</p>}{threeYearPlan?.objectives.length ? <ol>{threeYearPlan.objectives.map((item) => <li key={item}>{item}</li>)}</ol> : null}</div><Button variant="secondary" onClick={() => onEditLongTerm("three")}><Edit3 size={15} /> {threeYearPlan ? "Editar" : "Agregar prioridades"}</Button></Card></section>
    <section className="my-months-section" aria-labelledby="my-months-title">
      <header className="my-months-header"><div><p className="eyebrow">De la visión a la acción</p><h2 id="my-months-title">Mis meses</h2><p>Organiza tu año, mes a mes.</p></div><div><label><span>Año</span><select value={selectedYear} onChange={(event) => onYearChange(Number(event.target.value))}>{availableYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>{selectedYear === currentYear ? <Button variant="outline" onClick={() => document.getElementById(`month-${monthPeriodKey(currentYear, new Date().getMonth())}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>Ver mes actual</Button> : null}</div></header>
      <div className="created-month-grid">{monthSlots.map((slot) => {
        const plan = slot.plan;
        const monthLabel = monthNames[slot.monthIndex];
        if (!plan) return <Card id={`month-${slot.periodKey}`} className={`created-month-card month-card--empty ${slot.isCurrent ? "is-current" : ""}`} key={slot.periodKey}><button type="button" className="month-card-main month-card-empty-action" onClick={() => onAddPlan(slot.periodKey)} aria-label={`Añadir plan para ${monthLabel} ${selectedYear}`}><header><div><span>{monthLabel}</span><strong>{selectedYear}</strong></div>{slot.isCurrent ? <Badge tone="rose">Mes actual</Badge> : null}</header><div className="month-card-empty-copy"><CalendarDays size={22} /><h3>¿Qué quieres avanzar este mes?</h3><span><Plus size={15} /> Añadir plan</span></div></button></Card>;
        const progress = monthProgress(plan);
        const completed = plan.completedObjectiveIndexes?.length ?? 0;
        const areas = snapshot.lifeAreas.filter((area) => plan.areaIds?.includes(area.id));
        const datedEntries = [...plan.activities.filter((activity) => activity.date), ...snapshot.events.filter((event) => event.startDate.startsWith(slot.periodKey)).map((event) => ({ id: event.id, title: event.title, date: event.startDate, type: "event" as const }))].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
        const nextDate = datedEntries[0];
        return <Card id={`month-${slot.periodKey}`} className={`created-month-card month-card--planned ${slot.isCurrent ? "is-current" : ""}`} key={slot.periodKey}><button type="button" className="month-card-main" onClick={() => onOpenMonth(plan)} aria-label={`Ver plan de ${monthLabel} ${selectedYear}`}><header><div><span>{monthLabel}</span><strong>{selectedYear}</strong></div>{slot.isCurrent ? <Badge tone="rose">Mes actual</Badge> : <Badge tone={monthState(plan, todayKey).tone}>{monthState(plan, todayKey).label}</Badge>}</header><div className="month-card-summary"><small>Enfoque del mes</small><h3>{plan.intention || plan.priority || "Plan mensual"}</h3>{plan.objectives.length ? <ol>{plan.objectives.slice(0, 3).map((priority) => <li key={priority}>{priority}</li>)}</ol> : null}{nextDate?.date ? <p className="month-next-date"><CalendarDays size={14} /> <span>{format(new Date(`${nextDate.date}T12:00:00`), "d 'de' MMMM", { locale: es })} · {nextDate.title}</span></p> : null}<div className="month-area-badges">{areas.slice(0, 3).map((area) => <Badge key={area.id} tone="warm">{area.name}</Badge>)}</div>{plan.objectives.length ? <><ProgressBar value={progress} label="Avance de prioridades" /><p className="month-progress-copy">{completed} de {plan.objectives.length} prioridades completadas</p></> : null}</div></button><footer><Button variant="ghost" onClick={() => onEditMonth(plan)}><Edit3 size={15} /> Editar</Button><Button onClick={() => onOpenMonth(plan)}>Ver mes <ChevronRight size={15} /></Button></footer></Card>;
      })}</div>
    </section>
    <section className="short-term-tools" aria-label="Herramientas de corto plazo"><Button variant="secondary" onClick={onOpenWeek}>Plan semanal</Button><Button variant="secondary" onClick={onOpenDay}>Mi día</Button><Button variant="ghost" onClick={onOpenReset}>Revisión mensual</Button></section>
  </>;
}

function MonthDetail({ plan, snapshot, todayKey, anchorDate, calendarDates, monthMode, reflection, reflectionSaved, onBack, onEdit, onDelete, onMonthMode, onSelectDay, onTogglePriority, onReflectionChange, onSaveReflection, onPlanWeek }: { plan: CascadePlan; snapshot: PlannerSnapshot; todayKey: string; anchorDate: Date; calendarDates: Date[]; monthMode: "calendar" | "agenda"; reflection: { advanced: string; pending: string; next: string }; reflectionSaved: boolean; onBack: () => void; onEdit: () => void; onDelete: () => void; onMonthMode: (mode: "calendar" | "agenda") => void; onSelectDay: (key: string) => void; onTogglePriority: (index: number) => void; onReflectionChange: (next: { advanced: string; pending: string; next: string }) => void; onSaveReflection: (event: FormEvent) => void; onPlanWeek: () => void }) {
  const progress = monthProgress(plan);
  const relatedAreas = snapshot.lifeAreas.filter((area) => plan.areaIds?.includes(area.id));
  const areaGoals = parseAreaGoals(plan.details?.areaGoals);
  const actions = plan.activities.filter((activity) => activity.type !== "event");
  const events = [
    ...snapshot.events.filter((event) => event.startDate.startsWith(plan.periodKey)).map((event) => ({ id: event.id, title: event.title, date: event.startDate })),
    ...plan.activities.filter((activity) => activity.type === "event").map((event) => ({ id: event.id, title: event.title, date: event.date ?? "" })),
  ];
  return <><button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16} /> Volver a Mis meses</button><header className="month-detail-header"><div><p className="eyebrow">{monthState(plan, todayKey).label}</p><h1>{format(monthDate(plan.periodKey), "MMMM yyyy", { locale: es })}</h1><p>{plan.intention || "Un mes con espacio para decidir"}</p></div><div><Button variant="secondary" onClick={onEdit}><Edit3 size={16} /> Editar mes</Button><Button variant="ghost" onClick={onDelete}><Trash2 size={16} /> Eliminar</Button></div></header><div className="month-detail-grid"><Card className="month-focus-card"><p className="eyebrow">Enfoque del mes</p><h2>{plan.intention || "Todavía por definir"}</h2>{plan.details?.linkedThreeYearPriority && <p><strong>Conecta con:</strong> {plan.details.linkedThreeYearPriority}</p>}<div className="month-area-badges">{relatedAreas.map((area) => <Badge key={area.id} tone="warm">{area.name}</Badge>)}</div>{Object.keys(areaGoals).length ? <ul className="month-area-goal-list">{relatedAreas.filter((area) => areaGoals[area.id]).map((area) => <li key={area.id}><strong>{area.name}</strong><span>{areaGoals[area.id]}</span></li>)}</ul> : null}{plan.objectives.length ? <ProgressBar value={progress} label="Avance del mes" /> : null}</Card><Card className="month-priority-card"><p className="eyebrow">Prioridades</p><h2>Lo que importa en este mes</h2>{plan.objectives.length ? <div>{plan.objectives.map((priority, index) => { const completed = plan.completedObjectiveIndexes?.includes(index); return <button type="button" key={`${priority}-${index}`} className={completed ? "is-complete" : ""} onClick={() => onTogglePriority(index)}>{completed ? <Check size={16} /> : <Circle size={16} />}<span>{priority}</span></button>; })}</div> : <p>Aún no has elegido prioridades. Puedes agregarlas al editar el mes.</p>}</Card></div><div className="month-support-grid"><Card><p className="eyebrow">Acciones</p><h2>Pasos y actividades</h2>{actions.length ? <ul>{actions.map((activity) => <li key={activity.id}>{activity.title}{activity.date && <time>{activity.date}</time>}</li>)}</ul> : <p>No hay acciones definidas todavía.</p>}</Card><Card><p className="eyebrow">Fechas y eventos</p><h2>Lo que ya está en calendario</h2>{events.length ? <ul>{events.map((event) => <li key={event.id}><CalendarDays size={15} /><span>{event.title}</span><time>{event.date}</time></li>)}</ul> : <p>Este mes no tiene eventos registrados.</p>}<Link className="button button--ghost" to="/app/life-hub?tab=calendar">Ir a Eventos y calendario</Link></Card></div><Card className="month-reflection-card"><div><p className="eyebrow">Reflexión del mes</p><h2>Observa sin juzgar y decide qué sigue</h2></div><form onSubmit={onSaveReflection}>{([['advanced','¿Qué avanzó?'],['pending','¿Qué quedó pendiente?'],['next','¿Qué quieres llevar al próximo mes?']] as const).map(([key, label]) => <label key={key}><span>{label}</span><textarea rows={3} value={reflection[key]} onChange={(event) => onReflectionChange({ ...reflection, [key]: event.target.value })} /></label>)}<div><span aria-live="polite">{reflectionSaved ? "Reflexión guardada" : ""}</span><Button type="submit"><Save size={16} /> Guardar reflexión</Button></div></form></Card><div className="calendar-toolbar"><h2>Calendario del mes</h2><div className="calendar-mode-toggle" role="group" aria-label="Vista del mes"><button type="button" className={monthMode === "calendar" ? "is-active" : ""} onClick={() => onMonthMode("calendar")}>Calendario</button><button type="button" className={monthMode === "agenda" ? "is-active" : ""} onClick={() => onMonthMode("agenda")}>Agenda</button></div></div>{monthMode === "calendar" && <Card className="month-calendar-card"><div className="calendar-weekdays">{["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((day) => <span key={day}>{day}</span>)}</div><div className="month-calendar-grid">{calendarDates.map((date) => { const key = toLocalDateKey(date); const dayTasks = snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled"); const dayEvents = snapshot.events.filter((event) => event.startDate === key); return <button type="button" key={key} className={`${isSameMonth(date, anchorDate) ? "" : "is-outside"} ${key === todayKey ? "is-today" : ""}`} onClick={() => onSelectDay(key)}><span>{date.getDate()}</span>{dayEvents.slice(0, 2).map((event) => <small className="calendar-event" key={event.id}><CalendarDays size={12} />{event.title}</small>)}{dayTasks.slice(0, 2).map((task) => <small key={task.id}><Circle size={12} />{task.title}</small>)}</button>; })}</div></Card>}{monthMode === "agenda" && <Card className="month-agenda"><p className="eyebrow">Agenda cronológica</p><h2>Eventos y tareas</h2>{calendarDates.filter((date) => isSameMonth(date, anchorDate)).map((date) => { const key = toLocalDateKey(date); const entries = [...snapshot.events.filter((event) => event.startDate === key).map((event) => ({ id: event.id, title: event.title, kind: "Evento" })), ...snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled").map((task) => ({ id: task.id, title: task.title, kind: "Tarea" }))]; if (!entries.length) return null; return <section key={key}><time>{format(date, "d 'de' MMMM", { locale: es })}</time>{entries.map((entry) => <div key={`${entry.kind}-${entry.id}`}><Circle size={12} /><span>{entry.title}</span><small>{entry.kind}</small></div>)}</section>; })}<EmptyStateIfMonthEmpty snapshot={snapshot} monthKey={plan.periodKey} /></Card>}<div className="planning-bridge"><div><p className="eyebrow">Siguiente nivel</p><h2>Convierte este mes en una semana posible</h2><p>Lleva las prioridades y fechas a días concretos sin llenar todo tu calendario.</p></div><Button onClick={onPlanWeek}>Planificar mi semana <ChevronRight size={16} /></Button></div></>;
}

function PlanningSubheader({ title, description, onBack }: { title: string; description: string; onBack: () => void }) { return <><button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16} /> Volver a Planificación</button><SectionHeading eyebrow="Planificación" title={title} description={description} /></>; }
function EmptyStateIfMonthEmpty({ snapshot, monthKey }: { snapshot: PlannerSnapshot; monthKey: string }) { const hasEntries = snapshot.events.some((event) => event.startDate.startsWith(monthKey)) || snapshot.tasks.some((task) => task.date?.startsWith(monthKey) && task.status !== "cancelled"); return hasEntries ? null : <p className="empty-inline">Este mes todavía tiene espacio. Añade eventos o acciones cuando estés lista.</p>; }
function completedHabitSummary(snapshot: PlannerSnapshot) { const habits = snapshot.habits.filter((habit) => habit.status === "active"); const activeHabitIds = new Set(habits.map((habit) => habit.id)); const completed = snapshot.habitLogs.filter((log) => activeHabitIds.has(log.habitId) && log.value > 0).length; return habits.length ? `${completed} registros de hábitos completados. Mira el detalle en Tu progreso.` : "Aún no hay hábitos activos; puedes empezar con uno pequeño."; }

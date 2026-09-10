"use client";

/* eslint-disable jsx-a11y/no-autofocus -- Contextual editors open after an explicit user action. */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { eachDayOfInterval, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, Check, ChevronRight, Circle, Edit3, ListChecks, Lock, Plus, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import type { CascadePlan, PlannerSnapshot, Task } from "@/src/domain/planner";
import { monthlyBrainDumpSummary } from "@/src/domain/cascadeRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { cascadePlanFormSchema } from "@/src/lib/schemas";
import { buildYearMonthSlots, collectMonthPlanEntries, monthPeriodKey, parseAreaGoals, serializeAreaGoals } from "@/src/domain/monthPlanning";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";
import type { UserAccess } from "@/src/domain/access";
import { canAccessFeature, getTrialPlanningDateBounds, isTrialPlanningDateAllowed, isTrialPlanningMonthAllowed } from "@/src/domain/access";
import { PremiumFeatureGate } from "@/src/components/access/PremiumFeatureGate";
import type { QuickCaptureDefaults } from "@/src/features/tasks/QuickCaptureDrawer";
import { WeeklyPlanView } from "@/src/features/planning/WeeklyPlanView";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { PlanningMessageKey } from "@/src/i18n/messages/features/planning";

type PlanningView = "year" | "month" | "week" | "day" | "reset";
type LongTermMode = "five" | "three";

const fiveYearAreas = [
  ["wellbeing", "planning.area.wellbeing"],
  ["career", "planning.area.career"],
  ["finances", "planning.area.finances"],
  ["relationships", "planning.area.relationships"],
  ["lifestyle", "planning.area.lifestyle"],
] as const;

type MonthDraft = {
  month: string;
  year: string;
  focus: string;
  sourceGoalId: string;
  priorities: string[];
  linkedPriority: string;
  areaIds: string[];
  areaGoals: Record<string, string>;
  actions: MonthEntryDraft[];
  importantDates: MonthEntryDraft[];
  status: "draft" | "active" | "closed";
};

type MonthEntryDraft = { taskId?: string; title: string; date: string };

const emptyEntry = (): MonthEntryDraft => ({ title: "", date: "" });
const emptyMonthDraft = (date = new Date()): MonthDraft => ({ month: String(date.getMonth() + 1), year: String(date.getFullYear()), focus: "", sourceGoalId: "", priorities: ["", "", ""], linkedPriority: "", areaIds: [], areaGoals: {}, actions: [emptyEntry()], importantDates: [emptyEntry()], status: "active" });
const monthDraftFromPlan = (plan: CascadePlan, snapshot: PlannerSnapshot): MonthDraft => {
  const linkedTasks = snapshot.tasks.filter((task) => task.periodPlanId === plan.id).map((task) => ({ taskId: task.id, title: task.title, date: task.date ?? "" }));
  const linkedTitles = new Set(linkedTasks.map((task) => task.title));
  const legacyActions = plan.activities.filter((activity) => activity.type !== "event" && !linkedTitles.has(activity.title)).map((activity) => ({ title: activity.title, date: activity.date ?? "" }));
  const actions = [...linkedTasks, ...legacyActions];
  const importantDates = plan.activities.filter((activity) => activity.type === "event").map((activity) => ({ title: activity.title, date: activity.date ?? "" }));
  return { month: String(Number(plan.periodKey.slice(5, 7))), year: plan.periodKey.slice(0, 4), focus: plan.intention, sourceGoalId: plan.details?.sourceGoalId ?? "", priorities: [...plan.objectives.slice(0, 3), "", ""].slice(0, 3), linkedPriority: plan.details?.linkedThreeYearPriority ?? "", areaIds: plan.areaIds ?? [], areaGoals: parseAreaGoals(plan.details?.areaGoals), actions: actions.length ? actions : [emptyEntry()], importantDates: importantDates.length ? importantDates : [emptyEntry()], status: plan.status ?? "active" };
};
const monthDate = (periodKey: string) => new Date(`${periodKey}-01T12:00:00`);
const monthProgress = (plan: CascadePlan) => plan.objectives.length ? Math.round(((plan.completedObjectiveIndexes?.length ?? 0) / plan.objectives.length) * 100) : 0;

type I18n = ReturnType<typeof useI18n>;

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function monthState(plan: CascadePlan, todayKey: string, m: I18n["m"]) {
  const currentMonth = todayKey.slice(0, 7);
  if (plan.status === "closed") return { label: m("planning.monthState.closed"), tone: "neutral" as const };
  if (plan.periodKey === currentMonth) return { label: m("planning.monthState.current"), tone: "rose" as const };
  if (plan.status === "draft") return { label: m("planning.monthState.draft"), tone: "warm" as const };
  return { label: m("planning.monthState.saved"), tone: "sage" as const };
}

function taskProvenance(snapshot: PlannerSnapshot, task: Task, m: I18n["m"], formatDate: I18n["formatDate"]): string {
  const goal = snapshot.goals.find((item) => item.id === task.goalId)?.title;
  const project = snapshot.projects.find((item) => item.id === task.projectId)?.name;
  const monthlyPlan = snapshot.cascadePlans.find((item) => item.id === task.periodPlanId && item.horizon === "monthly");
  const monthlyResult = monthlyPlan ? m("planning.provenance.monthResult", { month: formatDate(monthDate(monthlyPlan.periodKey), { month: "long" }) }) : undefined;
  return [goal, monthlyResult, project].filter(Boolean).join(" · ") || m("planning.common.inbox");
}

export function PlanningPage({ planner, access, initialView = "year", onQuickCapture }: { planner: PlannerController; access: UserAccess; initialView?: PlanningView; onQuickCapture: (defaults: QuickCaptureDefaults) => void }) {
  const { snapshot } = planner;
  const { m, formatDate, formatNumber, formatPlural } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskEdit, setTaskEdit] = useState({ title: "", date: "", goalId: "", projectId: "" });
  const [taskError, setTaskError] = useState<PlanningMessageKey | null>(null);
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthModalOpen, setMonthModalOpen] = useState(createMonthRequested);
  const [editingMonthId, setEditingMonthId] = useState<string | null>(createMonthRequested ? requestedMonthPlan?.id ?? null : null);
  const [monthDraft, setMonthDraft] = useState<MonthDraft>(() => {
    if (createMonthRequested && requestedMonthPlan) return monthDraftFromPlan(requestedMonthPlan, snapshot);
    const draft = emptyMonthDraft();
    if (requestedGoal) { draft.focus = requestedGoal.title; draft.sourceGoalId = requestedGoal.id; draft.priorities[0] = requestedGoal.title; }
    return draft;
  });
  const [monthError, setMonthError] = useState<PlanningMessageKey | null>(null);
  const [longTermMode, setLongTermMode] = useState<LongTermMode | null>(null);
  const [longTermSummary, setLongTermSummary] = useState("");
  const [longTermPriorities, setLongTermPriorities] = useState(["", "", ""]);
  const [fiveYearDetails, setFiveYearDetails] = useState<Record<string, string>>({});
  const [monthMode, setMonthMode] = useState<"calendar" | "agenda">("calendar");
  const [monthlyReset, setMonthlyReset] = useState({ advanced: "", learned: "", release: "", adjust: "", next: "" });
  const [monthlyResetSaved, setMonthlyResetSaved] = useState(false);
  const [reflection, setReflection] = useState({ advanced: "", pending: "", next: "" });
  const [reflectionSaved, setReflectionSaved] = useState(false);

  const fiveYearPlan = snapshot.cascadePlans.find((plan) => plan.horizon === "pathways");
  const threeYearPlan = snapshot.cascadePlans.find((plan) => plan.horizon === "three_years");
  const monthPlans = useMemo(() => snapshot.cascadePlans.filter((plan) => plan.horizon === "monthly").sort((a, b) => a.periodKey.localeCompare(b.periodKey)), [snapshot.cascadePlans]);
  const monthSlots = useMemo(() => buildYearMonthSlots(selectedYear, monthPlans), [monthPlans, selectedYear]);
  const selectedMonthPlan = monthPlans.find((plan) => plan.id === selectedMonthId);
  const brainSummary = monthlyBrainDumpSummary(snapshot, toLocalDateKey(anchorDate).slice(0, 7));
  const activeGoalCount = snapshot.goals.filter((goal) => goal.status === "active").length;
  const plannerStats = m("planning.reset.plannerStats", {
    goals: formatPlural(activeGoalCount, { one: m("planning.reset.goalCount.one"), other: m("planning.reset.goalCount.other") }),
    habits: formatPlural(snapshot.habitLogs.length, { one: m("planning.reset.habitCount.one"), other: m("planning.reset.habitCount.other") }),
    pages: formatPlural(snapshot.journalEntries.length, { one: m("planning.reset.pageCount.one"), other: m("planning.reset.pageCount.other") }),
  });
  const inboxStats = m("planning.reset.inboxStats", {
    captured: formatPlural(brainSummary.captured, { one: m("planning.reset.thoughtCount.one"), other: m("planning.reset.thoughtCount.other") }),
    pending: formatPlural(brainSummary.pending, { one: m("planning.reset.openCount.one"), other: m("planning.reset.openCount.other") }),
  });
  const trialDateBounds = getTrialPlanningDateBounds(access);
  const selectedDateReadOnly = !isTrialPlanningDateAllowed(access, selectedDate);
  const monthDraftLabel = capitalize(formatDate(new Date(Number(monthDraft.year), Number(monthDraft.month) - 1, 1), { month: "long" }));

  const openTaskEditor = (task: Task) => {
    if (task.date && !isTrialPlanningDateAllowed(access, task.date)) return;
    setTaskError(null);
    setEditingTaskId(task.id);
    setTaskEdit({ title: task.title, date: task.date ?? "", goalId: task.goalId ?? "", projectId: task.projectId ?? "" });
  };

  const saveTaskEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingTaskId || !taskEdit.title.trim()) return;
    if (taskEdit.date && !isTrialPlanningDateAllowed(access, taskEdit.date)) { setTaskError("planning.trial.limit"); return; }
    await planner.updateTask(editingTaskId, taskEdit);
    setEditingTaskId(null);
  };
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
    if (!isTrialPlanningMonthAllowed(access, monthPeriodKey(year, monthIndex))) return;
    setEditingMonthId(null);
    setMonthDraft(emptyMonthDraft(new Date(year, monthIndex, 1)));
    setMonthError(null);
    setMonthModalOpen(true);
  };

  const openEditMonth = (plan: CascadePlan) => {
    if (!isTrialPlanningMonthAllowed(access, plan.periodKey)) return;
    setEditingMonthId(plan.id);
    setMonthDraft(monthDraftFromPlan(plan, snapshot));
    setMonthError(null);
    setMonthModalOpen(true);
  };

  const saveMonth = async (event: FormEvent) => {
    event.preventDefault();
    setMonthError(null);
    const periodKey = `${monthDraft.year}-${monthDraft.month.padStart(2, "0")}`;
    if (!isTrialPlanningMonthAllowed(access, periodKey)) {
      setMonthError("planning.error.trialMonthEdit");
      return;
    }
    if (monthPlans.some((plan) => plan.periodKey === periodKey && plan.id !== editingMonthId)) {
      setMonthError("planning.error.monthExists");
      return;
    }
    const priorities = monthDraft.priorities.map((item) => item.trim()).filter(Boolean).slice(0, 3);
    const actionDrafts = monthDraft.actions.filter((item) => item.title.trim());
    const activities = monthDraft.importantDates.filter((item) => item.title.trim()).map((item) => ({ title: item.title.trim(), date: item.date || undefined, type: "event" as const }));
    const datedEntries = [...actionDrafts, ...monthDraft.importantDates.filter((item) => item.title.trim())].filter((item) => item.date);
    if (datedEntries.some((item) => !isTrialPlanningDateAllowed(access, item.date))) {
      setMonthError("planning.trial.limit");
      return;
    }
    const areaGoals = serializeAreaGoals(monthDraft.areaGoals);
    if (!monthDraft.focus.trim() && !priorities.length && !actionDrafts.length && !activities.length && !areaGoals && !monthDraft.linkedPriority) {
      setMonthError("planning.error.monthMinimum");
      return;
    }
    const details = {
      ...(monthDraft.linkedPriority ? { linkedThreeYearPriority: monthDraft.linkedPriority } : {}),
      ...(areaGoals ? { areaGoals } : {}),
      ...(monthDraft.sourceGoalId ? { sourceGoalId: monthDraft.sourceGoalId, sourceGoalTitle: snapshot.goals.find((goal) => goal.id === monthDraft.sourceGoalId)?.title ?? "" } : {}),
    };
    const parsed = cascadePlanFormSchema.safeParse({ horizon: "monthly", periodKey, parentPlanId: threeYearPlan?.id, intention: monthDraft.focus, priority: priorities[0] ?? "", objectives: priorities, activities, areaIds: monthDraft.areaIds, details, status: monthDraft.status });
    if (!parsed.success) { setMonthError("planning.error.monthInvalid"); return; }
    const next = await planner.saveCascadePlan(parsed.data);
    const savedPlan = next.cascadePlans.find((plan) => plan.horizon === "monthly" && plan.periodKey === periodKey);
    if (savedPlan && actionDrafts.length) {
      await planner.upsertPlanActions(savedPlan.id, monthDraft.sourceGoalId || undefined, actionDrafts.map((action) => ({ taskId: action.taskId, title: action.title, date: action.date || undefined })));
    }
    setSelectedYear(Number(monthDraft.year));
    if (editingMonthId && selectedMonthId === editingMonthId && savedPlan) setSelectedMonthId(savedPlan.id);
    setMonthModalOpen(false);
  };

  const openMonthDetail = (plan: CascadePlan) => { setSelectedMonthId(plan.id); setAnchorDate(monthDate(plan.periodKey)); setView("month"); };

  const saveReflection = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedMonthPlan) return;
    await planner.saveCascadePlan({ horizon: "monthly", periodKey: selectedMonthPlan.periodKey, parentPlanId: selectedMonthPlan.parentPlanId, intention: selectedMonthPlan.intention, priority: selectedMonthPlan.priority, objectives: selectedMonthPlan.objectives, activities: selectedMonthPlan.activities.map(({ title, date, type }) => ({ title, date, type })), areaIds: selectedMonthPlan.areaIds ?? [], details: selectedMonthPlan.details, reflection, status: selectedMonthPlan.status });
    setReflectionSaved(true);
  };

  const saveReset = async () => {
    if (!monthlyReset.advanced.trim()) return;
    const summary = Object.values(monthlyReset).filter(Boolean).join(" · ");
    await planner.saveJournal(summary, { type: "monthly_reset", title: m("planning.reset.savedJournalTitle", { month: capitalize(formatDate(anchorDate, { month: "long", year: "numeric" })) }) });
    await planner.saveStructuredReview("monthly", monthlyReset, [monthlyReset.adjust, monthlyReset.next]);
    setMonthlyResetSaved(true);
  };

  const updateMonthEntry = (group: "actions" | "importantDates", index: number, patch: Partial<MonthEntryDraft>) => {
    setMonthDraft((current) => ({ ...current, [group]: current[group].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  };

  const addMonthEntry = (group: "actions" | "importantDates") => {
    setMonthDraft((current) => ({ ...current, [group]: [...current[group], emptyEntry()] }));
  };

  return <div className="page-stack cascade-page planning-v2" data-i18n-explicit="true">
    {view !== "week" && <SectionNavigation section="plan" />}
    {view === "year" && <PlanningOverview access={access} snapshot={snapshot} fiveYearPlan={fiveYearPlan} threeYearPlan={threeYearPlan} monthSlots={monthSlots} selectedYear={selectedYear} availableYears={availableYears} todayKey={todayKey} onYearChange={setSelectedYear} onAddPlan={(periodKey) => openCreateMonth(Number(periodKey.slice(0, 4)), Number(periodKey.slice(5, 7)) - 1)} onEditLongTerm={openLongTerm} onOpenMonth={openMonthDetail} onEditMonth={openEditMonth} onOpenWeek={() => navigate("/app/planning/weekly")} onOpenDay={() => setView("day")} onOpenReset={() => setView("reset")} />}

    {view === "month" && selectedMonthPlan && <MonthDetail plan={selectedMonthPlan} snapshot={snapshot} todayKey={todayKey} anchorDate={anchorDate} calendarDates={calendarDates} monthMode={monthMode} reflection={reflection} reflectionSaved={reflectionSaved} readOnly={!isTrialPlanningMonthAllowed(access, selectedMonthPlan.periodKey)} onBack={() => { setView("year"); setSelectedMonthId(null); }} onEdit={() => openEditMonth(selectedMonthPlan)} onDelete={async () => { const month = capitalize(formatDate(monthDate(selectedMonthPlan.periodKey), { month: "long", year: "numeric" })); if (!window.confirm(m("planning.deleteMonth.confirm", { month }))) return; await planner.deleteCascadePlan(selectedMonthPlan.id); setSelectedMonthId(null); setView("year"); }} onMonthMode={setMonthMode} onSelectDay={(key) => { setSelectedDate(key); setView("day"); }} onTogglePriority={(index) => planner.toggleCascadeObjective(selectedMonthPlan.id, index)} onReflectionChange={(next) => { setReflection(next); setReflectionSaved(false); }} onSaveReflection={saveReflection} onPlanWeek={() => navigate("/app/planning/weekly")} />}
    {view === "month" && !selectedMonthPlan && <EmptyState title={m("planning.missingMonth.title")} text={m("planning.missingMonth.description")} action={<Button onClick={() => setView("year")}>{m("planning.common.backToMonths")}</Button>} />}

    {view === "week" && <WeeklyPlanView planner={planner} access={access} anchorDate={anchorDate} todayKey={todayKey} reviewInitiallyOpen={new URLSearchParams(location.search).get("reset") === "1"} onAnchorDateChange={setAnchorDate} onBack={() => navigate("/app/planning")} onEditTask={openTaskEditor} />}

    {view === "day" && <><PlanningSubheader title={m("planning.day.title")} description={m("planning.day.description")} onBack={() => setView("year")} />{selectedDateReadOnly && <Card className="month-readonly-notice" role="status"><Lock size={20} aria-hidden="true" /><div><h2>{m("planning.day.readOnlyTitle")}</h2><p>{m("planning.trial.limit")}</p></div></Card>}<Card className="daily-schedule-card daily-date-plan"><header><div><p className="eyebrow">{m("planning.day.actions")}</p><h2>{capitalize(formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long" }))}</h2></div><input type="date" aria-label={m("planning.day.dateLabel")} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></header>{!selectedDateReadOnly && <button type="button" className="task-manager-add task-manager-add--button" onClick={() => onQuickCapture({ source: "today", date: selectedDate })}><Plus size={16} /><span>{m("planning.day.addAction")}</span><strong>{m("planning.day.add")}</strong></button>}<div className="daily-priority-list">{snapshot.tasks.filter((task) => task.date === selectedDate && task.status !== "cancelled").sort((a, b) => (a.focusPriority ?? 9) - (b.focusPriority ?? 9)).map((task) => { const readOnly = selectedDateReadOnly ? m("planning.day.readOnlySuffix") : ""; return <div key={task.id} className={task.status === "completed" ? "is-complete" : ""}><button type="button" disabled={selectedDateReadOnly} onClick={() => planner.toggleTask(task.id)} aria-label={m(task.status === "completed" ? "planning.day.reopenTask" : "planning.day.completeTask", { task: task.title, readOnly })}>{task.status === "completed" ? <Check size={15} /> : <Circle size={15} />}</button><button type="button" disabled={selectedDateReadOnly} onClick={() => openTaskEditor(task)}><strong data-no-translate="true" translate="no">{task.title}</strong><small data-no-translate="true" translate="no">{taskProvenance(snapshot, task, m, formatDate)}</small></button><button type="button" disabled={selectedDateReadOnly} onClick={() => openTaskEditor(task)} aria-label={m("planning.day.editTask", { task: task.title, readOnly })}><Edit3 size={14} /></button></div>; })}{!snapshot.tasks.some((task) => task.date === selectedDate && task.status !== "cancelled") && <EmptyState title={m(selectedDateReadOnly ? "planning.day.emptyReadOnlyTitle" : "planning.day.emptyTitle")} text={m(selectedDateReadOnly ? "planning.day.emptyReadOnlyDescription" : "planning.day.emptyDescription")} />}</div></Card></>}

    {view === "reset" && <><PlanningSubheader title={m("planning.reset.title")} description={m("planning.reset.description")} onBack={() => setView("year")} /><div className="monthly-reset-grid"><Card className="reset-reflection"><RotateCcw size={22} /><p className="eyebrow">{m("planning.reset.period", { month: capitalize(formatDate(anchorDate, { month: "long", year: "numeric" })) })}</p><h2>{m("planning.reset.heading")}</h2><div className="monthly-reset-questions">{([["advanced", m("planning.reset.question.advanced")], ["learned", m("planning.reset.question.learned")], ["release", m("planning.reset.question.release")], ["adjust", m("planning.reset.question.adjust")], ["next", m("planning.reset.question.next")]] as const).map(([key,label]) => <label key={key}><span>{label}</span><textarea required={key === "advanced"} rows={3} value={monthlyReset[key]} onChange={(event) => { setMonthlyReset({ ...monthlyReset, [key]: event.target.value }); setMonthlyResetSaved(false); }} /></label>)}</div><Button onClick={saveReset}><Save size={16} /> {m("planning.reset.save")}</Button>{monthlyResetSaved && <div className="reset-next-actions" role="status"><strong>{m("planning.reset.ready")}</strong><Button onClick={() => openCreateMonth()}>{m("planning.reset.prepareMonth")}</Button><Button variant="secondary" onClick={() => setView("week")}>{m("planning.reset.prepareWeek")}</Button></div>}</Card><div className="reset-summary"><Card className="brain-summary-card"><Sparkles size={23} /><div><p className="eyebrow">{m("planning.reset.plannerEyebrow")}</p><strong>{plannerStats}</strong><span>{m("planning.reset.plannerNote")}</span></div></Card><Card className="brain-summary-card"><Sparkles size={23} /><div><p className="eyebrow">{m("planning.reset.inboxEyebrow")}</p><strong>{inboxStats}</strong><span>{brainSummary.pending ? m("planning.reset.inboxPending", { pending: formatNumber(brainSummary.pending) }) : m("planning.reset.inboxClear")}</span></div></Card><Card className="release-note"><p>{m("planning.reset.carryTitle")}</p><span>{m("planning.reset.carryDescription")}</span></Card></div></div></>}

    <Modal explicitI18n open={Boolean(longTermMode)} title={m(longTermMode === "five" ? "planning.longTerm.fiveTitle" : "planning.longTerm.threeTitle")} description={m(longTermMode === "five" ? "planning.longTerm.fiveDescription" : "planning.longTerm.threeDescription")} onClose={() => setLongTermMode(null)}><form className="form-grid long-term-form" onSubmit={saveLongTerm}><label className="form-field form-field--full"><span>{m(longTermMode === "five" ? "planning.longTerm.fiveQuestion" : "planning.longTerm.threeQuestion")}</span><textarea rows={5} value={longTermSummary} onChange={(event) => setLongTermSummary(event.target.value)} placeholder={m("planning.longTerm.placeholder")} /></label><fieldset className="form-field form-field--full priority-stack"><legend>{m(longTermMode === "five" ? "planning.longTerm.fivePriorities" : "planning.longTerm.threePriorities")}</legend>{longTermPriorities.map((value, index) => <input key={index} value={value} onChange={(event) => setLongTermPriorities((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={m("planning.longTerm.priorityPlaceholder", { number: index + 1 })} />)}</fieldset>{longTermMode === "five" && <fieldset className="form-field form-field--full five-year-areas"><legend>{m("planning.longTerm.areaDetails")}</legend>{fiveYearAreas.map(([key, labelKey]) => <label key={key}><span>{m(labelKey)}</span><textarea rows={2} value={fiveYearDetails[key] ?? ""} onChange={(event) => setFiveYearDetails((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</fieldset>}<div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setLongTermMode(null)}>{m("planning.common.cancel")}</Button><Button type="submit"><Save size={16} /> {m("planning.common.save")}</Button></div></form></Modal>

    <Modal explicitI18n open={monthModalOpen} title={m(editingMonthId ? "planning.monthDialog.editTitle" : "planning.monthDialog.createTitle", { month: monthDraftLabel, year: monthDraft.year })} description={m("planning.monthDialog.description")} onClose={() => setMonthModalOpen(false)}>
      <form className="form-grid month-create-form" onSubmit={saveMonth}>
        <div className="month-period-summary form-field--full" aria-label={m("planning.monthDialog.planLabel", { month: monthDraftLabel, year: monthDraft.year })}><CalendarDays size={19} /><strong>{monthDraftLabel} {monthDraft.year}</strong></div>
        <label className="form-field form-field--full"><span>{m("planning.monthDialog.activeGoal")}</span><select value={monthDraft.sourceGoalId} onChange={(event) => { const sourceGoalId = event.target.value; const goal = snapshot.goals.find((item) => item.id === sourceGoalId); setMonthDraft((current) => ({ ...current, sourceGoalId, focus: current.focus || goal?.title || "" })); }}><option value="">{m("planning.monthDialog.noLinkedGoal")}</option>{snapshot.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id} data-no-translate="true" translate="no">{goal.title}</option>)}</select></label>
        {monthDraft.sourceGoalId && <Card className="month-goal-context form-field--full"><Check size={17} /><div><p className="eyebrow">{m("planning.monthDialog.goalContext")}</p><strong data-no-translate="true" translate="no">{snapshot.goals.find((goal) => goal.id === monthDraft.sourceGoalId)?.title}</strong><small>{m("planning.monthDialog.goalConnection")}</small></div></Card>}
        <label className="form-field form-field--full"><span>{m("planning.monthDialog.result")}</span><input value={monthDraft.focus} onChange={(event) => setMonthDraft({ ...monthDraft, focus: event.target.value })} placeholder={m("planning.monthDialog.resultPlaceholder")} /></label>
        <fieldset className="form-field form-field--full priority-stack"><legend>{m("planning.monthDialog.priorities")}</legend>{monthDraft.priorities.map((value, index) => <input key={index} value={value} onChange={(event) => setMonthDraft({ ...monthDraft, priorities: monthDraft.priorities.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} placeholder={m("planning.longTerm.priorityPlaceholder", { number: index + 1 })} />)}</fieldset>
        {threeYearPlan?.objectives.length ? <label className="form-field form-field--full"><span>{m("planning.monthDialog.linkThreeYear")}</span><select value={monthDraft.linkedPriority} onChange={(event) => setMonthDraft({ ...monthDraft, linkedPriority: event.target.value })}><option value="">{m("planning.monthDialog.noConnection")}</option>{threeYearPlan.objectives.map((priority) => <option key={priority} value={priority} data-no-translate="true" translate="no">{priority}</option>)}</select></label> : null}
        <fieldset className="form-field form-field--full month-area-goals"><legend>{m("planning.monthDialog.areaGoals")}</legend>{snapshot.lifeAreas.filter((area) => area.active).map((area) => { const selected = monthDraft.areaIds.includes(area.id); return <div key={area.id}><label><input type="checkbox" checked={selected} onChange={() => setMonthDraft((current) => ({ ...current, areaIds: selected ? current.areaIds.filter((id) => id !== area.id) : [...current.areaIds, area.id] }))} /><span data-no-translate="true" translate="no">{area.name}</span></label>{selected ? <input value={monthDraft.areaGoals[area.id] ?? ""} onChange={(event) => setMonthDraft((current) => ({ ...current, areaGoals: { ...current.areaGoals, [area.id]: event.target.value } }))} placeholder={m("planning.monthDialog.areaGoalPlaceholder", { area: area.name })} aria-label={m("planning.monthDialog.areaGoalLabel", { area: area.name })} /> : null}</div>; })}</fieldset>
        <fieldset className="form-field form-field--full month-entry-list"><legend>{m("planning.monthDialog.actions")}</legend><small>{m("planning.monthDialog.actionsDescription")}</small>{monthDraft.actions.map((item, index) => <div key={item.taskId ?? `action-${index}`}><input value={item.title} onChange={(event) => updateMonthEntry("actions", index, { title: event.target.value })} placeholder={m("planning.monthDialog.actionPlaceholder")} aria-label={m("planning.monthDialog.actionLabel", { number: index + 1 })} /><input type="date" min={trialDateBounds?.min} max={trialDateBounds?.max} value={item.date} onChange={(event) => updateMonthEntry("actions", index, { date: event.target.value })} aria-label={m("planning.monthDialog.actionDateLabel", { number: index + 1 })} /></div>)}<Button type="button" variant="ghost" onClick={() => addMonthEntry("actions")}><Plus size={15} /> {m("planning.monthDialog.addAction")}</Button></fieldset>
        <fieldset className="form-field form-field--full month-entry-list"><legend>{m("planning.monthDialog.importantDates")}</legend>{monthDraft.importantDates.map((item, index) => <div key={`date-${index}`}><input value={item.title} onChange={(event) => updateMonthEntry("importantDates", index, { title: event.target.value })} placeholder={m("planning.monthDialog.importantDatePlaceholder")} aria-label={m("planning.monthDialog.importantDateLabel", { number: index + 1 })} /><input type="date" min={trialDateBounds?.min} max={trialDateBounds?.max} value={item.date} onChange={(event) => updateMonthEntry("importantDates", index, { date: event.target.value })} aria-label={m("planning.monthDialog.importantDateDayLabel", { number: index + 1 })} /></div>)}<Button type="button" variant="ghost" onClick={() => addMonthEntry("importantDates")}><Plus size={15} /> {m("planning.monthDialog.addDate")}</Button></fieldset>
        {editingMonthId ? <label className="form-field form-field--full"><span>{m("planning.monthDialog.status")}</span><select value={monthDraft.status} onChange={(event) => setMonthDraft({ ...monthDraft, status: event.target.value as MonthDraft["status"] })}><option value="active">{m("planning.monthDialog.status.active")}</option><option value="draft">{m("planning.monthDialog.status.draft")}</option><option value="closed">{m("planning.monthDialog.status.closed")}</option></select></label> : null}
        {monthError ? <p className="form-error form-field--full" role="alert">{m(monthError)}</p> : null}
        <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setMonthModalOpen(false)}>{m("planning.common.cancel")}</Button><Button type="submit">{m("planning.monthDialog.save")}</Button></div>
      </form>
    </Modal>
    <Modal explicitI18n open={Boolean(editingTaskId)} title={m("planning.taskDialog.title")} description={m("planning.taskDialog.description")} onClose={() => setEditingTaskId(null)}>
      <form className="form-grid" onSubmit={saveTaskEdit}>
        <label className="form-field form-field--full"><span>{m("planning.common.action")}</span><input autoFocus required minLength={2} value={taskEdit.title} onChange={(event) => setTaskEdit({ ...taskEdit, title: event.target.value })} /></label>
        <label className="form-field"><span>{m("planning.common.date")}</span><input type="date" min={trialDateBounds?.min} max={trialDateBounds?.max} value={taskEdit.date} onChange={(event) => setTaskEdit({ ...taskEdit, date: event.target.value })} /></label>
        <label className="form-field"><span>{m("planning.common.goal")}</span><select value={taskEdit.goalId} onChange={(event) => setTaskEdit({ ...taskEdit, goalId: event.target.value })}><option value="">{m("planning.common.noGoal")}</option>{snapshot.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id} data-no-translate="true" translate="no">{goal.title}</option>)}</select></label>
        <label className="form-field"><span>{m("planning.common.project")}</span><select value={taskEdit.projectId} onChange={(event) => setTaskEdit({ ...taskEdit, projectId: event.target.value })}><option value="">{m("planning.common.noProject")}</option>{snapshot.projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id} data-no-translate="true" translate="no">{project.name}</option>)}</select></label>
        {taskError && <p className="form-error form-field--full" role="alert">{m(taskError)}</p>}
        <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setEditingTaskId(null)}>{m("planning.common.cancel")}</Button><Button type="submit"><Save size={15} /> {m("planning.taskDialog.save")}</Button></div>
      </form>
    </Modal>
  </div>;
}

function PlanningOverview({ access, snapshot, fiveYearPlan, threeYearPlan, monthSlots, selectedYear, availableYears, todayKey, onYearChange, onAddPlan, onEditLongTerm, onOpenMonth, onEditMonth, onOpenWeek, onOpenDay, onOpenReset }: { access: UserAccess; snapshot: PlannerSnapshot; fiveYearPlan?: CascadePlan; threeYearPlan?: CascadePlan; monthSlots: ReturnType<typeof buildYearMonthSlots>; selectedYear: number; availableYears: number[]; todayKey: string; onYearChange: (year: number) => void; onAddPlan: (periodKey: string) => void; onEditLongTerm: (mode: LongTermMode) => void; onOpenMonth: (plan: CascadePlan) => void; onEditMonth: (plan: CascadePlan) => void; onOpenWeek: () => void; onOpenDay: () => void; onOpenReset: () => void }) {
  const { m, formatDate, formatNumber } = useI18n();
  const fiveYearCard = <Card className="direction-card"><div className="direction-card__icon"><Sparkles size={21} /></div><div><p className="eyebrow">{m("planning.overview.fiveEyebrow")}</p><h2>{m("planning.longTerm.fiveTitle")}</h2>{fiveYearPlan?.intention ? <p data-no-translate="true" translate="no">{fiveYearPlan.intention}</p> : <p>{m("planning.overview.fiveDescription")}</p>}{fiveYearPlan?.objectives.length ? <ul data-no-translate="true" translate="no">{fiveYearPlan.objectives.map((item) => <li key={item}>{item}</li>)}</ul> : null}</div><Button variant="secondary" onClick={() => onEditLongTerm("five")}><Edit3 size={15} /> {m(fiveYearPlan ? "planning.common.edit" : "planning.overview.defineVision")}</Button></Card>;
  const currentYear = new Date().getFullYear();
  return <>
    <SectionHeading eyebrow={m("planning.overview.eyebrow")} title={m("planning.overview.title")} description={m("planning.overview.description")} />
    <section className="planning-direction-grid" aria-label={m("planning.overview.directionLabel")}>{canAccessFeature(access, "five_year_planning") ? fiveYearCard : <PremiumFeatureGate access={access} feature="five_year_planning" compact>{fiveYearCard}</PremiumFeatureGate>}<Card className="direction-card"><div className="direction-card__icon"><ListChecks size={21} /></div><div><p className="eyebrow">{m("planning.overview.threeEyebrow")}</p><h2>{m("planning.longTerm.threeTitle")}</h2>{threeYearPlan?.intention ? <p data-no-translate="true" translate="no">{threeYearPlan.intention}</p> : <p>{m("planning.overview.threeDescription")}</p>}{threeYearPlan?.objectives.length ? <ol data-no-translate="true" translate="no">{threeYearPlan.objectives.map((item) => <li key={item}>{item}</li>)}</ol> : null}</div><Button variant="secondary" onClick={() => onEditLongTerm("three")}><Edit3 size={15} /> {m(threeYearPlan ? "planning.common.edit" : "planning.overview.addPriorities")}</Button></Card></section>
    <section className="my-months-section" aria-labelledby="my-months-title">
      <header className="my-months-header"><div><p className="eyebrow">{m("planning.months.eyebrow")}</p><h2 id="my-months-title">{m("planning.months.title")}</h2><p>{m("planning.months.description")}</p></div><div><label><span>{m("planning.months.year")}</span><select value={selectedYear} onChange={(event) => onYearChange(Number(event.target.value))}>{availableYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>{selectedYear === currentYear ? <Button variant="outline" onClick={() => document.getElementById(`month-${monthPeriodKey(currentYear, new Date().getMonth())}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>{m("planning.months.viewCurrent")}</Button> : null}</div></header>
      <div className="created-month-grid">{monthSlots.map((slot) => {
        const plan = slot.plan;
        const monthLabel = capitalize(formatDate(new Date(selectedYear, slot.monthIndex, 1), { month: "long" }));
        const monthIdeas = snapshot.brainDumpItems.filter((item) => item.status !== "released" && item.tentativeDate?.startsWith(slot.periodKey));
        const monthAllowed = isTrialPlanningMonthAllowed(access, slot.periodKey);
        if (!plan && !monthAllowed) return <Card id={`month-${slot.periodKey}`} className="created-month-card month-card--empty month-card--locked" key={slot.periodKey}><div className="month-card-main month-card-empty-action" aria-label={m("planning.months.lockedLabel", { month: monthLabel, year: selectedYear })}><header><div><span>{monthLabel}</span><strong>{selectedYear}</strong></div><Lock size={17} aria-hidden="true" /></header><div className="month-card-empty-copy"><Lock size={22} aria-hidden="true" /><h3>{m("planning.months.premiumAvailable")}</h3><small>{m("planning.months.trialHorizon")}</small><Link className="button button--outline" to="/upgrade">{m("planning.common.unlockPremium")}</Link></div></div></Card>;
        if (!plan) return <Card id={`month-${slot.periodKey}`} className={`created-month-card month-card--empty ${slot.isCurrent ? "is-current" : ""}`} key={slot.periodKey}><button type="button" className="month-card-main month-card-empty-action" onClick={() => onAddPlan(slot.periodKey)} aria-label={m("planning.months.addPlanLabel", { month: monthLabel, year: selectedYear })}><header><div><span>{monthLabel}</span><strong>{selectedYear}</strong></div>{slot.isCurrent ? <Badge tone="rose">{m("planning.monthState.current")}</Badge> : null}</header><div className="month-card-empty-copy"><CalendarDays size={22} /><h3>{m("planning.months.question")}</h3>{monthIdeas.length ? <small>{m(monthIdeas.length === 1 ? "planning.months.linkedIdea" : "planning.months.linkedIdeas", { count: formatNumber(monthIdeas.length) })}</small> : null}<span><Plus size={15} /> {m("planning.months.addPlan")}</span></div></button></Card>;
        const progress = monthProgress(plan);
        const completed = plan.completedObjectiveIndexes?.length ?? 0;
        const areas = snapshot.lifeAreas.filter((area) => plan.areaIds?.includes(area.id));
        const datedEntries = [
          ...plan.activities.filter((activity) => activity.date),
          ...snapshot.tasks.filter((task) => task.periodPlanId === plan.id && task.date && task.status !== "cancelled").map((task) => ({ id: task.id, title: task.title, date: task.date, type: "action" as const })),
          ...snapshot.events.filter((event) => event.startDate.startsWith(slot.periodKey)).map((event) => ({ id: event.id, title: event.title, date: event.startDate, type: "event" as const })),
        ].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
        const nextDate = datedEntries[0];
        return <Card id={`month-${slot.periodKey}`} className={`created-month-card month-card--planned ${slot.isCurrent ? "is-current" : ""}`} key={slot.periodKey}><button type="button" className="month-card-main" onClick={() => onOpenMonth(plan)} aria-label={m("planning.months.viewPlanLabel", { month: monthLabel, year: selectedYear })}><header><div><span>{monthLabel}</span><strong>{selectedYear}</strong></div>{slot.isCurrent ? <Badge tone="rose">{m("planning.monthState.current")}</Badge> : <Badge tone={monthState(plan, todayKey, m).tone}>{monthState(plan, todayKey, m).label}</Badge>}</header><div className="month-card-summary"><small>{m("planning.months.focus")}</small><h3 data-no-translate="true" translate="no">{plan.intention || plan.priority || m("planning.common.monthlyPlan")}</h3>{plan.objectives.length ? <ol data-no-translate="true" translate="no">{plan.objectives.slice(0, 3).map((priority) => <li key={priority}>{priority}</li>)}</ol> : null}{monthIdeas.length ? <p className="month-brain-link"><Sparkles size={14} /> {m(monthIdeas.length === 1 ? "planning.months.ideaFromInbox" : "planning.months.ideasFromInbox", { count: formatNumber(monthIdeas.length) })}</p> : null}{nextDate?.date ? <p className="month-next-date"><CalendarDays size={14} /> <span>{formatDate(nextDate.date, { day: "numeric", month: "long" })} · <span data-no-translate="true" translate="no">{nextDate.title}</span></span></p> : null}<div className="month-area-badges">{areas.slice(0, 3).map((area) => <Badge key={area.id} tone="warm"><span data-no-translate="true" translate="no">{area.name}</span></Badge>)}</div>{plan.objectives.length ? <><ProgressBar value={progress} label={m("planning.months.priorityProgress")} /><p className="month-progress-copy">{m("planning.months.completedPriorities", { completed: formatNumber(completed), total: formatNumber(plan.objectives.length) })}</p></> : null}</div></button><footer>{monthAllowed ? <Button variant="ghost" onClick={() => onEditMonth(plan)}><Edit3 size={15} /> {m("planning.common.edit")}</Button> : <Badge tone="warm"><Lock size={14} aria-hidden="true" /> {m("planning.common.readOnly")}</Badge>}<Button onClick={() => onOpenMonth(plan)}>{m("planning.months.viewMonth")} <ChevronRight size={15} /></Button></footer></Card>;
      })}</div>
    </section>
    <section className="short-term-tools" aria-label={m("planning.tools.label")}><Button variant="secondary" onClick={onOpenWeek}>{m("planning.tools.week")}</Button><Button variant="secondary" onClick={onOpenDay}>{m("planning.tools.day")}</Button><Button variant="ghost" onClick={onOpenReset}>{m("planning.tools.reset")}</Button></section>
  </>;
}

function MonthDetail({ plan, snapshot, todayKey, anchorDate, calendarDates, monthMode, reflection, reflectionSaved, readOnly, onBack, onEdit, onDelete, onMonthMode, onSelectDay, onTogglePriority, onReflectionChange, onSaveReflection, onPlanWeek }: { plan: CascadePlan; snapshot: PlannerSnapshot; todayKey: string; anchorDate: Date; calendarDates: Date[]; monthMode: "calendar" | "agenda"; reflection: { advanced: string; pending: string; next: string }; reflectionSaved: boolean; readOnly: boolean; onBack: () => void; onEdit: () => void; onDelete: () => void; onMonthMode: (mode: "calendar" | "agenda") => void; onSelectDay: (key: string) => void; onTogglePriority: (index: number) => void; onReflectionChange: (next: { advanced: string; pending: string; next: string }) => void; onSaveReflection: (event: FormEvent) => void; onPlanWeek: () => void }) {
  const progress = monthProgress(plan);
  const relatedAreas = snapshot.lifeAreas.filter((area) => plan.areaIds?.includes(area.id));
  const areaGoals = parseAreaGoals(plan.details?.areaGoals);
  const entries = collectMonthPlanEntries(plan, snapshot.tasks, snapshot.events);
  const { actions, events } = entries;
  const { m, formatDate } = useI18n();
  if (readOnly) return <ReadOnlyMonthDetail plan={plan} snapshot={snapshot} entries={entries} todayKey={todayKey} onBack={onBack} onPlanWeek={onPlanWeek} />;
  return <><button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16} /> {m("planning.common.backToMonths")}</button><header className="month-detail-header"><div><p className="eyebrow">{monthState(plan, todayKey, m).label}</p><h1>{capitalize(formatDate(monthDate(plan.periodKey), { month: "long", year: "numeric" }))}</h1><p data-no-translate={plan.intention ? "true" : undefined} translate={plan.intention ? "no" : undefined}>{plan.intention || m("planning.monthDetail.defaultIntention")}</p></div><div><Button variant="secondary" onClick={onEdit}><Edit3 size={16} /> {m("planning.monthDetail.edit")}</Button><Button variant="ghost" onClick={onDelete}><Trash2 size={16} /> {m("planning.common.delete")}</Button></div></header><div className="month-detail-grid"><Card className="month-focus-card"><p className="eyebrow">{m("planning.months.focus")}</p><h2 data-no-translate={plan.intention ? "true" : undefined} translate={plan.intention ? "no" : undefined}>{plan.intention || m("planning.monthDetail.undefined")}</h2>{plan.details?.linkedThreeYearPriority && <p><strong>{m("planning.monthDetail.connectsWith")}</strong> <span data-no-translate="true" translate="no">{plan.details.linkedThreeYearPriority}</span></p>}<div className="month-area-badges">{relatedAreas.map((area) => <Badge key={area.id} tone="warm"><span data-no-translate="true" translate="no">{area.name}</span></Badge>)}</div>{Object.keys(areaGoals).length ? <ul className="month-area-goal-list">{relatedAreas.filter((area) => areaGoals[area.id]).map((area) => <li key={area.id} data-no-translate="true" translate="no"><strong>{area.name}</strong><span>{areaGoals[area.id]}</span></li>)}</ul> : null}{plan.objectives.length ? <ProgressBar value={progress} label={m("planning.monthDetail.progress")} /> : null}</Card><Card className="month-priority-card"><p className="eyebrow">{m("planning.monthDetail.priorities")}</p><h2>{m("planning.monthDetail.prioritiesTitle")}</h2>{plan.objectives.length ? <div>{plan.objectives.map((priority, index) => { const completed = plan.completedObjectiveIndexes?.includes(index); return <button type="button" key={`${priority}-${index}`} className={completed ? "is-complete" : ""} onClick={() => onTogglePriority(index)}>{completed ? <Check size={16} /> : <Circle size={16} />}<span data-no-translate="true" translate="no">{priority}</span></button>; })}</div> : <p>{m("planning.monthDetail.noPriorities")}</p>}</Card></div><div className="month-support-grid"><Card><p className="eyebrow">{m("planning.monthDetail.actions")}</p><h2>{m("planning.monthDetail.actionsTitle")}</h2>{actions.length ? <ul>{actions.map((activity) => <li key={activity.id}><span data-no-translate="true" translate="no">{activity.title}</span>{activity.date && <time>{formatDate(activity.date, { day: "numeric", month: "short" })}</time>}</li>)}</ul> : <p>{m("planning.monthDetail.noActions")}</p>}</Card><Card><p className="eyebrow">{m("planning.monthDetail.events")}</p><h2>{m("planning.monthDetail.eventsTitle")}</h2>{events.length ? <ul>{events.map((event) => <li key={event.id}><CalendarDays size={15} /><span data-no-translate="true" translate="no">{event.title}</span><time>{formatDate(event.date, { day: "numeric", month: "short" })}</time></li>)}</ul> : <p>{m("planning.monthDetail.noEvents")}</p>}<Link className="button button--ghost" to="/app/life-hub?tab=calendar">{m("planning.monthDetail.goToCalendar")}</Link></Card></div><Card className="month-reflection-card"><div><p className="eyebrow">{m("planning.monthDetail.reflection")}</p><h2>{m("planning.monthDetail.reflectionTitle")}</h2></div><form onSubmit={onSaveReflection}>{([['advanced',m('planning.monthDetail.reflectionAdvanced')],['pending',m('planning.monthDetail.reflectionPending')],['next',m('planning.monthDetail.reflectionNext')]] as const).map(([key, label]) => <label key={key}><span>{label}</span><textarea rows={3} value={reflection[key]} onChange={(event) => onReflectionChange({ ...reflection, [key]: event.target.value })} /></label>)}<div><span aria-live="polite">{reflectionSaved ? m("planning.monthDetail.reflectionSaved") : ""}</span><Button type="submit"><Save size={16} /> {m("planning.monthDetail.saveReflection")}</Button></div></form></Card><div className="calendar-toolbar"><h2>{m("planning.monthDetail.calendar")}</h2><div className="calendar-mode-toggle" role="group" aria-label={m("planning.monthDetail.viewLabel")}><button type="button" className={monthMode === "calendar" ? "is-active" : ""} onClick={() => onMonthMode("calendar")}>{m("planning.monthDetail.calendarMode")}</button><button type="button" className={monthMode === "agenda" ? "is-active" : ""} onClick={() => onMonthMode("agenda")}>{m("planning.monthDetail.agendaMode")}</button></div></div>{monthMode === "calendar" && <Card className="month-calendar-card"><div className="calendar-weekdays">{calendarDates.slice(0, 7).map((date) => { const day = formatDate(date, { weekday: "short" }).replace(".", "").toUpperCase(); return <span key={toLocalDateKey(date)}>{day}</span>; })}</div><div className="month-calendar-grid">{calendarDates.map((date) => { const key = toLocalDateKey(date); const dayTasks = snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled"); const dayEvents = snapshot.events.filter((event) => event.startDate === key); return <button type="button" key={key} className={`${isSameMonth(date, anchorDate) ? "" : "is-outside"} ${key === todayKey ? "is-today" : ""}`} onClick={() => onSelectDay(key)}><span>{date.getDate()}</span>{dayEvents.slice(0, 2).map((event) => <small className="calendar-event" key={event.id} data-no-translate="true" translate="no"><CalendarDays size={12} />{event.title}</small>)}{dayTasks.slice(0, 2).map((task) => <small key={task.id} data-no-translate="true" translate="no"><Circle size={12} />{task.title}</small>)}</button>; })}</div></Card>}{monthMode === "agenda" && <Card className="month-agenda"><p className="eyebrow">{m("planning.monthDetail.agendaEyebrow")}</p><h2>{m("planning.monthDetail.agendaTitle")}</h2>{calendarDates.filter((date) => isSameMonth(date, anchorDate)).map((date) => { const key = toLocalDateKey(date); const agendaEntries = [...snapshot.events.filter((event) => event.startDate === key).map((event) => ({ id: event.id, title: event.title, kind: "event" as const })), ...snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled").map((task) => ({ id: task.id, title: task.title, kind: "task" as const }))]; if (!agendaEntries.length) return null; return <section key={key}><time>{formatDate(date, { day: "numeric", month: "long" })}</time>{agendaEntries.map((entry) => <div key={`${entry.kind}-${entry.id}`}><Circle size={12} /><span data-no-translate="true" translate="no">{entry.title}</span><small>{m(entry.kind === "event" ? "planning.monthDetail.eventKind" : "planning.monthDetail.taskKind")}</small></div>)}</section>; })}<EmptyStateIfMonthEmpty snapshot={snapshot} monthKey={plan.periodKey} /></Card>}<div className="planning-bridge"><div><p className="eyebrow">{m("planning.monthDetail.nextLevel")}</p><h2>{m("planning.monthDetail.bridgeTitle")}</h2><p>{m("planning.monthDetail.bridgeDescription")}</p></div><Button onClick={onPlanWeek}>{m("planning.monthDetail.planWeek")} <ChevronRight size={16} /></Button></div></>;
}

function ReadOnlyMonthDetail({ plan, snapshot, entries, todayKey, onBack, onPlanWeek }: { plan: CascadePlan; snapshot: PlannerSnapshot; entries: ReturnType<typeof collectMonthPlanEntries>; todayKey: string; onBack: () => void; onPlanWeek: () => void }) {
  const relatedAreas = snapshot.lifeAreas.filter((area) => plan.areaIds?.includes(area.id));
  const { actions, events } = entries;
  const { m, formatDate } = useI18n();
  return <>
    <button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16} /> {m("planning.common.backToMonths")}</button>
    <header className="month-detail-header">
      <div><p className="eyebrow">{monthState(plan, todayKey, m).label}</p><h1>{capitalize(formatDate(monthDate(plan.periodKey), { month: "long", year: "numeric" }))}</h1><p data-no-translate={plan.intention ? "true" : undefined} translate={plan.intention ? "no" : undefined}>{plan.intention || m("planning.monthDetail.defaultIntention")}</p></div>
      <div><Badge tone="warm">{m("planning.common.readOnly")}</Badge><Link className="button button--outline" to="/upgrade">{m("planning.common.unlockPremium")}</Link></div>
    </header>
    <Card className="month-readonly-notice"><Lock size={20} aria-hidden="true" /><div><h2>{m("planning.monthDetail.preservedTitle")}</h2><p>{m("planning.monthDetail.preservedDescription")}</p></div></Card>
    <div className="month-detail-grid">
      <Card className="month-focus-card"><p className="eyebrow">{m("planning.months.focus")}</p><h2 data-no-translate={plan.intention ? "true" : undefined} translate={plan.intention ? "no" : undefined}>{plan.intention || m("planning.monthDetail.undefined")}</h2><div className="month-area-badges">{relatedAreas.map((area) => <Badge key={area.id} tone="warm"><span data-no-translate="true" translate="no">{area.name}</span></Badge>)}</div>{plan.objectives.length ? <ProgressBar value={monthProgress(plan)} label={m("planning.monthDetail.progress")} /> : null}</Card>
      <Card className="month-priority-card"><p className="eyebrow">{m("planning.monthDetail.priorities")}</p><h2>{m("planning.monthDetail.prioritiesTitle")}</h2>{plan.objectives.length ? <ol data-no-translate="true" translate="no">{plan.objectives.map((priority) => <li key={priority}>{priority}</li>)}</ol> : <p>{m("planning.monthDetail.noPrioritiesReadOnly")}</p>}</Card>
    </div>
    <div className="month-support-grid">
      <Card><p className="eyebrow">{m("planning.monthDetail.actions")}</p><h2>{m("planning.monthDetail.actionsTitle")}</h2>{actions.length ? <ul>{actions.map((action) => <li key={action.id}><span data-no-translate="true" translate="no">{action.title}</span>{action.date ? <time>{formatDate(action.date, { day: "numeric", month: "short" })}</time> : null}</li>)}</ul> : <p>{m("planning.monthDetail.noActions")}</p>}</Card>
      <Card><p className="eyebrow">{m("planning.monthDetail.events")}</p><h2>{m("planning.monthDetail.eventsTitle")}</h2>{events.length ? <ul>{events.map((event) => <li key={event.id}><CalendarDays size={15} /><span data-no-translate="true" translate="no">{event.title}</span><time>{formatDate(event.date, { day: "numeric", month: "short" })}</time></li>)}</ul> : <p>{m("planning.monthDetail.noEvents")}</p>}</Card>
    </div>
    <div className="planning-bridge"><div><p className="eyebrow">{m("planning.monthDetail.nextLevel")}</p><h2>{m("planning.monthDetail.weekAvailable")}</h2><p>{m("planning.monthDetail.weekAvailableDescription")}</p></div><Button onClick={onPlanWeek}>{m("planning.monthDetail.planWeek")} <ChevronRight size={16} /></Button></div>
  </>;
}

function PlanningSubheader({ title, description, onBack }: { title: string; description: string; onBack: () => void }) { const { m } = useI18n(); return <><button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16} /> {m("planning.common.backToPlanning")}</button><SectionHeading eyebrow={m("planning.overview.title")} title={title} description={description} /></>; }
function EmptyStateIfMonthEmpty({ snapshot, monthKey }: { snapshot: PlannerSnapshot; monthKey: string }) { const { m } = useI18n(); const hasEntries = snapshot.events.some((event) => event.startDate.startsWith(monthKey)) || snapshot.tasks.some((task) => task.date?.startsWith(monthKey) && task.status !== "cancelled"); return hasEntries ? null : <p className="empty-inline">{m("planning.monthDetail.empty")}</p>; }

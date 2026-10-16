"use client";

/* eslint-disable jsx-a11y/no-autofocus -- Contextual editors open after an explicit user action. */

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useUnsavedDraft, useDraftNavigation } from "@/src/components/navigation/UnsavedDraftProvider";
import { eachDayOfInterval, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, Check, ChevronRight, Circle, Edit3, Lock, Plus, RotateCcw, Save, Sparkles, Target, Trash2 } from "lucide-react";
import type { CascadePlan, PlannerSnapshot, Task } from "@/src/domain/planner";
import { monthlyBrainDumpSummary } from "@/src/domain/cascadeRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { cascadePlanFormSchema, monthImportantDateFormSchema } from "@/src/lib/schemas";
import { collectMonthPlanEntries, monthPeriodKey, parseAreaGoals, serializeAreaGoals } from "@/src/domain/monthPlanning";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";
import type { UserAccess } from "@/src/domain/access";
import { getTrialPlanningDateBounds, isTrialPlanningDateAllowed, isTrialPlanningMonthAllowed } from "@/src/domain/access";
import type { QuickCaptureDefaults } from "@/src/features/tasks/QuickCaptureDrawer";
import { WeeklyPlanView } from "@/src/features/planning/WeeklyPlanView";
import { EditorialMonthMap } from "@/src/features/preparation/EditorialMonthMap";
import { EditorialYear } from "@/src/features/preparation/EditorialYear";
import { MonthLists } from "@/src/features/preparation/MonthLists";
import { DayAgenda } from "@/src/features/preparation/DayAgenda";
import { usePreparationOperation } from "@/src/features/preparation/PreparationShared";
import { isValidCalendarDateKey } from "@/src/domain/calendar";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { PlanningMessageKey } from "@/src/i18n/messages/features/planning";

type PlanningView = "year" | "month" | "week" | "day" | "reset";
type GoalLinkDecision = "pending" | "link" | "keep" | null;
type MonthLinkConfirmation = { goal?: string; month: string; preserved: boolean; unlinked?: boolean };


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

type MonthEntryDraft = { entryKey: string; taskId?: string; title: string; date: string };

const emptyEntry = (): MonthEntryDraft => ({ entryKey: crypto.randomUUID(), title: "", date: "" });
const emptyMonthDraft = (date = new Date()): MonthDraft => ({ month: String(date.getMonth() + 1), year: String(date.getFullYear()), focus: "", sourceGoalId: "", priorities: ["", "", ""], linkedPriority: "", areaIds: [], areaGoals: {}, actions: [emptyEntry()], importantDates: [emptyEntry()], status: "active" });
const monthDraftFromPlan = (plan: CascadePlan, snapshot: PlannerSnapshot): MonthDraft => {
  const linkedTasks = snapshot.tasks.filter((task) => task.periodPlanId === plan.id).map((task) => ({ entryKey: task.planActionKey || `task:${task.id}`, taskId: task.id, title: task.title, date: task.date ?? "" }));
  const linkedTitles = new Set(linkedTasks.map((task) => task.title));
  const legacyActions = plan.activities.filter((activity) => activity.type !== "event" && !linkedTitles.has(activity.title)).map((activity) => ({ entryKey: `activity:${activity.id}`, title: activity.title, date: activity.date ?? "" }));
  const actions = [...linkedTasks, ...legacyActions];
  const importantDates = plan.activities.filter((activity) => activity.type === "event").map((activity) => ({ entryKey: `event:${activity.id}`, title: activity.title, date: activity.date ?? "" }));
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
  const query = new URLSearchParams(location.search);
  const requestedMonth = query.get("month");
  const initialMonth = requestedMonth && isValidCalendarDateKey(requestedMonth + "-01") ? requestedMonth : todayKey.slice(0, 7);
  const initialDate = query.get("date");
  const safeInitialDate = initialDate && isValidCalendarDateKey(initialDate) ? initialDate : todayKey;
  const requestedMonthPlan = snapshot.cascadePlans.find((plan) => plan.horizon === "monthly" && plan.periodKey === initialMonth);
  const firstView = requestedView && ["year", "month", "week", "day", "reset"].includes(requestedView) ? requestedView : initialView === "month" ? "year" : initialView;
  const [view, setView] = useState<PlanningView>(firstView);
  const [anchorDate, setAnchorDate] = useState(new Date(`${safeInitialDate}T12:00:00`));
  const [selectedDate, setSelectedDate] = useState(safeInitialDate);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskEdit, setTaskEdit] = useState({ title: "", date: "", goalId: "", projectId: "", time: "", estimatedMinutes: "" });
  const [taskError, setTaskError] = useState<PlanningMessageKey | null>(null);
  const taskOperation = usePreparationOperation();
  const legacyOperation = usePreparationOperation();
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(requestedView === "month" ? requestedMonthPlan?.id || null : null);
  const [monthTab, setMonthTab] = useState<"summary" | "plan" | "lists" | "notes">("summary");
  const requestedYear = Number(query.get("year"));
  const [selectedYear, setSelectedYear] = useState(Number.isInteger(requestedYear) && requestedYear >= 1900 && requestedYear <= 2200 ? requestedYear : Number(initialMonth.slice(0, 4)));
  const [monthModalOpen, setMonthModalOpen] = useState(createMonthRequested);
  const [editingMonthId, setEditingMonthId] = useState<string | null>(createMonthRequested ? requestedMonthPlan?.id ?? null : null);
  const [monthDraft, setMonthDraft] = useState<MonthDraft>(() => {
    if (createMonthRequested && requestedMonthPlan) return monthDraftFromPlan(requestedMonthPlan, snapshot);
    const draft = emptyMonthDraft(monthDate(initialMonth));
    if (requestedGoal) { draft.focus = requestedGoal.title; draft.sourceGoalId = requestedGoal.id; draft.priorities[0] = requestedGoal.title; }
    return draft;
  });
  const [monthError, setMonthError] = useState<PlanningMessageKey | null>(null);
  const [monthBaseline, setMonthBaseline] = useState(() => JSON.stringify(monthDraft));
  const draftNavigation = useDraftNavigation();
  const [invalidImportantDateKeys, setInvalidImportantDateKeys] = useState<string[]>([]);
  const [monthSaving, setMonthSaving] = useState(false);
  const monthSaveInFlightRef = useRef(false);
  const [goalLinkDecision, setGoalLinkDecision] = useState<GoalLinkDecision>(() => requestedGoal
    ? requestedMonthPlan && requestedMonthPlan.details?.sourceGoalId !== requestedGoal.id ? "pending" : "link"
    : null);
  const [goalTargetPeriodKey, setGoalTargetPeriodKey] = useState(todayKey.slice(0, 7));
  const [monthLinkConfirmation, setMonthLinkConfirmation] = useState<MonthLinkConfirmation | null>(() => location.state?.monthLinkConfirmation ?? null);
  const [monthMode, setMonthMode] = useState<"calendar" | "agenda">("calendar");
  const [monthlyReset, setMonthlyReset] = useState({ advanced: "", learned: "", release: "", adjust: "", next: "" });
  const [monthlyResetSaved, setMonthlyResetSaved] = useState(false);
  const [reflection, setReflection] = useState({ advanced: "", pending: "", next: "" });
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const loadedReflectionId = useRef<string | null>(null);
  const [reflectionPlanId, setReflectionPlanId] = useState<string | null>(null);
  const reflectionOperation = usePreparationOperation();

  const threeYearPlan = snapshot.cascadePlans.find((plan) => plan.horizon === "three_years");
  const monthPlans = useMemo(() => snapshot.cascadePlans.filter((plan) => plan.horizon === "monthly").sort((a, b) => a.periodKey.localeCompare(b.periodKey)), [snapshot.cascadePlans]);
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
  const editingMonthPlan = editingMonthId ? monthPlans.find((plan) => plan.id === editingMonthId) : undefined;
  const existingGoalTitle = editingMonthPlan?.details?.sourceGoalTitle
    || snapshot.goals.find((goal) => goal.id === editingMonthPlan?.details?.sourceGoalId)?.title;
  const selectableGoals = snapshot.goals.filter((goal, index, goals) => (
    goal.status === "active"
    || goal.id === requestedGoal?.id
    || goal.id === monthDraft.sourceGoalId
  ) && goals.findIndex((candidate) => candidate.id === goal.id) === index);

  const clearMonthGoalRequest = (confirmation: MonthLinkConfirmation | null = null) => {
    const params = new URLSearchParams(location.search);
    params.delete("create");
    params.delete("goal");
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params}` : "" }, { replace: true, state: confirmation ? { monthLinkConfirmation: confirmation } : null });
  };

  const closeMonthDialog = () => {
    if (monthSaveInFlightRef.current) return;
    draftNavigation.request(() => { setMonthModalOpen(false); setGoalLinkDecision(null); clearMonthGoalRequest(); });
  };

  const openTaskEditor = (task: Task) => {
    if (task.date && !isTrialPlanningDateAllowed(access, task.date)) return;
    setTaskError(null);
    setEditingTaskId(task.id);
    setTaskEdit({ title: task.title, date: task.date ?? "", goalId: task.goalId ?? "", projectId: task.projectId ?? "", time: task.time || "", estimatedMinutes: task.estimatedMinutes ? String(task.estimatedMinutes) : "" });
  };

  const saveTaskEdit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!editingTaskId || !taskEdit.title.trim()) return;
    if (taskEdit.date && !isTrialPlanningDateAllowed(access, taskEdit.date)) { setTaskError("planning.trial.limit"); return; }
    const minutes = taskEdit.estimatedMinutes ? Number(taskEdit.estimatedMinutes) : undefined;
    if (minutes !== undefined && (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440)) return false;
    const ok = await taskOperation.run(() => planner.updateTask(editingTaskId, { ...taskEdit, time: taskEdit.time || undefined, estimatedMinutes: minutes }));
    if (ok) { taskGuard.markSaved(); setEditingTaskId(null); } return ok;
  };
  const calendarDates = useMemo(() => {
    const weekStartsOn = snapshot.profile?.weekStartsOn ?? 1;
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(anchorDate), { weekStartsOn }), end: endOfWeek(endOfMonth(anchorDate), { weekStartsOn }) });
  }, [anchorDate, snapshot.profile?.weekStartsOn]);

  useEffect(() => {
    if (!selectedMonthPlan || loadedReflectionId.current === selectedMonthPlan.id) return;
    loadedReflectionId.current = selectedMonthPlan.id;
    queueMicrotask(() => {
      setAnchorDate(monthDate(selectedMonthPlan.periodKey));
      setReflection({ advanced: selectedMonthPlan.reflection?.advanced ?? "", pending: selectedMonthPlan.reflection?.pending ?? "", next: selectedMonthPlan.reflection?.next ?? "" });
      setReflectionSaved(false);
      setReflectionPlanId(selectedMonthPlan.id);
    });
  }, [selectedMonthPlan]);

  useEffect(() => { if (window.matchMedia("(max-width: 700px)").matches) queueMicrotask(() => setMonthMode("agenda")); }, []);

  const openCreateMonth = (year = selectedYear, monthIndex = new Date().getMonth()) => {
    const periodKey = monthPeriodKey(year, monthIndex);
    if (!isTrialPlanningMonthAllowed(access, periodKey)) return;
    const draft = emptyMonthDraft(new Date(year, monthIndex, 1));
    if (requestedGoal) {
      draft.focus = requestedGoal.title;
      draft.sourceGoalId = requestedGoal.id;
      draft.priorities[0] = requestedGoal.title;
    }
    setEditingMonthId(null);
    setMonthDraft(draft);
    setMonthBaseline(JSON.stringify(draft));
    setGoalTargetPeriodKey(periodKey);
    setGoalLinkDecision(requestedGoal ? "link" : null);
    setMonthError(null);
    setInvalidImportantDateKeys([]);
    setMonthModalOpen(true);
  };

  const openEditMonth = (plan: CascadePlan) => {
    if (!isTrialPlanningMonthAllowed(access, plan.periodKey)) return;
    setEditingMonthId(plan.id);
    setMonthDraft(monthDraftFromPlan(plan, snapshot));
    setMonthBaseline(JSON.stringify(monthDraftFromPlan(plan, snapshot)));
    setGoalTargetPeriodKey(plan.periodKey);
    setGoalLinkDecision(requestedGoal ? plan.details?.sourceGoalId === requestedGoal.id ? "link" : "pending" : null);
    setMonthError(null);
    setInvalidImportantDateKeys([]);
    setMonthModalOpen(true);
  };

  const chooseGoalMonth = (periodKey: string) => {
    if (!/^\d{4}-\d{2}$/.test(periodKey) || !isTrialPlanningMonthAllowed(access, periodKey)) {
      setMonthError("planning.error.trialMonthEdit");
      return;
    }
    draftNavigation.request(() => {
      const plan = monthPlans.find((item) => item.periodKey === periodKey);
      setSelectedYear(Number(periodKey.slice(0, 4)));
      if (plan) openEditMonth(plan);
      else openCreateMonth(Number(periodKey.slice(0, 4)), Number(periodKey.slice(5, 7)) - 1);
    });
  };

  const applyRequestedGoal = () => {
    if (!requestedGoal) return;
    setMonthDraft((current) => ({ ...current, sourceGoalId: requestedGoal.id, focus: current.focus || requestedGoal.title }));
    setGoalLinkDecision("link");
    setMonthError(null);
  };

  const keepExistingGoal = () => {
    setMonthDraft((current) => ({ ...current, sourceGoalId: editingMonthPlan?.details?.sourceGoalId ?? "" }));
    setGoalLinkDecision("keep");
    setMonthError(null);
  };

  const saveMonth = async (event?: FormEvent) => {
    event?.preventDefault();
    if (monthSaveInFlightRef.current) return;
    setMonthError(null);
    setInvalidImportantDateKeys([]);
    const periodKey = `${monthDraft.year}-${monthDraft.month.padStart(2, "0")}`;
    if (requestedGoal && editingMonthId && goalLinkDecision === "pending") {
      setMonthError("planning.error.goalDecisionRequired");
      return;
    }
    if (!isTrialPlanningMonthAllowed(access, periodKey)) {
      setMonthError("planning.error.trialMonthEdit");
      return;
    }
    if (monthPlans.some((plan) => plan.periodKey === periodKey && plan.id !== editingMonthId)) {
      setMonthError("planning.error.monthExists");
      return;
    }
    const priorities = [...monthDraft.priorities.map((item) => item.trim()).filter(Boolean).slice(0, 3), ...(editingMonthPlan?.objectives.slice(3) ?? [])];
    const actionDrafts = monthDraft.actions.filter((item) => item.title.trim());
    const importantDateDrafts = monthDraft.importantDates.filter((item) => item.title.trim());
    const invalidImportantDates = importantDateDrafts.filter((item) => !monthImportantDateFormSchema.safeParse(item).success);
    if (invalidImportantDates.length) {
      const invalidKeys = invalidImportantDates.map((item) => item.entryKey);
      setInvalidImportantDateKeys(invalidKeys);
      setMonthError("planning.error.importantDateRequired");
      queueMicrotask(() => document.getElementById(`month-important-date-${invalidKeys[0]}`)?.focus());
      return;
    }
    const activities = importantDateDrafts.map((item) => ({ id: item.entryKey?.startsWith("event:") ? item.entryKey.slice(6) : undefined, title: item.title.trim(), date: item.date, type: "event" as const }));
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
    const details = { ...(editingMonthPlan?.details ?? {}) };
    if (monthDraft.linkedPriority) details.linkedThreeYearPriority = monthDraft.linkedPriority;
    else delete details.linkedThreeYearPriority;
    if (areaGoals) details.areaGoals = areaGoals;
    else delete details.areaGoals;
    if (monthDraft.sourceGoalId) {
      details.sourceGoalId = monthDraft.sourceGoalId;
      details.sourceGoalTitle = snapshot.goals.find((goal) => goal.id === monthDraft.sourceGoalId)?.title ?? details.sourceGoalTitle ?? "";
    } else {
      delete details.sourceGoalId;
      delete details.sourceGoalTitle;
    }
    const parsed = cascadePlanFormSchema.safeParse({ horizon: "monthly", periodKey, parentPlanId: threeYearPlan?.id, intention: monthDraft.focus, priority: priorities[0] ?? "", objectives: priorities, activities, areaIds: monthDraft.areaIds, details, status: monthDraft.status });
    if (!parsed.success) { setMonthError("planning.error.monthInvalid"); return; }
    monthSaveInFlightRef.current = true;
    setMonthSaving(true);
    try {
      const next = await planner.saveCascadePlan(parsed.data);
      const savedPlan = next.cascadePlans.find((plan) => plan.horizon === "monthly" && plan.periodKey === periodKey);
      if (savedPlan && actionDrafts.length) {
        await planner.upsertPlanActions(savedPlan.id, monthDraft.sourceGoalId || undefined, actionDrafts.map((action) => ({ taskId: action.taskId, actionKey: action.entryKey, title: action.title, date: action.date || undefined })));
      }
      setSelectedYear(Number(monthDraft.year));
      if (editingMonthId && selectedMonthId === editingMonthId && savedPlan) setSelectedMonthId(savedPlan.id);
      let confirmation: MonthLinkConfirmation | null = null;
      if (requestedGoal && savedPlan) {
        const savedGoalId = savedPlan.details?.sourceGoalId;
        const previousGoalId = editingMonthPlan?.details?.sourceGoalId;
        const preserved = savedGoalId === previousGoalId && savedGoalId !== requestedGoal.id;
        confirmation = {
          goal: savedGoalId ? snapshot.goals.find((goal) => goal.id === savedGoalId)?.title ?? savedPlan.details?.sourceGoalTitle : undefined,
          month: `${monthDraftLabel} ${monthDraft.year}`,
          preserved,
          unlinked: !savedGoalId && !preserved,
        };
        setMonthLinkConfirmation(confirmation);
      }
      monthGuard.markSaved();
      setMonthBaseline(JSON.stringify(monthDraft));
      setMonthModalOpen(false);
      setGoalLinkDecision(null);
      clearMonthGoalRequest(confirmation);
      return true;
    } catch {
      setMonthError("planning.error.monthInvalid");
    } finally {
      monthSaveInFlightRef.current = false;
      setMonthSaving(false);
    }
  };

  const openMonthDetail = (plan: CascadePlan) => { setSelectedMonthId(plan.id); setAnchorDate(monthDate(plan.periodKey)); setView("month"); navigate(`/app/planning?view=month&month=${plan.periodKey}`); };

  const saveReflection = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!selectedMonthPlan) return;
    const ok = await reflectionOperation.run(() => planner.saveCascadePlan({ horizon: "monthly", periodKey: selectedMonthPlan.periodKey, parentPlanId: selectedMonthPlan.parentPlanId, intention: selectedMonthPlan.intention, priority: selectedMonthPlan.priority, objectives: selectedMonthPlan.objectives, activities: selectedMonthPlan.activities, areaIds: selectedMonthPlan.areaIds ?? [], details: selectedMonthPlan.details, reflection, status: selectedMonthPlan.status }));
    if (ok) { reflectionGuard.markSaved(); setReflectionSaved(true); } return ok;
  };

  const saveReset = async () => {
    if (!monthlyReset.advanced.trim()) return;
    const summary = Object.values(monthlyReset).filter(Boolean).join(" · ");
    const ok = await legacyOperation.run(async () => {
      await planner.saveJournal(summary, { type: "monthly_reset", title: m("planning.reset.savedJournalTitle", { month: capitalize(formatDate(anchorDate, { month: "long", year: "numeric" })) }) });
      await planner.saveStructuredReview("monthly", monthlyReset, [monthlyReset.adjust, monthlyReset.next]);
    });
    if (ok) { resetGuard.markSaved(); setMonthlyResetSaved(true); } return ok;
  };

  const persistedTask = snapshot.tasks.find((task) => task.id === editingTaskId);
  const taskGuard = useUnsavedDraft({ dirty: Boolean(persistedTask && JSON.stringify(taskEdit) !== JSON.stringify({ title: persistedTask.title, date: persistedTask.date || "", goalId: persistedTask.goalId || "", projectId: persistedTask.projectId || "", time: persistedTask.time || "", estimatedMinutes: persistedTask.estimatedMinutes ? String(persistedTask.estimatedMinutes) : "" })), saving: taskOperation.busy, onSave: async () => Boolean(await saveTaskEdit()), onDiscard: () => setEditingTaskId(null) });
  const monthGuard = useUnsavedDraft({ dirty: monthModalOpen && JSON.stringify(monthDraft) !== monthBaseline, saving: monthSaving, onSave: async () => Boolean(await saveMonth()), onDiscard: () => setMonthModalOpen(false) });
  const reflectionBase = { advanced: selectedMonthPlan?.reflection?.advanced || "", pending: selectedMonthPlan?.reflection?.pending || "", next: selectedMonthPlan?.reflection?.next || "" };
  const reflectionGuard = useUnsavedDraft({ dirty: view === "month" && Boolean(selectedMonthPlan) && reflectionPlanId === selectedMonthPlan?.id && JSON.stringify(reflection) !== JSON.stringify(reflectionBase), saving: reflectionOperation.busy, onSave: async () => Boolean(await saveReflection()), onDiscard: () => setReflection(reflectionBase) });
  const resetGuard = useUnsavedDraft({ dirty: view === "reset" && !monthlyResetSaved && Object.values(monthlyReset).some(Boolean), saving: legacyOperation.busy, onSave: async () => Boolean(await saveReset()), onDiscard: () => setMonthlyReset({ advanced: "", learned: "", release: "", adjust: "", next: "" }) });

  const updateMonthEntry = (group: "actions" | "importantDates", index: number, patch: Partial<MonthEntryDraft>) => {
    setMonthDraft((current) => ({ ...current, [group]: current[group].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
    if (group === "importantDates") {
      const entryKey = monthDraft.importantDates[index]?.entryKey;
      if (entryKey) setInvalidImportantDateKeys((current) => current.filter((key) => key !== entryKey));
    }
    setMonthError(null);
  };

  const addMonthEntry = (group: "actions" | "importantDates") => {
    setMonthDraft((current) => ({ ...current, [group]: [...current[group], emptyEntry()] }));
  };

  return <div className="page-stack cascade-page planning-v2" data-i18n-explicit="true">
    {(taskOperation.error || legacyOperation.error) && <p role="alert">{m("preparation.error")}</p>}
    {view !== "week" && view !== "year" && <SectionNavigation section="plan" />}
    {view === "year" && query.get("view") !== "annual" && <EditorialMonthMap planner={planner} access={access} year={selectedYear} onYearChange={setSelectedYear} onCreate={(periodKey) => openCreateMonth(Number(periodKey.slice(0, 4)), Number(periodKey.slice(5, 7)) - 1)} onEdit={openEditMonth} onOpen={openMonthDetail} />}
    {monthLinkConfirmation && <Card className="planning-link-confirmation" role="status"><Check size={18} /><span>{m(monthLinkConfirmation.preserved ? "planning.monthDialog.existingPreserved" : monthLinkConfirmation.unlinked ? "planning.monthDialog.linkRemoved" : "planning.monthDialog.linkSaved", monthLinkConfirmation.preserved || monthLinkConfirmation.unlinked ? { month: monthLinkConfirmation.month } : { goal: monthLinkConfirmation.goal ?? "", month: monthLinkConfirmation.month })}</span><button type="button" onClick={() => setMonthLinkConfirmation(null)} aria-label={m("modal.close")}>×</button></Card>}
    {view === "year" && query.get("view") === "annual" && <EditorialYear planner={planner} access={access} year={selectedYear} onYearChange={(year) => { setSelectedYear(year); navigate(`/app/planning?view=annual&year=${year}`, { replace: true }); }} onCreate={(periodKey) => openCreateMonth(Number(periodKey.slice(0, 4)), Number(periodKey.slice(5, 7)) - 1)} onOpen={openMonthDetail} />}

    {view === "month" && selectedMonthPlan && <div className="prep-month-view" data-tab={monthTab}><div className="prep-category-tabs" data-i18n-explicit="true" role="group" aria-label={m("preparation.month")}>{([["summary", "preparation.summary"], ["plan", "preparation.navPlan"], ["lists", "preparation.optionalLists"], ["notes", "preparation.notes"]] as const).map(([tab, label]) => <button key={tab} aria-pressed={monthTab === tab} onClick={() => draftNavigation.request(() => setMonthTab(tab))}>{m(label)}</button>)}</div><MonthDetail plan={selectedMonthPlan} snapshot={snapshot} todayKey={todayKey} anchorDate={anchorDate} calendarDates={calendarDates} monthMode={monthMode} reflection={reflection} reflectionSaved={reflectionSaved} reflectionSaving={reflectionOperation.busy} readOnly={!isTrialPlanningMonthAllowed(access, selectedMonthPlan.periodKey)} onBack={() => navigate("/app/planning")} onEdit={() => openEditMonth(selectedMonthPlan)} onDelete={async () => { const month = capitalize(formatDate(monthDate(selectedMonthPlan.periodKey), { month: "long", year: "numeric" })); if (!window.confirm(m("planning.deleteMonth.confirm", { month }))) return; await planner.deleteCascadePlan(selectedMonthPlan.id); setSelectedMonthId(null); setView("year"); }} onMonthMode={setMonthMode} onSelectDay={(key) => draftNavigation.request(() => { setSelectedDate(key); setView("day"); })} onTogglePriority={(index) => planner.toggleCascadeObjective(selectedMonthPlan.id, index)} onReflectionChange={(next) => { setReflection(next); setReflectionSaved(false); }} onSaveReflection={saveReflection} onPlanWeek={() => navigate("/app/planning/weekly")} />{monthTab === "lists" && <MonthLists planner={planner} month={selectedMonthPlan.periodKey} readOnly={!isTrialPlanningMonthAllowed(access, selectedMonthPlan.periodKey)} />}{monthTab === "notes" && !isTrialPlanningMonthAllowed(access, selectedMonthPlan.periodKey) && <Card><h2>{m("preparation.notes")}</h2><p data-no-translate="true">{Object.values(selectedMonthPlan.reflection || {}).filter(Boolean).join("\n") || m("preparation.noFocus")}</p></Card>}</div>}
    {view === "month" && reflectionOperation.error && <p role="alert" data-i18n-explicit="true">{m("preparation.error")}</p>}
    {view === "month" && !selectedMonthPlan && <EmptyState title={m("planning.missingMonth.title")} text={m("planning.missingMonth.description")} action={<><Button onClick={() => openCreateMonth(Number(initialMonth.slice(0, 4)), Number(initialMonth.slice(5, 7)) - 1)}>{m("preparation.createPlan")}</Button><Button onClick={() => navigate("/app/planning")}>{m("planning.common.backToMonths")}</Button></>} />}

    {view === "week" && <WeeklyPlanView planner={planner} access={access} anchorDate={anchorDate} todayKey={todayKey} reviewInitiallyOpen={new URLSearchParams(location.search).get("reset") === "1"} onQuickCapture={onQuickCapture} onAnchorDateChange={(date) => draftNavigation.request(() => setAnchorDate(date))} onBack={() => navigate("/app/planning")} onEditTask={openTaskEditor} />}

    {view === "day" && <DayAgenda planner={planner} date={selectedDate} onDateChange={(date) => { setSelectedDate(date); navigate(`/app/planning?view=day&date=${date}`); }} readOnly={selectedDateReadOnly} onQuickCapture={onQuickCapture} onEditTask={openTaskEditor} taskDetail={(task) => taskProvenance(snapshot, task, m, formatDate)} />}

    {view === "reset" && <><PlanningSubheader title={m("planning.reset.title")} description={m("planning.reset.description")} onBack={() => draftNavigation.request(() => setView("year"))} /><div className="monthly-reset-grid"><Card className="reset-reflection"><RotateCcw size={22} /><p className="eyebrow">{m("planning.reset.period", { month: capitalize(formatDate(anchorDate, { month: "long", year: "numeric" })) })}</p><h2>{m("planning.reset.heading")}</h2><fieldset className="draft-fields" disabled={legacyOperation.busy}><div className="monthly-reset-questions">{([["advanced", m("planning.reset.question.advanced")], ["learned", m("planning.reset.question.learned")], ["release", m("planning.reset.question.release")], ["adjust", m("planning.reset.question.adjust")], ["next", m("planning.reset.question.next")]] as const).map(([key,label]) => <label key={key}><span>{label}</span><textarea required={key === "advanced"} rows={3} value={monthlyReset[key]} onChange={(event) => { setMonthlyReset({ ...monthlyReset, [key]: event.target.value }); setMonthlyResetSaved(false); }} /></label>)}</div><Button onClick={saveReset}><Save size={16} /> {m("planning.reset.save")}</Button>{monthlyResetSaved && <div className="reset-next-actions" role="status"><strong>{m("planning.reset.ready")}</strong><Button onClick={() => openCreateMonth()}>{m("planning.reset.prepareMonth")}</Button><Button variant="secondary" onClick={() => setView("week")}>{m("planning.reset.prepareWeek")}</Button></div>}</fieldset></Card><div className="reset-summary"><Card className="brain-summary-card"><Sparkles size={23} /><div><p className="eyebrow">{m("planning.reset.plannerEyebrow")}</p><strong>{plannerStats}</strong><span>{m("planning.reset.plannerNote")}</span></div></Card><Card className="brain-summary-card"><Sparkles size={23} /><div><p className="eyebrow">{m("planning.reset.inboxEyebrow")}</p><strong>{inboxStats}</strong><span>{brainSummary.pending ? m("planning.reset.inboxPending", { pending: formatNumber(brainSummary.pending) }) : m("planning.reset.inboxClear")}</span></div></Card><Card className="release-note"><p>{m("planning.reset.carryTitle")}</p><span>{m("planning.reset.carryDescription")}</span></Card></div></div></>}


    <Modal explicitI18n open={monthModalOpen} title={m(editingMonthId ? "planning.monthDialog.editTitle" : "planning.monthDialog.createTitle", { month: monthDraftLabel, year: monthDraft.year })} description={m("planning.monthDialog.description")} onClose={closeMonthDialog}>
      <form className="form-grid month-create-form" onSubmit={saveMonth}><fieldset className="draft-fields" disabled={monthSaving}>
        <div className="month-period-summary form-field--full" aria-label={m("planning.monthDialog.planLabel", { month: monthDraftLabel, year: monthDraft.year })}><CalendarDays size={19} /><strong>{monthDraftLabel} {monthDraft.year}</strong></div>
        {requestedGoal && <Card className="month-goal-origin form-field--full"><Target size={20} aria-hidden="true" /><div><p className="eyebrow">{m("planning.monthDialog.originEyebrow")}</p><strong data-no-translate="true" translate="no">{requestedGoal.title}</strong>{editingMonthPlan && goalLinkDecision === "pending" ? <fieldset><legend>{m("planning.monthDialog.conflictTitle")}</legend><p>{existingGoalTitle ? m("planning.monthDialog.currentGoal", { goal: existingGoalTitle }) : m("planning.monthDialog.currentGoalNone")}</p><div><Button type="button" size="sm" onClick={applyRequestedGoal}>{m("planning.monthDialog.linkRequestedGoal")}</Button><Button type="button" size="sm" variant="secondary" onClick={keepExistingGoal}>{m("planning.monthDialog.keepExisting")}</Button></div></fieldset> : <small>{goalLinkDecision === "link" ? m(editingMonthPlan?.details?.sourceGoalId === requestedGoal.id ? "planning.monthDialog.alreadyLinked" : "planning.monthDialog.goalConnection") : existingGoalTitle ? m("planning.monthDialog.currentGoal", { goal: existingGoalTitle }) : m("planning.monthDialog.currentGoalNone")}</small>}<label><span>{m("planning.monthDialog.chooseAnotherMonth")}</span><input type="month" value={goalTargetPeriodKey} min={trialDateBounds?.min.slice(0, 7)} max={trialDateBounds?.max.slice(0, 7)} onChange={(event) => chooseGoalMonth(event.target.value)} aria-label={m("planning.monthDialog.chooseMonthLabel")} /></label></div></Card>}
        <label className="form-field form-field--full"><span>{m("planning.monthDialog.activeGoal")}</span><select value={monthDraft.sourceGoalId} disabled={goalLinkDecision === "pending"} onChange={(event) => { const sourceGoalId = event.target.value; const goal = snapshot.goals.find((item) => item.id === sourceGoalId); setMonthDraft((current) => ({ ...current, sourceGoalId, focus: current.focus || goal?.title || "" })); }}><option value="">{m("planning.monthDialog.noLinkedGoal")}</option>{selectableGoals.map((goal) => <option key={goal.id} value={goal.id} data-no-translate="true" translate="no">{goal.title}</option>)}</select></label>
        {monthDraft.sourceGoalId && <Card className="month-goal-context form-field--full"><Check size={17} /><div><p className="eyebrow">{m("planning.monthDialog.goalContext")}</p><strong data-no-translate="true" translate="no">{snapshot.goals.find((goal) => goal.id === monthDraft.sourceGoalId)?.title}</strong><small>{m("planning.monthDialog.goalConnection")}</small></div></Card>}
        <label className="form-field form-field--full"><span>{m("planning.monthDialog.result")}</span><input value={monthDraft.focus} onChange={(event) => setMonthDraft({ ...monthDraft, focus: event.target.value })} placeholder={m("planning.monthDialog.resultPlaceholder")} /></label>
        <fieldset className="form-field form-field--full priority-stack"><legend>{m("planning.monthDialog.priorities")}</legend>{monthDraft.priorities.map((value, index) => <input key={index} value={value} onChange={(event) => setMonthDraft({ ...monthDraft, priorities: monthDraft.priorities.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} placeholder={m("planning.longTerm.priorityPlaceholder", { number: index + 1 })} />)}</fieldset>
        {threeYearPlan?.objectives.length ? <label className="form-field form-field--full"><span>{m("planning.monthDialog.linkThreeYear")}</span><select value={monthDraft.linkedPriority} onChange={(event) => setMonthDraft({ ...monthDraft, linkedPriority: event.target.value })}><option value="">{m("planning.monthDialog.noConnection")}</option>{threeYearPlan.objectives.map((priority) => <option key={priority} value={priority} data-no-translate="true" translate="no">{priority}</option>)}</select></label> : null}
        <fieldset className="form-field form-field--full month-area-goals"><legend>{m("planning.monthDialog.areaGoals")}</legend>{snapshot.lifeAreas.filter((area) => area.active).map((area) => { const selected = monthDraft.areaIds.includes(area.id); return <div key={area.id}><label><input type="checkbox" checked={selected} onChange={() => setMonthDraft((current) => ({ ...current, areaIds: selected ? current.areaIds.filter((id) => id !== area.id) : [...current.areaIds, area.id] }))} /><span data-no-translate="true" translate="no">{area.name}</span></label>{selected ? <input value={monthDraft.areaGoals[area.id] ?? ""} onChange={(event) => setMonthDraft((current) => ({ ...current, areaGoals: { ...current.areaGoals, [area.id]: event.target.value } }))} placeholder={m("planning.monthDialog.areaGoalPlaceholder", { area: area.name })} aria-label={m("planning.monthDialog.areaGoalLabel", { area: area.name })} /> : null}</div>; })}</fieldset>
        <fieldset className="form-field form-field--full month-entry-list"><legend>{m("planning.monthDialog.actions")}</legend><small>{m("planning.monthDialog.actionsDescription")}</small>{monthDraft.actions.map((item, index) => <div key={item.entryKey}><input value={item.title} onChange={(event) => updateMonthEntry("actions", index, { title: event.target.value })} placeholder={m("planning.monthDialog.actionPlaceholder")} aria-label={m("planning.monthDialog.actionLabel", { number: index + 1 })} /><input type="date" min={trialDateBounds?.min} max={trialDateBounds?.max} value={item.date} onChange={(event) => updateMonthEntry("actions", index, { date: event.target.value })} aria-label={m("planning.monthDialog.actionDateLabel", { number: index + 1 })} /></div>)}<Button type="button" variant="ghost" onClick={() => addMonthEntry("actions")}><Plus size={15} /> {m("planning.monthDialog.addAction")}</Button></fieldset>
        <fieldset className="form-field form-field--full month-entry-list"><legend>{m("planning.monthDialog.importantDates")}</legend>{monthDraft.importantDates.map((item, index) => { const invalid = invalidImportantDateKeys.includes(item.entryKey); const errorId = `month-important-date-${item.entryKey}-error`; return <div key={item.entryKey}><input value={item.title} onChange={(event) => updateMonthEntry("importantDates", index, { title: event.target.value })} placeholder={m("planning.monthDialog.importantDatePlaceholder")} aria-label={m("planning.monthDialog.importantDateLabel", { number: index + 1 })} /><span className="month-entry-date-field"><input id={`month-important-date-${item.entryKey}`} type="date" min={trialDateBounds?.min} max={trialDateBounds?.max} value={item.date} onChange={(event) => updateMonthEntry("importantDates", index, { date: event.target.value })} aria-label={m("planning.monthDialog.importantDateDayLabel", { number: index + 1 })} aria-required={Boolean(item.title.trim())} aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : undefined} />{invalid ? <small id={errorId} className="form-error">{m("planning.error.importantDateRequired")}</small> : null}</span></div>; })}<Button type="button" variant="ghost" onClick={() => addMonthEntry("importantDates")}><Plus size={15} /> {m("planning.monthDialog.addDate")}</Button></fieldset>
        {editingMonthId ? <label className="form-field form-field--full"><span>{m("planning.monthDialog.status")}</span><select value={monthDraft.status} onChange={(event) => setMonthDraft({ ...monthDraft, status: event.target.value as MonthDraft["status"] })}><option value="active">{m("planning.monthDialog.status.active")}</option><option value="draft">{m("planning.monthDialog.status.draft")}</option><option value="closed">{m("planning.monthDialog.status.closed")}</option></select></label> : null}
        {monthError ? <p className="form-error form-field--full" role="alert">{m(monthError)}</p> : null}
        <div className="modal__actions form-field--full"><Button type="button" variant="ghost" disabled={monthSaving} onClick={closeMonthDialog}>{m("planning.common.cancel")}</Button><Button type="submit" loading={monthSaving}>{m(monthSaving ? "planning.monthDialog.saving" : "planning.monthDialog.save")}</Button></div>
      </fieldset></form>
    </Modal>
    <Modal explicitI18n open={Boolean(editingTaskId)} title={m("planning.taskDialog.title")} description={m("planning.taskDialog.description")} onClose={() => taskGuard.request(() => setEditingTaskId(null))}>
      <form className="form-grid" onSubmit={saveTaskEdit}><fieldset className="draft-fields" disabled={taskOperation.busy}>
        <label className="form-field form-field--full"><span>{m("planning.common.action")}</span><input autoFocus required minLength={2} value={taskEdit.title} onChange={(event) => setTaskEdit({ ...taskEdit, title: event.target.value })} /></label>
        <label className="form-field"><span>{m("planning.common.date")}</span><input type="date" min={trialDateBounds?.min} max={trialDateBounds?.max} value={taskEdit.date} onChange={(event) => setTaskEdit({ ...taskEdit, date: event.target.value })} /></label>
        <label className="form-field"><span>{m("draft.taskTime")}</span><input type="time" value={taskEdit.time} onChange={(event) => setTaskEdit({ ...taskEdit, time: event.target.value })} /></label>
        <label className="form-field"><span>{m("draft.taskDuration")}</span><input type="number" min={1} max={1440} value={taskEdit.estimatedMinutes} onChange={(event) => setTaskEdit({ ...taskEdit, estimatedMinutes: event.target.value })} /></label>
        <label className="form-field"><span>{m("planning.common.goal")}</span><select value={taskEdit.goalId} onChange={(event) => setTaskEdit({ ...taskEdit, goalId: event.target.value })}><option value="">{m("planning.common.noGoal")}</option>{snapshot.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id} data-no-translate="true" translate="no">{goal.title}</option>)}</select></label>
        <label className="form-field"><span>{m("planning.common.project")}</span><select value={taskEdit.projectId} onChange={(event) => setTaskEdit({ ...taskEdit, projectId: event.target.value })}><option value="">{m("planning.common.noProject")}</option>{snapshot.projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id} data-no-translate="true" translate="no">{project.name}</option>)}</select></label>
        {taskError && <p className="form-error form-field--full" role="alert">{m(taskError)}</p>}
        <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => taskGuard.request(() => setEditingTaskId(null))}>{m("planning.common.cancel")}</Button><Button type="submit" disabled={taskOperation.busy}><Save size={15} /> {m("planning.taskDialog.save")}</Button></div>
      </fieldset></form>
    </Modal>
  </div>;
}

function MonthDetail({ plan, snapshot, todayKey, anchorDate, calendarDates, monthMode, reflection, reflectionSaved, reflectionSaving, readOnly, onBack, onEdit, onDelete, onMonthMode, onSelectDay, onTogglePriority, onReflectionChange, onSaveReflection, onPlanWeek }: { plan: CascadePlan; snapshot: PlannerSnapshot; todayKey: string; anchorDate: Date; calendarDates: Date[]; monthMode: "calendar" | "agenda"; reflection: { advanced: string; pending: string; next: string }; reflectionSaved: boolean; reflectionSaving: boolean; readOnly: boolean; onBack: () => void; onEdit: () => void; onDelete: () => void; onMonthMode: (mode: "calendar" | "agenda") => void; onSelectDay: (key: string) => void; onTogglePriority: (index: number) => void; onReflectionChange: (next: { advanced: string; pending: string; next: string }) => void; onSaveReflection: (event: FormEvent) => void; onPlanWeek: () => void }) {
  const progress = monthProgress(plan);
  const relatedAreas = snapshot.lifeAreas.filter((area) => plan.areaIds?.includes(area.id));
  const areaGoals = parseAreaGoals(plan.details?.areaGoals);
  const entries = collectMonthPlanEntries(plan, snapshot.tasks, snapshot.events);
  const { actions, events } = entries;
  const { m, formatDate: formatLocalizedDate } = useI18n();
  const formatDate = (value: Date | string | undefined, options?: Intl.DateTimeFormatOptions) => value
    ? formatLocalizedDate(value, options)
    : m("planning.monthDetail.datePending");
  if (readOnly) return <ReadOnlyMonthDetail plan={plan} snapshot={snapshot} entries={entries} todayKey={todayKey} onBack={onBack} onPlanWeek={onPlanWeek} />;
  return <><button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16} /> {m("planning.common.backToMonths")}</button><header className="month-detail-header"><div><p className="eyebrow">{monthState(plan, todayKey, m).label}</p><h1>{capitalize(formatDate(monthDate(plan.periodKey), { month: "long", year: "numeric" }))}</h1><p data-no-translate={plan.intention ? "true" : undefined} translate={plan.intention ? "no" : undefined}>{plan.intention || m("planning.monthDetail.defaultIntention")}</p></div><div><Button variant="secondary" onClick={onEdit}><Edit3 size={16} /> {m("planning.monthDetail.edit")}</Button><Button variant="ghost" onClick={onDelete}><Trash2 size={16} /> {m("planning.common.delete")}</Button></div></header><div className="month-detail-grid"><Card className="month-focus-card"><p className="eyebrow">{m("planning.months.focus")}</p><h2 data-no-translate={plan.intention ? "true" : undefined} translate={plan.intention ? "no" : undefined}>{plan.intention || m("planning.monthDetail.undefined")}</h2>{plan.details?.linkedThreeYearPriority && <p><strong>{m("planning.monthDetail.connectsWith")}</strong> <span data-no-translate="true" translate="no">{plan.details.linkedThreeYearPriority}</span></p>}<div className="month-area-badges">{relatedAreas.map((area) => <Badge key={area.id} tone="warm"><span data-no-translate="true" translate="no">{area.name}</span></Badge>)}</div>{Object.keys(areaGoals).length ? <ul className="month-area-goal-list">{relatedAreas.filter((area) => areaGoals[area.id]).map((area) => <li key={area.id} data-no-translate="true" translate="no"><strong>{area.name}</strong><span>{areaGoals[area.id]}</span></li>)}</ul> : null}{plan.objectives.length ? <ProgressBar value={progress} label={m("planning.monthDetail.progress")} /> : null}</Card><Card className="month-priority-card"><p className="eyebrow">{m("planning.monthDetail.priorities")}</p><h2>{m("planning.monthDetail.prioritiesTitle")}</h2>{plan.objectives.length ? <div>{plan.objectives.map((priority, index) => { const completed = plan.completedObjectiveIndexes?.includes(index); return <button type="button" key={`${priority}-${index}`} className={completed ? "is-complete" : ""} onClick={() => onTogglePriority(index)}>{completed ? <Check size={16} /> : <Circle size={16} />}<span data-no-translate="true" translate="no">{priority}</span></button>; })}</div> : <p>{m("planning.monthDetail.noPriorities")}</p>}</Card></div><div className="month-support-grid"><Card><p className="eyebrow">{m("planning.monthDetail.actions")}</p><h2>{m("planning.monthDetail.actionsTitle")}</h2>{actions.length ? <ul>{actions.map((activity) => <li key={activity.id}><span data-no-translate="true" translate="no">{activity.title}</span>{activity.date && <time>{formatDate(activity.date, { day: "numeric", month: "short" })}</time>}</li>)}</ul> : <p>{m("planning.monthDetail.noActions")}</p>}</Card><Card><p className="eyebrow">{m("planning.monthDetail.events")}</p><h2>{m("planning.monthDetail.eventsTitle")}</h2>{events.length ? <ul>{events.map((event) => <li key={event.id}><CalendarDays size={15} /><span data-no-translate="true" translate="no">{event.title}</span><time>{formatDate(event.date, { day: "numeric", month: "short" })}</time></li>)}</ul> : <p>{m("planning.monthDetail.noEvents")}</p>}<Link className="button button--ghost" to="/app/life-hub?tab=calendar">{m("planning.monthDetail.goToCalendar")}</Link></Card></div><Card className="month-reflection-card"><div><p className="eyebrow">{m("planning.monthDetail.reflection")}</p><h2>{m("planning.monthDetail.reflectionTitle")}</h2></div><form onSubmit={onSaveReflection}><fieldset className="draft-fields" disabled={reflectionSaving}>{([['advanced',m('planning.monthDetail.reflectionAdvanced')],['pending',m('planning.monthDetail.reflectionPending')],['next',m('planning.monthDetail.reflectionNext')]] as const).map(([key, label]) => <label key={key}><span>{label}</span><textarea rows={3} value={reflection[key]} onChange={(event) => onReflectionChange({ ...reflection, [key]: event.target.value })} /></label>)}<div><span aria-live="polite">{reflectionSaved ? m("planning.monthDetail.reflectionSaved") : ""}</span><Button type="submit"><Save size={16} /> {m("planning.monthDetail.saveReflection")}</Button></div></fieldset></form></Card><div className="calendar-toolbar"><h2>{m("planning.monthDetail.calendar")}</h2><div className="calendar-mode-toggle" role="group" aria-label={m("planning.monthDetail.viewLabel")}><button type="button" className={monthMode === "calendar" ? "is-active" : ""} onClick={() => onMonthMode("calendar")}>{m("planning.monthDetail.calendarMode")}</button><button type="button" className={monthMode === "agenda" ? "is-active" : ""} onClick={() => onMonthMode("agenda")}>{m("planning.monthDetail.agendaMode")}</button></div></div>{monthMode === "calendar" && <Card className="month-calendar-card"><div className="calendar-weekdays">{calendarDates.slice(0, 7).map((date) => { const day = formatDate(date, { weekday: "short" }).replace(".", "").toUpperCase(); return <span key={toLocalDateKey(date)}>{day}</span>; })}</div><div className="month-calendar-grid">{calendarDates.map((date) => { const key = toLocalDateKey(date); const dayTasks = snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled"); const dayEvents = snapshot.events.filter((event) => event.startDate === key); return <button type="button" key={key} className={`${isSameMonth(date, anchorDate) ? "" : "is-outside"} ${key === todayKey ? "is-today" : ""}`} onClick={() => onSelectDay(key)}><span>{date.getDate()}</span>{dayEvents.slice(0, 2).map((event) => <small className="calendar-event" key={event.id} data-no-translate="true" translate="no"><CalendarDays size={12} />{event.title}</small>)}{dayTasks.slice(0, 2).map((task) => <small key={task.id} data-no-translate="true" translate="no"><Circle size={12} />{task.title}</small>)}</button>; })}</div></Card>}{monthMode === "agenda" && <Card className="month-agenda"><p className="eyebrow">{m("planning.monthDetail.agendaEyebrow")}</p><h2>{m("planning.monthDetail.agendaTitle")}</h2>{calendarDates.filter((date) => isSameMonth(date, anchorDate)).map((date) => { const key = toLocalDateKey(date); const agendaEntries = [...snapshot.events.filter((event) => event.startDate === key).map((event) => ({ id: event.id, title: event.title, kind: "event" as const })), ...snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled").map((task) => ({ id: task.id, title: task.title, kind: "task" as const }))]; if (!agendaEntries.length) return null; return <section key={key}><time>{formatDate(date, { day: "numeric", month: "long" })}</time>{agendaEntries.map((entry) => <div key={`${entry.kind}-${entry.id}`}><Circle size={12} /><span data-no-translate="true" translate="no">{entry.title}</span><small>{m(entry.kind === "event" ? "planning.monthDetail.eventKind" : "planning.monthDetail.taskKind")}</small></div>)}</section>; })}<EmptyStateIfMonthEmpty snapshot={snapshot} monthKey={plan.periodKey} /></Card>}<div className="planning-bridge"><div><p className="eyebrow">{m("planning.monthDetail.nextLevel")}</p><h2>{m("planning.monthDetail.bridgeTitle")}</h2><p>{m("planning.monthDetail.bridgeDescription")}</p></div><Button onClick={onPlanWeek}>{m("planning.monthDetail.planWeek")} <ChevronRight size={16} /></Button></div></>;
}

function ReadOnlyMonthDetail({ plan, snapshot, entries, todayKey, onBack, onPlanWeek }: { plan: CascadePlan; snapshot: PlannerSnapshot; entries: ReturnType<typeof collectMonthPlanEntries>; todayKey: string; onBack: () => void; onPlanWeek: () => void }) {
  const relatedAreas = snapshot.lifeAreas.filter((area) => plan.areaIds?.includes(area.id));
  const { actions, events } = entries;
  const { m, formatDate: formatLocalizedDate } = useI18n();
  const formatDate = (value: Date | string | undefined, options?: Intl.DateTimeFormatOptions) => value
    ? formatLocalizedDate(value, options)
    : m("planning.monthDetail.datePending");
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

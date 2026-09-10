"use client";

/* eslint-disable jsx-a11y/no-autofocus -- Contextual editors open after an explicit user action. */
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Circle,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  ImagePlus,
  Landmark,
  Layers3,
  ListTodo,
  MoonStar,
  Plus,
  Sparkles,
  Sun,
  Pencil,
  Save,
  X,
  Utensils,
  Wrench,
} from "lucide-react";
import type { BrainDumpType } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, SectionHeading } from "@/src/components/ui/Primitives";
import { imageUploadSchema } from "@/src/lib/schemas";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ChallengesPage } from "@/src/features/challenges/ChallengesPage";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";
import type { QuickCaptureDefaults } from "@/src/features/tasks/QuickCaptureDrawer";
import { getTrialPlanningDateBounds, isTrialPlanningDateAllowed, isTrialPlanningMonthAllowed, type UserAccess } from "@/src/domain/access";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { NavigationSpaceProgressMessageKey } from "@/src/i18n/messages/features/navigation-space-progress";

type HubTab = "summary" | "lists" | "routines" | "fitness" | "challenges" | "vision" | "events";
type ListDateMode = "flexible" | "month" | "date";
type ListDraft = { title: string; dateMode: ListDateMode; date: string; goalId: string; projectId: string };

const hubTabs: Array<{ id: HubTab; labelKey: NavigationSpaceProgressMessageKey }> = [
  { id: "summary", labelKey: "space.tab.summary" },
  { id: "lists", labelKey: "space.tab.lists" },
  { id: "routines", labelKey: "space.tab.routines" },
  { id: "challenges", labelKey: "space.tab.challenges" },
  { id: "vision", labelKey: "space.tab.vision" },
  { id: "events", labelKey: "space.tab.calendar" },
];

const toolTabs = hubTabs.filter((item) => !["summary", "lists"].includes(item.id));

const spaceDestinations = [
  ["/app/habits", "space.destination.habits.title", "space.destination.habits.description", ClipboardList],
  ["/app/tasks", "space.destination.tasks.title", "space.destination.tasks.description", ListTodo],
  ["/app/journal", "space.destination.journal.title", "space.destination.journal.description", BookOpen],
  ["/app/health", "space.destination.wellbeing.title", "space.destination.wellbeing.description", HeartPulse],
  ["/app/finance", "space.destination.finances.title", "space.destination.finances.description", Landmark],
  ["/app/life-hub?tab=lists", "space.destination.inbox.title", "space.destination.inbox.description", Layers3],
  ["/app/more", "space.destination.more.title", "space.destination.more.description", Wrench],
] as const;

const listLabelKeys: Record<BrainDumpType, NavigationSpaceProgressMessageKey> = {
  wishlist: "space.list.wishlist",
  want_to_do: "space.list.wantToDo",
  must_do: "space.list.mustDo",
  shopping: "space.list.shopping",
  want_to_learn: "space.list.wantToLearn",
  want_to_read: "space.list.wantToRead",
  watch_list: "space.list.watch",
};

const eventLabelKeys = {
  medical: "space.event.category.medical",
  birthday: "space.event.category.birthday",
  social: "space.event.category.social",
  work: "space.event.category.work",
  wellness: "space.event.category.wellness",
  personal: "space.event.category.personal",
} as const satisfies Record<string, NavigationSpaceProgressMessageKey>;

async function fileToDataUrl(file: File): Promise<string> {
  imageUploadSchema.parse({ type: file.type, size: file.size });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function LifeHubPage({ planner, access, onQuickCapture }: { planner: PlannerController; access: UserAccess; onQuickCapture: (defaults: QuickCaptureDefaults) => void }) {
  const { m, formatDate } = useI18n();
  const { snapshot } = planner;
  const today = toLocalDateKey(new Date());
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const normalizedRequestedTab = requestedTab === "calendar" ? "events" : requestedTab;
  const tab = hubTabs.some((item) => item.id === normalizedRequestedTab) ? normalizedRequestedTab as HubTab : "summary";
  const [message, setMessage] = useState("");
  const [planningError, setPlanningError] = useState("");
  const [listFilter, setListFilter] = useState<"all" | BrainDumpType>("all");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ListDraft & { type: BrainDumpType }>({ title: "", dateMode: "flexible", date: "", goalId: "", projectId: "", type: "want_to_do" });
  const [convertingItemId, setConvertingItemId] = useState<string | null>(null);
  const [conversionDestination, setConversionDestination] = useState<"monthly" | "weekly" | "daily">("daily");
  const [conversionDate, setConversionDate] = useState(today);
  const [editingInboxTaskId, setEditingInboxTaskId] = useState<string | null>(null);
  const [inboxEdit, setInboxEdit] = useState({ title: "", date: "", goalId: "", projectId: "" });
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState(() => m("space.routine.defaultName"));
  const [routinePeriod, setRoutinePeriod] = useState<"am" | "afternoon" | "pm">("am");
  const [routineSteps, setRoutineSteps] = useState("");
  const [quote, setQuote] = useState("");
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [visionReminder, setVisionReminder] = useState(false);
  const [visionFrequency, setVisionFrequency] = useState<"daily" | "weekly" | "monthly" | "quarterly">("weekly");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(today);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventCategory, setEventCategory] = useState<keyof typeof eventLabelKeys>("personal");
  const [fitnessDate, setFitnessDate] = useState(today);
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [mealName, setMealName] = useState(() => m("space.fitness.mealName", { count: 1 }));
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const initialBodyCheckIn = snapshot.bodyCheckIns.find((item) => item.date === today);
  const [bodyWeight, setBodyWeight] = useState(initialBodyCheckIn?.weight ?? 0);
  const [waist, setWaist] = useState(initialBodyCheckIn?.measurements.cintura ?? 0);
  const [hip, setHip] = useState(initialBodyCheckIn?.measurements.cadera ?? 0);
  const [bodyPhoto, setBodyPhoto] = useState<string | undefined>(initialBodyCheckIn?.photoDataUrl);
  const dateBounds = getTrialPlanningDateBounds(access);
  const monthBounds = dateBounds ? { min: dateBounds.min.slice(0, 7), max: dateBounds.max.slice(0, 7) } : null;
  const canPlanDate = (date: string) => isTrialPlanningDateAllowed(access, date);
  const canPlanTentativeDate = (date: string) => date.length === 7
    ? isTrialPlanningMonthAllowed(access, date)
    : isTrialPlanningDateAllowed(access, date);

  const selectedWorkout = snapshot.workoutLogs.find((item) => item.date === fitnessDate);
  const selectedNutrition = snapshot.nutritionLogs.find((item) => item.date === fitnessDate);
  const selectedBodyCheckIn = snapshot.bodyCheckIns.find((item) => item.date === fitnessDate);
  const fitnessWeek = useMemo(() => getWeekDates(new Date(`${fitnessDate}T12:00:00`), snapshot.profile?.weekStartsOn ?? 1), [fitnessDate, snapshot.profile?.weekStartsOn]);
  const fitnessWeekStart = toLocalDateKey(fitnessWeek[0]);
  const fitnessWeekEnd = toLocalDateKey(fitnessWeek[6]);
  const weeklyWorkoutLogs = snapshot.workoutLogs.filter((item) => item.date >= fitnessWeekStart && item.date <= fitnessWeekEnd);
  const weeklyExerciseCount = weeklyWorkoutLogs.reduce((total, log) => total + log.exercises.length, 0);
  const dailyMacros = (selectedNutrition?.meals ?? []).reduce((total, meal) => ({
    calories: total.calories + (meal.calories ?? 0), protein: total.protein + (meal.protein ?? 0),
    carbs: total.carbs + (meal.carbs ?? 0), fat: total.fat + (meal.fat ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const selectTab = (nextTab: HubTab) => {
    setSearchParams(nextTab === "summary" ? {} : { tab: nextTab });
  };
  const openInboxCapture = () => {
    if (tab !== "lists") setSearchParams({ tab: "lists" });
    onQuickCapture({ source: "inbox" });
  };

  const selectFitnessDate = (nextDate: string) => {
    const resolvedDate = nextDate || today;
    const checkIn = snapshot.bodyCheckIns.find((item) => item.date === resolvedDate);
    setFitnessDate(resolvedDate); setBodyWeight(checkIn?.weight ?? 0); setWaist(checkIn?.measurements.cintura ?? 0);
    setHip(checkIn?.measurements.cadera ?? 0); setBodyPhoto(checkIn?.photoDataUrl);
  };

  const visibleBrainItems = snapshot.brainDumpItems.filter((item) => listFilter === "all" || item.type === listFilter);
  const inboxTasks = snapshot.tasks.filter((task) => task.status === "inbox");

  const addRoutine = async (event: FormEvent) => {
    event.preventDefault();
    const steps = routineSteps.split("\n").map((item) => item.trim()).filter(Boolean);
    if (!routineName.trim() || !steps.length) return;
    const input = { name: routineName, period: routinePeriod, scheduledDays: editingRoutineId ? snapshot.routines.find((routine) => routine.id === editingRoutineId)?.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6], steps };
    if (editingRoutineId) await planner.updateRoutine(editingRoutineId, input);
    else await planner.createRoutine(input);
    setRoutineSteps("");
    setEditingRoutineId(null);
    setMessage(m("space.message.routineSaved"));
  };

  const addVisionItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!quote.trim() && !visionImage) return setMessage(m("space.message.visionRequired"));
    await planner.createVisionBoardItem({
      type: visionImage && quote.trim() ? "mixed" : visionImage ? "image" : "quote",
      content: visionImage || quote.trim(),
      caption: visionImage && quote.trim() ? quote.trim() : undefined,
      reminderEnabled: visionReminder,
      reminderFrequency: visionReminder ? visionFrequency : undefined,
    });
    setQuote(""); setVisionImage(null); setMessage(m("space.message.visionAdded"));
  };

  const uploadVisionImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setVisionImage(dataUrl);
      setMessage(m("space.message.imageReady"));
    } catch (error) {
      setMessage(m(error instanceof Error ? "space.message.imageInvalid" : "space.message.imageUnreadable"));
    }
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      setMessage(m("space.message.notificationsUnsupported"));
      return;
    }
    const permission = await Notification.requestPermission();
    setMessage(permission === "granted" ? m("space.message.notificationsEnabled") : m("space.message.notificationsLater"));
    if (permission === "granted") new Notification(m("space.notification.title"), { body: snapshot.visionBoardItems.find((item) => item.reminderEnabled)?.content || m("space.notification.body") });
  };

  const addEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!eventTitle.trim()) return;
    if (!canPlanDate(eventDate)) { setPlanningError(m("space.trialPlanningLimit")); return; }
    setPlanningError("");
    const input = { title: eventTitle, startDate: eventDate, category: eventCategory };
    if (editingEventId) await planner.updateEvent(editingEventId, input);
    else await planner.createEvent(input);
    setEventTitle("");
    setEditingEventId(null);
    setMessage(m("space.message.eventSaved"));
  };

  const openItemEditor = (itemId: string) => {
    const item = snapshot.brainDumpItems.find((candidate) => candidate.id === itemId);
    if (!item) return;
    if (item.tentativeDate && !canPlanTentativeDate(item.tentativeDate)) { setPlanningError(m("space.trialPlanningLimit")); return; }
    setPlanningError("");
    setEditingItemId(item.id);
    setEditDraft({ title: item.title, type: item.type, dateMode: item.tentativeDate?.length === 10 ? "date" : item.tentativeDate?.length === 7 ? "month" : "flexible", date: item.tentativeDate ?? "", goalId: item.goalId ?? "", projectId: item.projectId ?? "" });
  };

  const saveItemEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingItemId || !editDraft.title.trim()) return;
    if (editDraft.dateMode !== "flexible" && editDraft.date && !canPlanTentativeDate(editDraft.date)) { setPlanningError(m("space.trialPlanningLimit")); return; }
    setPlanningError("");
    await planner.updateBrainDumpItem(editingItemId, { title: editDraft.title, type: editDraft.type, tentativeDate: editDraft.dateMode === "flexible" ? null : editDraft.date || null, goalId: editDraft.goalId || null, projectId: editDraft.projectId || null });
    setEditingItemId(null);
    setMessage(m("space.message.ideaUpdated"));
  };

  const convertBrainItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!convertingItemId || !conversionDate) return;
    const date = conversionDestination === "monthly"
      ? conversionDate === today.slice(0, 7) ? today : `${conversionDate}-01`
      : conversionDate;
    if (!canPlanDate(date)) { setPlanningError(m("space.trialPlanningLimit")); return; }
    setPlanningError("");
    await planner.scheduleBrainDumpItem(convertingItemId, date, conversionDestination);
    setConvertingItemId(null);
    const destination = m(conversionDestination === "monthly" ? "space.destination.month" : conversionDestination === "weekly" ? "space.destination.week" : "space.destination.today");
    setMessage(m("space.message.converted", { destination, date }));
  };

  const saveInboxEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingInboxTaskId || !inboxEdit.title.trim()) return;
    if (inboxEdit.date && !canPlanDate(inboxEdit.date)) { setPlanningError(m("space.trialPlanningLimit")); return; }
    setPlanningError("");
    await planner.updateTask(editingInboxTaskId, inboxEdit);
    setEditingInboxTaskId(null);
    setMessage(inboxEdit.date ? m("space.message.actionScheduled", { date: inboxEdit.date }) : m("space.message.inboxUpdated"));
  };

  const addWorkout = async (event: FormEvent) => {
    event.preventDefault();
    if (!exercise.trim()) return;
    await planner.saveWorkout({ date: fitnessDate, exercise, sets, reps, weight, goal: m("space.fitness.weeklyProgress") });
    setExercise("");
  };

  const addMeal = async (event: FormEvent) => {
    event.preventDefault();
    await planner.saveMeal({ date: fitnessDate, name: mealName, calories, protein, carbs, fat });
    setMealName(m("space.fitness.mealName", { count: (selectedNutrition?.meals.length ?? 0) + 2 }));
  };

  const saveBody = async (event: FormEvent) => {
    event.preventDefault();
    await planner.saveBodyCheckIn({ date: fitnessDate, weight: bodyWeight || undefined, waist: waist || undefined, hip: hip || undefined, photoDataUrl: bodyPhoto });
    setMessage(m("space.message.bodySaved"));
  };

  const bodyPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setBodyPhoto(await fileToDataUrl(file)); } catch { setMessage(m("space.message.photoUnreadable")); }
  };

  return (
    requestedTab === "fitness" ? <Navigate to="/app/health" replace /> : requestedTab === "calendar" ? <Navigate to="/app/life-hub?tab=events" replace /> :
    <div className="page-stack life-hub-page" data-i18n-explicit="true">
      <SectionNavigation section="space" />
      <SectionHeading eyebrow={m(tab === "summary" ? "space.header.summary.eyebrow" : tab === "lists" ? "space.header.lists.eyebrow" : "space.header.tools.eyebrow")} title={m(tab === "summary" ? "space.header.summary.title" : tab === "lists" ? "space.header.lists.title" : "space.header.tools.title")} description={m(tab === "summary" ? "space.header.summary.description" : tab === "lists" ? "space.header.lists.description" : "space.header.tools.description")} action={tab === "summary" || tab === "lists" ? <Button onClick={openInboxCapture}><Plus size={16} /> {m("space.quickCapture")}</Button> : undefined} />
      {toolTabs.some((item) => item.id === tab) && <nav className="life-hub-tabs" aria-label={m("space.tools.label")}>{toolTabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? "is-active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => selectTab(item.id)}>{m(item.labelKey)}</button>)}</nav>}
      {message && <div className="inline-message" role="status">{message}</div>}
      {planningError && <div className="inline-message" role="alert">{planningError}</div>}

      {tab === "summary" && <section aria-labelledby="space-destinations-title"><div className="card-heading"><div><p className="eyebrow">{m("space.summary.eyebrow")}</p><h2 id="space-destinations-title">{m("space.summary.title")}</h2></div></div><div className="more-grid">{spaceDestinations.map(([href, titleKey, descriptionKey, Icon]) => <Link to={href} key={href}><Card className="more-card"><span><Icon size={21} aria-hidden="true" /></span><div><h3>{m(titleKey)}</h3><p>{m(descriptionKey)}</p></div><ChevronRight size={19} aria-hidden="true" /></Card></Link>)}</div></section>}

      {tab === "lists" && <>
        <Card className="brain-universal-capture"><div><p className="eyebrow">{m("space.inbox.capture.eyebrow")}</p><h2>{m("space.inbox.capture.title")}</h2><p>{m("space.inbox.capture.description")}</p></div><Button onClick={() => onQuickCapture({ source: "inbox" })}><Plus size={16} /> {m("space.inbox.capture.action")}</Button></Card>
        {inboxTasks.length > 0 && <Card className="brain-list brain-inbox-list"><header><div><h3>{m("space.inbox.unclassified")}</h3><small>{m("space.inbox.count", { count: inboxTasks.length })}</small></div></header>{inboxTasks.map((task) => {
          const readOnly = Boolean(task.date && !canPlanDate(task.date));
          return editingInboxTaskId === task.id ? <form className="brain-item-editor" key={task.id} onSubmit={saveInboxEdit}><input autoFocus required value={inboxEdit.title} onChange={(event) => setInboxEdit({ ...inboxEdit, title: event.target.value })} aria-label={m("space.inbox.editCapture")} /><input type="date" min={dateBounds ? (today > dateBounds.min ? today : dateBounds.min) : today} max={dateBounds?.max} value={inboxEdit.date} onChange={(event) => { setPlanningError(""); setInboxEdit({ ...inboxEdit, date: event.target.value }); }} aria-label={m("space.inbox.captureDate")} /><select value={inboxEdit.goalId} onChange={(event) => setInboxEdit({ ...inboxEdit, goalId: event.target.value })} aria-label={m("space.field.goal")}><option value="">{m("space.field.noGoal")}</option>{snapshot.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select><select value={inboxEdit.projectId} onChange={(event) => setInboxEdit({ ...inboxEdit, projectId: event.target.value })} aria-label={m("space.field.project")}><option value="">{m("space.field.noProject")}</option>{snapshot.projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><div><button type="submit"><Save size={14} /> {m("space.action.save")}</button><button type="button" onClick={() => setEditingInboxTaskId(null)}><X size={14} /> {m("space.action.cancel")}</button></div></form> : <div className="brain-item" key={task.id}><button type="button" disabled={readOnly} title={readOnly ? m("space.readOnly") : undefined} onClick={() => void planner.toggleTask(task.id)} aria-label={readOnly ? m("space.readOnly") : m("space.action.completeNamed", { name: task.title })}><Circle size={14} /></button><div><strong>{task.title}</strong><small>{m("space.inbox.capturedNoDate")}</small></div><button type="button" disabled={readOnly} title={readOnly ? m("space.readOnly") : undefined} onClick={() => { setPlanningError(""); setEditingInboxTaskId(task.id); setInboxEdit({ title: task.title, date: task.date ?? "", goalId: task.goalId ?? "", projectId: task.projectId ?? "" }); }} aria-label={readOnly ? m("space.readOnly") : m("space.action.organizeNamed", { name: task.title })}><Pencil size={14} /></button></div>;
        })}</Card>}
        <nav className="brain-filters" aria-label={m("space.lists.filterLabel")}>{(["all", ...Object.keys(listLabelKeys)] as Array<"all" | BrainDumpType>).map((type) => <button type="button" key={type} className={listFilter === type ? "is-active" : ""} aria-pressed={listFilter === type} onClick={() => setListFilter(type)}>{type === "all" ? m("space.lists.all") : m(listLabelKeys[type])}</button>)}</nav>
        <Card className="brain-list brain-legacy-list"><header><div><h3>{listFilter === "all" ? m("space.lists.organized") : m(listLabelKeys[listFilter])}</h3><small>{m("space.lists.openCount", { count: visibleBrainItems.filter((item) => item.status !== "completed" && item.status !== "released").length })}</small></div></header>{visibleBrainItems.map((item) => {
          const readOnly = Boolean(item.tentativeDate && !canPlanTentativeDate(item.tentativeDate));
          if (editingItemId === item.id) return <form className="brain-item-editor" key={item.id} onSubmit={saveItemEdit}><input autoFocus value={editDraft.title} onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })} aria-label={m("space.lists.editIdea")} /><select value={editDraft.type} onChange={(event) => setEditDraft({ ...editDraft, type: event.target.value as BrainDumpType })} aria-label={m("space.lists.moveList")}>{Object.entries(listLabelKeys).map(([value, labelKey]) => <option key={value} value={value}>{m(labelKey)}</option>)}</select><DateChoice mode={editDraft.dateMode} date={editDraft.date} dateBounds={dateBounds} label={item.title} onMode={(dateMode) => { setPlanningError(""); setEditDraft({ ...editDraft, dateMode, date: dateMode === "flexible" ? "" : editDraft.date }); }} onDate={(date) => { setPlanningError(""); setEditDraft({ ...editDraft, date }); }} /><select value={editDraft.goalId} onChange={(event) => setEditDraft({ ...editDraft, goalId: event.target.value })} aria-label={m("space.lists.ideaGoal")}><option value="">{m("space.field.noGoal")}</option>{snapshot.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select><select value={editDraft.projectId} onChange={(event) => setEditDraft({ ...editDraft, projectId: event.target.value })} aria-label={m("space.lists.ideaProject")}><option value="">{m("space.field.noProject")}</option>{snapshot.projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><div><button type="submit"><Save size={14} /> {m("space.action.save")}</button><button type="button" onClick={() => setEditingItemId(null)}><X size={14} /> {m("space.action.cancel")}</button></div></form>;
          if (convertingItemId === item.id) return <form className="brain-item-editor brain-convert-editor" key={item.id} onSubmit={convertBrainItem}><strong>{m("space.lists.convertNamed", { name: item.title })}</strong><label><span>{m("space.lists.destination")}</span><select value={conversionDestination} onChange={(event) => { const destination = event.target.value as typeof conversionDestination; setPlanningError(""); setConversionDestination(destination); setConversionDate(destination === "monthly" ? today.slice(0, 7) : today); }}><option value="daily">{m("space.destination.today")}</option><option value="weekly">{m("space.destination.week")}</option><option value="monthly">{m("space.destination.month")}</option></select></label><label><span>{m(conversionDestination === "monthly" ? "space.date.month" : "space.date.day")}</span><input type={conversionDestination === "monthly" ? "month" : "date"} min={conversionDestination === "monthly" ? (monthBounds && today.slice(0, 7) < monthBounds.min ? monthBounds.min : today.slice(0, 7)) : (dateBounds && today < dateBounds.min ? dateBounds.min : today)} max={conversionDestination === "monthly" ? monthBounds?.max : dateBounds?.max} value={conversionDate} onChange={(event) => { setPlanningError(""); setConversionDate(event.target.value); }} /></label><small>{m("space.lists.convertDescription")}</small><div><button type="submit"><Save size={14} /> {m("space.lists.confirmDestination")}</button><button type="button" onClick={() => setConvertingItemId(null)}><X size={14} /> {m("space.action.cancel")}</button></div></form>;
          const status = item.convertedTaskId ? m("space.lists.convertedTo", { destination: m(item.destination === "monthly" ? "space.destination.month" : item.destination === "weekly" ? "space.destination.week" : "space.destination.today") }) : m(item.status === "planned" ? "space.lists.status.organized" : "space.lists.status.captured");
          const date = item.tentativeDate ? m("space.lists.dateValue", { kind: m(item.tentativeDate.length === 7 ? "space.date.month" : "space.date.date"), date: item.tentativeDate }) : m("space.date.flexible");
          return <div className={`brain-item is-${item.status}`} key={item.id}><button type="button" disabled={readOnly} title={readOnly ? m("space.readOnly") : undefined} onClick={() => void planner.updateBrainDumpItem(item.id, { status: item.status === "completed" ? "idea" : "completed" })} aria-label={readOnly ? m("space.readOnly") : m(item.status === "completed" ? "space.action.reopenNamed" : "space.action.completeNamed", { name: item.title })}>{item.status === "completed" ? <Check size={14} /> : <Circle size={14} />}</button><div><strong>{item.title}</strong><small>{m("space.lists.metadata", { status, date })}</small></div><button type="button" disabled={readOnly} title={readOnly ? m("space.readOnly") : undefined} onClick={() => openItemEditor(item.id)} aria-label={readOnly ? m("space.readOnly") : m("space.action.editNamed", { name: item.title })}><Pencil size={14} /></button><button type="button" disabled={readOnly} title={readOnly ? m("space.readOnly") : undefined} onClick={() => { setPlanningError(""); setConvertingItemId(item.id); setConversionDestination("daily"); setConversionDate(today); }} aria-label={readOnly ? m("space.readOnly") : m("space.action.convertNamed", { name: item.title })}><CalendarDays size={14} /></button><button type="button" disabled={readOnly} title={readOnly ? m("space.readOnly") : undefined} onClick={() => void planner.updateBrainDumpItem(item.id, { status: "released" })} aria-label={readOnly ? m("space.readOnly") : m("space.action.releaseNamed", { name: item.title })}>×</button></div>;
        })}{!visibleBrainItems.length && <p className="brain-empty">{m("space.lists.empty")}</p>}</Card>
      </>}

      {tab === "routines" && <div className="hub-two-column"><Card className="hub-form-card"><Sun size={24} /><p className="eyebrow">{m(editingRoutineId ? "space.routine.edit" : "space.routine.new")}</p><h2>{m("space.routine.title")}</h2><form onSubmit={addRoutine}><label className="form-field"><span>{m("space.routine.name")}</span><input value={routineName} onChange={(event) => setRoutineName(event.target.value)} /></label><label className="form-field"><span>{m("space.routine.period")}</span><select value={routinePeriod} onChange={(event) => setRoutinePeriod(event.target.value as typeof routinePeriod)}><option value="am">{m("space.routine.period.am")}</option><option value="afternoon">{m("space.routine.period.afternoon")}</option><option value="pm">{m("space.routine.period.pm")}</option></select></label><label className="form-field"><span>{m("space.routine.steps")}</span><textarea rows={7} value={routineSteps} onChange={(event) => setRoutineSteps(event.target.value)} placeholder={m("space.routine.steps.placeholder")} /></label><div className="modal__actions"><Button type="submit">{m("space.routine.save")}</Button>{editingRoutineId && <Button type="button" variant="ghost" onClick={() => { setEditingRoutineId(null); setRoutineName(m("space.routine.defaultName")); setRoutineSteps(""); }}>{m("space.action.cancel")}</Button>}</div></form></Card><div className="routine-grid">{snapshot.routines.map((routine) => <Card className="routine-card" key={routine.id}><span>{routine.period === "am" ? <Sun size={20} /> : routine.period === "pm" ? <MoonStar size={20} /> : <Sparkles size={20} />}</span><Badge tone="rose">{m(routine.period === "am" ? "space.routine.badge.am" : routine.period === "pm" ? "space.routine.badge.pm" : "space.routine.badge.afternoon")}</Badge><button type="button" className="routine-card__edit" onClick={() => { setEditingRoutineId(routine.id); setRoutineName(routine.name); setRoutinePeriod(routine.period); setRoutineSteps(routine.steps.map((step) => step.title).join("\n")); }} aria-label={m("space.action.editNamed", { name: routine.name })}><Pencil size={15} /></button><h2>{routine.name}</h2>{routine.steps.map((step, index) => <p key={step.id}><i>{index + 1}</i>{step.title}</p>)}</Card>)}</div></div>}

      {tab === "fitness" && !snapshot.profile?.fitnessEnabled && <Card className="fitness-gate"><span><Dumbbell size={29} /></span><p className="eyebrow">{m("space.fitness.gate.eyebrow")}</p><h1>{m("space.fitness.gate.title")}</h1><p>{m("space.fitness.gate.description")}</p><Button onClick={() => planner.updateProfileSettings({ fitnessEnabled: true })}>{m("space.fitness.gate.action")}</Button></Card>}

      {tab === "fitness" && snapshot.profile?.fitnessEnabled && <>
        <div className="fitness-header"><div><p className="eyebrow">{m("space.fitness.header.eyebrow")}</p><h2>{m("space.fitness.header.title")}</h2><p>{m("space.fitness.header.week", { start: formatDate(fitnessWeekStart, { dateStyle: "medium" }), end: formatDate(fitnessWeekEnd, { dateStyle: "medium" }) })}</p></div><div className="fitness-header__actions"><label className="form-field"><span>{m("space.fitness.entryDate")}</span><input type="date" value={fitnessDate} onChange={(event) => selectFitnessDate(event.target.value)} /></label>{fitnessDate !== today && <Button variant="secondary" onClick={() => selectFitnessDate(today)}>{m("space.fitness.backToday")}</Button>}<Button variant="ghost" onClick={() => planner.updateProfileSettings({ fitnessEnabled: false })}>{m("space.fitness.hide")}</Button></div></div>
        <div className="fitness-summary" aria-label={m("space.fitness.summary.label")}>
          <Card><span>{m("space.fitness.summary.sessions")}</span><strong>{weeklyWorkoutLogs.length}</strong><small>{m("space.fitness.summary.sessions.note")}</small></Card>
          <Card><span>{m("space.fitness.summary.exercises")}</span><strong>{weeklyExerciseCount}</strong><small>{m("space.fitness.summary.exercises.note")}</small></Card>
          <Card><span>{m("space.fitness.summary.meals")}</span><strong>{selectedNutrition?.meals.length ?? 0}</strong><small>{m("space.fitness.kcalRecorded", { value: dailyMacros.calories })}</small></Card>
          <Card><span>{m("space.fitness.summary.latest")}</span><strong>{selectedBodyCheckIn?.weight ? m("space.fitness.kg", { value: selectedBodyCheckIn.weight }) : "—"}</strong><small>{formatDate(fitnessDate, { dateStyle: "medium" })}</small></Card>
        </div>
        <div className="fitness-grid">
          <Card className="hub-form-card fitness-log-card"><div className="fitness-card-heading"><span><Dumbbell size={22} /></span><div><p className="eyebrow">{m("space.fitness.workout.eyebrow")}</p><h2>{m("space.fitness.workout.title")}</h2></div></div><form onSubmit={addWorkout}><label className="form-field"><span>{m("space.fitness.workout.exercise")}</span><input value={exercise} onChange={(event) => setExercise(event.target.value)} placeholder={m("space.fitness.workout.placeholder")} /></label><div className="mini-field-grid"><label className="form-field"><span>{m("space.fitness.workout.sets")}</span><input type="number" min="1" value={sets} onChange={(event) => setSets(Number(event.target.value))} /></label><label className="form-field"><span>{m("space.fitness.workout.reps")}</span><input type="number" min="1" value={reps} onChange={(event) => setReps(Number(event.target.value))} /></label><label className="form-field"><span>{m("space.fitness.workout.weight")}</span><input type="number" min="0" step="0.5" value={weight} onChange={(event) => setWeight(Number(event.target.value))} /></label></div><Button type="submit">{m("space.fitness.workout.add")}</Button></form><div className="fitness-log-list">{selectedWorkout?.exercises.map((item) => <div className="workout-row" key={item.id}><strong>{item.name}</strong><span>{m("space.fitness.workout.values", { sets: item.sets, reps: item.reps, weight: item.weight })}</span></div>)}{!selectedWorkout?.exercises.length && <p className="fitness-empty">{m("space.fitness.workout.empty")}</p>}</div></Card>
          <Card className="hub-form-card fitness-log-card"><div className="fitness-card-heading"><span><Utensils size={22} /></span><div><p className="eyebrow">{m("space.fitness.nutrition.eyebrow")}</p><h2>{m("space.fitness.nutrition.title")}</h2></div></div><form onSubmit={addMeal}><label className="form-field"><span>{m("space.fitness.nutrition.meal")}</span><input value={mealName} onChange={(event) => setMealName(event.target.value)} /></label><div className="mini-field-grid mini-field-grid--four"><label className="form-field"><span>{m("space.fitness.nutrition.kcal")}</span><input type="number" min="0" value={calories} onChange={(event) => setCalories(Number(event.target.value))} /></label><label className="form-field"><span>{m("space.fitness.nutrition.protein")}</span><input type="number" min="0" value={protein} onChange={(event) => setProtein(Number(event.target.value))} /></label><label className="form-field"><span>{m("space.fitness.nutrition.carbs")}</span><input type="number" min="0" value={carbs} onChange={(event) => setCarbs(Number(event.target.value))} /></label><label className="form-field"><span>{m("space.fitness.nutrition.fat")}</span><input type="number" min="0" value={fat} onChange={(event) => setFat(Number(event.target.value))} /></label></div><Button type="submit">{m("space.fitness.nutrition.addMeal")}</Button></form><div className="macro-summary"><span>{m("space.fitness.kcal", { value: dailyMacros.calories })}</span><span>{m("space.fitness.proteinShort", { value: dailyMacros.protein })}</span><span>{m("space.fitness.carbsShort", { value: dailyMacros.carbs })}</span><span>{m("space.fitness.fatShort", { value: dailyMacros.fat })}</span></div><div className="meal-total">{selectedNutrition?.meals.map((meal) => <p key={meal.id}><span>{meal.name}</span><strong>{m("space.fitness.mealSummary", { calories: meal.calories ?? 0, protein: meal.protein ?? 0 })}</strong></p>)}{!selectedNutrition?.meals.length && <p className="fitness-empty">{m("space.fitness.nutrition.empty")}</p>}</div></Card>
          <Card className="hub-form-card"><Camera size={22} /><h2>{m("space.fitness.body.title")}</h2><form onSubmit={saveBody}><div className="mini-field-grid"><label className="form-field"><span>{m("space.fitness.body.weight")}</span><input type="number" min="0" step="0.1" value={bodyWeight || ""} onChange={(event) => setBodyWeight(Number(event.target.value))} /></label><label className="form-field"><span>{m("space.fitness.body.waist")}</span><input type="number" min="0" step="0.1" value={waist || ""} onChange={(event) => setWaist(Number(event.target.value))} /></label><label className="form-field"><span>{m("space.fitness.body.hip")}</span><input type="number" min="0" step="0.1" value={hip || ""} onChange={(event) => setHip(Number(event.target.value))} /></label></div><label className="upload-tile"><Camera size={20} /><span>{bodyPhoto ? m("space.fitness.body.photoReady") : m("space.fitness.body.photoAdd")}</span><input className="sr-only" type="file" accept="image/*" onChange={bodyPhotoChange} /></label><Button type="submit">{m("space.fitness.body.save")}</Button></form>{snapshot.bodyCheckIns.slice(0, 4).map((item) => <p className="body-history" key={item.id}><span>{formatDate(item.date, { dateStyle: "medium" })}</span><strong>{item.weight ? m("space.fitness.kg", { value: item.weight }) : m("space.fitness.body.noWeight")}</strong></p>)}</Card>
        </div>
      </>}

      {tab === "challenges" && <ChallengesPage planner={planner} embedded />}

      {tab === "vision" && <><Card className="vision-board-toolbar"><form onSubmit={addVisionItem}><label className="form-field"><span>{m("space.vision.quote")}</span><input value={quote} onChange={(event) => setQuote(event.target.value)} placeholder={m("space.vision.quote.placeholder")} /></label><label className="button button--secondary"><ImagePlus size={16} /> {visionImage ? m("space.vision.changeImage") : m("space.vision.chooseImage")}<input className="sr-only" type="file" accept="image/*" onChange={uploadVisionImage} /></label>{visionImage && <figure className="vision-upload-preview"><img src={visionImage} alt={m("space.vision.previewAlt")} /><figcaption>{m("space.vision.imageReady")}</figcaption></figure>}<label className="vision-reminder-control"><input type="checkbox" checked={visionReminder} onChange={(event) => setVisionReminder(event.target.checked)} /> {m("space.vision.reminders")}</label>{visionReminder && <label className="form-field"><span>{m("space.vision.frequency")}</span><select value={visionFrequency} onChange={(event) => setVisionFrequency(event.target.value as typeof visionFrequency)} aria-label={m("space.vision.frequencyLabel")}><option value="daily">{m("space.vision.frequency.daily")}</option><option value="weekly">{m("space.vision.frequency.weekly")}</option><option value="monthly">{m("space.vision.frequency.monthly")}</option><option value="quarterly">{m("space.vision.frequency.quarterly")}</option></select></label>}<Button type="submit"><Plus size={16} /> {m("space.vision.add")}</Button></form>{visionReminder && <Button variant="secondary" onClick={enableNotifications}><Bell size={16} /> {m("space.vision.allowNotifications")}</Button>}</Card><div className="vision-board-grid">{snapshot.visionBoardItems.map((item) => <Card className={`vision-board-item vision-board-item--${item.type}`} key={item.id}>{item.type !== "quote" ? <><img src={item.content} alt={item.caption || m("space.vision.itemAlt")} />{item.caption && <blockquote>“{item.caption}”</blockquote>}</> : <blockquote>“{item.content}”</blockquote>}<footer><span>{item.caption || m("space.vision.defaultCaption")}</span><button className={item.reminderEnabled ? "is-on" : ""} onClick={() => planner.toggleVisionReminder(item.id)}><Bell size={14} />{item.reminderEnabled ? m("space.vision.remember", { frequency: m(item.reminderFrequency === "daily" ? "space.vision.frequency.daily" : item.reminderFrequency === "monthly" ? "space.vision.frequency.monthly" : item.reminderFrequency === "quarterly" ? "space.vision.frequency.quarterly" : "space.vision.frequency.weekly") }) : m("space.vision.noReminder")}</button></footer></Card>)}</div></>}

      {tab === "events" && <div className="hub-two-column"><Card className="hub-form-card"><CalendarDays size={22} /><p className="eyebrow">{m(editingEventId ? "space.event.edit" : "space.event.new")}</p><h2>{m("space.event.title")}</h2><form onSubmit={addEvent}><label className="form-field"><span>{m("space.event.name")}</span><input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder={m("space.event.placeholder")} /></label><label className="form-field"><span>{m("space.event.date")}</span><input type="date" min={dateBounds?.min} max={dateBounds?.max} value={eventDate} onChange={(event) => { setPlanningError(""); setEventDate(event.target.value); }} /></label><label className="form-field"><span>{m("space.event.category")}</span><select value={eventCategory} onChange={(event) => setEventCategory(event.target.value as typeof eventCategory)}>{Object.entries(eventLabelKeys).map(([value, labelKey]) => <option value={value} key={value}>{m(labelKey)}</option>)}</select></label><div className="modal__actions"><Button type="submit">{m("space.event.save")}</Button>{editingEventId && <Button type="button" variant="ghost" onClick={() => { setEditingEventId(null); setEventTitle(""); }}>{m("space.action.cancel")}</Button>}</div></form><div className="event-list">{snapshot.events.map((item) => { const readOnly = !canPlanDate(item.startDate); return <p key={item.id}><span><i className={`event-dot event-dot--${item.category}`} />{item.title}</span><strong>{formatDate(item.startDate, { dateStyle: "medium" })}</strong><button type="button" disabled={readOnly} title={readOnly ? m("space.readOnly") : undefined} onClick={() => { setPlanningError(""); setEditingEventId(item.id); setEventTitle(item.title); setEventDate(item.startDate); setEventCategory(item.category); }} aria-label={readOnly ? m("space.readOnly") : m("space.action.editNamed", { name: item.title })}><Pencil size={14} /></button></p>; })}</div></Card><Card className="all-tasks-card"><p className="eyebrow">{m("space.tasks.eyebrow")}</p><h2>{m("space.tasks.title")}</h2>{snapshot.tasks.map((task) => { const readOnly = Boolean(task.date && !canPlanDate(task.date)); return <div className="all-task-row" key={task.id}><button type="button" disabled={readOnly} title={readOnly ? m("space.readOnly") : undefined} onClick={() => void planner.toggleTask(task.id)} aria-label={readOnly ? m("space.readOnly") : m(task.status === "completed" ? "space.action.reopenNamed" : "space.action.completeNamed", { name: task.title })}>{task.status === "completed" ? <Check size={15} /> : <Circle size={15} />}</button><span>{task.title}</span><Badge tone={task.status === "completed" ? "sage" : task.status === "in_progress" ? "rose" : "neutral"}>{m(task.status === "completed" ? "space.tasks.status.completed" : task.status === "in_progress" ? "space.tasks.status.inProgress" : "space.tasks.status.notStarted")}</Badge></div>; })}</Card></div>}

    </div>
  );
}

function DateChoice({ mode, date, dateBounds, label, onMode, onDate }: { mode: ListDateMode; date: string; dateBounds: ReturnType<typeof getTrialPlanningDateBounds>; label: string; onMode: (mode: ListDateMode) => void; onDate: (date: string) => void }) {
  const { m } = useI18n();
  return <fieldset className="brain-date-choice"><legend>{m("space.date.question")}</legend><div>{(["flexible", "month", "date"] as const).map((option) => <button type="button" key={option} className={mode === option ? "is-active" : ""} aria-pressed={mode === option} onClick={() => onMode(option)}>{m(option === "flexible" ? "space.date.flexible" : option === "month" ? "space.date.month" : "space.date.date")}</button>)}</div>{mode !== "flexible" && <input type={mode === "month" ? "month" : "date"} min={mode === "month" ? dateBounds?.min.slice(0, 7) : dateBounds?.min} max={mode === "month" ? dateBounds?.max.slice(0, 7) : dateBounds?.max} value={date} onChange={(event) => onDate(event.target.value)} aria-label={m("space.date.forItem", { kind: m(mode === "month" ? "space.date.month" : "space.date.date"), label })} />}</fieldset>;
}

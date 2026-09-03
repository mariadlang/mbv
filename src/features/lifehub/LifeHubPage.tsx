"use client";

/* eslint-disable jsx-a11y/no-autofocus -- Contextual editors open after an explicit user action. */
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Bell,
  CalendarDays,
  Camera,
  Check,
  Circle,
  Dumbbell,
  ImagePlus,
  MoonStar,
  Plus,
  Sparkles,
  Sun,
  Pencil,
  Save,
  X,
  Utensils,
} from "lucide-react";
import type { BrainDumpType } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatDateKey, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, SectionHeading } from "@/src/components/ui/Primitives";
import { imageUploadSchema } from "@/src/lib/schemas";
import { Navigate, useSearchParams } from "react-router-dom";
import { ChallengesPage } from "@/src/features/challenges/ChallengesPage";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";
import type { QuickCaptureDefaults } from "@/src/features/tasks/QuickCaptureDrawer";

type HubTab = "lists" | "routines" | "fitness" | "challenges" | "vision" | "events";
type ListDateMode = "flexible" | "month" | "date";
type ListDraft = { title: string; dateMode: ListDateMode; date: string; goalId: string; projectId: string };

const hubTabs: Array<{ id: HubTab; label: string }> = [
  { id: "lists", label: "Listas" },
  { id: "routines", label: "Rutinas" },
  { id: "challenges", label: "Retos" },
  { id: "vision", label: "Tablero de visión" },
  { id: "events", label: "Calendario" },
];

const listLabels: Record<BrainDumpType, string> = {
  wishlist: "Deseos",
  want_to_do: "Cosas que quiero hacer",
  must_do: "Debo hacer",
  shopping: "Compras por realizar",
  want_to_learn: "Quiero aprender",
  want_to_read: "Quiero leer",
  watch_list: "Series, TV y podcasts",
};

const eventLabels = {
  medical: "Cita médica",
  birthday: "Cumpleaños",
  social: "Salida",
  work: "Trabajo",
  wellness: "Bienestar",
  personal: "Personal",
};

async function fileToDataUrl(file: File): Promise<string> {
  imageUploadSchema.parse({ type: file.type, size: file.size });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function LifeHubPage({ planner, onQuickCapture }: { planner: PlannerController; onQuickCapture: (defaults: QuickCaptureDefaults) => void }) {
  const { snapshot } = planner;
  const today = toLocalDateKey(new Date());
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab = hubTabs.some((item) => item.id === requestedTab) ? requestedTab as HubTab : "lists";
  const [message, setMessage] = useState("");
  const [listFilter, setListFilter] = useState<"all" | BrainDumpType>("all");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ListDraft & { type: BrainDumpType }>({ title: "", dateMode: "flexible", date: "", goalId: "", projectId: "", type: "want_to_do" });
  const [convertingItemId, setConvertingItemId] = useState<string | null>(null);
  const [conversionDestination, setConversionDestination] = useState<"monthly" | "weekly" | "daily">("daily");
  const [conversionDate, setConversionDate] = useState(today);
  const [editingInboxTaskId, setEditingInboxTaskId] = useState<string | null>(null);
  const [inboxEdit, setInboxEdit] = useState({ title: "", date: "", goalId: "", projectId: "" });
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState("Rutina AM");
  const [routinePeriod, setRoutinePeriod] = useState<"am" | "afternoon" | "pm">("am");
  const [routineSteps, setRoutineSteps] = useState("");
  const [quote, setQuote] = useState("");
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [visionReminder, setVisionReminder] = useState(false);
  const [visionFrequency, setVisionFrequency] = useState<"daily" | "weekly" | "monthly" | "quarterly">("weekly");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(today);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventCategory, setEventCategory] = useState<keyof typeof eventLabels>("personal");
  const [fitnessDate, setFitnessDate] = useState(today);
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [mealName, setMealName] = useState("Comida 1");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const initialBodyCheckIn = snapshot.bodyCheckIns.find((item) => item.date === today);
  const [bodyWeight, setBodyWeight] = useState(initialBodyCheckIn?.weight ?? 0);
  const [waist, setWaist] = useState(initialBodyCheckIn?.measurements.cintura ?? 0);
  const [hip, setHip] = useState(initialBodyCheckIn?.measurements.cadera ?? 0);
  const [bodyPhoto, setBodyPhoto] = useState<string | undefined>(initialBodyCheckIn?.photoDataUrl);

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
    setSearchParams(nextTab === "lists" ? {} : { tab: nextTab });
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
    setMessage("Rutina guardada.");
  };

  const addVisionItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!quote.trim() && !visionImage) return setMessage("Añade una frase, una imagen o ambas antes de confirmar.");
    await planner.createVisionBoardItem({
      type: visionImage && quote.trim() ? "mixed" : visionImage ? "image" : "quote",
      content: visionImage || quote.trim(),
      caption: visionImage && quote.trim() ? quote.trim() : undefined,
      reminderEnabled: visionReminder,
      reminderFrequency: visionReminder ? visionFrequency : undefined,
    });
    setQuote(""); setVisionImage(null); setMessage("Elemento añadido a tu tablero de visión.");
  };

  const uploadVisionImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setVisionImage(dataUrl);
      setMessage("Imagen lista. Confirma para añadirla a tu tablero de visión.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos leer esa imagen.");
    }
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      setMessage("Tu navegador no admite notificaciones. Los recordatorios seguirán visibles en la app.");
      return;
    }
    const permission = await Notification.requestPermission();
    setMessage(permission === "granted" ? "Recordatorios activados en este navegador." : "Puedes activar los permisos más tarde desde tu navegador.");
    if (permission === "granted") new Notification("My Best Version", { body: snapshot.visionBoardItems.find((item) => item.reminderEnabled)?.content || "Recuerda la vida que estás construyendo." });
  };

  const addEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!eventTitle.trim()) return;
    const input = { title: eventTitle, startDate: eventDate, category: eventCategory };
    if (editingEventId) await planner.updateEvent(editingEventId, input);
    else await planner.createEvent(input);
    setEventTitle("");
    setEditingEventId(null);
    setMessage("Evento guardado.");
  };

  const openItemEditor = (itemId: string) => {
    const item = snapshot.brainDumpItems.find((candidate) => candidate.id === itemId);
    if (!item) return;
    setEditingItemId(item.id);
    setEditDraft({ title: item.title, type: item.type, dateMode: item.tentativeDate?.length === 10 ? "date" : item.tentativeDate?.length === 7 ? "month" : "flexible", date: item.tentativeDate ?? "", goalId: item.goalId ?? "", projectId: item.projectId ?? "" });
  };

  const saveItemEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingItemId || !editDraft.title.trim()) return;
    await planner.updateBrainDumpItem(editingItemId, { title: editDraft.title, type: editDraft.type, tentativeDate: editDraft.dateMode === "flexible" ? null : editDraft.date || null, goalId: editDraft.goalId || null, projectId: editDraft.projectId || null });
    setEditingItemId(null);
    setMessage("Idea actualizada.");
  };

  const convertBrainItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!convertingItemId || !conversionDate) return;
    const date = conversionDestination === "monthly"
      ? conversionDate === today.slice(0, 7) ? today : `${conversionDate}-01`
      : conversionDate;
    await planner.scheduleBrainDumpItem(convertingItemId, date, conversionDestination);
    setConvertingItemId(null);
    setMessage(`Convertida sin duplicar · ${conversionDestination === "monthly" ? "Mes" : conversionDestination === "weekly" ? "Semana" : "Mi día"}: ${date}`);
  };

  const saveInboxEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingInboxTaskId || !inboxEdit.title.trim()) return;
    await planner.updateTask(editingInboxTaskId, inboxEdit);
    setEditingInboxTaskId(null);
    setMessage(inboxEdit.date ? `Acción organizada para ${inboxEdit.date}.` : "Elemento actualizado en Bandeja.");
  };

  const addWorkout = async (event: FormEvent) => {
    event.preventDefault();
    if (!exercise.trim()) return;
    await planner.saveWorkout({ date: fitnessDate, exercise, sets, reps, weight, goal: "Progreso semanal" });
    setExercise("");
  };

  const addMeal = async (event: FormEvent) => {
    event.preventDefault();
    await planner.saveMeal({ date: fitnessDate, name: mealName, calories, protein, carbs, fat });
    setMealName(`Comida ${(selectedNutrition?.meals.length ?? 0) + 2}`);
  };

  const saveBody = async (event: FormEvent) => {
    event.preventDefault();
    await planner.saveBodyCheckIn({ date: fitnessDate, weight: bodyWeight || undefined, waist: waist || undefined, hip: hip || undefined, photoDataUrl: bodyPhoto });
    setMessage("Registro corporal guardado de forma local y privada.");
  };

  const bodyPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setBodyPhoto(await fileToDataUrl(file)); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos leer la foto."); }
  };

  return (
    requestedTab === "fitness" ? <Navigate to="/app/health" replace /> :
    <div className="page-stack life-hub-page">
      <SectionNavigation section="space" />
      <SectionHeading eyebrow={tab === "lists" ? "PAUSA EL RUIDO" : "MÁS HERRAMIENTAS"} title={tab === "lists" ? "Bandeja" : "Organiza a tu manera"} description={tab === "lists" ? "Guarda lo que tienes en la cabeza. Puedes organizarlo después." : "Rutinas, retos, visión y calendario están disponibles cuando los necesites."} action={tab === "lists" ? <Button onClick={() => onQuickCapture({ source: "inbox" })}><Plus size={16} /> Captura rápida</Button> : undefined} />
      {tab !== "lists" && <nav className="life-hub-tabs" aria-label="Más herramientas">{hubTabs.filter((item) => item.id !== "lists").map((item) => <button type="button" key={item.id} className={tab === item.id ? "is-active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => selectTab(item.id)}>{item.label}</button>)}</nav>}
      {message && <div className="inline-message" role="status">{message}</div>}

      {tab === "lists" && <>
        <Card className="brain-universal-capture"><div><p className="eyebrow">ENTRADA UNIVERSAL</p><h2>Escribe antes de organizar</h2><p>Solo el nombre es obligatorio. Se guardará sin fecha en tu Bandeja.</p></div><Button onClick={() => onQuickCapture({ source: "inbox" })}><Plus size={16} /> Escribe algo para recordarlo…</Button></Card>
        {inboxTasks.length > 0 && <Card className="brain-list brain-inbox-list"><header><div><h3>Sin clasificar</h3><small>{inboxTasks.length} en Bandeja</small></div></header>{inboxTasks.map((task) => editingInboxTaskId === task.id ? <form className="brain-item-editor" key={task.id} onSubmit={saveInboxEdit}><input autoFocus required value={inboxEdit.title} onChange={(event) => setInboxEdit({ ...inboxEdit, title: event.target.value })} aria-label="Editar captura" /><input type="date" min={today} value={inboxEdit.date} onChange={(event) => setInboxEdit({ ...inboxEdit, date: event.target.value })} aria-label="Fecha de la captura" /><select value={inboxEdit.goalId} onChange={(event) => setInboxEdit({ ...inboxEdit, goalId: event.target.value })} aria-label="Meta"><option value="">Sin meta</option>{snapshot.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select><select value={inboxEdit.projectId} onChange={(event) => setInboxEdit({ ...inboxEdit, projectId: event.target.value })} aria-label="Proyecto"><option value="">Sin proyecto</option>{snapshot.projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><div><button type="submit"><Save size={14} /> Guardar</button><button type="button" onClick={() => setEditingInboxTaskId(null)}><X size={14} /> Cancelar</button></div></form> : <div className="brain-item" key={task.id}><button type="button" onClick={() => planner.toggleTask(task.id)} aria-label={`Completar ${task.title}`}><Circle size={14} /></button><div><strong>{task.title}</strong><small>Capturado · sin fecha</small></div><button type="button" onClick={() => { setEditingInboxTaskId(task.id); setInboxEdit({ title: task.title, date: task.date ?? "", goalId: task.goalId ?? "", projectId: task.projectId ?? "" }); }} aria-label={`Organizar ${task.title}`}><Pencil size={14} /></button></div>)}</Card>}
        <nav className="brain-filters" aria-label="Filtrar ideas guardadas">{(["all", ...Object.keys(listLabels)] as Array<"all" | BrainDumpType>).map((type) => <button type="button" key={type} className={listFilter === type ? "is-active" : ""} aria-pressed={listFilter === type} onClick={() => setListFilter(type)}>{type === "all" ? "Todas" : listLabels[type]}</button>)}</nav>
        <Card className="brain-list brain-legacy-list"><header><div><h3>{listFilter === "all" ? "Ideas organizadas" : listLabels[listFilter]}</h3><small>{visibleBrainItems.filter((item) => item.status !== "completed" && item.status !== "released").length} abiertas</small></div></header>{visibleBrainItems.map((item) => editingItemId === item.id ? <form className="brain-item-editor" key={item.id} onSubmit={saveItemEdit}><input autoFocus value={editDraft.title} onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })} aria-label="Editar idea" /><select value={editDraft.type} onChange={(event) => setEditDraft({ ...editDraft, type: event.target.value as BrainDumpType })} aria-label="Mover a otra lista">{Object.entries(listLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><DateChoice mode={editDraft.dateMode} date={editDraft.date} label={item.title} onMode={(dateMode) => setEditDraft({ ...editDraft, dateMode, date: dateMode === "flexible" ? "" : editDraft.date })} onDate={(date) => setEditDraft({ ...editDraft, date })} /><select value={editDraft.goalId} onChange={(event) => setEditDraft({ ...editDraft, goalId: event.target.value })} aria-label="Meta de la idea"><option value="">Sin meta</option>{snapshot.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select><select value={editDraft.projectId} onChange={(event) => setEditDraft({ ...editDraft, projectId: event.target.value })} aria-label="Proyecto de la idea"><option value="">Sin proyecto</option>{snapshot.projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><div><button type="submit"><Save size={14} /> Guardar</button><button type="button" onClick={() => setEditingItemId(null)}><X size={14} /> Cancelar</button></div></form> : convertingItemId === item.id ? <form className="brain-item-editor brain-convert-editor" key={item.id} onSubmit={convertBrainItem}><strong>Convertir “{item.title}”</strong><label><span>Destino</span><select value={conversionDestination} onChange={(event) => { const destination = event.target.value as typeof conversionDestination; setConversionDestination(destination); setConversionDate(destination === "monthly" ? today.slice(0, 7) : today); }}><option value="daily">Mi día</option><option value="weekly">Semana</option><option value="monthly">Mes</option></select></label><label><span>{conversionDestination === "monthly" ? "Mes" : "Día"}</span><input type={conversionDestination === "monthly" ? "month" : "date"} min={conversionDestination === "monthly" ? today.slice(0, 7) : today} value={conversionDate} onChange={(event) => setConversionDate(event.target.value)} /></label><small>Se conservará el mismo elemento y su vínculo de origen.</small><div><button type="submit"><Save size={14} /> Confirmar destino</button><button type="button" onClick={() => setConvertingItemId(null)}><X size={14} /> Cancelar</button></div></form> : <div className={`brain-item is-${item.status}`} key={item.id}><button type="button" onClick={() => planner.updateBrainDumpItem(item.id, { status: item.status === "completed" ? "idea" : "completed" })} aria-label={item.status === "completed" ? `Reabrir ${item.title}` : `Completar ${item.title}`}>{item.status === "completed" ? <Check size={14} /> : <Circle size={14} />}</button><div><strong>{item.title}</strong><small>{item.convertedTaskId ? `Convertido en ${item.destination === "monthly" ? "Mes" : item.destination === "weekly" ? "Semana" : "Mi día"}` : item.status === "planned" ? "Organizado" : "Capturado"} · {item.tentativeDate ? `${item.tentativeDate.length === 7 ? "Mes" : "Fecha"}: ${item.tentativeDate}` : "Flexible"}</small></div><button type="button" onClick={() => openItemEditor(item.id)} aria-label={`Editar ${item.title}`}><Pencil size={14} /></button><button type="button" onClick={() => { setConvertingItemId(item.id); setConversionDestination("daily"); setConversionDate(today); }} aria-label={`Convertir ${item.title} en acción`}><CalendarDays size={14} /></button><button type="button" onClick={() => planner.updateBrainDumpItem(item.id, { status: "released" })} aria-label={`Liberar ${item.title}`}>×</button></div>)}{!visibleBrainItems.length && <p className="brain-empty">Todavía no hay ideas organizadas en esta vista.</p>}</Card>
      </>}

      {tab === "routines" && <div className="hub-two-column"><Card className="hub-form-card"><Sun size={24} /><p className="eyebrow">{editingRoutineId ? "Editar rutina" : "Nueva rutina"}</p><h2>Diseña una secuencia que te cuide</h2><form onSubmit={addRoutine}><label className="form-field"><span>Nombre</span><input value={routineName} onChange={(event) => setRoutineName(event.target.value)} /></label><label className="form-field"><span>Momento</span><select value={routinePeriod} onChange={(event) => setRoutinePeriod(event.target.value as typeof routinePeriod)}><option value="am">AM · mañana</option><option value="afternoon">Tarde</option><option value="pm">PM · noche</option></select></label><label className="form-field"><span>Pasos · uno por línea</span><textarea rows={7} value={routineSteps} onChange={(event) => setRoutineSteps(event.target.value)} placeholder={"Agua y luz natural\nEscribir mis tres prioridades"} /></label><div className="modal__actions"><Button type="submit">Guardar rutina</Button>{editingRoutineId && <Button type="button" variant="ghost" onClick={() => { setEditingRoutineId(null); setRoutineName("Rutina AM"); setRoutineSteps(""); }}>Cancelar</Button>}</div></form></Card><div className="routine-grid">{snapshot.routines.map((routine) => <Card className="routine-card" key={routine.id}><span>{routine.period === "am" ? <Sun size={20} /> : routine.period === "pm" ? <MoonStar size={20} /> : <Sparkles size={20} />}</span><Badge tone="rose">{routine.period === "am" ? "AM" : routine.period === "pm" ? "PM" : "Tarde"}</Badge><button type="button" className="routine-card__edit" onClick={() => { setEditingRoutineId(routine.id); setRoutineName(routine.name); setRoutinePeriod(routine.period); setRoutineSteps(routine.steps.map((step) => step.title).join("\n")); }} aria-label={`Editar ${routine.name}`}><Pencil size={15} /></button><h2>{routine.name}</h2>{routine.steps.map((step, index) => <p key={step.id}><i>{index + 1}</i>{step.title}</p>)}</Card>)}</div></div>}

      {tab === "fitness" && !snapshot.profile?.fitnessEnabled && <Card className="fitness-gate"><span><Dumbbell size={29} /></span><p className="eyebrow">Cuando te sirva</p><h1>Bienestar</h1><p>¿Quieres acompañar tu entrenamiento con más detalle? Puedes registrar ejercicios, comidas, macros, medidas y fotos semanales, y ocultarlo cuando prefieras una vista más ligera.</p><Button onClick={() => planner.updateProfileSettings({ fitnessEnabled: true })}>Quiero usar Bienestar</Button></Card>}

      {tab === "fitness" && snapshot.profile?.fitnessEnabled && <>
        <div className="fitness-header"><div><p className="eyebrow">Bienestar · seguimiento flexible</p><h2>Tu progreso, semana a semana</h2><p>Semana del {formatDateKey(fitnessWeekStart)} al {formatDateKey(fitnessWeekEnd)}</p></div><div className="fitness-header__actions"><label className="form-field"><span>Fecha del registro</span><input type="date" value={fitnessDate} onChange={(event) => selectFitnessDate(event.target.value)} /></label>{fitnessDate !== today && <Button variant="secondary" onClick={() => selectFitnessDate(today)}>Volver a Mi día</Button>}<Button variant="ghost" onClick={() => planner.updateProfileSettings({ fitnessEnabled: false })}>Ocultar por ahora</Button></div></div>
        <div className="fitness-summary" aria-label="Resumen de Bienestar">
          <Card><span>Sesiones esta semana</span><strong>{weeklyWorkoutLogs.length}</strong><small>Solo cuenta lo que registraste</small></Card>
          <Card><span>Ejercicios esta semana</span><strong>{weeklyExerciseCount}</strong><small>Puedes ajustar tu ritmo</small></Card>
          <Card><span>Comidas del día</span><strong>{selectedNutrition?.meals.length ?? 0}</strong><small>{dailyMacros.calories} kcal registradas</small></Card>
          <Card><span>Último registro</span><strong>{selectedBodyCheckIn?.weight ? `${selectedBodyCheckIn.weight} kg` : "—"}</strong><small>{formatDateKey(fitnessDate)}</small></Card>
        </div>
        <div className="fitness-grid">
          <Card className="hub-form-card fitness-log-card"><div className="fitness-card-heading"><span><Dumbbell size={22} /></span><div><p className="eyebrow">Entrenamiento</p><h2>Ejercicios</h2></div></div><form onSubmit={addWorkout}><label className="form-field"><span>Ejercicio</span><input value={exercise} onChange={(event) => setExercise(event.target.value)} placeholder="Sentadilla" /></label><div className="mini-field-grid"><label className="form-field"><span>Series</span><input type="number" min="1" value={sets} onChange={(event) => setSets(Number(event.target.value))} /></label><label className="form-field"><span>Repeticiones</span><input type="number" min="1" value={reps} onChange={(event) => setReps(Number(event.target.value))} /></label><label className="form-field"><span>Peso kg</span><input type="number" min="0" step="0.5" value={weight} onChange={(event) => setWeight(Number(event.target.value))} /></label></div><Button type="submit">Añadir ejercicio</Button></form><div className="fitness-log-list">{selectedWorkout?.exercises.map((item) => <div className="workout-row" key={item.id}><strong>{item.name}</strong><span>{item.sets} × {item.reps} · {item.weight} kg</span></div>)}{!selectedWorkout?.exercises.length && <p className="fitness-empty">Aún no hay ejercicios en esta fecha.</p>}</div></Card>
          <Card className="hub-form-card fitness-log-card"><div className="fitness-card-heading"><span><Utensils size={22} /></span><div><p className="eyebrow">Nutrición opcional</p><h2>Comidas y macros</h2></div></div><form onSubmit={addMeal}><label className="form-field"><span>Comida</span><input value={mealName} onChange={(event) => setMealName(event.target.value)} /></label><div className="mini-field-grid mini-field-grid--four"><label className="form-field"><span>Kcal</span><input type="number" min="0" value={calories} onChange={(event) => setCalories(Number(event.target.value))} /></label><label className="form-field"><span>Proteína</span><input type="number" min="0" value={protein} onChange={(event) => setProtein(Number(event.target.value))} /></label><label className="form-field"><span>Carbs</span><input type="number" min="0" value={carbs} onChange={(event) => setCarbs(Number(event.target.value))} /></label><label className="form-field"><span>Grasa</span><input type="number" min="0" value={fat} onChange={(event) => setFat(Number(event.target.value))} /></label></div><Button type="submit">Agregar otra comida</Button></form><div className="macro-summary"><span>{dailyMacros.calories} kcal</span><span>P {dailyMacros.protein} g</span><span>C {dailyMacros.carbs} g</span><span>G {dailyMacros.fat} g</span></div><div className="meal-total">{selectedNutrition?.meals.map((meal) => <p key={meal.id}><span>{meal.name}</span><strong>{meal.calories ?? 0} kcal · P {meal.protein ?? 0}g</strong></p>)}{!selectedNutrition?.meals.length && <p className="fitness-empty">Esta parte es opcional; úsala solo si te aporta claridad.</p>}</div></Card>
          <Card className="hub-form-card"><Camera size={22} /><h2>Registro semanal</h2><form onSubmit={saveBody}><div className="mini-field-grid"><label className="form-field"><span>Peso kg</span><input type="number" min="0" step="0.1" value={bodyWeight || ""} onChange={(event) => setBodyWeight(Number(event.target.value))} /></label><label className="form-field"><span>Cintura cm</span><input type="number" min="0" step="0.1" value={waist || ""} onChange={(event) => setWaist(Number(event.target.value))} /></label><label className="form-field"><span>Cadera cm</span><input type="number" min="0" step="0.1" value={hip || ""} onChange={(event) => setHip(Number(event.target.value))} /></label></div><label className="upload-tile"><Camera size={20} /><span>{bodyPhoto ? "Foto lista para guardar" : "Añadir foto opcional"}</span><input className="sr-only" type="file" accept="image/*" onChange={bodyPhotoChange} /></label><Button type="submit">Guardar registro privado</Button></form>{snapshot.bodyCheckIns.slice(0, 4).map((item) => <p className="body-history" key={item.id}><span>{item.date}</span><strong>{item.weight ? `${item.weight} kg` : "Sin peso"}</strong></p>)}</Card>
        </div>
      </>}

      {tab === "challenges" && <ChallengesPage planner={planner} embedded />}

      {tab === "vision" && <><Card className="vision-board-toolbar"><form onSubmit={addVisionItem}><label className="form-field"><span>Frase</span><input value={quote} onChange={(event) => setQuote(event.target.value)} placeholder="La vida que quiero también se construye hoy." /></label><label className="button button--secondary"><ImagePlus size={16} /> {visionImage ? "Cambiar imagen" : "Elegir imagen"}<input className="sr-only" type="file" accept="image/*" onChange={uploadVisionImage} /></label>{visionImage && <figure className="vision-upload-preview"><img src={visionImage} alt="Vista previa del elemento" /><figcaption>Imagen lista para confirmar</figcaption></figure>}<label className="vision-reminder-control"><input type="checkbox" checked={visionReminder} onChange={(event) => setVisionReminder(event.target.checked)} /> Quiero recibir recordatorios</label>{visionReminder && <label className="form-field"><span>Frecuencia</span><select value={visionFrequency} onChange={(event) => setVisionFrequency(event.target.value as typeof visionFrequency)} aria-label="Frecuencia de recordatorios"><option value="daily">Diaria</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="quarterly">Cada 3 meses</option></select></label>}<Button type="submit"><Plus size={16} /> Añadir al tablero de visión</Button></form>{visionReminder && <Button variant="secondary" onClick={enableNotifications}><Bell size={16} /> Permitir notificaciones</Button>}</Card><div className="vision-board-grid">{snapshot.visionBoardItems.map((item) => <Card className={`vision-board-item vision-board-item--${item.type}`} key={item.id}>{item.type !== "quote" ? <><img src={item.content} alt={item.caption || "Imagen del tablero de visión"} />{item.caption && <blockquote>“{item.caption}”</blockquote>}</> : <blockquote>“{item.content}”</blockquote>}<footer><span>{item.caption || "Mi visión"}</span><button className={item.reminderEnabled ? "is-on" : ""} onClick={() => planner.toggleVisionReminder(item.id)}><Bell size={14} />{item.reminderEnabled ? `Recordar · ${item.reminderFrequency ?? "semanal"}` : "Sin recordatorio"}</button></footer></Card>)}</div></>}

      {tab === "events" && <div className="hub-two-column"><Card className="hub-form-card"><CalendarDays size={22} /><p className="eyebrow">{editingEventId ? "Editar evento" : "Nuevo evento"}</p><h2>Guarda lo importante</h2><form onSubmit={addEvent}><label className="form-field"><span>Evento</span><input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Ej. Cita de control" /></label><label className="form-field"><span>Fecha</span><input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label><label className="form-field"><span>Clasificación</span><select value={eventCategory} onChange={(event) => setEventCategory(event.target.value as typeof eventCategory)}>{Object.entries(eventLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><div className="modal__actions"><Button type="submit">Guardar evento</Button>{editingEventId && <Button type="button" variant="ghost" onClick={() => { setEditingEventId(null); setEventTitle(""); }}>Cancelar</Button>}</div></form><div className="event-list">{snapshot.events.map((item) => <p key={item.id}><span><i className={`event-dot event-dot--${item.category}`} />{item.title}</span><strong>{item.startDate}</strong><button type="button" onClick={() => { setEditingEventId(item.id); setEventTitle(item.title); setEventDate(item.startDate); setEventCategory(item.category); }} aria-label={`Editar ${item.title}`}><Pencil size={14} /></button></p>)}</div></Card><Card className="all-tasks-card"><p className="eyebrow">Todas las tareas</p><h2>Tareas y estado</h2>{snapshot.tasks.map((task) => <div className="all-task-row" key={task.id}><button type="button" onClick={() => planner.toggleTask(task.id)} aria-label={task.status === "completed" ? `Reabrir ${task.title}` : `Completar ${task.title}`}>{task.status === "completed" ? <Check size={15} /> : <Circle size={15} />}</button><span>{task.title}</span><Badge tone={task.status === "completed" ? "sage" : task.status === "in_progress" ? "rose" : "neutral"}>{task.status === "completed" ? "Completada" : task.status === "in_progress" ? "En progreso" : "No iniciada"}</Badge></div>)}</Card></div>}

    </div>
  );
}

function DateChoice({ mode, date, label, onMode, onDate }: { mode: ListDateMode; date: string; label: string; onMode: (mode: ListDateMode) => void; onDate: (date: string) => void }) {
  return <fieldset className="brain-date-choice"><legend>¿Cuándo?</legend><div>{(["flexible", "month", "date"] as const).map((option) => <button type="button" key={option} className={mode === option ? "is-active" : ""} aria-pressed={mode === option} onClick={() => onMode(option)}>{option === "flexible" ? "Flexible" : option === "month" ? "Mes" : "Fecha"}</button>)}</div>{mode !== "flexible" && <input type={mode === "month" ? "month" : "date"} value={date} onChange={(event) => onDate(event.target.value)} aria-label={`${mode === "month" ? "Mes" : "Fecha"} para ${label}`} />}</fieldset>;
}

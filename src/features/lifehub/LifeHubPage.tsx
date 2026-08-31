"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Bell,
  BookHeart,
  CalendarDays,
  Camera,
  Check,
  Circle,
  Dumbbell,
  ImagePlus,
  Lightbulb,
  ListPlus,
  MoonStar,
  Plus,
  ShoppingBag,
  Sparkles,
  Sun,
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

type HubTab = "lists" | "routines" | "fitness" | "challenges" | "vision" | "events";

const hubTabs: Array<{ id: HubTab; label: string }> = [
  { id: "lists", label: "Listas" },
  { id: "routines", label: "Rutinas" },
  { id: "challenges", label: "Retos" },
  { id: "vision", label: "Vision board" },
  { id: "events", label: "Eventos y tareas" },
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

export function LifeHubPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const today = toLocalDateKey(new Date());
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab = hubTabs.some((item) => item.id === requestedTab) ? requestedTab as HubTab : "lists";
  const [message, setMessage] = useState("");
  const [listTitle, setListTitle] = useState("");
  const [listType, setListType] = useState<BrainDumpType>("want_to_do");
  const [listDate, setListDate] = useState("");
  const [listDateMode, setListDateMode] = useState<"flexible" | "month" | "date">("flexible");
  const [listDrafts, setListDrafts] = useState<Partial<Record<BrainDumpType, string>>>({});
  const [routineName, setRoutineName] = useState("Rutina AM");
  const [routinePeriod, setRoutinePeriod] = useState<"am" | "afternoon" | "pm">("am");
  const [routineSteps, setRoutineSteps] = useState("");
  const [quote, setQuote] = useState("");
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [visionReminder, setVisionReminder] = useState(false);
  const [visionFrequency, setVisionFrequency] = useState<"daily" | "weekly" | "monthly" | "quarterly">("weekly");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(today);
  const [eventTime, setEventTime] = useState("");
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

  const groupedLists = useMemo(() => (Object.keys(listLabels) as BrainDumpType[]).map((type) => ({
    type,
    items: snapshot.brainDumpItems.filter((item) => item.type === type),
  })), [snapshot.brainDumpItems]);

  const addListItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!listTitle.trim()) return;
    await planner.createBrainDumpItem({ title: listTitle, type: listType, tentativeDate: listDate || undefined, priority: listType === "must_do" ? "high" : "medium" });
    setListTitle(""); setListDate(""); setListDateMode("flexible");
  };

  const addRoutine = async (event: FormEvent) => {
    event.preventDefault();
    const steps = routineSteps.split("\n").map((item) => item.trim()).filter(Boolean);
    if (!routineName.trim() || !steps.length) return;
    await planner.createRoutine({ name: routineName, period: routinePeriod, scheduledDays: [0, 1, 2, 3, 4, 5, 6], steps });
    setRoutineSteps("");
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
    setQuote(""); setVisionImage(null); setMessage("Elemento añadido a tu vision board.");
  };

  const uploadVisionImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setVisionImage(dataUrl);
      setMessage("Imagen lista. Confirma para añadirla a tu vision board.");
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
    await planner.createEvent({ title: eventTitle, startDate: eventDate, time: eventTime || undefined, category: eventCategory });
    setEventTitle("");
  };

  const addListItemToCard = async (event: FormEvent, type: BrainDumpType) => {
    event.preventDefault();
    const title = listDrafts[type]?.trim();
    if (!title) return;
    await planner.createBrainDumpItem({ title, type, priority: type === "must_do" ? "high" : "medium" });
    setListDrafts((current) => ({ ...current, [type]: "" }));
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
    setMessage("Check-in corporal guardado de forma local y privada.");
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
      <SectionHeading eyebrow="PAUSA EL RUIDO" title="Mi espacio" description="Un lugar para capturar ideas, cuidar tus rutinas y recordar la vida que estás construyendo." />
      <nav className="life-hub-tabs" aria-label="Secciones de Mi espacio">{hubTabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? "is-active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => selectTab(item.id)}>{item.label}</button>)}</nav>
      {message && <div className="inline-message" role="status">{message}</div>}

      {tab === "lists" && <>
        <Card className="hub-capture-card"><div><ListPlus size={23} /><p className="eyebrow">PAUSA EL RUIDO</p><h2>Captura lo que aparece. Decide cuando tengas claridad.</h2><p>La fecha es tentativa y siempre podrás moverla, completarla o liberarla.</p></div><form onSubmit={addListItem}><label className="form-field"><span>Pensamiento</span><input value={listTitle} onChange={(event) => setListTitle(event.target.value)} placeholder="Ej. Tomar un curso de fotografía" /></label><label className="form-field"><span>Lista</span><select value={listType} onChange={(event) => setListType(event.target.value as BrainDumpType)}>{Object.entries(listLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><fieldset className="date-mode-field"><legend>Fecha tentativa</legend><div><label><input type="radio" checked={listDateMode === "flexible"} onChange={() => { setListDateMode("flexible"); setListDate(""); }} /> Flexible</label><label><input type="radio" checked={listDateMode === "month"} onChange={() => { setListDateMode("month"); setListDate(""); }} /> Mes</label><label><input type="radio" checked={listDateMode === "date"} onChange={() => { setListDateMode("date"); setListDate(""); }} /> Fecha exacta</label></div>{listDateMode !== "flexible" && <input type={listDateMode === "month" ? "month" : "date"} value={listDate} onChange={(event) => setListDate(event.target.value)} aria-label={listDateMode === "month" ? "Mes tentativo" : "Fecha tentativa exacta"} />}</fieldset><Button type="submit"><Plus size={16} /> Capturar</Button></form></Card>
        <div className="brain-lists-grid">{groupedLists.map(({ type, items }) => <Card className="brain-list" key={type}><header><span>{type === "shopping" ? <ShoppingBag size={18} /> : type === "want_to_read" ? <BookHeart size={18} /> : <Lightbulb size={18} />}</span><div><h3>{listLabels[type]}</h3><small>{items.filter((item) => item.status !== "completed" && item.status !== "released").length} abiertas</small></div></header><form className="brain-card-add" onSubmit={(event) => addListItemToCard(event, type)}><input value={listDrafts[type] ?? ""} onChange={(event) => setListDrafts((current) => ({ ...current, [type]: event.target.value }))} placeholder={`Añadir a ${listLabels[type].toLowerCase()}`} aria-label={`Añadir a ${listLabels[type]}`} /><button type="submit" aria-label={`Guardar en ${listLabels[type]}`}><Plus size={15} /></button></form>{items.map((item) => <div className={`brain-item is-${item.status}`} key={item.id}><button onClick={() => planner.updateBrainDumpItem(item.id, { status: item.status === "completed" ? "idea" : "completed" })}>{item.status === "completed" ? <Check size={14} /> : <Circle size={14} />}</button><div><strong>{item.title}</strong><small>{item.tentativeDate || "Sin fecha · flexible"}</small></div><button onClick={() => planner.updateBrainDumpItem(item.id, { status: "released" })} aria-label="Liberar">×</button></div>)}{!items.length && <p className="brain-empty">Todo lo que aparezca aquí puede quedarse sin decidir por ahora.</p>}</Card>)}</div>
      </>}

      {tab === "routines" && <div className="hub-two-column"><Card className="hub-form-card"><Sun size={24} /><p className="eyebrow">Nueva rutina</p><h2>Diseña una secuencia que te cuide</h2><form onSubmit={addRoutine}><label className="form-field"><span>Nombre</span><input value={routineName} onChange={(event) => setRoutineName(event.target.value)} /></label><label className="form-field"><span>Momento</span><select value={routinePeriod} onChange={(event) => setRoutinePeriod(event.target.value as typeof routinePeriod)}><option value="am">AM · mañana</option><option value="afternoon">Tarde</option><option value="pm">PM · noche</option></select></label><label className="form-field"><span>Pasos · uno por línea</span><textarea rows={7} value={routineSteps} onChange={(event) => setRoutineSteps(event.target.value)} placeholder={"Agua y luz natural\nEscribir mis Top 3"} /></label><Button type="submit">Guardar rutina</Button></form></Card><div className="routine-grid">{snapshot.routines.map((routine) => <Card className="routine-card" key={routine.id}><span>{routine.period === "am" ? <Sun size={20} /> : routine.period === "pm" ? <MoonStar size={20} /> : <Sparkles size={20} />}</span><Badge tone="rose">{routine.period === "am" ? "AM" : routine.period === "pm" ? "PM" : "Tarde"}</Badge><h2>{routine.name}</h2>{routine.steps.map((step, index) => <p key={step.id}><i>{index + 1}</i>{step.title}</p>)}</Card>)}</div></div>}

      {tab === "fitness" && !snapshot.profile?.fitnessEnabled && <Card className="fitness-gate"><span><Dumbbell size={29} /></span><p className="eyebrow">Cuando te sirva</p><h1>Fitness Hub</h1><p>¿Quieres acompañar tu entrenamiento con más detalle? Puedes registrar ejercicios, comidas, macros, medidas y fotos semanales, y ocultarlo cuando prefieras una vista más ligera.</p><Button onClick={() => planner.updateProfileSettings({ fitnessEnabled: true })}>Quiero usar Fitness Hub</Button></Card>}

      {tab === "fitness" && snapshot.profile?.fitnessEnabled && <>
        <div className="fitness-header"><div><p className="eyebrow">Fitness Hub · seguimiento flexible</p><h2>Tu progreso, semana a semana</h2><p>Semana del {formatDateKey(fitnessWeekStart)} al {formatDateKey(fitnessWeekEnd)}</p></div><div className="fitness-header__actions"><label className="form-field"><span>Fecha del registro</span><input type="date" value={fitnessDate} onChange={(event) => selectFitnessDate(event.target.value)} /></label>{fitnessDate !== today && <Button variant="secondary" onClick={() => selectFitnessDate(today)}>Volver a hoy</Button>}<Button variant="ghost" onClick={() => planner.updateProfileSettings({ fitnessEnabled: false })}>Ocultar por ahora</Button></div></div>
        <div className="fitness-summary" aria-label="Resumen de Fitness Hub">
          <Card><span>Sesiones esta semana</span><strong>{weeklyWorkoutLogs.length}</strong><small>Solo cuenta lo que registraste</small></Card>
          <Card><span>Ejercicios esta semana</span><strong>{weeklyExerciseCount}</strong><small>Puedes ajustar tu ritmo</small></Card>
          <Card><span>Comidas del día</span><strong>{selectedNutrition?.meals.length ?? 0}</strong><small>{dailyMacros.calories} kcal registradas</small></Card>
          <Card><span>Último check-in</span><strong>{selectedBodyCheckIn?.weight ? `${selectedBodyCheckIn.weight} kg` : "—"}</strong><small>{formatDateKey(fitnessDate)}</small></Card>
        </div>
        <div className="fitness-grid">
          <Card className="hub-form-card fitness-log-card"><div className="fitness-card-heading"><span><Dumbbell size={22} /></span><div><p className="eyebrow">Entrenamiento</p><h2>Ejercicios</h2></div></div><form onSubmit={addWorkout}><label className="form-field"><span>Ejercicio</span><input value={exercise} onChange={(event) => setExercise(event.target.value)} placeholder="Sentadilla" /></label><div className="mini-field-grid"><label className="form-field"><span>Series</span><input type="number" min="1" value={sets} onChange={(event) => setSets(Number(event.target.value))} /></label><label className="form-field"><span>Reps</span><input type="number" min="1" value={reps} onChange={(event) => setReps(Number(event.target.value))} /></label><label className="form-field"><span>Peso kg</span><input type="number" min="0" step="0.5" value={weight} onChange={(event) => setWeight(Number(event.target.value))} /></label></div><Button type="submit">Añadir ejercicio</Button></form><div className="fitness-log-list">{selectedWorkout?.exercises.map((item) => <div className="workout-row" key={item.id}><strong>{item.name}</strong><span>{item.sets} × {item.reps} · {item.weight} kg</span></div>)}{!selectedWorkout?.exercises.length && <p className="fitness-empty">Aún no hay ejercicios en esta fecha.</p>}</div></Card>
          <Card className="hub-form-card fitness-log-card"><div className="fitness-card-heading"><span><Utensils size={22} /></span><div><p className="eyebrow">Nutrición opcional</p><h2>Comidas y macros</h2></div></div><form onSubmit={addMeal}><label className="form-field"><span>Comida</span><input value={mealName} onChange={(event) => setMealName(event.target.value)} /></label><div className="mini-field-grid mini-field-grid--four"><label className="form-field"><span>Kcal</span><input type="number" min="0" value={calories} onChange={(event) => setCalories(Number(event.target.value))} /></label><label className="form-field"><span>Proteína</span><input type="number" min="0" value={protein} onChange={(event) => setProtein(Number(event.target.value))} /></label><label className="form-field"><span>Carbs</span><input type="number" min="0" value={carbs} onChange={(event) => setCarbs(Number(event.target.value))} /></label><label className="form-field"><span>Grasa</span><input type="number" min="0" value={fat} onChange={(event) => setFat(Number(event.target.value))} /></label></div><Button type="submit">Agregar otra comida</Button></form><div className="macro-summary"><span>{dailyMacros.calories} kcal</span><span>P {dailyMacros.protein} g</span><span>C {dailyMacros.carbs} g</span><span>G {dailyMacros.fat} g</span></div><div className="meal-total">{selectedNutrition?.meals.map((meal) => <p key={meal.id}><span>{meal.name}</span><strong>{meal.calories ?? 0} kcal · P {meal.protein ?? 0}g</strong></p>)}{!selectedNutrition?.meals.length && <p className="fitness-empty">Esta parte es opcional; úsala solo si te aporta claridad.</p>}</div></Card>
          <Card className="hub-form-card"><Camera size={22} /><h2>Check-in semanal</h2><form onSubmit={saveBody}><div className="mini-field-grid"><label className="form-field"><span>Peso kg</span><input type="number" min="0" step="0.1" value={bodyWeight || ""} onChange={(event) => setBodyWeight(Number(event.target.value))} /></label><label className="form-field"><span>Cintura cm</span><input type="number" min="0" step="0.1" value={waist || ""} onChange={(event) => setWaist(Number(event.target.value))} /></label><label className="form-field"><span>Cadera cm</span><input type="number" min="0" step="0.1" value={hip || ""} onChange={(event) => setHip(Number(event.target.value))} /></label></div><label className="upload-tile"><Camera size={20} /><span>{bodyPhoto ? "Foto lista para guardar" : "Añadir foto opcional"}</span><input className="sr-only" type="file" accept="image/*" onChange={bodyPhotoChange} /></label><Button type="submit">Guardar check-in privado</Button></form>{snapshot.bodyCheckIns.slice(0, 4).map((item) => <p className="body-history" key={item.id}><span>{item.date}</span><strong>{item.weight ? `${item.weight} kg` : "Sin peso"}</strong></p>)}</Card>
        </div>
      </>}

      {tab === "challenges" && <ChallengesPage planner={planner} embedded />}

      {tab === "vision" && <><Card className="vision-board-toolbar"><form onSubmit={addVisionItem}><label className="form-field"><span>Frase</span><input value={quote} onChange={(event) => setQuote(event.target.value)} placeholder="La vida que quiero también se construye hoy." /></label><label className="button button--secondary"><ImagePlus size={16} /> {visionImage ? "Cambiar imagen" : "Elegir imagen"}<input className="sr-only" type="file" accept="image/*" onChange={uploadVisionImage} /></label>{visionImage && <figure className="vision-upload-preview"><img src={visionImage} alt="Vista previa del elemento" /><figcaption>Imagen lista para confirmar</figcaption></figure>}<label className="vision-reminder-control"><input type="checkbox" checked={visionReminder} onChange={(event) => setVisionReminder(event.target.checked)} /> Quiero recibir recordatorios</label>{visionReminder && <label className="form-field"><span>Frecuencia</span><select value={visionFrequency} onChange={(event) => setVisionFrequency(event.target.value as typeof visionFrequency)} aria-label="Frecuencia de recordatorios"><option value="daily">Diaria</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="quarterly">Cada 3 meses</option></select></label>}<Button type="submit"><Plus size={16} /> Añadir al Vision Board</Button></form>{visionReminder && <Button variant="secondary" onClick={enableNotifications}><Bell size={16} /> Permitir notificaciones</Button>}</Card><div className="vision-board-grid">{snapshot.visionBoardItems.map((item) => <Card className={`vision-board-item vision-board-item--${item.type}`} key={item.id}>{item.type !== "quote" ? <><img src={item.content} alt={item.caption || "Imagen de vision board"} />{item.caption && <blockquote>“{item.caption}”</blockquote>}</> : <blockquote>“{item.content}”</blockquote>}<footer><span>{item.caption || "Mi visión"}</span><button className={item.reminderEnabled ? "is-on" : ""} onClick={() => planner.toggleVisionReminder(item.id)}><Bell size={14} />{item.reminderEnabled ? `Recordar · ${item.reminderFrequency ?? "semanal"}` : "Sin recordatorio"}</button></footer></Card>)}</div></>}

      {tab === "events" && <div className="hub-two-column"><Card className="hub-form-card"><CalendarDays size={22} /><p className="eyebrow">Nuevo evento</p><h2>Guarda lo importante</h2><form onSubmit={addEvent}><label className="form-field"><span>Evento</span><input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Ej. Cita de control" /></label><div className="mini-field-grid"><label className="form-field"><span>Fecha</span><input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label><label className="form-field"><span>Hora</span><input type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} /></label></div><label className="form-field"><span>Clasificación</span><select value={eventCategory} onChange={(event) => setEventCategory(event.target.value as typeof eventCategory)}>{Object.entries(eventLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><Button type="submit">Guardar evento</Button></form><div className="event-list">{snapshot.events.map((item) => <p key={item.id}><span><i className={`event-dot event-dot--${item.category}`} />{item.title}</span><strong>{item.startDate} {item.time}</strong></p>)}</div></Card><Card className="all-tasks-card"><p className="eyebrow">All tasks</p><h2>Todas las tareas y su status</h2>{snapshot.tasks.map((task) => <button key={task.id} onClick={() => planner.toggleTask(task.id)}><span>{task.status === "completed" ? <Check size={15} /> : <Circle size={15} />}{task.title}</span><Badge tone={task.status === "completed" ? "sage" : task.status === "in_progress" ? "rose" : "neutral"}>{task.status === "completed" ? "Done" : task.status === "in_progress" ? "On going" : "Not initiated"}</Badge></button>)}</Card></div>}

    </div>
  );
}

"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, BarChart3, CalendarDays, Check, ChevronRight, Clock3, Copy, Dumbbell,
  Flame, Pencil, Plus, Settings2, Target, Trash2, Utensils,
} from "lucide-react";
import type { MealLog } from "@/src/domain/planner";
import { dailyNutritionTotals, mealCompletionPercent, normalizedExerciseSets } from "@/src/domain/fitnessRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { Button, Card, EmptyState, ProgressBar } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";

type FitnessSection = "nutrition" | "training";
type WorkoutDraftExercise = { id?: string; name: string; sets: Array<{ id?: string; setNumber: number; reps: number; weight: number }> };

const days = [
  { long: "Lunes", short: "L" }, { long: "Martes", short: "M" }, { long: "Miércoles", short: "X" },
  { long: "Jueves", short: "J" }, { long: "Viernes", short: "V" }, { long: "Sábado", short: "S" },
  { long: "Domingo", short: "D" },
];

const defaultSettings = {
  physicalGoal: "Cuidar mi fuerza y bienestar",
  dailyCalories: 1750,
  mealsPerDay: 4,
  workoutsPerWeek: 3,
  trainingDays: [0, 2, 4],
};

export function FitnessPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const [searchParams, setSearchParams] = useSearchParams();
  const section: FitnessSection = searchParams.get("section") === "training" ? "training" : "nutrition";
  const initialDate = searchParams.get("date") || toLocalDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [mealOpen, setMealOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [editingMealId, setEditingMealId] = useState<string | undefined>();
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState(0);
  const [mealProtein, setMealProtein] = useState(0);
  const [mealCarbs, setMealCarbs] = useState(0);
  const [mealFat, setMealFat] = useState(0);
  const [mealNotes, setMealNotes] = useState("");
  const [workoutName, setWorkoutName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [draftExercises, setDraftExercises] = useState<WorkoutDraftExercise[]>([]);
  const [copyTarget, setCopyTarget] = useState("");
  const [settings, setSettings] = useState(snapshot.profile?.fitnessProfile ?? defaultSettings);
  const [bodyWeight, setBodyWeight] = useState(0);
  const [waist, setWaist] = useState(0);
  const [hip, setHip] = useState(0);

  const weekDates = useMemo(() => getWeekDates(new Date(`${selectedDate}T12:00:00`), 1), [selectedDate]);
  const selectedNutrition = snapshot.nutritionLogs.find((item) => item.date === selectedDate);
  const selectedWorkout = snapshot.workoutLogs.find((item) => item.date === selectedDate);
  const totals = dailyNutritionTotals(selectedNutrition?.meals ?? []);
  const fitness = snapshot.profile?.fitnessProfile ?? defaultSettings;
  const selectedDayIndex = weekDates.findIndex((date) => toLocalDateKey(date) === selectedDate);
  const selectedDay = days[selectedDayIndex >= 0 ? selectedDayIndex : 0];
  const allSessions = snapshot.workoutLogs.flatMap((log) => log.completedSessions ?? []).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const exerciseNames = Array.from(new Set(allSessions.flatMap((session) => session.exercises.map((exercise) => exercise.name))));
  const [historyExercise, setHistoryExercise] = useState("");
  const visibleHistoryExercise = historyExercise || exerciseNames[0] || "";

  const selectSection = (next: FitnessSection) => {
    const params = new URLSearchParams(searchParams);
    if (next === "nutrition") params.delete("section"); else params.set("section", "training");
    params.set("date", selectedDate);
    setSearchParams(params, { replace: true });
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
    const params = new URLSearchParams(searchParams);
    params.set("date", date);
    setSearchParams(params, { replace: true });
  };

  const openMeal = (meal?: MealLog) => {
    setEditingMealId(meal?.id);
    setMealName(meal?.name ?? `Comida ${(selectedNutrition?.meals.length ?? 0) + 1}`);
    setMealCalories(meal?.calories ?? 0); setMealProtein(meal?.protein ?? 0); setMealCarbs(meal?.carbs ?? 0); setMealFat(meal?.fat ?? 0);
    setMealNotes(meal?.notes ?? ""); setMealOpen(true);
  };

  const saveMeal = async (event: FormEvent) => {
    event.preventDefault();
    await planner.saveMeal({ mealId: editingMealId, date: selectedDate, name: mealName, calories: mealCalories, protein: mealProtein, carbs: mealCarbs, fat: mealFat, notes: mealNotes, completed: true });
    setMealOpen(false); setMessage(editingMealId ? "Comida actualizada." : "Comida añadida al día.");
  };

  const openWorkout = () => {
    setWorkoutName(selectedWorkout?.name ?? selectedWorkout?.goal ?? "");
    setDurationMinutes(selectedWorkout?.durationMinutes ?? 60);
    setDraftExercises((selectedWorkout?.exercises ?? []).map((exercise) => ({
      id: exercise.id, name: exercise.name,
      sets: normalizedExerciseSets(exercise).map((set) => ({ ...set })),
    })));
    setWorkoutOpen(true);
  };

  const addExercise = () => setDraftExercises((current) => [...current, { name: "", sets: [{ setNumber: 1, reps: 10, weight: 0 }] }]);
  const updateExerciseName = (index: number, value: string) => setDraftExercises((current) => current.map((exercise, itemIndex) => itemIndex === index ? { ...exercise, name: value } : exercise));
  const updateSetCount = (index: number, count: number) => setDraftExercises((current) => current.map((exercise, itemIndex) => {
    if (itemIndex !== index) return exercise;
    const safeCount = Math.max(1, Math.min(10, count));
    const sets = Array.from({ length: safeCount }, (_, setIndex) => exercise.sets[setIndex] ?? { setNumber: setIndex + 1, reps: 10, weight: 0 });
    return { ...exercise, sets: sets.map((set, setIndex) => ({ ...set, setNumber: setIndex + 1 })) };
  }));
  const updateSet = (exerciseIndex: number, setIndex: number, field: "reps" | "weight", value: number) => setDraftExercises((current) => current.map((exercise, itemIndex) => itemIndex === exerciseIndex ? {
    ...exercise, sets: exercise.sets.map((set, currentSetIndex) => currentSetIndex === setIndex ? { ...set, [field]: value } : set),
  } : exercise));

  const saveWorkout = async (event: FormEvent) => {
    event.preventDefault();
    await planner.saveWorkoutPlan({ date: selectedDate, name: workoutName, durationMinutes: durationMinutes || undefined, exercises: draftExercises });
    setWorkoutOpen(false); setMessage("Rutina planificada guardada sin modificar tu historial.");
  };

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    await planner.updateProfileSettings({ fitnessEnabled: true, fitnessProfile: settings });
    if (bodyWeight || waist || hip) await planner.saveBodyCheckIn({ date: selectedDate, weight: bodyWeight || undefined, waist: waist || undefined, hip: hip || undefined });
    setSettingsOpen(false); setMessage("Tu contexto de Fitness quedó guardado.");
  };

  return <div className="page-stack fitness-page">
    <header className="fitness-page__header">
      <Link className="back-link" to="/app/life-hub"><ArrowLeft size={18} /> Volver a Mi espacio</Link>
      <div><span className="fitness-page__title-icon">{section === "nutrition" ? <Utensils size={27} /> : <Dumbbell size={27} />}</span><div><p className="eyebrow">MI ESPACIO · FITNESS</p><h1>{section === "nutrition" ? "Alimentación" : "Entrenamiento"}</h1></div></div>
      <Button variant="secondary" onClick={() => { setSettings(snapshot.profile?.fitnessProfile ?? defaultSettings); setSettingsOpen(true); }}><Settings2 size={17} /> Configurar</Button>
    </header>

    {message && <div className="inline-message" role="status">{message}</div>}

    <Card className="fitness-context-card">
      <div><span><Target size={20} /></span><small>Meta física</small><strong>{fitness.physicalGoal}</strong></div>
      <div><span><Flame size={20} /></span><small>Calorías diarias</small><strong>{fitness.dailyCalories} kcal</strong></div>
      <div><span>{section === "nutrition" ? <Utensils size={20} /> : <Dumbbell size={20} />}</span><small>{section === "nutrition" ? "Comidas al día" : "Entrenamientos"}</small><strong>{section === "nutrition" ? fitness.mealsPerDay : `${fitness.workoutsPerWeek} por semana`}</strong></div>
      <div className="fitness-context-days"><span><CalendarDays size={20} /></span><small>Días de entrenamiento</small><div>{days.map((day, index) => <i className={fitness.trainingDays.includes(index) ? "is-active" : ""} key={day.long}>{day.short}</i>)}</div></div>
    </Card>

    <div className="fitness-tabs" role="tablist" aria-label="Secciones de Fitness">
      <button type="button" role="tab" aria-selected={section === "nutrition"} className={section === "nutrition" ? "is-active" : ""} onClick={() => selectSection("nutrition")}>Alimentación</button>
      <button type="button" role="tab" aria-selected={section === "training"} className={section === "training" ? "is-active" : ""} onClick={() => selectSection("training")}>Entrenamiento</button>
    </div>

    <nav className="fitness-week" aria-label="Días de la semana">
      {weekDates.map((date, index) => { const key = toLocalDateKey(date); return <button type="button" key={key} className={selectedDate === key ? "is-active" : ""} aria-current={selectedDate === key ? "date" : undefined} onClick={() => selectDate(key)}><span>{days[index].long}</span><small>{date.getDate()}</small></button>; })}
    </nav>

    {section === "nutrition" ? <>
      <Card className="fitness-day-card nutrition-day-card">
        <header><div><span className="fitness-round-icon"><CalendarDays size={21} /></span><div><p className="eyebrow">{selectedDate}</p><h2>{selectedDay.long}</h2></div></div><div className="macro-total"><strong><Flame size={21} /> {totals.calories} kcal</strong><span>P {totals.protein}g · C {totals.carbs}g · G {totals.fat}g</span></div></header>
        {(selectedNutrition?.meals.length ?? 0) > 0 ? <div className="meal-grid">{selectedNutrition?.meals.map((meal) => <article className="meal-card" key={meal.id}><div><span><Utensils size={19} /></span><button type="button" onClick={() => openMeal(meal)} aria-label={`Editar ${meal.name}`}><Pencil size={16} /></button></div><h3>{meal.name}</h3><strong>{meal.calories ?? 0} kcal</strong><p>P {meal.protein ?? 0} / C {meal.carbs ?? 0} / G {meal.fat ?? 0}</p>{meal.notes && <small>{meal.notes}</small>}<button className="meal-card__delete" type="button" onClick={() => planner.deleteMeal(selectedDate, meal.id)} aria-label={`Eliminar ${meal.name}`}><Trash2 size={14} /> Eliminar</button></article>)}</div> : <EmptyState title="Aún no hay comidas registradas" text="Añade únicamente lo que te ayude a observar tu alimentación con claridad." action={<Button onClick={() => openMeal()}><Plus size={17} /> Añadir comida</Button>} />}
      </Card>
      <Card className="fitness-day-summary"><span className="fitness-round-icon"><BarChart3 size={21} /></span><div><h2>Resumen del día</h2><p>{selectedNutrition?.meals.length ?? 0} comidas registradas</p><ProgressBar value={mealCompletionPercent(selectedNutrition?.meals.length ?? 0, fitness.mealsPerDay)} label={`${selectedNutrition?.meals.length ?? 0}/${fitness.mealsPerDay} completadas`} /></div><Button onClick={() => openMeal()}><Plus size={18} /> Añadir comida</Button></Card>
      <CopyDayControls label="Copiar alimentación a" selectedDate={selectedDate} copyTarget={copyTarget} onTarget={setCopyTarget} onCopy={async () => { if (!copyTarget) return; await planner.copyMeals(selectedDate, copyTarget); setMessage("Alimentación copiada al día elegido."); }} />
    </> : <>
      <Card className="fitness-day-card training-day-card">
        {selectedWorkout?.exercises.length ? <>
          <header><div><span className="fitness-round-icon"><Dumbbell size={22} /></span><div><p className="eyebrow">{selectedDay.long} · {selectedDate}</p><h2>{selectedWorkout.name ?? selectedWorkout.goal ?? "Entrenamiento"}</h2></div></div><div className="workout-meta"><span><Clock3 size={16} /> {selectedWorkout.durationMinutes ?? "—"} min</span><span><Dumbbell size={16} /> {selectedWorkout.exercises.length} ejercicios</span><Button variant="secondary" size="sm" onClick={openWorkout}><Pencil size={15} /> Editar</Button></div></header>
          <div className="exercise-table">{selectedWorkout.exercises.map((exercise) => <article key={exercise.id}><div className="exercise-name"><span><Dumbbell size={18} /></span><div><h3>{exercise.name}</h3><small>{normalizedExerciseSets(exercise).length} series</small></div></div><div className="exercise-sets">{normalizedExerciseSets(exercise).map((set) => <div key={set.id}><small>Set {set.setNumber}</small><strong>{set.reps} rep</strong><span>{set.weight} kg</span></div>)}</div></article>)}</div>
          <div className="workout-actions"><Button variant="secondary" onClick={() => setHistoryOpen(true)}><BarChart3 size={17} /> Ver historial de pesos</Button><Button onClick={async () => { await planner.completeWorkout(selectedDate); setMessage("Sesión realizada guardada en tu historial."); }}><Check size={17} /> Guardar sesión realizada</Button></div>
        </> : <EmptyState title={`Sin entrenamiento para ${selectedDay.long.toLowerCase()}`} text="Puedes dejarlo como descanso o crear una rutina para este día." action={<Button onClick={openWorkout}><Plus size={17} /> Añadir entrenamiento</Button>} />}
      </Card>
      <section className="fitness-week-overview" aria-label="Resumen de entrenamientos de la semana">{weekDates.map((date, index) => { const key = toLocalDateKey(date); const log = snapshot.workoutLogs.find((item) => item.date === key); return <button type="button" key={key} className={key === selectedDate ? "is-active" : ""} onClick={() => selectDate(key)}><CalendarDays size={18} /><span><small>{days[index].long}</small><strong>{log?.name ?? log?.goal ?? "Descanso"}</strong></span><em>{log?.exercises.length ? `${log.exercises.length} ejercicios` : "Sin plan"}</em><ChevronRight size={17} /></button>; })}</section>
      <div className="fitness-primary-action"><Button onClick={openWorkout}><Plus size={18} /> {selectedWorkout ? "Editar entrenamiento" : "Añadir entrenamiento"}</Button></div>
      {selectedWorkout && <CopyDayControls label="Duplicar entrenamiento en" selectedDate={selectedDate} copyTarget={copyTarget} onTarget={setCopyTarget} onCopy={async () => { if (!copyTarget) return; await planner.duplicateWorkout(selectedDate, copyTarget); setMessage("Entrenamiento duplicado sin copiar el historial."); }} />}
    </>}

    <Card className="fitness-quote"><span>☆</span><p>Pequeñas decisiones hoy, grandes cambios siempre.</p><span>♡</span></Card>

    <Modal open={mealOpen} title={editingMealId ? "Editar comida" : "Añadir comida"} description="Registra manualmente solo la información que quieras observar." onClose={() => setMealOpen(false)}>
      <form className="fitness-form" onSubmit={saveMeal}><label className="form-field"><span>Nombre</span><input required minLength={2} value={mealName} onChange={(event) => setMealName(event.target.value)} /></label><div className="fitness-form-grid"><NumberField label="Calorías" value={mealCalories} onChange={setMealCalories} /><NumberField label="Proteína (g)" value={mealProtein} onChange={setMealProtein} /><NumberField label="Carbohidratos (g)" value={mealCarbs} onChange={setMealCarbs} /><NumberField label="Grasas (g)" value={mealFat} onChange={setMealFat} /></div><label className="form-field"><span>Notas opcionales</span><textarea rows={3} value={mealNotes} onChange={(event) => setMealNotes(event.target.value)} /></label><div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setMealOpen(false)}>Cancelar</Button><Button type="submit">Guardar comida</Button></div></form>
    </Modal>

    <Modal open={workoutOpen} title={selectedWorkout ? "Editar entrenamiento" : "Añadir entrenamiento"} description="Cada serie conserva sus propias repeticiones y peso." onClose={() => setWorkoutOpen(false)}>
      <form className="fitness-form workout-builder" onSubmit={saveWorkout}><div className="fitness-form-grid"><label className="form-field"><span>Nombre del entrenamiento</span><input required minLength={2} value={workoutName} onChange={(event) => setWorkoutName(event.target.value)} placeholder="Ej. Glúteos" /></label><NumberField label="Duración estimada (min)" value={durationMinutes} onChange={setDurationMinutes} min={1} /></div>{draftExercises.map((exercise, exerciseIndex) => <fieldset key={exercise.id ?? exerciseIndex}><legend>Ejercicio {exerciseIndex + 1}</legend><div className="workout-builder__heading"><label className="form-field"><span>Nombre del ejercicio</span><input required minLength={2} value={exercise.name} onChange={(event) => updateExerciseName(exerciseIndex, event.target.value)} /></label><label className="form-field"><span>Número de series</span><input type="number" min="1" max="10" value={exercise.sets.length} onChange={(event) => updateSetCount(exerciseIndex, Number(event.target.value))} /></label><button type="button" onClick={() => setDraftExercises((current) => current.filter((_, index) => index !== exerciseIndex))} aria-label={`Eliminar ejercicio ${exerciseIndex + 1}`}><Trash2 size={16} /></button></div><div className="workout-builder__sets">{exercise.sets.map((set, setIndex) => <div key={set.id ?? setIndex}><strong>Set {setIndex + 1}</strong><NumberField label="Reps" value={set.reps} onChange={(value) => updateSet(exerciseIndex, setIndex, "reps", value)} /><NumberField label="Peso kg" value={set.weight} onChange={(value) => updateSet(exerciseIndex, setIndex, "weight", value)} step={0.5} /></div>)}</div></fieldset>)}<Button type="button" variant="secondary" onClick={addExercise}><Plus size={16} /> Añadir ejercicio</Button>{!draftExercises.length && <p className="form-help">Añade al menos un ejercicio para guardar el entrenamiento.</p>}<div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setWorkoutOpen(false)}>Cancelar</Button><Button type="submit" disabled={!draftExercises.length}>Guardar rutina</Button></div></form>
    </Modal>

    <Modal open={settingsOpen} title="Configurar Fitness" description="Este contexto se usa tanto en Alimentación como en Entrenamiento." onClose={() => setSettingsOpen(false)}>
      <form className="fitness-form" onSubmit={saveSettings}><label className="form-field"><span>Meta física</span><input required minLength={2} value={settings.physicalGoal} onChange={(event) => setSettings({ ...settings, physicalGoal: event.target.value })} /></label><div className="fitness-form-grid"><NumberField label="Calorías diarias" value={settings.dailyCalories} onChange={(dailyCalories) => setSettings({ ...settings, dailyCalories })} min={1} /><NumberField label="Comidas al día" value={settings.mealsPerDay} onChange={(mealsPerDay) => setSettings({ ...settings, mealsPerDay })} min={1} max={10} /><NumberField label="Entrenamientos por semana" value={settings.workoutsPerWeek} onChange={(workoutsPerWeek) => setSettings({ ...settings, workoutsPerWeek })} min={1} max={7} /></div><fieldset className="training-day-picker"><legend>Días de entrenamiento</legend>{days.map((day, index) => <label key={day.long}><input type="checkbox" checked={settings.trainingDays.includes(index)} onChange={(event) => setSettings({ ...settings, trainingDays: event.target.checked ? [...settings.trainingDays, index].sort() : settings.trainingDays.filter((dayIndex) => dayIndex !== index) })} />{day.long}</label>)}</fieldset><details className="body-checkin-settings"><summary>Medidas y progreso corporal (opcional)</summary><p>Tus registros anteriores siguen disponibles: {snapshot.bodyCheckIns.length} check-ins guardados.</p><div className="fitness-form-grid"><NumberField label="Peso kg" value={bodyWeight} onChange={setBodyWeight} step={0.1} /><NumberField label="Cintura cm" value={waist} onChange={setWaist} step={0.1} /><NumberField label="Cadera cm" value={hip} onChange={setHip} step={0.1} /></div>{snapshot.bodyCheckIns.slice(0, 3).map((item) => <p className="body-checkin-row" key={item.id}><span>{item.date}</span><strong>{item.weight ? `${item.weight} kg` : "Sin peso"}</strong></p>)}</details><div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setSettingsOpen(false)}>Cancelar</Button><Button type="submit" disabled={!settings.trainingDays.length}>Guardar configuración</Button></div></form>
    </Modal>

    <Modal open={historyOpen} title="Historial de pesos" description="Cada registro realizado queda separado de la rutina planificada." onClose={() => setHistoryOpen(false)}>
      <div className="weight-history"><label className="form-field"><span>Ejercicio</span><select value={visibleHistoryExercise} onChange={(event) => setHistoryExercise(event.target.value)}>{exerciseNames.map((name) => <option key={name}>{name}</option>)}</select></label>{allSessions.filter((session) => session.exercises.some((exercise) => exercise.name === visibleHistoryExercise)).map((session) => { const exercise = session.exercises.find((item) => item.name === visibleHistoryExercise); return <article key={session.id}><div><strong>{session.date}</strong><small>{session.workoutName}</small></div><p>{exercise?.sets.map((set) => `${set.weight} kg × ${set.reps}`).join(" · ")}</p></article>; })}{!allSessions.length && <EmptyState title="Aún no hay sesiones realizadas" text="Cuando guardes una sesión, sus pesos aparecerán aquí sin alterar tu rutina." />}</div>
    </Modal>
  </div>;
}

function NumberField({ label, value, onChange, min = 0, max, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return <label className="form-field"><span>{label}</span><input type="number" min={min} max={max} step={step} value={value || ""} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function CopyDayControls({ label, selectedDate, copyTarget, onTarget, onCopy }: { label: string; selectedDate: string; copyTarget: string; onTarget: (value: string) => void; onCopy: () => void }) {
  return <Card className="copy-day-controls"><Copy size={18} /><label className="form-field"><span>{label}</span><input type="date" min={selectedDate} value={copyTarget} onChange={(event) => onTarget(event.target.value)} /></label><Button variant="secondary" disabled={!copyTarget || copyTarget === selectedDate} onClick={onCopy}>Copiar</Button></Card>;
}

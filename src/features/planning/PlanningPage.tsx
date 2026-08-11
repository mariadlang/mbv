"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Compass,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import type { CascadeHorizon } from "@/src/domain/planner";
import { monthlyBrainDumpSummary, weeklyPlanningInsight } from "@/src/domain/cascadeRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatShortDay, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, SectionHeading } from "@/src/components/ui/Primitives";

type PlanningView = "year" | "month" | "week" | "day" | "reset";

const monthIdeas = [
  ["Enero", "Enfocar", "Definir visión y metas"],
  ["Febrero", "Fundamentar", "Crear el hábito clave"],
  ["Marzo", "Impulsar", "Convertir intención en avance"],
  ["Abril", "Expandir", "Abrir nuevas posibilidades"],
  ["Mayo", "Profundizar", "Desarrollar una habilidad"],
  ["Junio", "Consolidar", "Ordenar sistemas y procesos"],
  ["Julio", "Elevar", "Elegir el siguiente nivel"],
  ["Agosto", "Preparar", "Ajustar el segundo semestre"],
  ["Septiembre", "Construir", "Escalar lo que funciona"],
  ["Octubre", "Visibilizar", "Compartir y posicionar"],
  ["Noviembre", "Abundancia", "Crear espacio y libertad"],
  ["Diciembre", "Celebrar", "Cerrar ciclos y agradecer"],
] as const;

const horizonLabels: Record<CascadeHorizon, { short: string; title: string; hint: string }> = {
  pathways: { short: "Caminos", title: "Cómo construyo la vida que quiero", hint: "Decisiones y sistemas que conectan tu Dream Life con la realidad." },
  three_years: { short: "3 años", title: "Plan a 3 años", hint: "Cómo quieres que se vea y se sienta tu vida al final de este horizonte." },
  annual: { short: "1 año", title: "Plan a 1 año", hint: "El resultado anual que orienta tus doce meses." },
  six_months: { short: "6 meses", title: "Plan a 6 meses", hint: "Un puente claro entre el año y el siguiente trimestre." },
  quarterly: { short: "3 meses", title: "Plan a 3 meses", hint: "Un trimestre concreto, medible y posible." },
  monthly: { short: "Mes", title: "Plan mensual", hint: "Intención, prioridad, objetivos y actividades del mes." },
  weekly: { short: "Semana", title: "Plan semanal", hint: "Prioridades ubicadas en días reales, con espacio para ajustar." },
  daily: { short: "Día", title: "Plan diario y horarios", hint: "Lo esencial de hoy, protegido con bloques de tiempo." },
};

function periodKeyFor(horizon: CascadeHorizon, anchor: Date, selectedDate: string) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;
  if (horizon === "pathways") return "vision";
  if (horizon === "three_years") return String(year + 3);
  if (horizon === "annual") return String(year);
  if (horizon === "six_months") return `${year}-H${month <= 6 ? 1 : 2}`;
  if (horizon === "quarterly") return `${year}-Q${Math.ceil(month / 3)}`;
  if (horizon === "monthly") return format(anchor, "yyyy-MM");
  if (horizon === "weekly") return `${year}-W${String(getISOWeek(anchor)).padStart(2, "0")}`;
  return selectedDate;
}

export function PlanningPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const todayKey = toLocalDateKey(new Date());
  const [view, setView] = useState<PlanningView>("year");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [taskTitle, setTaskTitle] = useState("");
  const [resetText, setResetText] = useState("");
  const [cascadeHorizon, setCascadeHorizon] = useState<CascadeHorizon>("annual");
  const [intention, setIntention] = useState("");
  const [priority, setPriority] = useState("");
  const [objectives, setObjectives] = useState("");
  const [activities, setActivities] = useState("");
  const [saved, setSaved] = useState(false);

  const weekDates = getWeekDates(anchorDate, snapshot.profile?.weekStartsOn ?? 1);
  const activePeriodKey = periodKeyFor(cascadeHorizon, anchorDate, selectedDate);
  const activePlan = snapshot.cascadePlans.find(
    (plan) => plan.horizon === cascadeHorizon && plan.periodKey === activePeriodKey,
  );
  const weeklyInsight = weeklyPlanningInsight(snapshot);
  const brainSummary = monthlyBrainDumpSummary(snapshot, format(anchorDate, "yyyy-MM"));
  const calendarDates = useMemo(() => {
    const weekStartsOn = snapshot.profile?.weekStartsOn ?? 1;
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(anchorDate), { weekStartsOn }),
      end: endOfWeek(endOfMonth(anchorDate), { weekStartsOn }),
    });
  }, [anchorDate, snapshot.profile?.weekStartsOn]);

  useEffect(() => {
    queueMicrotask(() => {
      setIntention(activePlan?.intention ?? "");
      setPriority(activePlan?.priority ?? "");
      setObjectives(activePlan?.objectives.join("\n") ?? "");
      setActivities(activePlan?.activities.map((item) => item.title).join("\n") ?? "");
    });
  }, [activePlan, activePeriodKey]);

  const saveCascade = async (event: FormEvent) => {
    event.preventDefault();
    if (!intention.trim() || !priority.trim()) return;
    await planner.saveCascadePlan({
      horizon: cascadeHorizon,
      periodKey: activePeriodKey,
      intention,
      priority,
      objectives: objectives.split("\n").map((item) => item.trim()).filter(Boolean),
      activities: activities.split("\n").map((item) => item.trim()).filter(Boolean).map((title) => ({ title, type: "activity" as const })),
    });
    setSaved(true);
  };

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    await planner.createTask(taskTitle, selectedDate);
    setTaskTitle("");
  };

  const saveReset = async () => {
    if (!resetText.trim()) return;
    await planner.saveJournal(resetText, { type: "monthly_reset", title: `Reset mensual · ${format(anchorDate, "MMMM yyyy", { locale: es })}` });
    await planner.saveReview("monthly", resetText);
    setResetText("");
  };

  const moveMonth = (amount: number) => setAnchorDate((date) => amount > 0 ? addMonths(date, 1) : subMonths(date, 1));
  const selectHorizon = (horizon: CascadeHorizon) => {
    setCascadeHorizon(horizon);
    setSaved(false);
    document.getElementById("cascade-editor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="page-stack cascade-page">
      <SectionHeading
        eyebrow="De tu Dream Life a lo que haces hoy"
        title="Planeación cascada"
        description="Cada nivel responde al anterior: caminos, 3 años, 1 año, 6 meses, 3 meses, mes, semana y día."
      />

      <Card className="cascade-map-card">
        <div className="cascade-map-heading"><span><Compass size={20} /></span><div><p className="eyebrow">Tu mapa completo</p><h2>La visión baja a decisiones concretas</h2></div></div>
        <div className="cascade-map" role="tablist" aria-label="Horizontes de planeación">
          {(Object.keys(horizonLabels) as CascadeHorizon[]).map((horizon, index) => {
            const hasPlan = snapshot.cascadePlans.some((plan) => plan.horizon === horizon && plan.periodKey === periodKeyFor(horizon, anchorDate, selectedDate));
            return <button key={horizon} className={cascadeHorizon === horizon ? "is-active" : ""} onClick={() => selectHorizon(horizon)} role="tab"><span>{index + 1}</span><strong>{horizonLabels[horizon].short}</strong><small>{hasPlan ? "Definido" : "Por definir"}</small></button>;
          })}
        </div>

        <form className="cascade-editor" id="cascade-editor" onSubmit={saveCascade}>
          <header><div><p className="eyebrow">{horizonLabels[cascadeHorizon].short} · {activePeriodKey}</p><h2>{horizonLabels[cascadeHorizon].title}</h2><p>{horizonLabels[cascadeHorizon].hint}</p></div>{activePlan?.suggestion && <aside><Sparkles size={16} /><span>{activePlan.suggestion}</span></aside>}</header>
          <div className="cascade-fields">
            <label className="form-field"><span>Intención de este nivel</span><textarea rows={3} value={intention} onChange={(event) => { setIntention(event.target.value); setSaved(false); }} placeholder="¿Cómo quieres vivir o sentir este periodo?" /></label>
            <label className="form-field"><span>Prioridad principal</span><textarea rows={3} value={priority} onChange={(event) => { setPriority(event.target.value); setSaved(false); }} placeholder="Si solo una cosa avanzara, ¿cuál sería?" /></label>
            <label className="form-field"><span>Objetivos · uno por línea</span><textarea rows={5} value={objectives} onChange={(event) => { setObjectives(event.target.value); setSaved(false); }} placeholder={"Objetivo 1\nObjetivo 2\nObjetivo 3"} /></label>
            <label className="form-field"><span>Actividades o eventos · uno por línea</span><textarea rows={5} value={activities} onChange={(event) => { setActivities(event.target.value); setSaved(false); }} placeholder={"Actividad clave\nEvento importante"} /></label>
          </div>
          <footer><span>{saved ? <><Check size={15} /> Nivel guardado y conectado</> : "Confirma cada nivel para conservar tu mapa."}</span><Button type="submit"><Save size={16} /> Guardar {horizonLabels[cascadeHorizon].short}</Button></footer>
        </form>
      </Card>

      <nav className="planning-tabs" aria-label="Vistas de planificación">
        {(["year", "month", "week", "day", "reset"] as PlanningView[]).map((item) => <button key={item} className={view === item ? "is-active" : ""} onClick={() => setView(item)}>{item === "year" ? "12 meses" : item === "month" ? "Mes y eventos" : item === "week" ? "Semana" : item === "day" ? "Día y horarios" : "Reset mensual"}</button>)}
      </nav>

      {view === "year" && <>
        <div className="annual-plan-grid">{monthIdeas.map(([month, verb, suggestion], index) => {
          const monthKey = `${anchorDate.getFullYear()}-${String(index + 1).padStart(2, "0")}`;
          const plan = snapshot.cascadePlans.find((item) => item.horizon === "monthly" && item.periodKey === monthKey);
          const monthEvents = snapshot.events.filter((event) => event.startDate.startsWith(monthKey)).length;
          return <Card className="month-plan-card month-plan-card--interactive" key={month} onClick={() => { setAnchorDate(new Date(anchorDate.getFullYear(), index, 1)); setCascadeHorizon("monthly"); }}><span>{month}</span><strong>{plan?.intention || verb}</strong><p>{plan?.priority || suggestion}</p><small>{plan?.objectives.length ?? 0} objetivos · {monthEvents} eventos</small><i>{plan ? "✓" : "+"}</i></Card>;
        })}</div>
        <Card className="annual-cascade-note"><Sparkles size={20} /><div><strong>Cómo usar tus 12 meses</strong><p>Abre un mes para definir intención, prioridad, objetivos y actividades. Puedes cambiarlo sin romper el plan anual.</p></div></Card>
      </>}

      {view === "month" && <>
        <div className="calendar-toolbar"><button onClick={() => moveMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button><h2>{format(anchorDate, "MMMM yyyy", { locale: es })}</h2><button onClick={() => moveMonth(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button><Button variant="secondary" onClick={() => setAnchorDate(new Date())}>Hoy</Button></div>
        <Card className="month-calendar-card">
          <div className="calendar-weekdays">{["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="month-calendar-grid">{calendarDates.map((date) => {
            const key = toLocalDateKey(date);
            const dayTasks = snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled");
            const dayEvents = snapshot.events.filter((event) => event.startDate === key);
            return <button key={key} className={`${isSameMonth(date, anchorDate) ? "" : "is-outside"} ${key === todayKey ? "is-today" : ""}`} onClick={() => { setSelectedDate(key); setView("day"); setCascadeHorizon("daily"); }}><span>{date.getDate()}</span>{dayEvents.slice(0, 2).map((event) => <small className="calendar-event" key={event.id}><CalendarDays size={10} />{event.title}</small>)}{dayTasks.slice(0, 2).map((task) => <small key={task.id}><Circle size={8} />{task.title}</small>)}</button>;
          })}</div>
        </Card>
      </>}

      {view === "week" && <>
        <div className="weekly-planner-assistant">
          <Card><p className="eyebrow">Así te fue la semana pasada</p><strong>{weeklyInsight.completionRate}% completado</strong><p>{weeklyInsight.summary}</p></Card>
          <Card><Sparkles size={20} /><p className="eyebrow">Sugerencia para esta semana</p><strong>{weeklyInsight.suggestion}</strong></Card>
          <Card className="weekly-brain-dump"><p className="eyebrow">Ubica tu braindump</p>{snapshot.brainDumpItems.filter((item) => item.status === "idea").slice(0, 3).map((item, index) => { const target = weekDates[Math.min(index + 1, 6)]; return <div key={item.id}><span>{item.title}</span><Button type="button" variant="secondary" onClick={() => planner.scheduleBrainDumpItem(item.id, toLocalDateKey(target))}>Poner {formatShortDay(target)}</Button></div>; })}{!snapshot.brainDumpItems.some((item) => item.status === "idea") && <p>No hay ideas pendientes por ubicar.</p>}</Card>
        </div>
        <form className="planning-add" onSubmit={addTask}><Plus size={19} /><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="¿Qué quieres hacer esta semana?" /><select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>{weekDates.map((date) => <option value={toLocalDateKey(date)} key={date.toISOString()}>{formatShortDay(date)} {date.getDate()}</option>)}</select><Button type="submit">Añadir</Button></form>
        <section className="week-board">{weekDates.map((date) => { const key = toLocalDateKey(date); const tasks = snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled"); return <Card className={`day-column ${key === todayKey ? "is-today" : ""}`} key={key}><header className="day-column__header"><div><span>{formatShortDay(date)}</span><strong>{date.getDate()}</strong></div>{key === todayKey && <Badge tone="rose">Hoy</Badge>}</header><div className="day-column__tasks">{tasks.map((task) => <button className={`week-task ${task.status === "completed" ? "is-complete" : ""}`} key={task.id} onClick={() => planner.toggleTask(task.id)}>{task.status === "completed" ? <Check size={15} /> : <Circle size={14} />}<span>{task.title}</span>{task.time && <small>{task.time}</small>}</button>)}{!tasks.length && <p className="day-column__empty">Espacio disponible</p>}</div></Card>; })}</section>
      </>}

      {view === "day" && <div className="daily-schedule-layout">
        <Card className="daily-schedule-card"><header><div><p className="eyebrow">Horario flexible</p><h2>{format(new Date(`${selectedDate}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })}</h2></div><input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setCascadeHorizon("daily"); }} /></header><div className="schedule-grid">{[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map((hour) => { const tasks = snapshot.tasks.filter((task) => task.date === selectedDate && Number(task.time?.slice(0,2)) === hour); return <div key={hour}><time>{String(hour).padStart(2,"0")}:00</time><span>{tasks.map((task) => <button key={task.id} onClick={() => planner.toggleTask(task.id)}>{task.title}</button>)}</span></div>; })}</div></Card>
        <Card className="daily-unscheduled"><Clock3 size={22} /><h2>Sin horario todavía</h2><p>Pon una hora desde Tareas o usa estos pendientes como margen flexible.</p>{snapshot.tasks.filter((task) => task.date === selectedDate && !task.time && task.status !== "completed").map((task) => <button key={task.id} onClick={() => planner.toggleTask(task.id)}><Circle size={14} />{task.title}</button>)}</Card>
      </div>}

      {view === "reset" && <div className="monthly-reset-grid">
        <Card className="reset-reflection"><RotateCcw size={22} /><p className="eyebrow">Reflexión del mes anterior</p><h2>¿Qué logré, qué aprendí y qué quiero ajustar?</h2><textarea value={resetText} onChange={(event) => setResetText(event.target.value)} rows={9} placeholder="Escribe una reflexión honesta y útil…" /><Button onClick={saveReset}><Save size={16} /> Guardar reset mensual</Button></Card>
        <div className="reset-summary"><Card className="brain-summary-card"><Sparkles size={23} /><div><p className="eyebrow">Summary de tus listas</p><strong>{brainSummary.captured} pensamientos capturados · {brainSummary.pending} abiertos</strong><span>{brainSummary.message}</span></div></Card><Card className="release-note"><p>Lo que elijo llevar al próximo mes</p><span>Conserva solo lo que todavía apoya tu visión, tus caminos y tu prioridad anual.</span></Card></div>
      </div>}
    </div>
  );
}

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
import { Link, useLocation } from "react-router-dom";
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
import type { CascadeHorizon, PlannerSnapshot } from "@/src/domain/planner";
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

export function PlanningPage({ planner, initialView = "year" }: { planner: PlannerController; initialView?: PlanningView }) {
  const { snapshot } = planner;
  const location = useLocation();
  const todayKey = toLocalDateKey(new Date());
  const requestedView = new URLSearchParams(location.search).get("view");
  const [view, setView] = useState<PlanningView>((["year", "month", "week", "day", "reset"] as PlanningView[]).includes(requestedView as PlanningView) ? requestedView as PlanningView : initialView);
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskFocusPriority, setTaskFocusPriority] = useState<"" | "1" | "2" | "3">("");
  const [monthlyReset, setMonthlyReset] = useState({ advanced: "", learned: "", release: "", adjust: "", next: "" });
  const [monthlyResetSaved, setMonthlyResetSaved] = useState(false);
  const [cascadeHorizon, setCascadeHorizon] = useState<CascadeHorizon>("annual");
  const [intention, setIntention] = useState("");
  const [priority, setPriority] = useState("");
  const [objectives, setObjectives] = useState("");
  const [activities, setActivities] = useState("");
  const [saved, setSaved] = useState(false);
  const [fullMapOpen, setFullMapOpen] = useState(initialView === "year");
  const [monthMode, setMonthMode] = useState<"calendar" | "agenda">("calendar");
  const [weeklyResetOpen, setWeeklyResetOpen] = useState(new URLSearchParams(location.search).get("reset") === "1");
  const [weeklyReset, setWeeklyReset] = useState({ celebrate: "", release: "", adjust: "", priorities: ["", "", ""] });
  const [weeklyResetSaved, setWeeklyResetSaved] = useState(false);

  const weekDates = getWeekDates(anchorDate, snapshot.profile?.weekStartsOn ?? 1);
  const activePeriodKey = periodKeyFor(cascadeHorizon, anchorDate, selectedDate);
  const activePlan = snapshot.cascadePlans.find(
    (plan) => plan.horizon === cascadeHorizon && plan.periodKey === activePeriodKey,
  );
  const weeklyInsight = weeklyPlanningInsight(snapshot);
  const brainSummary = monthlyBrainDumpSummary(snapshot, format(anchorDate, "yyyy-MM"));
  const monthlyContext = snapshot.cascadePlans.find((plan) => plan.horizon === "monthly" && plan.periodKey === format(anchorDate, "yyyy-MM"));
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

  useEffect(() => {
    if (new URLSearchParams(location.search).get("reset") === "1") queueMicrotask(() => setWeeklyResetOpen(true));
  }, [location.search]);

  useEffect(() => {
    if (window.matchMedia("(max-width: 700px)").matches) queueMicrotask(() => setMonthMode("agenda"));
  }, []);

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
    const focusPriority = taskFocusPriority ? Number(taskFocusPriority) as 1 | 2 | 3 : undefined;
    const occupied = focusPriority && snapshot.tasks.find((task) => task.date === selectedDate && task.focusPriority === focusPriority && task.status !== "completed" && task.status !== "cancelled");
    if (occupied && !window.confirm(`Ya tienes una prioridad ${focusPriority}: “${occupied.title}”. ¿Quieres reemplazarla?`)) return;
    await planner.createTaskDetailed({ title: taskTitle, date: selectedDate, time: taskTime || undefined, priority: "medium", focusPriority });
    setTaskTitle(""); setTaskTime(""); setTaskFocusPriority("");
  };

  const saveReset = async () => {
    if (!monthlyReset.advanced.trim()) return;
    const summary = Object.values(monthlyReset).filter(Boolean).join(" · ");
    await planner.saveJournal(summary, { type: "monthly_reset", title: `Reset mensual · ${format(anchorDate, "MMMM yyyy", { locale: es })}` });
    await planner.saveStructuredReview("monthly", monthlyReset, [monthlyReset.adjust, monthlyReset.next]);
    setMonthlyResetSaved(true);
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
        eyebrow="De tu visión a lo que haces hoy"
        title="Planificación"
        description="Empieza por la semana, mira el mes cuando necesites contexto y abre el mapa completo solo para trabajar la dirección."
      />

      <div className="planning-focus-cards">
        <button className={view === "week" ? "is-active" : ""} onClick={() => { setView("week"); setCascadeHorizon("weekly"); }}><span>Ahora</span><strong>Semana</strong><small>Ubica lo importante en días reales.</small></button>
        <button className={view === "month" ? "is-active" : ""} onClick={() => { setView("month"); setCascadeHorizon("monthly"); }}><span>Después</span><strong>Mes</strong><small>Conecta objetivos, eventos y acciones.</small></button>
        <button className={view === "year" ? "is-active" : ""} onClick={() => { setView("year"); setCascadeHorizon("annual"); }}><span>Dirección</span><strong>Año y largo plazo</strong><small>Mira hacia dónde conduce este ciclo.</small></button>
        <button className="planning-map-toggle" onClick={() => setFullMapOpen(!fullMapOpen)}>{fullMapOpen ? "Ocultar mapa completo" : "Ver mi mapa completo"} <Compass size={18} /></button>
      </div>

      {fullMapOpen && <Card className="cascade-map-card">
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
      </Card>}

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
        <div className="calendar-toolbar"><button onClick={() => moveMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button><h2>{format(anchorDate, "MMMM yyyy", { locale: es })}</h2><button onClick={() => moveMonth(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button><Button variant="secondary" onClick={() => setAnchorDate(new Date())}>Hoy</Button><div className="calendar-mode-toggle" role="group" aria-label="Vista del mes"><button className={monthMode === "calendar" ? "is-active" : ""} onClick={() => setMonthMode("calendar")}>Calendario</button><button className={monthMode === "agenda" ? "is-active" : ""} onClick={() => setMonthMode("agenda")}>Agenda</button></div></div>
        {monthMode === "calendar" && <Card className="month-calendar-card">
          <div className="calendar-weekdays">{["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="month-calendar-grid">{calendarDates.map((date) => {
            const key = toLocalDateKey(date);
            const dayTasks = snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled");
            const dayEvents = snapshot.events.filter((event) => event.startDate === key);
            return <button key={key} className={`${isSameMonth(date, anchorDate) ? "" : "is-outside"} ${key === todayKey ? "is-today" : ""}`} onClick={() => { setSelectedDate(key); setView("day"); setCascadeHorizon("daily"); }}><span>{date.getDate()}</span>{dayEvents.slice(0, 2).map((event) => <small className="calendar-event" key={event.id}><CalendarDays size={10} />{event.title}</small>)}{dayTasks.slice(0, 2).map((task) => <small key={task.id}><Circle size={8} />{task.title}</small>)}</button>;
          })}</div>
        </Card>}
        {monthMode === "agenda" && <Card className="month-agenda"><p className="eyebrow">Agenda cronológica</p><h2>Eventos y Tareas</h2>{calendarDates.filter((date) => isSameMonth(date, anchorDate)).map((date) => { const key = toLocalDateKey(date); const entries = [...snapshot.events.filter((event) => event.startDate === key).map((event) => ({ id: event.id, title: event.title, kind: "Evento" })), ...snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled").map((task) => ({ id: task.id, title: task.title, kind: "Tarea" }))]; if (!entries.length) return null; return <section key={key}><time>{format(date, "d 'de' MMMM", { locale: es })}</time>{entries.map((entry) => <div key={`${entry.kind}-${entry.id}`}><Circle size={9} /><span>{entry.title}</span><small>{entry.kind}</small></div>)}</section>; })}<EmptyStateIfMonthEmpty planner={planner} monthKey={format(anchorDate, "yyyy-MM")} /></Card>}
        <div className="planning-bridge"><div><p className="eyebrow">Siguiente nivel</p><h2>¿Ya sabes qué importa este mes?</h2><p>Prepara tus semanas con las metas, eventos y pendientes que ya están aquí.</p></div><Button onClick={() => { setView("week"); setCascadeHorizon("weekly"); }}>Preparar mis semanas <ArrowRightIcon /></Button></div>
      </>}

      {view === "week" && <>
        <div className="weekly-planner-assistant">
          <Card><p className="eyebrow">Así te fue la semana pasada</p><strong>{weeklyInsight.completionRate}% completado</strong><p>{weeklyInsight.summary}</p></Card>
          <Card><Sparkles size={20} /><p className="eyebrow">Sugerencia para esta semana</p><strong>{weeklyInsight.suggestion}</strong></Card>
          <Card className="weekly-brain-dump"><p className="eyebrow">Ubica tu braindump</p>{snapshot.brainDumpItems.filter((item) => item.status === "idea").slice(0, 3).map((item, index) => { const target = weekDates[Math.min(index + 1, 6)]; return <div key={item.id}><span>{item.title}</span><Button type="button" variant="secondary" onClick={() => planner.scheduleBrainDumpItem(item.id, toLocalDateKey(target))}>Poner {formatShortDay(target)}</Button></div>; })}{!snapshot.brainDumpItems.some((item) => item.status === "idea") && <p>No hay ideas pendientes por ubicar.</p>}</Card>
        </div>
        <Card className="week-context-card"><p className="eyebrow">Lo que llega desde el mes</p>{monthlyContext ? <><h2>{monthlyContext.priority}</h2><p>{monthlyContext.intention}</p><ul>{monthlyContext.objectives.slice(0, 3).map((objective) => <li key={objective}>{objective}</li>)}</ul></> : <p>Este mes todavía no tiene una prioridad definida. Puedes preparar la semana y completar el mes después.</p>}<div><span><strong>{snapshot.goals.filter((goal) => goal.status === "active").length}</strong> metas activas</span><span><strong>{snapshot.events.filter((event) => weekDates.some((date) => event.startDate === toLocalDateKey(date))).length}</strong> eventos</span><span><strong>{snapshot.tasks.filter((task) => task.date && weekDates.some((date) => task.date === toLocalDateKey(date)) && task.status !== "completed").length}</strong> pendientes</span></div></Card>
        <form className="planning-add" onSubmit={addTask}><Plus size={19} /><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="¿Qué quieres hacer esta semana?" aria-label="Nueva tarea semanal" /><select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="Día de la tarea">{weekDates.map((date) => <option value={toLocalDateKey(date)} key={date.toISOString()}>{formatShortDay(date)} {date.getDate()}</option>)}</select><input type="time" value={taskTime} onChange={(event) => setTaskTime(event.target.value)} aria-label="Hora opcional" /><select value={taskFocusPriority} onChange={(event) => setTaskFocusPriority(event.target.value as typeof taskFocusPriority)} aria-label="Prioridad de enfoque"><option value="">No prioritario</option><option value="1">Prioridad 1</option><option value="2">Prioridad 2</option><option value="3">Prioridad 3</option></select><Button type="submit">Añadir</Button></form>
        <div className="mobile-week-selector" role="tablist" aria-label="Días de la semana">{weekDates.map((date) => { const key = toLocalDateKey(date); return <button role="tab" aria-selected={selectedDate === key} className={selectedDate === key ? "is-active" : ""} key={key} onClick={() => setSelectedDate(key)}><span>{formatShortDay(date)}</span><strong>{date.getDate()}</strong></button>; })}</div>
        <section className="week-board">{weekDates.map((date) => { const key = toLocalDateKey(date); const tasks = snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled"); return <Card className={`day-column ${key === todayKey ? "is-today" : ""} ${key === selectedDate ? "is-selected" : ""}`} key={key}><header className="day-column__header"><div><span>{formatShortDay(date)}</span><strong>{date.getDate()}</strong></div>{key === todayKey && <Badge tone="rose">Hoy</Badge>}</header><div className="day-column__tasks">{tasks.map((task) => <button className={`week-task ${task.status === "completed" ? "is-complete" : ""}`} key={task.id} onClick={() => planner.toggleTask(task.id)}>{task.status === "completed" ? <Check size={15} /> : <Circle size={14} />}<span>{task.title}</span>{task.time && <small>{task.time}</small>}</button>)}{!tasks.length && <p className="day-column__empty">Espacio disponible</p>}</div></Card>; })}</section>
      </>}

      {view === "week" && <Card className="weekly-reset-card"><div><p className="eyebrow">Weekly Reset · un solo flujo</p><h2>{weeklyResetSaved ? "Tu semana está lista." : "Prepara una semana que se sienta posible"}</h2><p>Este mismo reset se abre desde Inicio, Semana, Tu progreso y Mi diario.</p></div>{!weeklyResetOpen && !weeklyResetSaved ? <Button onClick={() => setWeeklyResetOpen(true)}>Iniciar Weekly Reset</Button> : weeklyResetOpen ? <form className="weekly-reset-form" onSubmit={async (event) => { event.preventDefault(); await planner.saveStructuredReview("weekly", { celebrate: weeklyReset.celebrate, observe: weeklyInsight.summary, release: weeklyReset.release, adjust: weeklyReset.adjust, priority1: weeklyReset.priorities[0], priority2: weeklyReset.priorities[1], priority3: weeklyReset.priorities[2] }, weeklyReset.priorities); setWeeklyResetOpen(false); setWeeklyResetSaved(true); }}><label><span>1. Celebra · ¿Qué sí avanzó?</span><textarea required rows={2} value={weeklyReset.celebrate} onChange={(event) => setWeeklyReset({ ...weeklyReset, celebrate: event.target.value })} /></label><div className="weekly-observation"><strong>2. Observa</strong><span>{weeklyInsight.summary}</span><span>{completedHabitSummary(snapshot)}</span><span>Balance del mes disponible en Finanzas.</span></div><label><span>3. Suelta · ¿Qué ya no importa?</span><textarea rows={2} value={weeklyReset.release} onChange={(event) => setWeeklyReset({ ...weeklyReset, release: event.target.value })} /></label><label><span>4. Ajusta · ¿Qué quieres mover o cambiar?</span><textarea rows={2} value={weeklyReset.adjust} onChange={(event) => setWeeklyReset({ ...weeklyReset, adjust: event.target.value })} /></label><fieldset><legend>5. Elige tus tres prioridades de la próxima semana</legend>{weeklyReset.priorities.map((value, index) => <input key={index} value={value} onChange={(event) => setWeeklyReset({ ...weeklyReset, priorities: weeklyReset.priorities.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} placeholder={`Prioridad ${index + 1}`} />)}</fieldset><div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setWeeklyResetOpen(false)}>Ahora no</Button><Button type="submit">Guardar Weekly Reset</Button></div></form> : null}<Link className="button button--secondary" to="/app/today">Ver mi lunes</Link></Card>}

      {view === "day" && <div className="daily-schedule-layout">
        <Card className="daily-schedule-card"><header><div><p className="eyebrow">Horario flexible</p><h2>{format(new Date(`${selectedDate}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })}</h2></div><input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setCascadeHorizon("daily"); }} /></header><div className="schedule-grid">{[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map((hour) => { const tasks = snapshot.tasks.filter((task) => task.date === selectedDate && Number(task.time?.slice(0,2)) === hour); return <div key={hour}><time>{String(hour).padStart(2,"0")}:00</time><span>{tasks.map((task) => <button key={task.id} onClick={() => planner.toggleTask(task.id)}>{task.title}</button>)}</span></div>; })}</div></Card>
        <Card className="daily-unscheduled"><Clock3 size={22} /><h2>Sin horario todavía</h2><p>Pon una hora desde Tareas o usa estos pendientes como margen flexible.</p>{snapshot.tasks.filter((task) => task.date === selectedDate && !task.time && task.status !== "completed").map((task) => <button key={task.id} onClick={() => planner.toggleTask(task.id)}><Circle size={14} />{task.title}</button>)}</Card>
      </div>}

      {view === "reset" && <div className="monthly-reset-grid">
        <Card className="reset-reflection"><RotateCcw size={22} /><p className="eyebrow">Monthly Reset · {format(anchorDate, "MMMM yyyy", { locale: es })}</p><h2>Cierra este ciclo y prepara el siguiente</h2><div className="monthly-reset-questions">{([['advanced','¿Qué avanzó?'],['learned','¿Qué aprendiste?'],['release','¿Qué quieres soltar?'],['adjust','¿Qué debes ajustar?'],['next','¿Qué importa el próximo mes?']] as const).map(([key,label]) => <label key={key}><span>{label}</span><textarea required={key === "advanced"} rows={3} value={monthlyReset[key]} onChange={(event) => { setMonthlyReset({ ...monthlyReset, [key]: event.target.value }); setMonthlyResetSaved(false); }} /></label>)}</div><Button onClick={saveReset}><Save size={16} /> Guardar Monthly Reset</Button>{monthlyResetSaved && <div className="reset-next-actions" role="status"><strong>Tu próximo ciclo está listo.</strong><Button onClick={() => { setView("month"); setCascadeHorizon("monthly"); }}>Preparar mi próximo mes</Button><Button variant="secondary" onClick={() => { setView("week"); setCascadeHorizon("weekly"); }}>Preparar mi primera semana</Button></div>}</Card>
        <div className="reset-summary"><Card className="brain-summary-card"><Sparkles size={23} /><div><p className="eyebrow">Lo que ya está en tu planner</p><strong>{snapshot.goals.filter((goal) => goal.status === "active").length} metas · {snapshot.habitLogs.length} registros de hábitos · {snapshot.journalEntries.length} páginas</strong><span>Finanzas, ánimo, pendientes y proyectos siguen disponibles para observar sin duplicarlos.</span></div></Card><Card className="brain-summary-card"><Sparkles size={23} /><div><p className="eyebrow">Resumen de tus listas</p><strong>{brainSummary.captured} pensamientos capturados · {brainSummary.pending} abiertos</strong><span>{brainSummary.message}</span></div></Card><Card className="release-note"><p>Lo que elijo llevar al próximo mes</p><span>Conserva solo lo que todavía apoya tu visión, tus caminos y tu prioridad anual.</span></Card></div>
      </div>}
    </div>
  );
}

function EmptyStateIfMonthEmpty({ planner, monthKey }: { planner: PlannerController; monthKey: string }) {
  const hasEntries = planner.snapshot.events.some((event) => event.startDate.startsWith(monthKey))
    || planner.snapshot.tasks.some((task) => task.date?.startsWith(monthKey) && task.status !== "cancelled");
  if (hasEntries) return null;
  return <p className="empty-inline">Este mes todavía tiene espacio. Añade eventos o acciones cuando estés lista.</p>;
}

function ArrowRightIcon() {
  return <ChevronRight aria-hidden="true" size={16} />;
}

function completedHabitSummary(snapshot: PlannerSnapshot) {
  const habits = snapshot.habits.filter((habit) => habit.status === "active");
  const activeHabitIds = new Set(habits.map((habit) => habit.id));
  const completed = snapshot.habitLogs.filter((log) => activeHabitIds.has(log.habitId) && log.value > 0).length;
  if (!habits.length) return "Aún no hay hábitos activos; puedes empezar con uno pequeño.";
  return `${completed} registros de hábitos completados. Mira el detalle en Tu progreso.`;
}

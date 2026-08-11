"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Circle, Heart, Leaf, Plus, Save, Sparkles, Target } from "lucide-react";
import { calculateGoalProgress } from "@/src/domain/rules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatShortDay, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, SectionHeading } from "@/src/components/ui/Primitives";

type PlanningView = "annual" | "quarters" | "month" | "reset" | "week";

const months = [
  ["Enero", "Enfocar", "Definir visión y metas", "Claridad y planificación"],
  ["Febrero", "Fundamentar", "Crear hábito clave", "Rutinas sólidas"],
  ["Marzo", "Impulsar", "Primeros avances", "Ejecutar y aprender"],
  ["Abril", "Expandir", "Nuevas oportunidades", "Networking"],
  ["Mayo", "Profundizar", "Desarrollar habilidades", "Especialización"],
  ["Junio", "Consolidar", "Sistemas y procesos", "Optimizar"],
  ["Julio", "Elevar", "Mayor impacto", "Up-leverage"],
  ["Agosto", "Preparar", "Planificar el semestre", "Ajustar rumbo"],
  ["Septiembre", "Construir", "Escalar proyectos", "Resultados consistentes"],
  ["Octubre", "Visibilizar", "Compartir y posicionar", "Marca personal"],
  ["Noviembre", "Abundancia", "Multiplicar ingresos", "Crear libertad"],
  ["Diciembre", "Celebrar", "Cerrar ciclos", "Evaluar y agradecer"],
] as const;

const quarterNames = ["Enfocar y construir", "Crecer y consolidar", "Construir la base", "Expandir e impactar"];

export function PlanningPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const [view, setView] = useState<PlanningView>("annual");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const dates = getWeekDates(anchorDate, snapshot.profile?.weekStartsOn ?? 1);
  const todayKey = toLocalDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [title, setTitle] = useState("");
  const [resetText, setResetText] = useState("");
  const [savedReset, setSavedReset] = useState(false);

  const calendarDates = useMemo(() => {
    const starts = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: snapshot.profile?.weekStartsOn ?? 1 });
    const ends = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: snapshot.profile?.weekStartsOn ?? 1 });
    return eachDayOfInterval({ start: starts, end: ends });
  }, [anchorDate, snapshot.profile?.weekStartsOn]);

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await planner.createTask(title, selectedDate);
    setTitle("");
  };

  const saveReset = async () => {
    if (!resetText.trim()) return;
    await planner.saveJournal(resetText, { type: "monthly_reset", title: `Monthly Reset · ${format(anchorDate, "MMMM yyyy", { locale: es })}` });
    await planner.saveReview("monthly", resetText);
    setSavedReset(true);
  };

  const movePeriod = (amount: number) => setAnchorDate((date) => amount > 0 ? addMonths(date, 1) : subMonths(date, 1));

  return (
    <div className="page-stack planning-reference">
      <SectionHeading
        eyebrow="Del año a la acción de hoy"
        title={view === "annual" ? "Plan anual de 12 meses" : view === "quarters" ? `Overview trimestral ${anchorDate.getFullYear()}` : view === "month" ? format(anchorDate, "MMMM yyyy", { locale: es }) : view === "reset" ? `Monthly Reset · ${format(anchorDate, "MMMM yyyy", { locale: es })}` : `Semana del ${dates[0].getDate()} ${format(dates[0], "MMM", { locale: es })} — ${dates[6].getDate()} ${format(dates[6], "MMM yyyy", { locale: es })}`}
        description={view === "annual" ? "Tu visión, distribuida en pasos que construyen tu mejor versión." : "Conecta la dirección de largo plazo con una agenda realista."}
        action={view === "month" || view === "week" || view === "reset" ? <div className="week-switcher"><button onClick={() => movePeriod(-1)} aria-label="Periodo anterior"><ChevronLeft size={18} /></button><button onClick={() => setAnchorDate(new Date())}>Hoy</button><button onClick={() => movePeriod(1)} aria-label="Periodo siguiente"><ChevronRight size={18} /></button></div> : undefined}
      />

      <nav className="planning-tabs" aria-label="Vistas de planificación">
        {(["annual", "quarters", "month", "reset", "week"] as const).map((item) => <button key={item} className={view === item ? "is-active" : ""} onClick={() => setView(item)}>{item === "annual" ? "Plan anual" : item === "quarters" ? "Trimestres" : item === "month" ? "Calendario" : item === "reset" ? "Reset mensual" : "Semana"}</button>)}
      </nav>

      {view === "annual" && <>
        <div className="annual-plan-grid">{months.map(([month, verb, goal, focus], index) => <Card className="month-plan-card" key={month}><span>{month}</span><strong>{verb}</strong><p>{goal}</p><small>{focus}</small><i>{index % 4 === 0 ? "☆" : index % 4 === 1 ? "❧" : index % 4 === 2 ? "↗" : "♡"}</i></Card>)}</div>
        <Card className="area-legend"><span>Áreas</span>{snapshot.lifeAreas.filter((area) => area.active).slice(0,6).map((area) => <span key={area.id}><i className={`area-dot area-dot--${area.color}`} />{area.name}</span>)}</Card>
      </>}

      {view === "quarters" && <div className="quarter-overview">{[0,1,2,3].map((quarter) => {
        const quarterGoals = snapshot.goals.filter((_, index) => index % 4 === quarter);
        const progress = quarterGoals.length ? Math.round(quarterGoals.reduce((sum, goal) => sum + calculateGoalProgress(goal, snapshot.milestones, snapshot.tasks), 0) / quarterGoals.length) : quarter === 0 ? 78 : quarter === 1 ? 65 : quarter === 2 ? 40 : 0;
        return <Card className="quarter-row" key={quarter}><div className="quarter-label"><strong>Q{quarter + 1}</strong><span>{["Ene – Mar","Abr – Jun","Jul – Sep","Oct – Dic"][quarter]}</span></div><div><small>Enfoque</small><strong>{quarterNames[quarter]}</strong></div><div><small>Metas principales</small><ul><li>{quarterGoals[0]?.title ?? "Definir visión y metas"}</li><li>{quarterGoals[1]?.title ?? "Crear hábitos clave"}</li></ul></div><div><small>Hitos clave</small><ul><li>{snapshot.milestones[quarter]?.title ?? "Plan de acción"}</li><li>{snapshot.milestones[quarter + 1]?.title ?? "Revisión completada"}</li></ul></div><div className="quarter-progress"><span className="mini-progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}>{progress}%</span><Badge tone={progress ? "rose" : "neutral"}>{progress ? "En curso" : "Pendiente"}</Badge></div></Card>;
      })}</div>}

      {view === "month" && <Card className="month-calendar-card">
        <div className="calendar-weekdays">{["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="month-calendar-grid">{calendarDates.map((date) => { const key = toLocalDateKey(date); const dayTasks = snapshot.tasks.filter((task) => task.date === key && task.status !== "cancelled"); return <button key={key} className={`${isSameMonth(date, anchorDate) ? "" : "is-outside"} ${key === todayKey ? "is-today" : ""}`} onClick={() => { setSelectedDate(key); setView("week"); }}><span>{date.getDate()}</span>{dayTasks.slice(0,3).map((task) => <small key={task.id}><i className={`area-dot area-dot--${snapshot.lifeAreas.find((area) => area.id === task.lifeAreaId)?.color ?? "rose"}`} />{task.title}</small>)}{dayTasks.length > 3 && <em>+{dayTasks.length - 3} más</em>}</button>; })}</div>
      </Card>}

      {view === "reset" && <div className="monthly-reset-grid">
        <Card className="reset-reflection"><p className="eyebrow">Reflexión del mes anterior</p><h2>¿Qué logré? ¿Qué aprendí? ¿Qué puedo mejorar?</h2><textarea value={resetText} onChange={(event) => { setResetText(event.target.value); setSavedReset(false); }} rows={9} placeholder="Escribe una reflexión honesta y útil para el mes que empieza…" />{savedReset && <p className="inline-success"><Check size={15} /> Reflexión guardada</p>}<Button onClick={saveReset}><Save size={16} /> Guardar Monthly Reset</Button></Card>
        <div className="reset-summary"><Card><Heart size={22} /><p className="eyebrow">Mi intención del mes</p><h2>{snapshot.profile?.intention}</h2></Card><div className="reset-mini-grid"><Card><strong>Top 3 prioridades</strong>{snapshot.profile?.mainPriorities?.slice(0,3).map((item,index) => <p key={item}><span>{index+1}</span>{item}</p>)}</Card><Card><strong>Hábitos clave</strong>{snapshot.habits.slice(0,3).map((habit) => <p key={habit.id}><Circle size={13}/>{habit.name}</p>)}</Card><Card><strong>Metas del mes</strong>{snapshot.goals.slice(0,3).map((goal) => <p key={goal.id}><Target size={13}/>{goal.title}</p>)}</Card></div><Card className="release-note"><Leaf size={34}/><p>Lo que suelto este mes</p><span>Perfeccionismo, compararme y decir “sí” a todo.</span></Card></div>
      </div>}

      {view === "week" && <>
        <Card className="weekly-focus"><span className="weekly-focus__icon"><Sparkles size={21} /></span><div><p className="eyebrow">Intención semanal</p><h2>Elegir un ritmo sostenible y terminar lo esencial.</h2></div><div className="weekly-focus__stats"><span><strong>{snapshot.tasks.filter((task) => dates.some((date) => toLocalDateKey(date) === task.date)).length}</strong> tareas</span><span><strong>{snapshot.habits.length}</strong> hábitos</span></div></Card>
        <form className="planning-add" onSubmit={addTask}><Plus size={19} aria-hidden="true" /><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="¿Qué quieres hacer esta semana?" aria-label="Nueva tarea semanal" /><select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="Día para la nueva tarea">{dates.map((date) => <option value={toLocalDateKey(date)} key={date.toISOString()}>{formatShortDay(date)} {date.getDate()}</option>)}</select><Button type="submit">Añadir</Button></form>
        <section className="week-board" aria-label="Tareas de la semana">{dates.map((date) => { const dateKey = toLocalDateKey(date); const tasks = snapshot.tasks.filter((task) => task.date === dateKey && task.status !== "cancelled"); const isToday = dateKey === todayKey; return <Card className={`day-column ${isToday ? "is-today" : ""}`} key={dateKey}><header className="day-column__header"><div><span>{formatShortDay(date)}</span><strong>{date.getDate()}</strong></div>{isToday && <Badge tone="rose">Hoy</Badge>}</header><div className="day-column__tasks">{tasks.map((task) => <button className={`week-task ${task.status === "completed" ? "is-complete" : ""}`} key={task.id} onClick={() => planner.toggleTask(task.id)}>{task.status === "completed" ? <Check size={15} /> : <Circle size={14} />}<span>{task.title}</span>{task.estimatedMinutes && <small>{task.estimatedMinutes}m</small>}</button>)}{tasks.length === 0 && <p className="day-column__empty">Espacio disponible</p>}</div><button className="day-column__add" onClick={() => setSelectedDate(dateKey)}><Plus size={15} /> Añadir</button></Card>; })}</section>
      </>}
    </div>
  );
}

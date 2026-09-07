"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { addWeeks, format, isSameMonth, isSameYear } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Inbox,
  MoreHorizontal,
  Plus,
  Repeat2,
  Star,
  X,
} from "lucide-react";
import type { BrainDumpItem, Task } from "@/src/domain/planner";
import { weeklyPlanningInsight } from "@/src/domain/cascadeRules";
import { isHabitLogComplete, isHabitScheduledOn } from "@/src/domain/rules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { getReviewPeriodKey, getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { Button } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";

type WeeklyPlanViewProps = {
  planner: PlannerController;
  anchorDate: Date;
  todayKey: string;
  reviewInitiallyOpen?: boolean;
  onAnchorDateChange: (date: Date) => void;
  onBack: () => void;
  onEditTask: (task: Task) => void;
};

type TaskUpdatePatch = Omit<Parameters<PlannerController["updateTask"]>[1], "title">;

type ReviewDraft = {
  celebrate: string;
  release: string;
  adjust: string;
  priorities: string[];
};

const emptyReview = (): ReviewDraft => ({ celebrate: "", release: "", adjust: "", priorities: ["", "", ""] });
const dayInitials = ["D", "L", "M", "X", "J", "V", "S"];

function reviewFromResponses(responses: Record<string, string> = {}): ReviewDraft {
  return {
    celebrate: responses.celebrate ?? "",
    release: responses.release ?? "",
    adjust: responses.adjust ?? "",
    priorities: [responses.priority1 ?? "", responses.priority2 ?? "", responses.priority3 ?? ""],
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatWeekRange(dates: Date[]) {
  const first = dates[0];
  const last = dates[6];
  if (isSameMonth(first, last)) return `${first.getDate()}–${format(last, "d MMM yyyy", { locale: es })}`;
  if (isSameYear(first, last)) return `${format(first, "d MMM", { locale: es })} – ${format(last, "d MMM yyyy", { locale: es })}`;
  return `${format(first, "d MMM yyyy", { locale: es })} – ${format(last, "d MMM yyyy", { locale: es })}`;
}

function closeClosestDetails(target: EventTarget | null) {
  (target as HTMLElement | null)?.closest("details")?.removeAttribute("open");
}

export function WeeklyPlanView({ planner, anchorDate, todayKey, reviewInitiallyOpen = false, onAnchorDateChange, onBack, onEditTask }: WeeklyPlanViewProps) {
  const { snapshot } = planner;
  const weekDates = useMemo(() => getWeekDates(anchorDate, 1), [anchorDate]);
  const weekKeys = useMemo(() => new Set(weekDates.map(toLocalDateKey)), [weekDates]);
  const weekTasks = snapshot.tasks.filter((task) => task.date && weekKeys.has(task.date) && task.status !== "cancelled");
  const unscheduledTasks = snapshot.tasks.filter((task) => !task.date && !["completed", "cancelled"].includes(task.status));
  const unplacedIdeas = snapshot.brainDumpItems.filter((item) => item.status === "idea" && !item.convertedTaskId);
  const priorityTasks = weekTasks.filter((task) => task.priority === "high");
  const visibleWeekIsCurrent = weekKeys.has(todayKey);
  const reviewPeriodKey = getReviewPeriodKey("weekly", weekDates[0], 1);
  const savedReview = snapshot.reviews.find((review) => review.type === "weekly" && review.periodKey === reviewPeriodKey);
  const insight = weeklyPlanningInsight(snapshot, weekDates[0]);

  const [openComposerDate, setOpenComposerDate] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingDraft, setPendingDraft] = useState("");
  const [pendingOpen, setPendingOpen] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [operationError, setOperationError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewOpen, setReviewOpen] = useState(reviewInitiallyOpen);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(() => savedReview ? reviewFromResponses(savedReview.responses) : emptyReview());
  const composerRef = useRef<HTMLInputElement>(null);
  const savingKeyRef = useRef<string | null>(null);

  useEffect(() => {
    composerRef.current?.focus();
  }, [openComposerDate]);

  const runOperation = async (key: string, operation: () => Promise<unknown>, successMessage: string) => {
    if (savingKeyRef.current) return false;
    savingKeyRef.current = key;
    setSavingKey(key);
    setOperationError("");
    setNotice("");
    try {
      await operation();
      setNotice(successMessage);
      return true;
    } catch {
      setOperationError("No pudimos guardar este cambio. Tus datos siguen aquí; inténtalo nuevamente.");
      return false;
    } finally {
      savingKeyRef.current = null;
      setSavingKey(null);
    }
  };

  const createTask = async (date?: string) => {
    const key = date ?? "pending";
    const title = (date ? drafts[date] ?? "" : pendingDraft).trim();
    if (!title || savingKeyRef.current) return;
    const saved = await runOperation(`create-${key}`, () => planner.createTask(title, date), date ? "Tarea añadida a la semana." : "Pendiente guardado sin fecha.");
    if (!saved) return;
    if (date) setDrafts((current) => ({ ...current, [date]: "" }));
    else setPendingDraft("");
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const updateTask = async (task: Task, patch: TaskUpdatePatch, message: string) =>
    runOperation(`task-${task.id}`, () => planner.updateTask(task.id, { title: task.title, ...patch }), message);

  const toggleTask = async (task: Task) =>
    runOperation(`task-${task.id}`, () => planner.toggleTask(task.id), task.status === "completed" ? "Tarea reabierta." : "Tarea completada.");

  const moveTask = async (task: Task, date: string) => {
    const target = new Date(`${date}T12:00:00`);
    const outsideVisibleWeek = !weekKeys.has(date);
    return updateTask(task, { date }, outsideVisibleWeek ? `Tarea movida al ${format(target, "d 'de' MMMM 'de' yyyy", { locale: es })}.` : `Tarea movida al ${capitalize(format(target, "EEEE", { locale: es }))}.`);
  };

  const placeIdea = async (idea: BrainDumpItem, date: string) => {
    const target = new Date(`${date}T12:00:00`);
    return runOperation(`idea-${idea.id}`, () => planner.scheduleBrainDumpItem(idea.id, date, "weekly"), `Idea convertida en tarea para ${format(target, "d 'de' MMMM", { locale: es })}.`);
  };

  const scrollToTask = (taskId: string) => {
    const target = document.getElementById(`weekly-task-${taskId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  };

  const navigateWeek = (amount: number) => {
    setOpenComposerDate(null);
    onAnchorDateChange(addWeeks(anchorDate, amount));
  };

  const returnToCurrentWeek = () => {
    setOpenComposerDate(null);
    onAnchorDateChange(new Date());
  };

  const openReview = () => {
    setReviewDraft(reviewFromResponses(savedReview?.responses));
    setReviewOpen(true);
  };

  const saveReview = async (event: FormEvent) => {
    event.preventDefault();
    const responses = {
      celebrate: reviewDraft.celebrate,
      observe: insight.summary,
      release: reviewDraft.release,
      adjust: reviewDraft.adjust,
      priority1: reviewDraft.priorities[0],
      priority2: reviewDraft.priorities[1],
      priority3: reviewDraft.priorities[2],
    };
    const saved = await runOperation("weekly-review", () => planner.saveStructuredReview("weekly", responses, reviewDraft.priorities, weekDates[0]), "Revisión semanal guardada.");
    if (saved) setReviewOpen(false);
  };

  return <section className="weekly-plan-page" aria-labelledby="weekly-plan-title">
    <button type="button" className="weekly-back-link" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /> Volver a Planificación</button>

    <header className="weekly-plan-header">
      <div className="weekly-plan-heading">
        <h1 id="weekly-plan-title">Plan semanal</h1>
        <p>Distribuye tus acciones por día, sin perder de vista tus metas.</p>
      </div>
      <div className="weekly-header-actions">
        <Button type="button" variant="outline" onClick={openReview}><ClipboardCheck size={17} aria-hidden="true" /> Revisión semanal</Button>
        <div className="weekly-period-navigation" aria-label="Navegar por semanas">
          <button type="button" onClick={() => navigateWeek(-1)} aria-label="Semana anterior"><ChevronLeft size={18} /></button>
          <strong>{formatWeekRange(weekDates)}</strong>
          <button type="button" onClick={() => navigateWeek(1)} aria-label="Semana siguiente"><ChevronRight size={18} /></button>
          <Button type="button" variant="secondary" onClick={returnToCurrentWeek} disabled={visibleWeekIsCurrent}>Esta semana</Button>
        </div>
      </div>
    </header>

    <section className="weekly-priority-strip" aria-labelledby="weekly-priorities-title">
      <div><Star size={17} aria-hidden="true" /><strong id="weekly-priorities-title">Prioridades de la semana</strong></div>
      <div className="weekly-priority-chips">
        {priorityTasks.map((task) => <button type="button" key={task.id} onClick={() => scrollToTask(task.id)}><Star size={14} aria-hidden="true" /> {task.title}</button>)}
        {!priorityTasks.length && <span>No necesitas elegir prioridades para empezar.</span>}
      </div>
    </section>

    <div className="weekly-feedback" aria-live="polite">
      {notice && <p className="weekly-notice">{notice}</p>}
      {operationError && <p className="weekly-error" role="alert">{operationError}</p>}
    </div>

    <div className="weekly-plan-layout">
      <section className="weekly-days-panel" aria-labelledby="weekly-days-title">
        <header className="weekly-days-panel__header">
          <h2 id="weekly-days-title">Tu semana</h2>
          <nav aria-label="Ir a un día de la semana">
            {weekDates.map((date) => {
              const key = toLocalDateKey(date);
              return <button type="button" className={key === todayKey ? "is-today" : ""} key={key} onClick={() => document.getElementById(`weekly-day-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} aria-label={`Ir a ${format(date, "EEEE d 'de' MMMM", { locale: es })}`}><span>{dayInitials[date.getDay()]}</span><strong>{date.getDate()}</strong></button>;
            })}
          </nav>
        </header>

        <div className="weekly-day-groups">
          {weekDates.map((date) => {
            const key = toLocalDateKey(date);
            const isToday = key === todayKey;
            const dayTasks = weekTasks.filter((task) => task.date === key);
            const dayHabits = snapshot.habits.filter((habit) => isHabitScheduledOn(habit, date));
            return <section id={`weekly-day-${key}`} className={`weekly-day-group ${isToday ? "is-today" : ""}`} key={key} aria-labelledby={`weekly-day-title-${key}`}>
              <header className="weekly-day-label">
                <span id={`weekly-day-title-${key}`}>{capitalize(format(date, "EEEE", { locale: es }))}</span>
                <strong>{date.getDate()} <small>{format(date, "MMM", { locale: es })}</small></strong>
                {isToday && <em>Hoy</em>}
              </header>
              <div className="weekly-day-content">
                <div className="weekly-day-toolbar"><button type="button" onClick={() => setOpenComposerDate(key)}><Plus size={16} aria-hidden="true" /> Añadir tarea</button></div>
                <div className="weekly-day-items">
                  {dayTasks.map((task) => <WeeklyTaskRow key={task.id} task={task} planner={planner} weekDates={weekDates} saving={savingKey === `task-${task.id}`} onMove={moveTask} onUpdate={updateTask} onToggle={toggleTask} onEdit={onEditTask} />)}
                  {dayHabits.map((habit) => {
                    const log = snapshot.habitLogs.find((item) => item.habitId === habit.id && item.date === key);
                    const complete = isHabitLogComplete(habit, log);
                    return <div className="weekly-habit-row" key={habit.id}>
                      <button type="button" className={complete ? "is-complete" : ""} aria-pressed={complete} aria-label={`${complete ? "Desmarcar" : "Registrar"} hábito ${habit.name} el ${format(date, "d 'de' MMMM", { locale: es })}`} disabled={Boolean(savingKey)} onClick={() => void runOperation(`habit-${habit.id}-${key}`, () => planner.toggleHabit(habit.id, key), complete ? "Registro de hábito retirado para este día." : "Hábito registrado para este día.")}>{complete ? <Check size={13} /> : <Circle size={13} />}</button>
                      <Repeat2 size={15} aria-hidden="true" />
                      <span>Hábito · {habit.name}</span>
                    </div>;
                  })}
                  {!dayTasks.length && !dayHabits.length && openComposerDate !== key && <p className="weekly-day-empty">Este día tiene espacio.</p>}
                </div>
                {openComposerDate === key && <form className="weekly-inline-composer" onSubmit={(event) => { event.preventDefault(); void createTask(key); }}>
                  <input ref={composerRef} value={drafts[key] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} placeholder="Título de la tarea" aria-label={`Título de la tarea para ${format(date, "EEEE d 'de' MMMM", { locale: es })}`} />
                  <Button type="submit" size="sm" loading={savingKey === `create-${key}`} disabled={!drafts[key]?.trim()}>Guardar</Button>
                  <button type="button" className="weekly-composer-cancel" onClick={() => setOpenComposerDate(null)} aria-label="Cancelar nueva tarea"><X size={18} /></button>
                </form>}
              </div>
            </section>;
          })}
        </div>
      </section>

      <aside className={`weekly-pending-panel ${pendingOpen ? "is-open" : ""}`} aria-labelledby="weekly-pending-title">
        <header>
          <div><Inbox size={20} aria-hidden="true" /><h2 id="weekly-pending-title">Pendientes sin fecha</h2></div>
          <button type="button" className="weekly-pending-toggle" aria-expanded={pendingOpen} aria-controls="weekly-pending-content" onClick={() => setPendingOpen((current) => !current)}><ChevronDown size={18} /><span className="sr-only">{pendingOpen ? "Ocultar" : "Mostrar"} pendientes sin fecha</span></button>
        </header>
        <div id="weekly-pending-content" className="weekly-pending-content">
          <form className="weekly-pending-composer" onSubmit={(event) => { event.preventDefault(); void createTask(); }}>
            <Plus size={16} aria-hidden="true" />
            <input value={pendingDraft} onChange={(event) => setPendingDraft(event.target.value)} placeholder="Añadir pendiente..." aria-label="Añadir pendiente sin fecha" />
            <Button type="submit" size="sm" loading={savingKey === "create-pending"} disabled={!pendingDraft.trim()} aria-label="Guardar pendiente"><ArrowRight size={17} /></Button>
          </form>
          <div className="weekly-pending-list">
            {unscheduledTasks.map((task) => <WeeklyPendingTask key={task.id} task={task} planner={planner} weekDates={weekDates} saving={savingKey === `task-${task.id}`} onMove={moveTask} onUpdate={updateTask} onToggle={toggleTask} onEdit={onEditTask} />)}
            {unplacedIdeas.map((idea) => <WeeklyPendingIdea key={idea.id} idea={idea} weekDates={weekDates} saving={savingKey === `idea-${idea.id}`} onPlace={placeIdea} />)}
            {!unscheduledTasks.length && !unplacedIdeas.length && <p className="weekly-pending-empty">No hay pendientes sin fecha.</p>}
          </div>
        </div>
      </aside>
    </div>

    <Modal open={reviewOpen} title="Revisión semanal" description={`Reflexiona y prepara la semana ${formatWeekRange(weekDates)}.`} onClose={() => setReviewOpen(false)}>
      <form className="weekly-review-dialog" onSubmit={saveReview}>
        <label><span>¿Qué sí avanzó?</span><textarea required rows={3} value={reviewDraft.celebrate} onChange={(event) => setReviewDraft({ ...reviewDraft, celebrate: event.target.value })} /></label>
        <div className="weekly-review-observation"><strong>Observa</strong><span>{insight.summary}</span></div>
        <label><span>¿Qué ya no importa?</span><textarea rows={2} value={reviewDraft.release} onChange={(event) => setReviewDraft({ ...reviewDraft, release: event.target.value })} /></label>
        <label><span>¿Qué quieres mover o cambiar?</span><textarea rows={2} value={reviewDraft.adjust} onChange={(event) => setReviewDraft({ ...reviewDraft, adjust: event.target.value })} /></label>
        <fieldset><legend>Prioridades para esta semana (opcionales)</legend>{reviewDraft.priorities.map((value, index) => <input key={index} value={value} onChange={(event) => setReviewDraft({ ...reviewDraft, priorities: reviewDraft.priorities.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} placeholder={`Prioridad ${index + 1}`} />)}</fieldset>
        {operationError && <p className="weekly-error" role="alert">{operationError}</p>}
        <div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setReviewOpen(false)}>Ahora no</Button><Button type="submit" loading={savingKey === "weekly-review"}>Guardar revisión semanal</Button></div>
      </form>
    </Modal>
  </section>;
}

type TaskOperationProps = {
  task: Task;
  planner: PlannerController;
  weekDates: Date[];
  saving: boolean;
  onMove: (task: Task, date: string) => Promise<boolean>;
  onUpdate: (task: Task, patch: TaskUpdatePatch, message: string) => Promise<boolean>;
  onToggle: (task: Task) => Promise<boolean>;
  onEdit: (task: Task) => void;
};

function DateAssignmentMenu({ task, weekDates, label, onMove, onUpdate }: Pick<TaskOperationProps, "task" | "weekDates" | "onMove" | "onUpdate"> & { label: string }) {
  return <details className="weekly-date-menu">
    <summary aria-label={`${label}: ${task.title}`}><CalendarDays size={15} aria-hidden="true" /><span>{label}</span><ChevronDown size={14} aria-hidden="true" /></summary>
    <div className="weekly-popover weekly-date-popover">
      <strong>Semana visible</strong>
      <div>{weekDates.map((date) => {
        const key = toLocalDateKey(date);
        return <button type="button" key={key} aria-label={`Asignar ${task.title} al ${key}`} onClick={(event) => { closeClosestDetails(event.currentTarget); void onMove(task, key); }}><span>{capitalize(format(date, "EEE", { locale: es }).replace(".", ""))}</span><strong>{date.getDate()}</strong></button>;
      })}</div>
      <label><span>Otra fecha</span><input type="date" defaultValue={task.date ?? ""} onChange={(event) => { if (!event.target.value) return; closeClosestDetails(event.currentTarget); void onMove(task, event.target.value); }} /></label>
      {task.date && <button type="button" className="weekly-unschedule-action" onClick={(event) => { closeClosestDetails(event.currentTarget); void onUpdate(task, { date: "" }, "Tarea devuelta a Pendientes sin fecha."); }}>Quitar fecha</button>}
    </div>
  </details>;
}

function TaskOptionsMenu({ task, planner, onUpdate, onEdit }: Pick<TaskOperationProps, "task" | "planner" | "onUpdate" | "onEdit">) {
  return <details className="weekly-options-menu">
    <summary aria-label={`Más opciones para ${task.title}`}><MoreHorizontal size={18} aria-hidden="true" /></summary>
    <div className="weekly-popover weekly-options-popover">
      <button type="button" onClick={(event) => { closeClosestDetails(event.currentTarget); onEdit(task); }}>Editar tarea</button>
      <button type="button" onClick={(event) => { closeClosestDetails(event.currentTarget); void onUpdate(task, { priority: task.priority === "high" ? "medium" : "high" }, task.priority === "high" ? "Tarea retirada de las prioridades." : "Tarea marcada como prioridad."); }}>{task.priority === "high" ? "Quitar prioridad" : "Marcar como prioridad"}</button>
      <label><span>Meta</span><select value={task.goalId ?? ""} onChange={(event) => { closeClosestDetails(event.currentTarget); void onUpdate(task, { goalId: event.target.value }, event.target.value ? "Meta vinculada a la tarea." : "Vínculo con la meta retirado."); }}><option value="">Sin meta</option>{planner.snapshot.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
    </div>
  </details>;
}

function WeeklyTaskRow({ task, planner, weekDates, saving, onMove, onUpdate, onToggle, onEdit }: TaskOperationProps) {
  const goal = planner.snapshot.goals.find((item) => item.id === task.goalId);
  const complete = task.status === "completed";
  return <article id={`weekly-task-${task.id}`} className={`weekly-task-row ${complete ? "is-complete" : ""}`} tabIndex={-1}>
    <button type="button" className="weekly-task-check" aria-label={complete ? `Reabrir ${task.title}` : `Completar ${task.title}`} disabled={saving} onClick={() => void onToggle(task)}>{complete ? <Check size={14} /> : <Circle size={14} />}</button>
    <div className="weekly-task-copy"><strong>{task.title}</strong>{goal && <span>Meta · {goal.title}</span>}</div>
    <button type="button" className={`weekly-task-star ${task.priority === "high" ? "is-active" : ""}`} aria-pressed={task.priority === "high"} aria-label={`${task.priority === "high" ? "Quitar" : "Marcar"} prioridad: ${task.title}`} disabled={saving} onClick={() => void onUpdate(task, { priority: task.priority === "high" ? "medium" : "high" }, task.priority === "high" ? "Tarea retirada de las prioridades." : "Tarea marcada como prioridad.")}><Star size={15} /></button>
    <div className="weekly-task-actions"><DateAssignmentMenu task={task} weekDates={weekDates} label="Cambiar día" onMove={onMove} onUpdate={onUpdate} /><TaskOptionsMenu task={task} planner={planner} onUpdate={onUpdate} onEdit={onEdit} /></div>
  </article>;
}

function WeeklyPendingTask({ task, planner, weekDates, saving, onMove, onUpdate, onToggle, onEdit }: TaskOperationProps) {
  const complete = task.status === "completed";
  const goal = planner.snapshot.goals.find((item) => item.id === task.goalId);
  return <article className="weekly-pending-task">
    <div className="weekly-pending-task__main">
      <button type="button" className="weekly-task-check" aria-label={complete ? `Reabrir ${task.title}` : `Completar ${task.title}`} disabled={saving} onClick={() => void onToggle(task)}>{complete ? <Check size={14} /> : <Circle size={14} />}</button>
      <div className="weekly-pending-task__copy"><strong>{task.title}</strong>{goal && <span>Meta · {goal.title}</span>}</div>
      <TaskOptionsMenu task={task} planner={planner} onUpdate={onUpdate} onEdit={onEdit} />
    </div>
    <DateAssignmentMenu task={task} weekDates={weekDates} label="Asignar día" onMove={onMove} onUpdate={onUpdate} />
  </article>;
}

function WeeklyPendingIdea({ idea, weekDates, saving, onPlace }: { idea: BrainDumpItem; weekDates: Date[]; saving: boolean; onPlace: (idea: BrainDumpItem, date: string) => Promise<boolean> }) {
  return <article className="weekly-pending-task weekly-pending-idea">
    <div className="weekly-pending-task__main"><Inbox size={15} aria-hidden="true" /><strong>{idea.title}</strong><span>Idea de Bandeja</span></div>
    <details className="weekly-date-menu">
      <summary aria-label={`Asignar día a la idea ${idea.title}`}><CalendarDays size={15} aria-hidden="true" /><span>Asignar día</span><ChevronDown size={14} aria-hidden="true" /></summary>
      <div className="weekly-popover weekly-date-popover"><strong>Semana visible</strong><div>{weekDates.map((date) => <button type="button" disabled={saving} key={toLocalDateKey(date)} aria-label={`Asignar ${idea.title} al ${toLocalDateKey(date)}`} onClick={(event) => { closeClosestDetails(event.currentTarget); void onPlace(idea, toLocalDateKey(date)); }}><span>{capitalize(format(date, "EEE", { locale: es }).replace(".", ""))}</span><strong>{date.getDate()}</strong></button>)}</div><label><span>Otra fecha</span><input type="date" onChange={(event) => { if (!event.target.value) return; closeClosestDetails(event.currentTarget); void onPlace(idea, event.target.value); }} /></label></div>
    </details>
  </article>;
}

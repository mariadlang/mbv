"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Eye, RotateCcw, Save, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { Button } from "@/src/components/ui/Primitives";

export type QuickCaptureDefaults = {
  source: "global" | "dashboard" | "today" | "week" | "inbox" | "empty" | "goal";
  date?: string;
  focusPriority?: 1 | 2 | 3;
  goalId?: string;
  projectId?: string;
  periodPlanId?: string;
};

type CaptureType = "task" | "priority";

export function QuickCaptureDrawer({
  open,
  defaults,
  planner,
  onClose,
}: {
  open: boolean;
  defaults: QuickCaptureDefaults;
  planner: PlannerController;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [goalId, setGoalId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState<CaptureType>("task");
  const [focusPriority, setFocusPriority] = useState<"1" | "2" | "3">("1");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ id: string; title: string; destination: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    queueMicrotask(() => {
      setTitle("");
      setDate(defaults.date ?? "");
      setPriority("medium");
      setGoalId(defaults.goalId ?? "");
      setProjectId(defaults.projectId ?? "");
      setType(defaults.focusPriority ? "priority" : "task");
      setFocusPriority(String(defaults.focusPriority ?? 1) as "1" | "2" | "3");
      setOptionsOpen(false);
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => titleRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [defaults, onClose, open]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || saving) return;
    setSaving(true);
    const existingIds = new Set(planner.snapshot.tasks.map((task) => task.id));
    const next = await planner.createTaskDetailed({
      title: cleanTitle,
      date: date || undefined,
      priority,
      focusPriority: type === "priority" ? Number(focusPriority) as 1 | 2 | 3 : defaults.focusPriority,
      goalId: goalId || undefined,
      projectId: projectId || undefined,
      periodPlanId: defaults.periodPlanId,
    });
    const created = next.tasks.find((task) => !existingIds.has(task.id));
    setSaving(false);
    if (!created) return;
    setFeedback({ id: created.id, title: created.title, destination: created.date ? `Mi día · ${created.date}` : "Bandeja" });
    onClose();
  };

  const undo = async () => {
    if (!feedback) return;
    await planner.deleteTask(feedback.id);
    setFeedback(null);
  };

  return <>
    {open && typeof document !== "undefined" && createPortal(<div className="quick-capture-layer">
      <button type="button" className="quick-capture-backdrop" aria-label="Cerrar captura rápida" onClick={onClose} />
      <aside ref={drawerRef} className="quick-capture-drawer" role="dialog" aria-modal="true" aria-labelledby={headingId} aria-describedby={descriptionId}>
        <header><div><p className="eyebrow">CAPTURA RÁPIDA</p><h2 id={headingId}>¿Qué quieres recordar?</h2><p id={descriptionId}>Escribe primero. Puedes organizarlo ahora o después.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></header>
        <form onSubmit={save}>
          <label className="form-field"><span>Nombre</span><input ref={titleRef} required minLength={2} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Escribe algo para recordarlo…" /></label>
          <button type="button" className="quick-capture-options-toggle" aria-expanded={optionsOpen} onClick={() => setOptionsOpen((current) => !current)}><span>Más opciones</span><ChevronDown size={17} /></button>
          {optionsOpen && <div className="quick-capture-options">
            <label className="form-field"><span>Fecha</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label className="form-field"><span>Prioridad</span><select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label>
            <label className="form-field"><span>Meta</span><select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">Sin meta</option>{planner.snapshot.goals.filter((goal) => goal.status === "active").map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label>
            <label className="form-field"><span>Proyecto</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Sin proyecto</option>{planner.snapshot.projects.filter((project) => project.status === "active").map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
            <label className="form-field"><span>Tipo</span><select value={type} onChange={(event) => setType(event.target.value as CaptureType)}><option value="task">Tarea</option><option value="priority">Prioridad de Mi día</option></select></label>
            {type === "priority" && <label className="form-field"><span>Posición</span><select value={focusPriority} onChange={(event) => setFocusPriority(event.target.value as typeof focusPriority)}><option value="1">Prioridad 1</option><option value="2">Prioridad 2</option><option value="3">Prioridad 3</option></select></label>}
          </div>}
          <div className="quick-capture-actions"><small>{date ? "Se guardará en el día elegido." : "Se guardará en Bandeja, sin fecha."}</small><Button type="submit" loading={saving}><Save size={16} /> Guardar</Button></div>
        </form>
      </aside>
    </div>, document.body)}
    {feedback && <div className="quick-capture-feedback" role="status" aria-live="polite"><span><Check size={17} /><strong>Guardado en {feedback.destination}</strong><small>{feedback.title}</small></span><Link to="/app/tasks"><Eye size={15} /> Ver</Link><button type="button" onClick={undo}><RotateCcw size={15} /> Deshacer</button><button type="button" aria-label="Cerrar confirmación" onClick={() => setFeedback(null)}><X size={15} /></button></div>}
  </>;
}

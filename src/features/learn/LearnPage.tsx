"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, ChevronRight, Sparkles } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { Button, Card, SectionHeading } from "@/src/components/ui/Primitives";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";
import { useI18n } from "@/src/i18n/I18nProvider";

const tips = [
  ["Organiza tu vida", "Si tienes siete prioridades, realmente no tienes prioridades.", "Elegir mis tres prioridades"],
  ["Construye hábitos", "Empieza con una versión suficientemente pequeña para un día difícil.", "Definir la versión mínima de un hábito"],
  ["Trabaja mejor", "Planifica menos de tu capacidad total para dejar margen a lo inesperado.", "Dejar un bloque libre esta semana"],
  ["Cuida tu mente", "Nombrar cómo llegas puede ayudarte a elegir una carga más amable.", "Registrar cómo llego hoy"],
  ["Dinero con propósito", "Divide una meta mensual de ahorro en aportes más pequeños.", "Definir un aporte pequeño de ahorro"],
  ["Diseña tu vida", "Una buena meta describe un resultado, no solo una actividad.", "Revisar el resultado de una meta"],
] as const;

export function LearnPage({ planner }: { planner: PlannerController }) {
  const { m } = useI18n();
  const [today, setToday] = useState(() => toLocalDateKey(new Date()));
  const operations = useRef(new Map<string, "adding" | "added">());
  const [states, setStates] = useState<Record<string, "adding" | "added">>({});

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refreshDate = () => {
      const now = new Date();
      setToday(toLocalDateKey(now));
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      clearTimeout(timer);
      timer = setTimeout(refreshDate, midnight.getTime() - now.getTime());
    };
    refreshDate();
    window.addEventListener("focus", refreshDate);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refreshDate); };
  }, []);

  async function applySuggestion(index: number, action: string) {
    const date = toLocalDateKey(new Date());
    const key = `${date}:${index}`;
    // Lock the operation synchronously, before React renders or persistence resolves.
    // Scoped to this visit/date, never a global title-based deduplication rule.
    if (operations.current.has(key)) return;
    operations.current.set(key, "adding");
    setToday(date);
    setStates(Object.fromEntries(operations.current));
    try {
      await planner.createTask(action, date);
      operations.current.set(key, "added");
    } catch {
      // usePlanner owns the shared save-error alert. Release only this suggestion.
      operations.current.delete(key);
    }
    setStates(Object.fromEntries(operations.current));
  }

  return <div className="page-stack learn-page">
    <SectionNavigation section="space" />
    <SectionHeading eyebrow="Ideas que aterrizan" title="Aprende" description="Tips breves para organizarte con más claridad, sin convertir tu planner en otro pendiente." />
    <div className="learn-grid">{tips.map(([category, tip, action], index) => {
      const state = states[`${today}:${index}`];
      return <Card key={category} className="learn-card">
        <div className="learn-card__category"><span><BookOpen size={21} aria-hidden="true" /></span><p className="eyebrow">{category}</p></div>
        <h2>{tip}</h2>
        <Button variant="secondary" feedback={state === "added" ? "success" : undefined} data-i18n-explicit="true" loading={state === "adding"} disabled={state === "added"} onClick={() => void applySuggestion(index, action)}>
          {state === "added" && <Check size={16} aria-hidden="true" />}
          {m(state === "adding" ? "learn.apply.adding" : state === "added" ? "learn.apply.added" : "learn.apply.action")}
          {!state && <ChevronRight size={16} aria-hidden="true" />}
        </Button>
        <small className={state === "added" ? "learn-card__confirmation" : "sr-only"} role="status" aria-atomic="true" data-i18n-explicit="true">{state === "added" ? m("learn.apply.confirmation") : state === "adding" ? m("learn.apply.adding") : ""}</small>
      </Card>;
    })}</div>
    <Card className="learn-note"><Sparkles size={22} /><div><h2>Una idea a la vez</h2><p>Cuando exista una guía externa verificada, este espacio podrá enlazarla. No mostramos enlaces inventados.</p></div><Link className="button button--text" to="/app/today">Ver mi día</Link></Card>
  </div>;
}

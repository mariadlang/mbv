"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, Sparkles } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { Button, Card, SectionHeading } from "@/src/components/ui/Primitives";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";

const tips = [
  ["Organiza tu vida", "Si tienes siete prioridades, realmente no tienes prioridades.", "Elegir mis tres prioridades"],
  ["Construye hábitos", "Empieza con una versión suficientemente pequeña para un día difícil.", "Definir la versión mínima de un hábito"],
  ["Trabaja mejor", "Planifica menos de tu capacidad total para dejar margen a lo inesperado.", "Dejar un bloque libre esta semana"],
  ["Cuida tu mente", "Nombrar cómo llegas puede ayudarte a elegir una carga más amable.", "Registrar cómo llego hoy"],
  ["Dinero con propósito", "Divide una meta mensual de ahorro en aportes más pequeños.", "Definir un aporte pequeño de ahorro"],
  ["Diseña tu vida", "Una buena meta describe un resultado, no solo una actividad.", "Revisar el resultado de una meta"],
] as const;

export function LearnPage({ planner }: { planner: PlannerController }) {
  const [saved, setSaved] = useState("");
  return <div className="page-stack learn-page">
    <SectionNavigation section="space" />
    <SectionHeading eyebrow="Ideas que aterrizan" title="Aprende" description="Tips breves para organizarte con más claridad, sin convertir tu planner en otro pendiente." />
    <div className="learn-grid">{tips.map(([category, tip, action]) => <Card key={category} className="learn-card"><span><BookOpen size={21} /></span><p className="eyebrow">{category}</p><h2>{tip}</h2><Button variant="secondary" onClick={async () => { await planner.createTask(action, toLocalDateKey(new Date())); setSaved(category); }}>Aplicar a Mi día <ChevronRight size={16} /></Button>{saved === category && <small role="status">Añadido a Mi día como tarea no prioritaria.</small>}</Card>)}</div>
    <Card className="learn-note"><Sparkles size={22} /><div><h2>Una idea a la vez</h2><p>Cuando exista una guía externa verificada, este espacio podrá enlazarla. No mostramos enlaces inventados.</p></div><Link className="button button--text" to="/app/today">Ver mi día</Link></Card>
  </div>;
}

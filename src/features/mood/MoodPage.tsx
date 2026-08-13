"use client";

import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MoodName } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { getRecentDates, toLocalDateKey } from "@/src/lib/dates";
import { Button, Card, SectionHeading } from "@/src/components/ui/Primitives";

const moods: { name: MoodName; face: string; label: string }[] = [
  { name: "Abrumada", face: "⌢", label: "Muy mal" },
  { name: "Cansada", face: "—", label: "Mal" },
  { name: "Calmada", face: "·", label: "Neutral" },
  { name: "Enfocada", face: "⌣", label: "Bien" },
  { name: "Alegre", face: "◡", label: "Muy bien" },
];
const factors = ["Sueño", "Trabajo", "Entrenamiento", "Relaciones", "Ciclo", "Alimentación"];

export function MoodPage({ planner }: { planner: PlannerController }) {
  const todayKey = toLocalDateKey(new Date());
  const today = planner.snapshot.moodLogs.find((log) => log.date === todayKey);
  const [mood, setMood] = useState<MoodName>(today?.mood ?? "Calmada");
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(today?.energy ?? 3);
  const [sleep, setSleep] = useState<1 | 2 | 3 | 4 | 5>(today?.sleep ?? 3);
  const [concentration, setConcentration] = useState<1 | 2 | 3 | 4 | 5>(today?.concentration ?? 3);
  const [selectedFactors, setSelectedFactors] = useState<string[]>(today?.factors ?? []);
  const [note, setNote] = useState(today?.note ?? "");
  const chartData = useMemo(() => getRecentDates(30).map((date) => {
    const log = planner.snapshot.moodLogs.find((item) => item.date === toLocalDateKey(date));
    return { day: date.getDate(), energy: log?.energy ?? null };
  }), [planner.snapshot.moodLogs]);

  return (
    <div className="page-stack mood-page-full">
      <SectionHeading eyebrow="Escucha tu ritmo" title="Estado de ánimo y energía" description="Registra contexto para entenderte mejor, nunca para juzgarte." />
      <div className="mood-full-layout">
        <Card className="mood-checkin-card">
          <h2>¿Cómo te sientes hoy?</h2>
          <div className="mood-face-row">{moods.map((item) => <button key={item.name} className={mood === item.name ? "is-selected" : ""} onClick={() => setMood(item.name)} aria-pressed={mood === item.name}><span>{item.face}</span><small>{item.label}</small></button>)}</div>
          <h3>Nivel de energía</h3>
          <div className="energy-buttons">{([1,2,3,4,5] as const).map((level) => <button key={level} className={energy === level ? "is-selected" : ""} onClick={() => setEnergy(level)}>{level}</button>)}</div>
          <div className="mood-signal-grid"><div><h3>Calidad del sueño</h3><div className="energy-buttons">{([1,2,3,4,5] as const).map((level) => <button key={level} className={sleep === level ? "is-selected" : ""} onClick={() => setSleep(level)}>{level}</button>)}</div></div><div><h3>Concentración</h3><div className="energy-buttons">{([1,2,3,4,5] as const).map((level) => <button key={level} className={concentration === level ? "is-selected" : ""} onClick={() => setConcentration(level)}>{level}</button>)}</div></div></div>
          <h3>Factores que influyen hoy</h3>
          <div className="factor-chips">{factors.map((factor) => <button key={factor} className={selectedFactors.includes(factor) ? "is-selected" : ""} onClick={() => setSelectedFactors(selectedFactors.includes(factor) ? selectedFactors.filter((item) => item !== factor) : [...selectedFactors, factor])}>{factor}</button>)}</div>
          <label className="mood-note"><span>Notas opcionales</span><textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="¿Hay algo que quieras anotar sobre tu día?" /></label>
          <Button onClick={() => planner.saveMood(mood, energy, selectedFactors, note, sleep, concentration)}>Guardar registro</Button>
        </Card>
        <Card className="mood-trend-card"><p className="eyebrow">Tendencia mensual</p><h2>Tu energía a lo largo del mes</h2><div className="mood-trend-chart"><ResponsiveContainer width="100%" height={260}><LineChart data={chartData}><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize:10,fill:"var(--color-text-secondary)"}} /><YAxis domain={[1,5]} ticks={[1,2,3,4,5]} axisLine={false} tickLine={false} tick={{fontSize:10,fill:"var(--color-text-secondary)"}} /><Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 12 }} /><Line type="monotone" dataKey="energy" connectNulls stroke="var(--color-brand-strong)" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div><div className="neutral-observation"><strong>Observación neutral</strong><p>Tu energía puede variar. Escuchar tu ritmo también es avanzar.</p></div></Card>
      </div>
    </div>
  );
}

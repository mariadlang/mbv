"use client";

import { useState } from "react";
import { Frown, Heart, Laugh, Meh, Pencil, Smile, Sparkles, type LucideIcon } from "lucide-react";
import type { MoodName } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { Button, Card } from "@/src/components/ui/Primitives";

const moodOptions: { name: MoodName; label: string; Icon: LucideIcon }[] = [
  { name: "Abrumada", label: "Muy baja", Icon: Frown },
  { name: "Cansada", label: "Baja", Icon: Meh },
  { name: "Calmada", label: "Equilibrada", Icon: Smile },
  { name: "Enfocada", label: "Buena", Icon: Smile },
  { name: "Alegre", label: "Excelente", Icon: Laugh },
];

export function TodayMoodCard({
  planner,
  saveOnChange = false,
  onLowEnergy,
}: {
  planner: PlannerController;
  saveOnChange?: boolean;
  onLowEnergy?: () => void;
}) {
  const todayKey = toLocalDateKey(new Date());
  const savedLog = planner.snapshot.moodLogs.find((log) => log.date === todayKey);
  const [mood, setMood] = useState<MoodName>(savedLog?.mood ?? "Calmada");
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10>(savedLog?.energy ?? 6);
  const [note, setNote] = useState(savedLog?.note ?? "");
  const [saved, setSaved] = useState(false);

  const save = async (nextMood = mood, nextEnergy = energy, nextNote = note) => {
    await planner.saveMood(nextMood, nextEnergy, savedLog?.factors ?? [], nextNote, savedLog?.sleep, savedLog?.concentration);
    setSaved(true);
  };

  const chooseMood = (nextMood: MoodName) => {
    setMood(nextMood);
    setSaved(false);
    if (saveOnChange) void save(nextMood, energy, note);
  };

  const chooseEnergy = (nextEnergy: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) => {
    setEnergy(nextEnergy);
    setSaved(false);
    if (saveOnChange) void save(mood, nextEnergy, note);
  };

  return (
    <Card className="today-mood-card">
      <header className="today-mood-card__header"><h2>Mi estado hoy</h2><span><Heart size={20} strokeWidth={1.7} /> Tu bienestar importa</span></header>
      <div className="today-mood-section"><h3>Ánimo</h3><p>Selecciona lo que mejor te representa hoy</p><div className="today-mood-options" role="radiogroup" aria-label="Ánimo de hoy">{moodOptions.map(({ name, label, Icon }) => { const selected = mood === name; return <button type="button" role="radio" aria-checked={selected} key={name} className={selected ? "is-selected" : ""} onClick={() => chooseMood(name)}><span><Icon size={34} strokeWidth={1.35} aria-hidden="true" /></span><small>{label}</small></button>; })}</div></div>
      <fieldset className="today-mood-energy"><legend>Energía</legend><p>Tu energía para hoy</p><div className="today-mood-energy__row"><div className="today-mood-energy__segments" role="group" aria-label="Nivel de energía">{([1,2,3,4,5,6,7,8,9,10] as const).map((level) => <button type="button" key={level} className={level <= energy ? "is-filled" : ""} aria-pressed={level === energy} aria-label={`Energía ${level} de 10`} onClick={() => chooseEnergy(level)}><span className="sr-only">{level}</span></button>)}</div><strong>{energy}/10</strong></div></fieldset>
      <form className="today-mood-note-field" onSubmit={(event) => { event.preventDefault(); void save(); }}><Sparkles size={22} strokeWidth={1.6} aria-hidden="true" /><label className="sr-only" htmlFor="today-mood-note">Nota breve sobre tu estado</label><input id="today-mood-note" value={note} onChange={(event) => { setNote(event.target.value); setSaved(false); }} onBlur={() => { if (saveOnChange) void save(mood, energy, note); }} placeholder="Escribe una nota breve sobre cómo te sientes…" /><button type="submit" aria-label="Guardar nota de bienestar"><Pencil size={19} strokeWidth={1.7} /></button></form>
      {saveOnChange ? <footer>TU BIENESTAR HOY, MÁS POSIBILIDADES MAÑANA <Heart size={15} fill="currentColor" aria-hidden="true" /></footer> : <div className="today-mood-card__actions"><Button type="button" onClick={() => void save()}>{savedLog ? "Actualizar registro" : "Guardar registro"}</Button><span className={saved ? "is-visible" : ""} role="status"><span><Heart size={13} fill="currentColor" aria-hidden="true" /> Registro guardado</span><small>Tu bienestar hoy,<br />más posibilidades mañana</small></span></div>}
      {onLowEnergy && energy <= 4 && <Button variant="secondary" onClick={onLowEnergy}>Activar modo mínimo</Button>}
    </Card>
  );
}

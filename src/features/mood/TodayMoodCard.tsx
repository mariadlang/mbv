"use client";

import { useState, type KeyboardEvent } from "react";
import { Frown, Heart, Laugh, Meh, Pencil, Smile, Sparkles, type LucideIcon } from "lucide-react";
import type { MoodName } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { Button, Card } from "@/src/components/ui/Primitives";
import { useI18n } from "@/src/i18n/I18nProvider";

const moodOptions: { name: MoodName; Icon: LucideIcon }[] = [
  { name: "Abrumada", Icon: Frown },
  { name: "Cansada", Icon: Meh },
  { name: "Calmada", Icon: Smile },
  { name: "Enfocada", Icon: Smile },
  { name: "Alegre", Icon: Laugh },
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
  const { m, formatNumber } = useI18n();
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

  const moodLabel = (name: MoodName) => {
    if (name === "Abrumada") return m("today.mood.veryLow");
    if (name === "Cansada") return m("today.mood.low");
    if (name === "Calmada") return m("today.mood.balanced");
    if (name === "Enfocada") return m("today.mood.good");
    return m("today.mood.excellent");
  };

  const moveMoodFocus = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % moodOptions.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + moodOptions.length) % moodOptions.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = moodOptions.length - 1;
    else return;
    event.preventDefault();
    chooseMood(moodOptions[nextIndex].name);
    event.currentTarget.closest('[role="radiogroup"]')?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
  };

  return (
    <Card className="today-mood-card" data-i18n-explicit="true">
      <header className="today-mood-card__header"><h2>{m("today.mood.title")}</h2><span><Heart size={20} strokeWidth={1.7} /> {m("today.mood.care")}</span></header>
      <div className="today-mood-section"><h3>{m("today.mood.section")}</h3><p>{m("today.mood.prompt")}</p><div className="today-mood-options" role="radiogroup" aria-label={m("today.mood.groupAria")}>{moodOptions.map(({ name, Icon }, index) => { const selected = mood === name; return <button type="button" role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1} key={name} className={selected ? "is-selected" : ""} onClick={() => chooseMood(name)} onKeyDown={(event) => moveMoodFocus(event, index)}><span><Icon size={34} strokeWidth={1.35} aria-hidden="true" /></span><small>{moodLabel(name)}</small></button>; })}</div></div>
      <fieldset className="today-mood-energy"><legend>{m("today.mood.energy")}</legend><p>{m("today.mood.energyPrompt")}</p><div className="today-mood-energy__row"><div className="today-mood-energy__segments" role="group" aria-label={m("today.mood.energyGroupAria")}>{([1,2,3,4,5,6,7,8,9,10] as const).map((level) => <button type="button" key={level} className={level <= energy ? "is-filled" : ""} aria-pressed={level === energy} aria-label={m("today.mood.energyAria", { level: formatNumber(level) })} onClick={() => chooseEnergy(level)}><span className="sr-only">{formatNumber(level)}</span></button>)}</div><strong>{formatNumber(energy)}/10</strong></div></fieldset>
      <form className="today-mood-note-field" onSubmit={(event) => { event.preventDefault(); void save(); }}><Sparkles size={22} strokeWidth={1.6} aria-hidden="true" /><label className="sr-only" htmlFor="today-mood-note">{m("today.mood.noteLabel")}</label><input id="today-mood-note" value={note} onChange={(event) => { setNote(event.target.value); setSaved(false); }} onBlur={() => { if (saveOnChange) void save(mood, energy, note); }} placeholder={m("today.mood.notePlaceholder")} translate="no" data-no-translate="true" /><button type="submit" aria-label={m("today.mood.saveNoteAria")}><Pencil size={19} strokeWidth={1.7} /></button></form>
      {saveOnChange ? <footer>{m("today.mood.footer")} <Heart size={15} fill="currentColor" aria-hidden="true" /></footer> : <div className="today-mood-card__actions"><Button type="button" onClick={() => void save()}>{savedLog ? m("today.mood.update") : m("today.mood.save")}</Button><span className={saved ? "is-visible" : ""} role="status"><span><Heart size={13} fill="currentColor" aria-hidden="true" /> {m("today.mood.saved")}</span><small>{m("today.mood.savedLineOne")}<br />{m("today.mood.savedLineTwo")}</small></span></div>}
      {onLowEnergy && energy <= 4 && <Button variant="secondary" onClick={onLowEnergy}>{m("today.mood.minimumMode")}</Button>}
    </Card>
  );
}

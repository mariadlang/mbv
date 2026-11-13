"use client";

/* eslint-disable jsx-a11y/no-autofocus -- Inline fields open only after an explicit edit action. */
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays } from "date-fns";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { MealLog, MealSlot } from "@/src/domain/planner";
import { healthPreparation } from "@/src/domain/healthPreparation";
import { mainMealSlots, mealsForDate } from "@/src/domain/mealPlanning";
import { getWeekDates, toLocalDateKey } from "@/src/lib/dates";
import { useI18n } from "@/src/i18n/I18nProvider";
import { useUnsavedDraft, useDraftNavigation } from "@/src/components/navigation/UnsavedDraftProvider";
import { localDate, usePreparationOperation } from "./PreparationShared";

const slotKeys = { breakfast: "meals.breakfast", lunch: "meals.lunch", dinner: "meals.dinner", snack: "meals.snacks" } as const;

type DayProps = { planner: PlannerController; date: string; daily?: boolean; selected?: boolean };

export function WeeklyMeals({ planner, date, onSelectDate }: DayProps & { onSelectDate: (date: string) => void }) {
  const { m, formatDate } = useI18n();
  const navigation = useDraftNavigation();
  const dates = getWeekDates(localDate(date), planner.snapshot.profile?.weekStartsOn ?? 1);
  const changeWeek = (offset: number) => navigation.request(() => onSelectDate(toLocalDateKey(addDays(localDate(date), offset))));
  return <section className="meal-week" data-i18n-explicit="true" aria-label={m("meals.week")}>
    <header className="meal-week-heading"><div className="meal-week-navigation">
      <button type="button" onClick={() => changeWeek(-7)} aria-label={m("meals.previousWeek")}><ChevronLeft size={18} /></button>
      <span>{formatDate(dates[0], { day: "numeric", month: "short" })} – {formatDate(dates[6], { day: "numeric", month: "short", year: "numeric" })}</span>
      <button type="button" onClick={() => changeWeek(7)} aria-label={m("meals.nextWeek")}><ChevronRight size={18} /></button>
    </div></header>
    <div className="meal-day-selector" role="group" aria-label={m("meals.selectDay")}>{dates.map((day) => {
      const key = toLocalDateKey(day);
      return <button type="button" key={key} aria-pressed={date === key} aria-label={formatDate(day, { weekday: "long", day: "numeric", month: "long" })} onClick={() => navigation.request(() => onSelectDate(key))}><span>{formatDate(day, { weekday: "short" })}</span><strong>{formatDate(day, { day: "numeric" })}</strong></button>;
    })}</div>
    <div className="meal-week-grid">{dates.map((day) => { const key = toLocalDateKey(day); return <MealDayCard key={key} planner={planner} date={key} selected={date === key} />; })}</div>
    <p className="meal-plan-note">{m("meals.planHelp")}</p>
  </section>;
}

export function MealDayCard({ planner, date, daily = false, selected = false }: DayProps) {
  const { m, formatDate } = useI18n();
  const meals = mealsForDate(planner.snapshot, date);
  const snacks = meals.filter((meal) => meal.slot === "snack");
  const legacy = meals.filter((meal) => !meal.slot);
  const [saved, setSaved] = useState(false);
  const onSaved = () => setSaved(true);
  return <article className={`meal-day-card ${selected ? "is-selected" : ""} ${daily ? "is-daily" : ""}`} data-date={date} data-i18n-explicit="true" aria-label={formatDate(localDate(date), { weekday: "long", day: "numeric", month: "long" })}>
    <header><h3>{daily ? m("meals.day") : formatDate(localDate(date), { weekday: "long" })}</h3><time dateTime={date}>{formatDate(localDate(date), daily ? { day: "numeric", month: "long" } : { day: "numeric", month: "short" })}</time></header>
    <div className="meal-day-content">{mainMealSlots.map((slot) => {
      const entries = meals.filter((meal) => meal.slot === slot);
      return <section className="meal-slot" key={slot} aria-label={m(slotKeys[slot])}><h4>{m(slotKeys[slot])}</h4>{entries.length ? entries.map((meal) => <MealField key={meal.id} planner={planner} date={date} slot={slot} meal={meal} daily={daily} onSaved={onSaved} />) : <MealField planner={planner} date={date} slot={slot} daily={daily} onSaved={onSaved} />}</section>;
    })}
    {(!daily || snacks.length > 0) && <section className="meal-slot meal-snacks" aria-label={m("meals.snacks")}>
      {snacks.length > 0 && <h4>{m("meals.snacks")}</h4>}{snacks.map((meal) => <MealField key={meal.id} planner={planner} date={date} slot="snack" meal={meal} onSaved={onSaved} />)}
      <MealField planner={planner} date={date} slot="snack" onSaved={onSaved} />
    </section>}
    {legacy.length > 0 && <section className="meal-slot meal-legacy" aria-label={m("meals.previous")}><h4>{m("meals.previous")}</h4>{legacy.map((meal) => <MealField key={meal.id} planner={planner} date={date} meal={meal} onSaved={onSaved} />)}</section>}
    </div>
    <MonthlyMealVersion planner={planner} date={date} />
    {saved && <p className="meal-save-status" role="status">{m("meals.saved")}</p>}
  </article>;
}

function MealField({ planner, date, slot, meal, daily, onSaved }: { planner: PlannerController; date: string; slot?: MealSlot; meal?: MealLog; daily?: boolean; onSaved: () => void }) {
  const { m, formatDate } = useI18n();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [mealId, setMealId] = useState("");
  const operation = usePreparationOperation();
  const label = slot ? m(slotKeys[slot]) : m("meals.previous");
  const fieldLabel = `${label} · ${formatDate(localDate(date), { weekday: "long", day: "numeric", month: "long" })}`;
  const save = async () => {
    if (!name.trim()) return false;
    if (!await operation.run(() => planner.savePlannedMeal({ date, mealId, slot, name }))) return false;
    guard.markSaved(); setEditing(false); onSaved(); return true;
  };
  const guard = useUnsavedDraft({ dirty: editing && (name !== (meal?.name ?? "") || operation.busy), saving: operation.busy, onSave: save, onDiscard: () => setEditing(false) });
  if (!editing) return <button type="button" className={`meal-value ${meal ? "has-content" : "is-empty"}`} aria-label={m(meal ? "meals.editAria" : "meals.addAria", { meal: fieldLabel })} onClick={() => guard.request(() => { setName(meal?.name ?? ""); setMealId(meal?.id ?? crypto.randomUUID()); setEditing(true); })}>
    {meal ? <span data-no-translate="true" translate="no">{meal.name}</span> : slot === "snack" ? m("meals.addSnacks") : daily ? <>{m("meals.unplanned")}<span>{m("meals.add")}</span></> : m("meals.add")}
  </button>;
  return <form className="meal-inline-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <fieldset disabled={operation.busy} aria-busy={operation.busy}>
      <label><span className="sr-only">{fieldLabel}</span><textarea autoFocus required maxLength={300} rows={3} value={name} onChange={(event) => setName(event.target.value)} /></label>
      {operation.error && <p role="alert">{m("preparation.error")}</p>}
      <div><button type="submit" className="button" disabled={!name.trim() || operation.busy}>{m(operation.busy ? "draft.saving" : "preparation.save")}</button><button type="button" className="button button--ghost" onClick={() => guard.request(() => setEditing(false))}>{m("common.cancel")}</button></div>
    </fieldset>
  </form>;
}

function MonthlyMealVersion({ planner, date }: { planner: PlannerController; date: string }) {
  const { m } = useI18n();
  const navigation = useDraftNavigation();
  const operation = usePreparationOperation();
  const current = healthPreparation(planner.snapshot, date, "nutrition");
  if (!current.monthly) return null;
  return <div className="meal-month-version"><small>{m(current.override ? "preparation.weeklyException" : "preparation.recovered")}</small>{current.override && <button type="button" disabled={operation.busy} onClick={() => navigation.request(() => { void operation.run(() => planner.saveHealthPreparation({ date, section: "nutrition", scope: "weekly", title: current.monthly!.title, inherit: true })); })}>{m("preparation.restoreMonth")}</button>}{operation.error && <p role="alert">{m("preparation.error")}</p>}</div>;
}

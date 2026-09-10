"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Apple, Check, HeartHandshake, MoonStar, Pause, Plus, RotateCcw, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Challenge } from "@/src/domain/planner";
import { calculateChallengeProgress } from "@/src/domain/challengeRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { getInclusiveDateCount, isDateKeyWithinRange, toLocalDateKey } from "@/src/lib/dates";
import { challengeFormSchema, type ChallengeFormInput } from "@/src/lib/schemas";
import { Modal } from "@/src/components/ui/Modal";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { NavigationSpaceProgressMessageKey } from "@/src/i18n/messages/features/navigation-space-progress";

type ChallengeType = ChallengeFormInput["type"];

const challengeMeta: Record<ChallengeType, { labelKey: NavigationSpaceProgressMessageKey; icon: LucideIcon }> = {
  fear: { labelKey: "challenges.type.fear", icon: HeartHandshake },
  intermittent_fasting: { labelKey: "challenges.type.fasting", icon: MoonStar },
  no_sugar: { labelKey: "challenges.type.noSugar", icon: Apple },
  custom: { labelKey: "challenges.type.custom", icon: Sparkles },
};

type ChallengePreset = {
  type: Exclude<ChallengeType, "custom">;
  titleKey: NavigationSpaceProgressMessageKey;
  intentionKey: NavigationSpaceProgressMessageKey;
  descriptionKey: NavigationSpaceProgressMessageKey;
  noteKey: NavigationSpaceProgressMessageKey;
};

const presets: ChallengePreset[] = [
  {
    type: "fear",
    titleKey: "challenges.preset.fear.title",
    intentionKey: "challenges.preset.fear.intention",
    descriptionKey: "challenges.preset.fear.description",
    noteKey: "challenges.preset.fear.note",
  },
  {
    type: "intermittent_fasting",
    titleKey: "challenges.preset.fasting.title",
    intentionKey: "challenges.preset.fasting.intention",
    descriptionKey: "challenges.preset.fasting.description",
    noteKey: "challenges.preset.fasting.note",
  },
  {
    type: "no_sugar",
    titleKey: "challenges.preset.noSugar.title",
    intentionKey: "challenges.preset.noSugar.intention",
    descriptionKey: "challenges.preset.noSugar.description",
    noteKey: "challenges.preset.noSugar.note",
  },
];

function ChallengeIcon({ type, size = 22 }: { type: ChallengeType; size?: number }) {
  const Icon = challengeMeta[type].icon;
  return <Icon size={size} aria-hidden="true" />;
}

export function ChallengesPage({ planner, embedded = false }: { planner: PlannerController; embedded?: boolean }) {
  const { m } = useI18n();
  const today = toLocalDateKey(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<ChallengeFormInput>({
    resolver: zodResolver(challengeFormSchema),
    defaultValues: { title: "", type: "custom", intention: "", startDate: today, endDate: "" },
  });
  const selectedType = useWatch({ control: form.control, name: "type" });

  const openChallengeForm = (preset?: ChallengePreset) => {
    form.reset(preset ? { title: m(preset.titleKey), type: preset.type, intention: m(preset.intentionKey), startDate: today, endDate: "" } : { title: "", type: "custom", intention: "", startDate: today, endDate: "" });
    setDialogOpen(true);
  };

  const submit = form.handleSubmit(async (values) => {
    await planner.createChallenge(values);
    setDialogOpen(false);
    form.reset();
  });

  const activeChallenges = planner.snapshot.challenges.filter((challenge) => challenge.status === "active");
  const completedChallenges = planner.snapshot.challenges.filter((challenge) => challenge.status === "completed");
  const pausedChallenges = planner.snapshot.challenges.filter((challenge) => challenge.status === "archived");

  return (
    <div className={`page-stack challenges-page ${embedded ? "challenges-page--embedded" : ""}`} data-i18n-explicit="true">
      <SectionHeading
        eyebrow={m("challenges.header.eyebrow")}
        title={m("challenges.header.title")}
        description={m("challenges.header.description")}
        action={<Button onClick={() => openChallengeForm()}><Plus size={17} /> {m("challenges.create")}</Button>}
      />

      <section aria-labelledby="challenge-ideas-title">
        <div className="card-heading">
          <div><p className="eyebrow">{m("challenges.presets.eyebrow")}</p><h2 id="challenge-ideas-title">{m("challenges.presets.title")}</h2></div>
          <Badge tone="rose">{m("challenges.presets.editable")}</Badge>
        </div>
        <div className="challenge-presets">
          {presets.map((preset) => <Card key={preset.type} className="challenge-preset-card">
            <span><ChallengeIcon type={preset.type} /></span>
            <Badge tone="neutral">{m(challengeMeta[preset.type].labelKey)}</Badge>
            <h3>{m(preset.titleKey)}</h3>
            <p>{m(preset.descriptionKey)}</p>
            <small>{m(preset.noteKey)}</small>
            <Button variant="secondary" onClick={() => openChallengeForm(preset)}>{m("challenges.presets.choose")}</Button>
          </Card>)}
        </div>
      </section>

      <section aria-labelledby="active-challenges-title">
        <div className="card-heading">
          <div><p className="eyebrow">{m("challenges.active.eyebrow")}</p><h2 id="active-challenges-title">{m("challenges.active.title")}</h2></div>
          {activeChallenges.length > 0 && <Badge tone="sage">{m("challenges.active.count", { count: activeChallenges.length })}</Badge>}
        </div>
        {activeChallenges.length === 0 ? <Card><EmptyState title={m("challenges.active.empty.title")} text={m("challenges.active.empty.description")} action={<Button variant="secondary" onClick={() => openChallengeForm()}>{m("challenges.active.empty.action")}</Button>} /></Card> : <div className="active-challenges">
          {activeChallenges.map((challenge) => <ActiveChallengeCard key={challenge.id} challenge={challenge} today={today} planner={planner} />)}
        </div>}
      </section>

      {pausedChallenges.length > 0 && <section aria-labelledby="paused-challenges-title">
        <div className="card-heading"><div><p className="eyebrow">{m("challenges.paused.eyebrow")}</p><h2 id="paused-challenges-title">{m("challenges.paused.title")}</h2></div></div>
        <div className="completed-challenges">
          {pausedChallenges.map((challenge) => <Card key={challenge.id} className="completed-challenge-card"><span><ChallengeIcon type={challenge.type} size={18} /></span><div><h3>{challenge.title}</h3><p>{m("challenges.paused.description")}</p></div><Button size="sm" variant="ghost" onClick={() => planner.updateChallengeStatus(challenge.id, "active")}><RotateCcw size={15} /> {m("challenges.resume")}</Button></Card>)}
        </div>
      </section>}

      {completedChallenges.length > 0 && <section aria-labelledby="completed-challenges-title">
        <div className="card-heading"><div><p className="eyebrow">{m("challenges.completed.eyebrow")}</p><h2 id="completed-challenges-title">{m("challenges.completed.title")}</h2></div></div>
        <div className="completed-challenges">
          {completedChallenges.map((challenge) => { const count = new Set(challenge.completedDates).size; return <Card key={challenge.id} className="completed-challenge-card"><span><ChallengeIcon type={challenge.type} size={18} /></span><div><h3>{challenge.title}</h3><p>{m(count === 1 ? "challenges.days.one" : "challenges.days.many", { count })}</p></div><Button size="sm" variant="ghost" onClick={() => planner.updateChallengeStatus(challenge.id, "active")}><RotateCcw size={15} /> {m("challenges.resume")}</Button></Card>; })}
        </div>
      </section>}

      <Modal open={dialogOpen} title={m("challenges.modal.title")} description={m("challenges.modal.description")} onClose={() => setDialogOpen(false)} explicitI18n>
        <form className="challenge-form" onSubmit={submit} noValidate>
          <label className="form-field"><span>{m("challenges.form.name")}</span><input {...form.register("title")} placeholder={m("challenges.form.name.placeholder")} />{form.formState.errors.title && <small role="alert">{m("challenges.form.name.error")}</small>}</label>
          <label className="form-field"><span>{m("challenges.form.type")}</span><select {...form.register("type")}><option value="fear">{m("challenges.type.fear")}</option><option value="intermittent_fasting">{m("challenges.type.fasting")}</option><option value="no_sugar">{m("challenges.type.noSugar")}</option><option value="custom">{m("challenges.type.customOption")}</option></select></label>
          <label className="form-field form-field--wide"><span>{m("challenges.form.intention")}</span><textarea {...form.register("intention")} placeholder={m("challenges.form.intention.placeholder")} />{form.formState.errors.intention && <small role="alert">{m("challenges.form.intention.error")}</small>}</label>
          <label className="form-field"><span>{m("challenges.form.startDate")}</span><input type="date" {...form.register("startDate")} />{form.formState.errors.startDate && <small role="alert">{m("challenges.form.startDate.error")}</small>}</label>
          <label className="form-field"><span>{m("challenges.form.endDate")} <small>{m("challenges.form.optional")}</small></span><input type="date" {...form.register("endDate")} />{form.formState.errors.endDate && <small role="alert">{m("challenges.form.endDate.error")}</small>}</label>
          {(selectedType === "intermittent_fasting" || selectedType === "no_sugar") && <p className="challenge-health-note">{m("challenges.form.healthNote")}</p>}
          <div className="modal__actions form-field--wide"><Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>{m("challenges.form.notNow")}</Button><Button type="submit" loading={planner.saving}>{m("challenges.form.save")}</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function ActiveChallengeCard({ challenge, today, planner }: { challenge: Challenge; today: string; planner: PlannerController }) {
  const { m, formatDate } = useI18n();
  const completedToday = challenge.completedDates.includes(today);
  const inRange = isDateKeyWithinRange(today, challenge.startDate, challenge.endDate);
  const plannedDays = challenge.endDate ? getInclusiveDateCount(challenge.startDate, challenge.endDate) : undefined;
  const progress = calculateChallengeProgress(challenge);
  const encouragement = !inRange
    ? m(today < challenge.startDate ? "challenges.encouragement.notStarted" : "challenges.encouragement.ended")
    : m(completedToday ? "challenges.encouragement.today" : progress.completed === 0 ? "challenges.encouragement.first" : "challenges.encouragement.return");

  return <Card className="active-challenge-card">
    <header><div className="challenge-card-title"><span><ChallengeIcon type={challenge.type} /></span><div><Badge tone="rose">{m(challengeMeta[challenge.type].labelKey)}</Badge><h3>{challenge.title}</h3></div></div><Button size="sm" variant="ghost" onClick={() => planner.updateChallengeStatus(challenge.id, "archived")}><Pause size={15} /> {m("challenges.pause")}</Button></header>
    <p>{challenge.intention}</p>
    <div className="challenge-period"><span>{m("challenges.period.start", { date: formatDate(challenge.startDate, { dateStyle: "medium" }) })}</span>{challenge.endDate && <span>{m("challenges.period.end", { date: formatDate(challenge.endDate, { dateStyle: "medium" }) })}</span>}</div>
    <div className="challenge-day-count"><strong>{progress.completed}</strong><span>{plannedDays ? m(progress.completed === 1 ? "challenges.period.registeredOneWithPlan" : "challenges.period.registeredManyWithPlan", { count: progress.completed, planned: plannedDays }) : m(progress.completed === 1 ? "challenges.period.registeredOneFlexible" : "challenges.period.registeredManyFlexible", { count: progress.completed })}</span></div>
    <p className="challenge-encouragement">{encouragement}</p>
    <div className="modal__actions"><Button variant={completedToday ? "outline" : "primary"} disabled={!inRange} onClick={() => planner.toggleChallengeDate(challenge.id, today)} aria-pressed={completedToday}>{completedToday ? <><RotateCcw size={16} /> {m("challenges.today.remove")}</> : <><Check size={16} /> {m("challenges.today.register")}</>}</Button><Button variant="ghost" onClick={() => planner.updateChallengeStatus(challenge.id, "completed")}><Check size={15} /> {m("challenges.close")}</Button></div>
  </Card>;
}

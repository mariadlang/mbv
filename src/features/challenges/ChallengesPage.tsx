"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Apple, Check, HeartHandshake, MoonStar, Plus, RotateCcw, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Challenge } from "@/src/domain/planner";
import { calculateChallengeProgress, challengeEncouragement } from "@/src/domain/challengeRules";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { formatDateKey, getInclusiveDateCount, isDateKeyWithinRange, toLocalDateKey } from "@/src/lib/dates";
import { challengeFormSchema, type ChallengeFormInput } from "@/src/lib/schemas";
import { Modal } from "@/src/components/ui/Modal";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionHeading } from "@/src/components/ui/Primitives";

type ChallengeType = ChallengeFormInput["type"];

const challengeMeta: Record<ChallengeType, { label: string; icon: LucideIcon }> = {
  fear: { label: "Salir de mi zona conocida", icon: HeartHandshake },
  intermittent_fasting: { label: "Ayuno intermitente", icon: MoonStar },
  no_sugar: { label: "Sin azúcar añadida", icon: Apple },
  custom: { label: "Reto personal", icon: Sparkles },
};

const presets: Array<ChallengeFormInput & { description: string; note: string }> = [
  {
    type: "fear",
    title: "Pierde el miedo",
    intention: "Acercarme con suavidad a algo que hoy me incomoda.",
    startDate: "",
    endDate: "",
    description: "Elige una acción pequeña que amplíe tu zona de confianza.",
    note: "Tú decides el tamaño del paso y puedes ajustarlo cuando lo necesites.",
  },
  {
    type: "intermittent_fasting",
    title: "Explorar el ayuno intermitente",
    intention: "Observar cómo se siente este hábito en mi bienestar.",
    startDate: "",
    endDate: "",
    description: "Registra los días que elegiste probarlo, sin convertirlos en una obligación.",
    note: "Si tienes dudas o condiciones de salud, consulta primero a un profesional.",
  },
  {
    type: "no_sugar",
    title: "Reto sin azúcar añadida",
    intention: "Explorar decisiones de alimentación más conscientes.",
    startDate: "",
    endDate: "",
    description: "Prueba este cambio por un periodo elegido por ti y registra cómo te va.",
    note: "No busca perfección: un día distinto no borra lo que ya aprendiste.",
  },
];

function ChallengeIcon({ type, size = 22 }: { type: ChallengeType; size?: number }) {
  const Icon = challengeMeta[type].icon;
  return <Icon size={size} aria-hidden="true" />;
}

export function ChallengesPage({ planner }: { planner: PlannerController }) {
  const today = toLocalDateKey(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<ChallengeFormInput>({
    resolver: zodResolver(challengeFormSchema),
    defaultValues: { title: "", type: "custom", intention: "", startDate: today, endDate: "" },
  });
  const selectedType = useWatch({ control: form.control, name: "type" });

  const openChallengeForm = (preset?: ChallengeFormInput) => {
    form.reset(preset ? { ...preset, startDate: today } : { title: "", type: "custom", intention: "", startDate: today, endDate: "" });
    setDialogOpen(true);
  };

  const submit = form.handleSubmit(async (values) => {
    await planner.createChallenge(values);
    setDialogOpen(false);
    form.reset();
  });

  const activeChallenges = planner.snapshot.challenges.filter((challenge) => challenge.status === "active");
  const completedChallenges = planner.snapshot.challenges.filter((challenge) => challenge.status === "completed");

  return (
    <div className="page-stack challenges-page">
      <SectionHeading
        eyebrow="Curiosidad antes que presión"
        title="Retos"
        description="Prueba algo nuevo, registra lo que sí ocurrió y cambia el plan si deja de hacerte bien."
        action={<Button onClick={() => openChallengeForm()}><Plus size={17} /> Crear reto personal</Button>}
      />

      <section aria-labelledby="challenge-ideas-title">
        <div className="card-heading">
          <div><p className="eyebrow">Ideas para comenzar</p><h2 id="challenge-ideas-title">Elige un punto de partida</h2></div>
          <Badge tone="rose">Siempre editable</Badge>
        </div>
        <div className="challenge-presets">
          {presets.map((preset) => <Card key={preset.type} className="challenge-preset-card">
            <span><ChallengeIcon type={preset.type} /></span>
            <Badge tone="neutral">{challengeMeta[preset.type].label}</Badge>
            <h3>{preset.title}</h3>
            <p>{preset.description}</p>
            <small>{preset.note}</small>
            <Button variant="secondary" onClick={() => openChallengeForm(preset)}>Elegir este reto</Button>
          </Card>)}
        </div>
      </section>

      <section aria-labelledby="active-challenges-title">
        <div className="card-heading">
          <div><p className="eyebrow">Tu experiencia</p><h2 id="active-challenges-title">Retos activos</h2></div>
          {activeChallenges.length > 0 && <Badge tone="sage">{activeChallenges.length} en curso</Badge>}
        </div>
        {activeChallenges.length === 0 ? <Card><EmptyState title="Todavía no elegiste un reto" text="Puedes usar una idea como base o crear una experiencia completamente tuya." action={<Button variant="secondary" onClick={() => openChallengeForm()}>Crear mi primer reto</Button>} /></Card> : <div className="active-challenges">
          {activeChallenges.map((challenge) => <ActiveChallengeCard key={challenge.id} challenge={challenge} today={today} planner={planner} />)}
        </div>}
      </section>

      {completedChallenges.length > 0 && <section aria-labelledby="completed-challenges-title">
        <div className="card-heading"><div><p className="eyebrow">Lo que ya exploraste</p><h2 id="completed-challenges-title">Retos cerrados</h2></div></div>
        <div className="completed-challenges">
          {completedChallenges.map((challenge) => <Card key={challenge.id} className="completed-challenge-card"><span><ChallengeIcon type={challenge.type} size={18} /></span><div><h3>{challenge.title}</h3><p>{challenge.completedDates.length} días registrados</p></div><Button size="sm" variant="ghost" onClick={() => planner.updateChallengeStatus(challenge.id, "active")}><RotateCcw size={15} /> Retomar</Button></Card>)}
        </div>
      </section>}

      <Modal open={dialogOpen} title="Crear un reto" description="Define una intención y un periodo que se sientan posibles para ti." onClose={() => setDialogOpen(false)}>
        <form className="challenge-form" onSubmit={submit} noValidate>
          <label className="form-field"><span>Nombre del reto</span><input {...form.register("title")} placeholder="Ej. Hablar en público una vez" />{form.formState.errors.title && <small role="alert">Escribe un nombre para tu reto.</small>}</label>
          <label className="form-field"><span>Tipo</span><select {...form.register("type")}><option value="fear">Salir de mi zona conocida</option><option value="intermittent_fasting">Ayuno intermitente</option><option value="no_sugar">Sin azúcar añadida</option><option value="custom">Personalizado</option></select></label>
          <label className="form-field form-field--wide"><span>¿Para qué quieres probarlo?</span><textarea {...form.register("intention")} placeholder="Quiero descubrir si…" />{form.formState.errors.intention && <small role="alert">Cuenta brevemente qué quieres explorar.</small>}</label>
          <label className="form-field"><span>Fecha de inicio</span><input type="date" {...form.register("startDate")} />{form.formState.errors.startDate && <small role="alert">Elige una fecha de inicio.</small>}</label>
          <label className="form-field"><span>Fecha final <small>(opcional)</small></span><input type="date" {...form.register("endDate")} />{form.formState.errors.endDate && <small role="alert">{form.formState.errors.endDate.message}</small>}</label>
          {selectedType === "intermittent_fasting" && <p className="challenge-health-note">Esta herramienta solo registra tu decisión. No reemplaza una recomendación médica o nutricional.</p>}
          <div className="modal__actions form-field--wide"><Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Ahora no</Button><Button type="submit" loading={planner.saving}>Guardar reto</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function ActiveChallengeCard({ challenge, today, planner }: { challenge: Challenge; today: string; planner: PlannerController }) {
  const completedToday = challenge.completedDates.includes(today);
  const inRange = isDateKeyWithinRange(today, challenge.startDate, challenge.endDate);
  const plannedDays = challenge.endDate ? getInclusiveDateCount(challenge.startDate, challenge.endDate) : undefined;
  const progress = calculateChallengeProgress(challenge, plannedDays);

  return <Card className="active-challenge-card">
    <header><div className="challenge-card-title"><span><ChallengeIcon type={challenge.type} /></span><div><Badge tone="rose">{challengeMeta[challenge.type].label}</Badge><h3>{challenge.title}</h3></div></div><Button size="sm" variant="ghost" onClick={() => planner.updateChallengeStatus(challenge.id, "completed")}><Check size={15} /> Cerrar reto</Button></header>
    <p>{challenge.intention}</p>
    <div className="challenge-period"><span>Inicio: {formatDateKey(challenge.startDate)}</span>{challenge.endDate && <span>Final: {formatDateKey(challenge.endDate)}</span>}</div>
    {progress.percentage === undefined ? <div className="challenge-day-count"><strong>{progress.completed}</strong><span>{progress.completed === 1 ? "día registrado" : "días registrados"}</span></div> : <ProgressBar value={progress.percentage} label={`${progress.completed} de ${progress.planned} días registrados`} />}
    <p className="challenge-encouragement">{inRange ? challengeEncouragement(progress.completed, completedToday) : today < challenge.startDate ? "Este reto todavía no comienza. Puedes cambiar la fecha si quieres empezar antes." : "El periodo elegido terminó. Puedes cerrarlo o ajustar tu próximo reto."}</p>
    <Button variant={completedToday ? "outline" : "primary"} disabled={!inRange} onClick={() => planner.toggleChallengeDate(challenge.id, today)} aria-pressed={completedToday}>{completedToday ? <><RotateCcw size={16} /> Quitar registro de hoy</> : <><Check size={16} /> Registrar hoy</>}</Button>
  </Card>;
}


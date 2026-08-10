"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Coins, FileUp, Heart, Home, Leaf, Palette, Plane, Sparkles, Target } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { onboardingSchema, type OnboardingInput } from "@/src/lib/schemas";
import { Button } from "@/src/components/ui/Primitives";

const intentions = [
  ["Convertirme en mi mejor versión", "Crecimiento personal y bienestar", Sparkles],
  ["Lograr equilibrio y bienestar", "Salud, mente y emociones", Heart],
  ["Impulsar mi carrera o negocio", "Desarrollo profesional y financiero", BriefcaseBusiness],
  ["Explorar nuevas posibilidades", "Descubrimiento y transformación", Leaf],
] as const;

const areas = [
  ["Salud y bienestar", Heart], ["Carrera", BriefcaseBusiness], ["Finanzas", Coins], ["Relaciones", Heart],
  ["Hogar", Home], ["Crecimiento", Leaf], ["Proyectos creativos", Palette], ["Experiencias", Plane],
] as const;

export function Onboarding({ planner }: { planner: PlannerController }) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [selectedIntention, setSelectedIntention] = useState<string>(intentions[0][0]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(["Salud y bienestar", "Carrera", "Crecimiento"]);
  const [priorities, setPriorities] = useState(["", "", ""]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const form = useForm<OnboardingInput>({ resolver: zodResolver(onboardingSchema), defaultValues: { name: "", intention: intentions[0][0], weekStartsOn: 1 } });
  const weekStartsOn = useWatch({ control: form.control, name: "weekStartsOn" });

  const chooseIntention = (value: string) => {
    setSelectedIntention(value);
    form.setValue("intention", value, { shouldValidate: true });
  };
  const complete = form.handleSubmit((values) => planner.completeOnboarding({ ...values, selectedAreaNames: selectedAreas, priorities }));
  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try { await planner.importBackup(file); } catch { setImportError("Este archivo no parece ser un respaldo válido de My Best Version Planner."); }
  };

  if (stage === 0) {
    return <main className="splash-page">
      <div className="splash-orb splash-orb--one" /><div className="splash-orb splash-orb--two" />
      <section className="splash-content">
        <div className="mbv-monogram">M<span>B</span><em>V</em><i>❧</i></div>
        <h1>My Best<br />Version <em>Planner</em></h1>
        <div className="splash-divider"><span /><Heart size={17} /><span /></div>
        <p>Diseña la vida que<br /><em>quieres vivir</em></p>
        <div className="splash-illustration"><Leaf size={84} strokeWidth={1} /><span className="splash-notebook">MBV</span></div>
        <Button onClick={() => setStage(1)}>Comenzar <ArrowRight size={18} /></Button>
        <input ref={fileRef} className="sr-only" type="file" accept="application/json" onChange={(event) => importBackup(event.target.files?.[0])} />
        <button className="splash-import" onClick={() => fileRef.current?.click()}><FileUp size={14} /> Ya tengo un respaldo</button>
        {importError && <p className="form-error" role="alert">{importError}</p>}
        <small>Al continuar, aceptas nuestros <u>Términos y Privacidad</u>.</small>
      </section>
    </main>;
  }

  return <main className="onboarding-page onboarding-page--reference">
    <header className="onboarding-header"><button className="onboarding-back" onClick={() => setStage((stage - 1) as 0 | 1 | 2 | 3)} aria-label="Volver"><ArrowLeft size={20} /></button><span>Paso {stage} de 3</span></header>
    <div className="onboarding-progress"><span style={{ width: `${stage / 3 * 100}%` }} /></div>
    <section className="onboarding-panel onboarding-panel--reference">
      {stage === 1 && <>
        <span className="onboarding-symbol"><Heart size={24} /></span>
        <h1>¿Qué quieres construir <em>en esta etapa?</em></h1>
        <p>Define tu intención principal para que podamos acompañarte mejor.</p>
        <div className="intention-options">{intentions.map(([title, description, Icon]) => <button key={title} className={selectedIntention === title ? "is-selected" : ""} onClick={() => chooseIntention(title)}><span className="radio-dot">{selectedIntention === title && <i />}</span><span className="intention-option__icon"><Icon size={22} /></span><span><strong>{title}</strong><small>{description}</small></span></button>)}</div>
        <blockquote>“No se trata de tenerlo todo claro, sino de dar el siguiente paso.”</blockquote>
        <Button className="onboarding-primary" onClick={() => setStage(2)}>Continuar</Button>
      </>}
      {stage === 2 && <>
        <h1>¿En qué áreas quieres <em>enfocarte?</em></h1><p>Selecciona las áreas importantes para ti en este momento.</p>
        <div className="area-grid-reference">{areas.map(([name, Icon]) => { const selected = selectedAreas.includes(name); return <button key={name} className={selected ? "is-selected" : ""} onClick={() => setSelectedAreas(selected ? selectedAreas.filter((item) => item !== name) : [...selectedAreas, name])} aria-pressed={selected}><span className="area-check">{selected && <Check size={14} />}</span><Icon size={34} strokeWidth={1.35} /><strong>{name}</strong></button>; })}</div>
        <Button className="onboarding-primary" disabled={!selectedAreas.length} onClick={() => setStage(3)}>Continuar</Button><small className="onboarding-hint">Podrás ajustar tus áreas más adelante.</small>
      </>}
      {stage === 3 && <form onSubmit={complete}>
        <h1>Personaliza tu planner <em>para ti</em></h1><p>Cuéntanos algunos detalles para crear tu experiencia personalizada.</p>
        <label className="form-field"><span>¿Cómo te llamas?</span><input placeholder="Tu nombre" {...form.register("name")} />{form.formState.errors.name && <small className="form-error">{form.formState.errors.name.message}</small>}</label>
        <fieldset className="form-field"><legend>¿Cuál es tu primer día de la semana?</legend><div className="weekday-start"><button type="button" className={weekStartsOn === 1 ? "is-selected" : ""} onClick={() => form.setValue("weekStartsOn", 1)}>LUN</button>{["MAR","MIÉ","JUE","VIE","SÁB"].map((day) => <span key={day}>{day}</span>)}<button type="button" className={weekStartsOn === 0 ? "is-selected" : ""} onClick={() => form.setValue("weekStartsOn", 0)}>DOM</button></div></fieldset>
        <fieldset className="form-field"><legend>¿Cuáles son tus 3 prioridades principales?</legend><div className="priority-inputs">{priorities.map((priority, index) => <label key={index}><span>{index + 1}</span><Target size={18} /><input value={priority} onChange={(event) => setPriorities(priorities.map((item, i) => i === index ? event.target.value : item))} placeholder={["Mi salud física y mental", "Hacer crecer mi carrera", "Tener tiempo de calidad"][index]} /></label>)}</div></fieldset>
        <Button type="submit" className="onboarding-primary">Crear mi planner</Button><small className="onboarding-hint">Último paso, ¡ya casi está!</small>
      </form>}
    </section>
  </main>;
}

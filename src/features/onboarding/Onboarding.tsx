"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, FileUp, Heart, ListTodo, Repeat2, Sparkles, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { onboardingOutcomeSchema, onboardingSchema } from "@/src/lib/schemas";
import { Button, Card } from "@/src/components/ui/Primitives";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { analyticsService } from "@/src/services/analyticsService";
import { BRAND_PROMISE, BRAND_SLOGAN } from "@/src/lib/brand";

type OnboardingFocus = "today" | "goal" | "week" | "habit";

const focusOptions = [
  { id: "today", title: "Mi día", copy: "Elegir qué merece tu atención ahora.", Icon: ListTodo },
  { id: "goal", title: "Una meta", copy: "Convertir un resultado importante en una acción.", Icon: Target },
  { id: "week", title: "Mi semana", copy: "Dar dirección a los próximos días sin llenarlos.", Icon: CalendarDays },
  { id: "habit", title: "Un hábito", copy: "Empezar una práctica pequeña y repetible.", Icon: Repeat2 },
] satisfies Array<{ id: OnboardingFocus; title: string; copy: string; Icon: typeof ListTodo }>;

const resultCopy: Record<OnboardingFocus, { title: string; description: string; placeholder: string }> = {
  today: { title: "¿Qué te gustaría haber avanzado hoy?", description: "Describe un resultado pequeño que haría que el día se sintiera bien orientado.", placeholder: "Ej. Dejar lista la propuesta" },
  goal: { title: "¿Qué resultado quieres conseguir?", description: "Nombra el destino. Después elegiremos solamente el primer paso.", placeholder: "Ej. Completar mi primera carrera de 10K" },
  week: { title: "¿Qué te gustaría haber avanzado esta semana?", description: "Elige un resultado concreto y posible para estos días.", placeholder: "Ej. Preparar el primer borrador" },
  habit: { title: "¿Qué hábito quieres empezar?", description: "Empieza con algo sencillo. Podrás personalizar días y seguimiento después.", placeholder: "Ej. Caminar después del almuerzo" },
};

export function Onboarding({ planner, onCompleted, defaultName }: { planner: PlannerController; onCompleted(): Promise<void>; defaultName: string }) {
  const navigate = useNavigate();
  const [stage, setStage] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [focus, setFocus] = useState<OnboardingFocus>("today");
  const [result, setResult] = useState("");
  const [action, setAction] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const restored = await planner.importBackup(file);
      if (restored.profile?.onboardingCompleted) await onCompleted();
    } catch {
      setImportError("Este archivo no parece ser un respaldo válido de My Best Version.");
    }
  };

  const continueFromResult = () => {
    const parsed = onboardingOutcomeSchema.shape.result.safeParse(result);
    if (!parsed.success) return setFormError(parsed.error.issues[0]?.message ?? "Escribe un resultado concreto.");
    setFormError(null);
    setStage(3);
  };

  const continueFromAction = () => {
    const parsed = onboardingOutcomeSchema.safeParse({ focus, result, action });
    if (!parsed.success) return setFormError(parsed.error.issues[0]?.message ?? "Escribe una primera acción.");
    setFormError(null);
    setStage(4);
  };

  const complete = async () => {
    const outcome = onboardingOutcomeSchema.safeParse({ focus, result, action });
    const profile = onboardingSchema.safeParse({ name: defaultName || "Mi espacio", intention: result, usePurpose: result, weekStartsOn: 1 });
    if (!outcome.success) {
      setFormError(outcome.error.issues[0]?.message ?? "Revisa tu primera acción.");
      return;
    }
    if (!profile.success) {
      setFormError(profile.error.issues[0]?.message ?? "No pudimos preparar tu espacio.");
      return;
    }
    setSaving(true);
    try {
      await planner.completeOnboarding({ ...profile.data, selectedAreaNames: [], priorities: [], ...outcome.data });
      await onCompleted();
      navigate("/app/today", { replace: true });
    } catch {
      setSaving(false);
      setFormError("No pudimos crear tu primera acción. Inténtalo nuevamente.");
    }
  };

  if (stage === 0) {
    return <main className="splash-page">
      <div className="splash-orb splash-orb--one" /><div className="splash-orb splash-orb--two" />
      <section className="splash-content">
        <BrandMark />
        <p className="eyebrow">MY BEST VERSION</p>
        <h1>{BRAND_SLOGAN}</h1>
        <div className="splash-divider"><span /><Heart size={17} /><span /></div>
        <p>{BRAND_PROMISE}</p>
        <div className="splash-illustration splash-logo-illustration" aria-label="Logo oficial de My Best Version"><BrandMark iconOnly /></div>
        <Button onClick={() => { analyticsService.track("onboarding_started", { source: "welcome" }, "onboarding-started"); setStage(1); }}>Crear mi primera acción <ArrowRight size={18} /></Button>
        <span className="signed-session"><Check size={14} /> Tus datos se guardan localmente en este dispositivo</span>
        <input ref={fileRef} className="sr-only" type="file" accept="application/json" onChange={(event) => importBackup(event.target.files?.[0])} />
        <button className="splash-import" onClick={() => fileRef.current?.click()}><FileUp size={14} /> Ya tengo un respaldo</button>
        {importError && <p className="form-error" role="alert">{importError}</p>}
      </section>
    </main>;
  }

  return <main className="onboarding-page onboarding-page--reference">
    <header className="onboarding-header">
      {stage < 4 ? <button className="onboarding-back" onClick={() => setStage((stage - 1) as 0 | 1 | 2 | 3)} aria-label="Volver"><ArrowLeft size={20} /></button> : <span />}
      <span>Paso {stage} de 4</span>
    </header>
    <div className="onboarding-progress"><span style={{ width: `${stage / 4 * 100}%` }} /></div>
    <section className="onboarding-panel onboarding-panel--reference">
      {stage === 1 && <><span className="onboarding-symbol"><Sparkles size={24} /></span><h1>¿Qué te gustaría <em>organizar primero?</em></h1><p>Elige un punto de partida. Las demás herramientas seguirán disponibles cuando las necesites.</p><div className="onboarding-focus-grid" role="radiogroup" aria-label="Qué organizar primero">{focusOptions.map(({ id, title, copy, Icon }) => <button type="button" role="radio" aria-checked={focus === id} className={focus === id ? "is-selected" : ""} onClick={() => setFocus(id)} key={id}><span className="area-check">{focus === id && <Check size={14} />}</span><Icon size={24} /><strong>{title}</strong><small>{copy}</small></button>)}</div><Button className="onboarding-primary" onClick={() => setStage(2)}>Continuar</Button></>}

      {stage === 2 && <><span className="onboarding-symbol"><Target size={24} /></span><h1>{resultCopy[focus].title}</h1><p>{resultCopy[focus].description}</p><label className="form-field onboarding-wide-field"><span>Resultado</span><input value={result} onChange={(event) => setResult(event.target.value)} placeholder={resultCopy[focus].placeholder} /></label>{formError && <p className="form-error" role="alert">{formError}</p>}<Button className="onboarding-primary" onClick={continueFromResult}>Continuar</Button></>}

      {stage === 3 && <><span className="onboarding-symbol"><ListTodo size={24} /></span><h1>¿Cuál es la <em>primera acción?</em></h1><p>Elige un paso visible y pequeño. Lo pondremos en Mi día como tu prioridad principal.</p><Card className="onboarding-result-context"><small>RESULTADO</small><strong>{result}</strong></Card><label className="form-field onboarding-wide-field"><span>Primera acción</span><input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Ej. Abrir el documento y escribir el esquema" /></label>{formError && <p className="form-error" role="alert">{formError}</p>}<Button className="onboarding-primary" onClick={continueFromAction}>Continuar</Button></>}

      {stage === 4 && <><span className="onboarding-symbol"><Check size={24} /></span><h1>Todo listo. <em>Ya tienes una acción concreta para empezar.</em></h1><p>No necesitas configurar nada más. Tu resultado y su primera acción quedarán conectados.</p><Card className="onboarding-action-preview"><small>PRIMERA ACCIÓN · MI DÍA</small><strong>{action}</strong><span>{result}</span></Card>{formError && <p className="form-error" role="alert">{formError}</p>}<Button className="onboarding-primary" loading={saving} onClick={complete}>Ver mi primera acción <ArrowRight size={18} /></Button></>}
    </section>
  </main>;
}

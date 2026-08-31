"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Coins,
  FileUp,
  Heart,
  Home,
  Leaf,
  Palette,
  Plane,
  Sparkles,
} from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { onboardingSchema } from "@/src/lib/schemas";
import { Button } from "@/src/components/ui/Primitives";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { analyticsService } from "@/src/services/analyticsService";
import { useNavigate } from "react-router-dom";
import { BRAND_PROMISE, BRAND_SLOGAN } from "@/src/lib/brand";

const areas = [
  ["Salud y bienestar", Heart],
  ["Carrera / profesional", BriefcaseBusiness],
  ["Finanzas", Coins],
  ["Relaciones", Heart],
  ["Hogar", Home],
  ["Crecimiento personal", Leaf],
  ["Espiritual", Sparkles],
  ["Proyectos creativos", Palette],
  ["Experiencias", Plane],
  ["Otro", Leaf],
] as const;

export function Onboarding({ planner }: { planner: PlannerController }) {
  const navigate = useNavigate();
  const [stage, setStage] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [startPath, setStartPath] = useState("/app/planning");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [difference, setDifference] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleArea = (area: string) => {
    setFormError(null);
    setSelectedAreas((current) => current.includes(area)
      ? current.filter((item) => item !== area)
      : current.length < 3
        ? [...current, area]
        : current);
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      await planner.importBackup(file);
    } catch {
      setImportError("Este archivo no parece ser un respaldo válido de My Best Version.");
    }
  };

  const complete = async () => {
    const parsed = onboardingSchema.safeParse({
      name,
      intention: difference,
      usePurpose: difference,
      weekStartsOn: 1,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Revisa este paso antes de continuar.");
      return;
    }
    await planner.completeOnboarding({ ...parsed.data, selectedAreaNames: selectedAreas, priorities: [] });
    navigate(startPath, { replace: true });
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
        <Button onClick={() => { analyticsService.track("onboarding_started", { source: "welcome" }, "onboarding-started"); setStage(1); }}>Crear mi espacio <ArrowRight size={18} /></Button>
        <span className="signed-session"><Check size={14} /> Tus datos se guardan localmente en este dispositivo</span>
        <input ref={fileRef} className="sr-only" type="file" accept="application/json" onChange={(event) => importBackup(event.target.files?.[0])} />
        <button className="splash-import" onClick={() => fileRef.current?.click()}><FileUp size={14} /> Ya tengo un respaldo</button>
        {importError && <p className="form-error" role="alert">{importError}</p>}
      </section>
    </main>;
  }

  return <main className="onboarding-page onboarding-page--reference">
    <header className="onboarding-header">
      <button className="onboarding-back" onClick={() => setStage((stage - 1) as 0 | 1 | 2 | 3 | 4)} aria-label="Volver"><ArrowLeft size={20} /></button>
      <span>Paso {stage} de 4</span>
    </header>
    <div className="onboarding-progress"><span style={{ width: `${stage / 4 * 100}%` }} /></div>
    <section className="onboarding-panel onboarding-panel--reference">
      {stage === 1 && <>
        <span className="onboarding-symbol"><Sparkles size={24} /></span>
        <h1>¿Cómo quieres <em>empezar?</em></h1>
        <p>Elige el horizonte que más te sirva hoy. Podrás usar los demás cuando quieras.</p>
        <div className="onboarding-start-grid" role="radiogroup" aria-label="Forma de empezar">
          {[
            ["/app/planning?view=year", "Diseñar mi mes", "Empieza por prioridades y acciones cercanas."],
            ["/app/planning", "Diseñar mi año", "Organiza los próximos meses con una dirección clara."],
            ["/app/vision", "Diseñar mi plan de vida", "Comienza por Dream Life y la rueda de vida con acompañamiento."],
          ].map(([path, title, copy]) => <button type="button" role="radio" aria-checked={startPath === path} className={startPath === path ? "is-selected" : ""} onClick={() => setStartPath(path)} key={path}><span className="area-check">{startPath === path && <Check size={14} />}</span><strong>{title}</strong><small>{copy}</small></button>)}
        </div>
        <Button className="onboarding-primary" onClick={() => setStage(2)}>Continuar</Button>
      </>}

      {stage === 2 && <>
        <span className="onboarding-symbol"><Sparkles size={24} /></span>
        <h1>¿Qué quieres mejorar <em>primero?</em></h1>
        <p>Elige hasta tres áreas. No estás decidiendo toda tu vida, solo dónde quieres empezar.</p>
        <div className="area-grid-reference" role="group" aria-label="Áreas para comenzar">
          {areas.map(([area, Icon]) => {
            const selected = selectedAreas.includes(area);
            return <button key={area} type="button" className={selected ? "is-selected" : ""} onClick={() => toggleArea(area)} aria-pressed={selected}>
              <span className="area-check">{selected && <Check size={14} />}</span><Icon size={34} strokeWidth={1.35} /><strong>{area}</strong>
            </button>;
          })}
        </div>
        <small className="onboarding-hint">{selectedAreas.length}/3 seleccionadas</small>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <Button className="onboarding-primary" disabled={!selectedAreas.length} onClick={() => { setFormError(null); setStage(3); }}>Continuar</Button>
      </>}

      {stage === 3 && <>
        <span className="onboarding-symbol"><Heart size={24} /></span>
        <h1>¿Qué te gustaría que fuera <em>diferente?</em></h1>
        <p>Una frase es suficiente. La usaremos como dirección, nunca como una tarea automática.</p>
        <label className="form-field onboarding-wide-field">
          <span>Quiero que sea diferente…</span>
          <textarea rows={6} value={difference} onChange={(event) => setDifference(event.target.value)} placeholder="Ej. Quiero sentir que mi semana tiene espacio para mi salud y mi proyecto personal." />
        </label>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <Button className="onboarding-primary" onClick={() => {
          if (difference.trim().length < 4) return setFormError("Escribe una frase breve para darte una primera dirección.");
          setFormError(null); setStage(4);
        }}>Continuar</Button>
      </>}

      {stage === 4 && <>
        <span className="onboarding-symbol"><Leaf size={24} /></span>
        <h1>¿Cómo quieres que <em>te llamemos?</em></h1>
        <p>Eso es todo por ahora. El inicio de semana y otras preferencias estarán en Ajustes.</p>
        <label className="form-field onboarding-wide-field"><span>Tu nombre</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. María" /></label>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <Button className="onboarding-primary" onClick={complete}>Crear mi espacio</Button>
        <small className="onboarding-hint">No necesitas configurarlo todo para comenzar.</small>
      </>}
    </section>
  </main>;
}

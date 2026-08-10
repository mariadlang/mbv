"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight, Check, FileUp, Heart, Sparkles, Target } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { onboardingSchema, type OnboardingInput } from "@/src/lib/schemas";
import { Button, Card } from "@/src/components/ui/Primitives";

const areas = [
  "Salud y bienestar",
  "Carrera",
  "Finanzas",
  "Relaciones",
  "Hogar",
  "Crecimiento",
  "Proyectos creativos",
  "Experiencias",
];

export function Onboarding({ planner }: { planner: PlannerController }) {
  const [stage, setStage] = useState<"welcome" | "profile" | "areas">("welcome");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([
    "Salud y bienestar",
    "Crecimiento",
    "Proyectos creativos",
  ]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      intention: "",
      weekStartsOn: 1,
    },
  });

  const next = async () => {
    if (await form.trigger()) setStage("areas");
  };

  const complete = form.handleSubmit((values) =>
    planner.completeOnboarding({ ...values, selectedAreaNames: selectedAreas }),
  );

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      await planner.importBackup(file);
    } catch {
      setImportError("Este archivo no parece ser un respaldo válido de My Best Version Planner.");
    }
  };

  if (stage === "welcome") {
    return (
      <main className="welcome-page">
        <div className="welcome-orb welcome-orb--top" />
        <div className="welcome-orb welcome-orb--bottom" />
        <section className="welcome-copy">
          <p className="wordmark">My Best Version</p>
          <div className="welcome-lockup">
            <span>My Best</span>
            <span>Version</span>
            <em>Planner</em>
          </div>
          <h1>Diseña la vida<br />que quieres vivir.</h1>
          <p>Conecta tus metas con hábitos y acciones que sí caben en tu vida. Con claridad, flexibilidad y sin culpa.</p>
          <div className="welcome-actions">
            <Button onClick={() => setStage("profile")}>Crear mi planner <ArrowRight size={18} /></Button>
            <input ref={fileRef} className="sr-only" type="file" accept="application/json" onChange={(event) => importBackup(event.target.files?.[0])} />
            <Button variant="ghost" onClick={() => fileRef.current?.click()}><FileUp size={17} /> Importar respaldo</Button>
          </div>
          {importError && <p className="form-error" role="alert">{importError}</p>}
          <small><span className="local-note__dot" /> Tus datos permanecen en este dispositivo.</small>
        </section>

        <section className="welcome-preview" aria-label="Vista previa de My Best Version Planner">
          <Card className="preview-card preview-card--intention">
            <span className="eyebrow">Mi intención de hoy</span>
            <h2>Avanzar con calma y claridad.</h2>
          </Card>
          <Card className="preview-card preview-card--habit">
            <div><span className="preview-icon"><Heart size={18} /></span><div><strong>Entrenamiento</strong><small>3 veces esta semana</small></div></div>
            <span className="preview-check"><Check size={16} /></span>
          </Card>
          <Card className="preview-card preview-card--goal">
            <span className="eyebrow">Meta prioritaria</span>
            <div><Target size={20} /><h3>Completar 21K</h3><strong>68%</strong></div>
            <span className="preview-progress"><i /></span>
          </Card>
          <blockquote>“Estructura suficiente para avanzar, espacio suficiente para vivir.”</blockquote>
          <Sparkles className="preview-spark" size={24} />
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <span className="wordmark">My Best Version</span>
        <span>Paso {stage === "profile" ? "1" : "2"} de 2</span>
      </header>
      <div className="onboarding-progress"><span style={{ width: stage === "profile" ? "50%" : "100%" }} /></div>
      <section className="onboarding-panel">
        {stage === "profile" ? (
          <>
            <p className="eyebrow">Empecemos por lo esencial</p>
            <h1>¿Qué quieres transformar ahora?</h1>
            <p>No tienes que configurar todo hoy. Solo crear contexto suficiente para elegir mejor.</p>
            <div className="form-grid onboarding-form">
              <label className="form-field form-field--full"><span>¿Cómo quieres que te llamemos?</span><input placeholder="Tu nombre" {...form.register("name")} />{form.formState.errors.name && <small className="form-error">{form.formState.errors.name.message}</small>}</label>
              <label className="form-field form-field--full"><span>Tu intención inicial</span><textarea rows={4} placeholder="Ej. Crear una semana posible y propia." {...form.register("intention")} />{form.formState.errors.intention && <small className="form-error">{form.formState.errors.intention.message}</small>}</label>
              <fieldset className="form-field form-field--full"><legend>Mi semana comienza</legend><div className="radio-cards"><label><input type="radio" value={1} {...form.register("weekStartsOn", { valueAsNumber: true })} /> <span>Lunes</span></label><label><input type="radio" value={0} {...form.register("weekStartsOn", { valueAsNumber: true })} /> <span>Domingo</span></label></div></fieldset>
            </div>
            <div className="onboarding-actions"><Button variant="ghost" onClick={() => setStage("welcome")}><ArrowLeft size={17} /> Atrás</Button><Button onClick={next}>Elegir mis áreas <ArrowRight size={17} /></Button></div>
          </>
        ) : (
          <>
            <p className="eyebrow">Tu vida completa</p>
            <h1>Elige las áreas que importan.</h1>
            <p>Selecciona al menos una. Podrás cambiarlo más adelante sin perder tu historia.</p>
            <div className="area-picker">
              {areas.map((area) => {
                const selected = selectedAreas.includes(area);
                return <button key={area} className={selected ? "is-selected" : ""} onClick={() => setSelectedAreas(selected ? selectedAreas.filter((item) => item !== area) : [...selectedAreas, area])} aria-pressed={selected}><span>{selected && <Check size={15} />}</span>{area}</button>;
              })}
            </div>
            <div className="onboarding-actions"><Button variant="ghost" onClick={() => setStage("profile")}><ArrowLeft size={17} /> Atrás</Button><Button disabled={selectedAreas.length === 0} onClick={complete}>Abrir mi planner <ArrowRight size={17} /></Button></div>
          </>
        )}
      </section>
      <p className="onboarding-quote">Progreso amable. Un paso a la vez.</p>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/src/components/ui/Primitives";
import { useI18n } from "@/src/i18n/I18nProvider";

interface GuidedTutorialProps {
  completed: boolean;
  loading: boolean;
  replayNonce: number;
  onComplete(): Promise<void> | void;
}

export function GuidedTutorial({ completed, loading, replayNonce, onComplete }: GuidedTutorialProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [manualOpen, setManualOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState<DOMRect | null>(null);
  const seenReplay = useRef(replayNonce);
  const cardRef = useRef<HTMLElement>(null);
  const steps = useMemo(() => [
    { title: "Bienvenida", text: "Este es tu espacio para organizar lo que quieres lograr y convertirlo en acciones que sí caben en tu vida.", path: "/app/dashboard", selector: ".story-dashboard__header" },
    { title: "Inicio", text: "Aquí encuentras un resumen de tus hábitos, tareas y avances. Es una forma rápida de entender cómo vas.", path: "/app/dashboard", selector: ".rhythm-section" },
    { title: "Hoy", text: "En esta sección organizas lo que necesitas hacer hoy y registras los hábitos que quieres construir.", path: "/app/today", selector: "#main-content h1" },
    { title: "Semana", text: "Planifica tu semana con una visión clara de tus prioridades, pendientes y compromisos.", path: "/app/planning/weekly", selector: "#main-content h1" },
    { title: "Metas", text: "Define tus objetivos y conviértelos en pasos concretos para cada mes y cada semana.", path: "/app/goals", selector: "#main-content h1" },
    { title: "Bienestar", text: "Organiza tus rutinas de ejercicio, tu alimentación y los hábitos que apoyan tu bienestar.", path: "/app/habits", selector: "#main-content h1" },
    { title: "Mi espacio", text: "Escribe ideas, registra cómo te sientes y guarda aquello que necesitas sacar de tu cabeza.", path: "/app/life-hub", selector: "#main-content h1" },
    { title: "Finanzas", text: "Lleva un seguimiento sencillo de tus gastos, ahorros y objetivos financieros.", path: "/app/finance", selector: "#main-content h1" },
    { title: "Progreso", text: "Revisa lo que has logrado y reconoce patrones que te ayudan a seguir avanzando.", path: "/app/progress", selector: "#main-content h1" },
    { title: "Configuración", text: "Desde aquí puedes cambiar el idioma, repetir este recorrido o cerrar tu sesión.", path: "/app/settings", selector: "#account-settings" },
  ], []);

  useEffect(() => {
    if (replayNonce === seenReplay.current) return;
    seenReplay.current = replayNonce;
    const timer = window.setTimeout(() => { setStep(0); setManualOpen(true); }, 0);
    return () => window.clearTimeout(timer);
  }, [replayNonce]);

  const mandatory = !loading && !completed;
  const manual = manualOpen && !mandatory;
  const open = mandatory || manualOpen;
  const final = step === steps.length;
  useEffect(() => {
    if (!open || final) return;
    const current = steps[step];
    if (location.pathname !== current.path) { navigate(current.path); return; }
    let cancelled = false;
    const locate = () => {
      if (cancelled) return;
      const element = document.querySelector<HTMLElement>(current.selector);
      if (!element) { setTarget(null); return; }
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => { if (!cancelled) setTarget(element.getBoundingClientRect()); }, 180);
    };
    const timer = window.setTimeout(locate, 120);
    const update = () => {
      const element = document.querySelector<HTMLElement>(current.selector);
      setTarget(element?.getBoundingClientRect() ?? null);
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { cancelled = true; window.clearTimeout(timer); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [final, location.pathname, navigate, open, step, steps]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const blockKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (manual) setManualOpen(false);
      }
      if (event.key !== "Tab" || !cardRef.current) return;
      const focusable = [...cardRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (!focusable.length) return;
      const index = focusable.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length]?.focus();
    };
    window.addEventListener("keydown", blockKeys, true);
    cardRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", blockKeys, true); };
  }, [manual, open, step]);

  if (!open) return null;
  const closeReplay = () => { if (manual) setManualOpen(false); };
  const finish = async () => {
    await onComplete();
    setManualOpen(false);
    navigate("/app/today", { replace: true });
  };
  return <div className="guided-tour" role="presentation" onMouseDown={(event) => { if (!cardRef.current?.contains(event.target as Node)) event.preventDefault(); }}>
    <div className="guided-tour__veil" />
    {!final && target && <div className="guided-tour__spotlight" style={{ left: Math.max(8, target.left - 8), top: Math.max(8, target.top - 8), width: Math.min(window.innerWidth - 16, target.width + 16), height: target.height + 16 }} />}
    <section ref={cardRef} className="guided-tour__card" role="dialog" aria-modal="true" aria-live="polite">
      {manual && <button className="guided-tour__close" type="button" onClick={closeReplay} aria-label={t("Salir del tutorial")}><X size={18} /></button>}
      {!final ? <>
        <p className="eyebrow">{t("Paso {step} de {total}", { step: step + 1, total: steps.length })}</p>
        <h2>{t(steps[step].title)}</h2><p>{t(steps[step].text)}</p>
        {!manual && step === 0 && <small>{t("Este recorrido es obligatorio la primera vez para que siempre sepas dónde empezar.")}</small>}
        <div className="guided-tour__progress" aria-hidden="true"><span style={{ width: `${(step + 1) / steps.length * 100}%` }} /></div>
        <Button onClick={() => setStep((value) => value + 1)}>{step === 0 ? t("Empezar") : t("Siguiente")} <ArrowRight size={16} /></Button>
      </> : <>
        <p className="eyebrow">My Best Version</p><h2>{t("Todo listo. No necesitas organizar tu vida completa hoy: empieza por lo que más te importa.")}</h2>
        <Button onClick={finish}>{t("Ir a mi día")} <ArrowRight size={16} /></Button>
      </>}
    </section>
  </div>;
}

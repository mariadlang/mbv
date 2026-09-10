"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, FileUp, Heart, ListTodo, Repeat2, Sparkles, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { onboardingOutcomeSchema, onboardingSchema } from "@/src/lib/schemas";
import { Button, Card } from "@/src/components/ui/Primitives";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { analyticsService } from "@/src/services/analyticsService";
import { CTA } from "@/src/lib/cta";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { MessageKey } from "@/src/i18n/keys";

type OnboardingFocus = "today" | "goal" | "week" | "habit";

const focusOptions = [
  { id: "today", title: "onboarding.focus.today.title", copy: "onboarding.focus.today.description", Icon: ListTodo },
  { id: "goal", title: "onboarding.focus.goal.title", copy: "onboarding.focus.goal.description", Icon: Target },
  { id: "week", title: "onboarding.focus.week.title", copy: "onboarding.focus.week.description", Icon: CalendarDays },
  { id: "habit", title: "onboarding.focus.habit.title", copy: "onboarding.focus.habit.description", Icon: Repeat2 },
] satisfies Array<{ id: OnboardingFocus; title: MessageKey; copy: MessageKey; Icon: typeof ListTodo }>;

const resultCopy: Record<OnboardingFocus, { title: MessageKey; description: MessageKey; placeholder: MessageKey }> = {
  today: { title: "onboarding.result.today.title", description: "onboarding.result.today.description", placeholder: "onboarding.result.today.placeholder" },
  goal: { title: "onboarding.result.goal.title", description: "onboarding.result.goal.description", placeholder: "onboarding.result.goal.placeholder" },
  week: { title: "onboarding.result.week.title", description: "onboarding.result.week.description", placeholder: "onboarding.result.week.placeholder" },
  habit: { title: "onboarding.result.habit.title", description: "onboarding.result.habit.description", placeholder: "onboarding.result.habit.placeholder" },
};

export function Onboarding({ planner, onCompleted, defaultName }: { planner: PlannerController; onCompleted(): Promise<void>; defaultName: string }) {
  const { m } = useI18n();
  const navigate = useNavigate();
  const [stage, setStage] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [focus, setFocus] = useState<OnboardingFocus>("today");
  const [result, setResult] = useState("");
  const [action, setAction] = useState("");
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const [importError, setImportError] = useState<MessageKey | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const restored = await planner.importBackup(file);
      if (restored.profile?.onboardingCompleted) await onCompleted();
    } catch {
      setImportError("onboarding.import.invalid");
    }
  };

  const continueFromResult = () => {
    const parsed = onboardingOutcomeSchema.shape.result.safeParse(result);
    if (!parsed.success) return setFormError("onboarding.result.error");
    setFormError(null);
    setStage(3);
  };

  const continueFromAction = () => {
    const parsed = onboardingOutcomeSchema.safeParse({ focus, result, action });
    if (!parsed.success) return setFormError("onboarding.action.error");
    setFormError(null);
    setStage(4);
  };

  const complete = async () => {
    const outcome = onboardingOutcomeSchema.safeParse({ focus, result, action });
    const profile = onboardingSchema.safeParse({ name: defaultName || m("onboarding.profile.fallbackName"), intention: result, usePurpose: result, weekStartsOn: 1 });
    if (!outcome.success) {
      setFormError("onboarding.action.error");
      return;
    }
    if (!profile.success) {
      setFormError("onboarding.profile.error");
      return;
    }
    setSaving(true);
    try {
      await planner.completeOnboarding({ ...profile.data, selectedAreaNames: [], priorities: [], ...outcome.data });
      analyticsService.track("first_outcome_created", { source: "onboarding", view: focus, version: 2 }, "onboarding-outcome:v2");
      analyticsService.track("first_action_created", { source: "onboarding", view: focus, result: "connected", version: 2 }, "first:v2");
      await onCompleted();
      navigate("/app/today", { replace: true });
    } catch {
      setSaving(false);
      setFormError("onboarding.complete.error");
    }
  };

  if (stage === 0) {
    return <main className="splash-page" data-i18n-explicit="true">
      <div className="splash-orb splash-orb--one" /><div className="splash-orb splash-orb--two" />
      <section className="splash-content">
        <BrandMark compact />
        <p className="eyebrow">MY BEST VERSION</p>
        <h1>{m("brand.slogan")}</h1>
        <div className="splash-divider"><span /><Heart size={17} /><span /></div>
        <p>{m("brand.promise")}</p>
        <div className="splash-illustration splash-logo-illustration" aria-label={m("onboarding.logo.label")}><BrandMark iconOnly /></div>
        <Button onClick={() => { analyticsService.track(CTA.firstAccess.event, { source: "welcome", version: 2 }, "onboarding-started:v2"); setStage(1); }}>{m("onboarding.start")} <ArrowRight size={18} /></Button>
        <span className="signed-session"><Check size={14} /> {m("onboarding.localData")}</span>
        <input ref={fileRef} className="sr-only" type="file" accept="application/json" onChange={(event) => importBackup(event.target.files?.[0])} />
        <button className="splash-import" onClick={() => fileRef.current?.click()}><FileUp size={14} /> {m("onboarding.importBackup")}</button>
        {importError && <p className="form-error" role="alert">{m(importError)}</p>}
      </section>
    </main>;
  }

  return <main className="onboarding-page onboarding-page--reference" data-i18n-explicit="true">
    <header className="onboarding-header">
      {stage < 4 ? <button className="onboarding-back" onClick={() => setStage((stage - 1) as 0 | 1 | 2 | 3)} aria-label={m("common.back")}><ArrowLeft size={20} /></button> : <span />}
      <span>{m("onboarding.progress", { step: stage, total: 4 })}</span>
    </header>
    <div className="onboarding-progress"><span style={{ width: `${stage / 4 * 100}%` }} /></div>
    <section className="onboarding-panel onboarding-panel--reference">
      {stage === 1 && <><span className="onboarding-symbol"><Sparkles size={24} /></span><h1><EmphasizedMessage message={m("onboarding.focus.title")} emphasis={m("onboarding.focus.emphasis")} /></h1><p>{m("onboarding.focus.description")}</p><div className="onboarding-focus-grid" role="radiogroup" aria-label={m("onboarding.focus.label")}>{focusOptions.map(({ id, title, copy, Icon }) => <button type="button" role="radio" aria-checked={focus === id} className={focus === id ? "is-selected" : ""} onClick={() => setFocus(id)} key={id}><span className="area-check">{focus === id && <Check size={14} />}</span><Icon size={24} /><strong>{m(title)}</strong><small>{m(copy)}</small></button>)}</div><Button className="onboarding-primary" onClick={() => { analyticsService.track("onboarding_focus_selected", { source: "onboarding", view: focus, version: 2 }, "focus-selected:v2"); setStage(2); }}>{m("common.continue")}</Button></>}

      {stage === 2 && <><span className="onboarding-symbol"><Target size={24} /></span><h1>{m(resultCopy[focus].title)}</h1><p>{m(resultCopy[focus].description)}</p><label className="form-field onboarding-wide-field"><span>{m("onboarding.result.label")}</span><input value={result} onChange={(event) => setResult(event.target.value)} placeholder={m(resultCopy[focus].placeholder)} /></label>{formError && <p className="form-error" role="alert">{m(formError)}</p>}<Button className="onboarding-primary" onClick={continueFromResult}>{m("common.continue")}</Button></>}

      {stage === 3 && <><span className="onboarding-symbol"><ListTodo size={24} /></span><h1><EmphasizedMessage message={m("onboarding.action.title")} emphasis={m("onboarding.action.emphasis")} /></h1><p>{m("onboarding.action.description")}</p><Card className="onboarding-result-context"><small>{m("onboarding.result.label").toUpperCase()}</small><strong data-no-translate="true">{result}</strong></Card><label className="form-field onboarding-wide-field"><span>{m("onboarding.action.label")}</span><input value={action} onChange={(event) => setAction(event.target.value)} placeholder={m("onboarding.action.placeholder")} /></label>{formError && <p className="form-error" role="alert">{m(formError)}</p>}<Button className="onboarding-primary" onClick={continueFromAction}>{m("common.continue")}</Button></>}

      {stage === 4 && <><span className="onboarding-symbol"><Check size={24} /></span><h1><EmphasizedMessage message={m("onboarding.ready.title")} emphasis={m("onboarding.ready.emphasis")} /></h1><p>{m("onboarding.ready.description")}</p><Card className="onboarding-action-preview"><small>{m("onboarding.ready.preview").toUpperCase()}</small><strong data-no-translate="true">{action}</strong><span data-no-translate="true">{result}</span></Card>{formError && <p className="form-error" role="alert">{m(formError)}</p>}<Button className="onboarding-primary" loading={saving} onClick={complete}>{m("onboarding.ready.cta")} <ArrowRight size={18} /></Button></>}
    </section>
  </main>;
}

function EmphasizedMessage({ message, emphasis }: { message: string; emphasis: string }) {
  const index = message.indexOf(emphasis);
  if (index < 0) return message;
  return <>{message.slice(0, index)}<em>{emphasis}</em>{message.slice(index + emphasis.length)}</>;
}

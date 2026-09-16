"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, CheckSquare, HeartPulse, Sparkles, Star, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Card } from "@/src/components/ui/Primitives";
import { useAccount } from "@/src/hooks/useAccount";
import { useCookieConsent } from "@/src/features/legal/CookieConsent";
import { useI18n } from "@/src/i18n/I18nProvider";
import { publicConfig } from "@/src/lib/publicConfig";
import { analyticsService } from "@/src/services/analyticsService";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { dismissReturnExperience, readReturnExperience, RETURN_EXPERIENCE_UPDATED_EVENT, type ReturnExperienceVisit } from "@/src/services/returnExperienceService";

const hiddenVisit: ReturnExperienceVisit = { visible: false, detectedAt: null, daysAway: null };

export function ReturnExperienceCard({ planner, onChoosePriority }: { planner: PlannerController; onChoosePriority(): void }) {
  const { m } = useI18n();
  const account = useAccount();
  const { preferences } = useCookieConsent();
  const accountId = account.user?.id ?? "";
  const enabled = publicConfig.productFeatureFlags.return_experience;
  const [visit, setVisit] = useState<ReturnExperienceVisit>(() => {
    if (!enabled || !accountId || typeof window === "undefined") return hiddenVisit;
    return readReturnExperience(accountId);
  });
  const [busyAction, setBusyAction] = useState<"move" | "release" | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [actionError, setActionError] = useState(false);
  const trackedView = useRef<string | null>(null);
  const pendingTask = useMemo(() => planner.snapshot.tasks
    .filter((task) => !["completed", "cancelled"].includes(task.status))
    .toSorted((a, b) => (a.date ?? "9999-99-99").localeCompare(b.date ?? "9999-99-99") || a.createdAt.localeCompare(b.createdAt))[0], [planner.snapshot.tasks]);

  useEffect(() => {
    if (!enabled || !accountId) return;
    let active = true;
    const updateVisit = (event: Event) => {
      const detail = (event as CustomEvent<ReturnExperienceVisit>).detail;
      setVisit(detail?.visible ? detail : readReturnExperience(accountId));
    };
    window.addEventListener(RETURN_EXPERIENCE_UPDATED_EVENT, updateVisit);
    queueMicrotask(() => {
      if (active) setVisit(readReturnExperience(accountId));
    });
    return () => {
      active = false;
      window.removeEventListener(RETURN_EXPERIENCE_UPDATED_EVENT, updateVisit);
    };
  }, [accountId, enabled]);

  useEffect(() => {
    if (!enabled || !preferences?.analytics || !visit.visible || !visit.detectedAt || trackedView.current === visit.detectedAt) return;
    trackedView.current = visit.detectedAt;
    analyticsService.track(
      "return_experience_viewed",
      { source: "dashboard", surface: "dashboard", ...(visit.daysAway === null ? {} : { days_away: visit.daysAway }), version: 2 },
      `viewed:${visit.detectedAt}:v2`,
    );
  }, [enabled, preferences?.analytics, visit]);

  if (!enabled || !accountId || !visit.visible || !visit.detectedAt) return null;

  const finish = (result: "pending" | "priority" | "minimum" | "move" | "release" | "dismiss") => {
    analyticsService.track(
      "return_experience_action_clicked",
      { source: "dashboard", surface: "dashboard", result, ...(visit.daysAway === null ? {} : { days_away: visit.daysAway }), version: 2 },
      `action:${visit.detectedAt}:${result}:v2`,
    );
    dismissReturnExperience(accountId);
    setVisit(hiddenVisit);
  };

  const runPendingAction = async (result: "move" | "release", operation: () => Promise<unknown>) => {
    setBusyAction(result);
    setActionError(false);
    try {
      await operation();
      finish(result);
    } catch {
      setActionError(true);
    } finally {
      setBusyAction(null);
    }
  };

  return <Card className="return-experience-card" role="region" aria-labelledby="return-experience-title">
    <span className="return-experience-card__icon" aria-hidden="true"><Sparkles size={22} /></span>
    <div className="return-experience-card__copy">
      <p className="eyebrow">{m("dashboard.return.eyebrow")}</p>
      <h2 id="return-experience-title">{m("dashboard.return.title")}</h2>
      <p>{m("dashboard.return.description")}</p>
      {pendingTask && <div className="return-experience-card__pending"><small>{m("dashboard.return.pendingCandidate")}</small><strong data-no-translate="true" translate="no">{pendingTask.title}</strong></div>}
      {actionError && <p className="return-experience-card__error" role="alert">{m("dashboard.return.actionError")}</p>}
    </div>
    <button type="button" className="return-experience-card__dismiss" onClick={() => finish("dismiss")} aria-label={m("dashboard.return.dismiss")}><X size={18} /></button>
    <div className="return-experience-card__actions">
      <Link className="button button--secondary" to="/app/tasks" onClick={() => finish("pending")}><CheckSquare size={16} /> {m("dashboard.return.pending")}</Link>
      <Button variant="secondary" onClick={() => { finish("priority"); onChoosePriority(); }}><Star size={16} /> {m("dashboard.return.priority")}</Button>
      {pendingTask && <Button variant="secondary" loading={busyAction === "move"} disabled={Boolean(busyAction)} onClick={() => void runPendingAction("move", () => planner.rescheduleTask(pendingTask.id, toLocalDateKey(new Date())))}><CalendarDays size={16} /> {m("dashboard.return.moveToday")}</Button>}
      {pendingTask && !confirmRelease && <Button variant="ghost" disabled={Boolean(busyAction)} onClick={() => setConfirmRelease(true)}>{m("dashboard.return.leaveBehind")}</Button>}
      <Link className="button button--ghost" to="/app/today?mode=minimum" onClick={() => finish("minimum")}><HeartPulse size={16} /> {m("dashboard.return.minimum")} <ArrowRight size={15} /></Link>
    </div>
    {pendingTask && confirmRelease && <div className="return-experience-card__confirm" role="group" aria-label={m("dashboard.return.leaveBehindConfirmAria", { title: pendingTask.title })}><p>{m("dashboard.return.leaveBehindConfirm")}</p><Button size="sm" variant="ghost" disabled={Boolean(busyAction)} onClick={() => setConfirmRelease(false)}>{m("dashboard.return.keepTask")}</Button><Button size="sm" variant="secondary" loading={busyAction === "release"} onClick={() => void runPendingAction("release", () => planner.cancelTask(pendingTask.id))}>{m("dashboard.return.confirmLeaveBehind")}</Button></div>}
  </Card>;
}

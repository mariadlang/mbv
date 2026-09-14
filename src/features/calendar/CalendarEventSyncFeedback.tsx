"use client";

import { Link } from "react-router-dom";
import type { PlannerEvent } from "@/src/domain/planner";
import { useCalendarIntegration } from "@/src/hooks/useCalendarIntegration";
import { useI18n } from "@/src/i18n/I18nProvider";

type VisibleSyncState = Exclude<PlannerEvent["syncState"], "local" | undefined>;

function stateMessage(state: VisibleSyncState) {
  if (state === "pending") return "calendar.state.pending" as const;
  if (state === "synced") return "calendar.state.synced" as const;
  if (state === "conflict") return "calendar.state.conflict" as const;
  if (state === "reconnect_required") return "calendar.state.reconnectRequired" as const;
  return "calendar.state.error" as const;
}

export function CalendarEventSyncFeedback({ event }: { event: Pick<PlannerEvent, "id" | "syncState"> }) {
  const { m } = useI18n();
  const calendar = useCalendarIntegration();
  const state = event.syncState;
  if (!state || state === "local") return null;
  const label = m(stateMessage(state));
  const className = `calendar-sync-badge calendar-sync-badge--${state}`;

  if (state === "conflict") return <Link className={`${className} calendar-sync-action`} to="/app/life-hub?tab=events">{label}</Link>;
  if (state === "reconnect_required" || calendar.snapshot.integration?.status === "reconnect_required") {
    return <Link className={`${className} calendar-sync-action`} to="/app/settings#integrations">{m("calendar.settings.reconnect")}</Link>;
  }
  if ((state === "pending" || state === "error") && calendar.connected) {
    return <button type="button" className={`${className} calendar-sync-action`} onClick={() => void calendar.syncNow()} disabled={calendar.syncing}>{label}</button>;
  }
  return <span className={className}>{label}</span>;
}

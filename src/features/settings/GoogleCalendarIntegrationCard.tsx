"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, ChevronDown, RefreshCw, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Card, LoadingState } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { useCalendarIntegration } from "@/src/hooks/useCalendarIntegration";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { CalendarMessageKey } from "@/src/i18n/messages/features/calendar";

const errorKeys: Record<string, CalendarMessageKey> = {
  CALENDAR_NOT_CONFIGURED: "calendar.error.notConfigured",
  RECONNECT_REQUIRED: "calendar.error.reconnect",
  GOOGLE_UNAUTHORIZED: "calendar.error.reconnect",
  RATE_LIMITED: "calendar.error.rateLimited",
  ETAG_CONFLICT: "calendar.error.etagConflict",
  CALENDAR_PENDING_CHANGES: "calendar.error.pendingChanges",
  CALENDAR_DATE_OUTSIDE_ACCESS: "calendar.error.dateOutsideAccess",
  CALENDAR_CONNECTION_CHANGED: "calendar.error.connectionChanged",
  GOOGLE_EVENT_ID_COLLISION: "calendar.error.eventIdCollision",
  CALENDAR_COMPLETION_IN_PROGRESS: "calendar.error.completionInProgress",
};

const callbackErrorKeys: Record<string, CalendarMessageKey> = {
  access_denied: "calendar.settings.connectionCancelled",
  missing_scope: "calendar.settings.connectionMissingScope",
  invalid_state: "calendar.settings.connectionExpired",
};

export function GoogleCalendarIntegrationCard() {
  const { m, formatDate } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const calendar = useCalendarIntegration();
  const completeConnection = calendar.completeConnection;
  const completionAttempt = useRef("");
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [defaultId, setDefaultId] = useState("");

  const callbackState = useMemo(() => new URLSearchParams(location.search).get("calendar"), [location.search]);
  const callbackReason = useMemo(() => new URLSearchParams(location.search).get("reason"), [location.search]);
  const configurationRequired = Boolean(calendar.snapshot.integration && calendar.snapshot.calendars.length && !calendar.snapshot.calendars.some((item) => item.isVisible));
  const selectedDefault = calendar.snapshot.calendars.find((item) => item.id === defaultId);
  const selectionValid = visibleIds.length > 0 && Boolean(selectedDefault?.isWritable && visibleIds.includes(defaultId));
  const errorMessage = calendar.error ? m(errorKeys[calendar.error] ?? "calendar.error.generic") : null;

  useEffect(() => {
    if (callbackState !== "pending" || completionAttempt.current === location.key) return;
    const timer = window.setTimeout(() => {
      completionAttempt.current = location.key;
      void completeConnection().then((completed) => {
        const params = new URLSearchParams(location.search);
        params.set("calendar", completed ? "connected" : "error");
        params.delete("calendar_token");
        params.delete("reason");
        navigate({ pathname: location.pathname, search: `?${params.toString()}`, hash: "#integrations" }, { replace: true });
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [callbackState, completeConnection, location.key, location.pathname, location.search, navigate]);

  if (calendar.loading) return <Card id="integrations" className="google-calendar-integration"><LoadingState label={m("calendar.settings.syncing")} /></Card>;

  return <>
    <Card id="integrations" className="google-calendar-integration" data-i18n-explicit="true">
      <header className="google-calendar-integration__header">
        <span className="google-calendar-integration__icon"><CalendarCheck size={22} aria-hidden="true" /></span>
        <div>
          <p className="eyebrow">{m("calendar.settings.eyebrow")}</p>
          <h2>{m("calendar.settings.title")}</h2>
          <p>{m("calendar.settings.description")}</p>
        </div>
        {calendar.snapshot.integration && <Badge tone={calendar.snapshot.integration.status === "connected" ? "sage" : "warm"}>{calendar.snapshot.integration.status === "connected" ? m("calendar.settings.connected") : m("calendar.settings.reconnect")}</Badge>}
      </header>

      {callbackState === "connected" && <Alert tone="success">{m("calendar.settings.connectionSuccess")}</Alert>}
      {callbackState === "pending" && <Alert tone="info">{m("calendar.settings.completing")}</Alert>}
      {callbackState === "error" && <Alert tone="danger">{m(callbackErrorKeys[callbackReason ?? ""] ?? "calendar.settings.connectionError")}</Alert>}
      {errorMessage && <Alert tone={calendar.error === "RECONNECT_REQUIRED" ? "warning" : "danger"}>{errorMessage}</Alert>}

      {!calendar.snapshot.integration ? <div className="google-calendar-integration__disconnected">
        <p><ShieldCheck size={16} aria-hidden="true" /> {m("calendar.settings.privacy")} <Link to="/privacy#google-calendar">{m("calendar.settings.privacyLink")}</Link></p>
        {!calendar.snapshot.configured && <small>{m("calendar.settings.unavailable")}</small>}
        <Button onClick={() => void calendar.connect()} loading={calendar.saving} disabled={!calendar.snapshot.configured}>{m(calendar.saving ? "calendar.settings.connecting" : "calendar.settings.connect")}</Button>
      </div> : <>
        <div className="google-calendar-integration__account">
          <div><strong data-no-translate="true" translate="no">{calendar.snapshot.integration.email}</strong><small>{calendar.snapshot.integration.lastSyncedAt ? m("calendar.settings.lastSync", { date: formatDate(calendar.snapshot.integration.lastSyncedAt, { dateStyle: "medium", timeStyle: "short" }) }) : m("calendar.settings.neverSynced")}</small></div>
          <div>
            {!configurationRequired && <Button variant="secondary" disabled={calendar.snapshot.integration.status === "reconnect_required"} onClick={() => { if (!configurationOpen) { setVisibleIds(calendar.snapshot.calendars.filter((item) => item.isVisible).map((item) => item.id)); setDefaultId(calendar.snapshot.calendars.find((item) => item.isDefault)?.id ?? ""); } setConfigurationOpen((value) => !value); }}>{configurationOpen ? m("calendar.settings.hideConfiguration") : m("calendar.settings.configure")} <ChevronDown size={16} aria-hidden="true" /></Button>}
            <Button variant="outline" onClick={() => void calendar.syncNow()} loading={calendar.syncing} disabled={configurationRequired || calendar.snapshot.integration.status === "reconnect_required"}><RefreshCw size={16} aria-hidden="true" /> {m("calendar.settings.sync")}</Button>
            <Button variant="ghost" onClick={() => setDisconnectOpen(true)}>{m("calendar.settings.disconnect")}</Button>
          </div>
        </div>
        {calendar.snapshot.integration.status === "reconnect_required" && <Alert tone="warning">{m("calendar.settings.reconnectNeeded")} <Button size="sm" variant="outline" onClick={() => void calendar.connect()}>{m("calendar.settings.reconnect")}</Button></Alert>}
        {calendar.snapshot.integration.status === "connected" && (configurationOpen || configurationRequired) && <form className="google-calendar-configuration" onSubmit={(event) => { event.preventDefault(); if (selectionValid) void calendar.configure({ visibleCalendarIds: visibleIds, defaultCalendarId: defaultId }); }}>
          <div><h3>{m("calendar.settings.calendars")}</h3><p>{m("calendar.settings.calendarsDescription")}</p></div>
          <div className="google-calendar-list">
            {calendar.snapshot.calendars.map((item) => <label key={item.id}>
              <input type="checkbox" checked={visibleIds.includes(item.id)} onChange={(event) => {
                const next = event.target.checked ? [...new Set([...visibleIds, item.id])] : visibleIds.filter((id) => id !== item.id);
                setVisibleIds(next);
                if (!next.includes(defaultId)) setDefaultId(calendar.snapshot.calendars.find((candidate) => next.includes(candidate.id) && candidate.isWritable)?.id ?? "");
              }} />
              <i style={item.color ? { backgroundColor: item.color } : undefined} />
              <span data-no-translate="true" translate="no">{item.name}</span>
              {!item.isWritable && <small>{m("calendar.settings.readOnly")}</small>}
              <span className="sr-only">{m("calendar.settings.visible", { calendar: item.name })}</span>
            </label>)}
          </div>
          <label className="form-field"><span>{m("calendar.settings.default")}</span><select value={defaultId} onChange={(event) => setDefaultId(event.target.value)}>{calendar.snapshot.calendars.filter((item) => item.isWritable && visibleIds.includes(item.id)).map((item) => <option key={item.id} value={item.id} data-no-translate="true">{item.name}</option>)}</select></label>
          {!selectionValid && <p className="form-error">{m("calendar.settings.selectOne")}</p>}
          <div className="form-actions"><Button type="submit" loading={calendar.saving} disabled={!selectionValid}>{m("calendar.settings.save")}</Button></div>
        </form>}
      </>}
    </Card>
    <Modal explicitI18n open={disconnectOpen} title={m("calendar.settings.disconnectTitle")} description={m("calendar.settings.disconnectDescription")} onClose={() => setDisconnectOpen(false)}>
      <div className="modal__actions"><Button variant="ghost" onClick={() => setDisconnectOpen(false)}>{m("common.cancel")}</Button><Button variant="danger" loading={calendar.saving} onClick={async () => { await calendar.disconnect(); setDisconnectOpen(false); }}>{m("calendar.settings.disconnectConfirm")}</Button></div>
    </Modal>
  </>;
}

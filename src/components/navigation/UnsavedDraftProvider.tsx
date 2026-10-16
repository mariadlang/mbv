"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useBlocker } from "react-router-dom";
import { Modal } from "@/src/components/ui/Modal";
import { useI18n } from "@/src/i18n/I18nProvider";

type Draft = { dirty: boolean; saving?: boolean; onSave: () => Promise<boolean>; onDiscard: () => void };
type Registration = { current: Draft; acknowledged: boolean };
type Navigation = { request: (action: () => void) => void; register: (id: string, draft: Registration) => () => void };
const directNavigation: Navigation = { request: (action) => action(), register: () => () => undefined };
const DraftContext = createContext<Navigation>(directNavigation);

/** One registry for explicit editor drafts; never stores user text or touches persistence. */
export function UnsavedDraftProvider({ children }: { children: ReactNode }) {
  const { m } = useI18n();
  const drafts = useRef(new Map<string, Registration>());
  const [pending, setPending] = useState<{ run: () => void; cancel?: () => void } | null>(null);
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const [error, setError] = useState(false);
  const changed = useCallback(() => [...drafts.current.values()].filter((draft) => !draft.acknowledged && (draft.current.dirty || draft.current.saving)), []);
  const blocker = useBlocker(useCallback(() => changed().length > 0, [changed]));
  useEffect(() => {
    if (blocker.state === "blocked") {
      // Router retains both location and history index until the user decides.
      // Synchronize the router's external blocked navigation with our accessible dialog.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPending({ run: blocker.proceed, cancel: blocker.reset });
      setError(false);
    }
  }, [blocker]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (changed().length) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [changed]);
  const request = useCallback((run: () => void) => {
    if (savingLock.current) return;
    if (!changed().length) { run(); return; }
    setError(false);
    setPending({ run });
  }, [changed]);
  const register = useCallback((id: string, draft: Registration) => {
    drafts.current.set(id, draft);
    return () => { drafts.current.delete(id); };
  }, []);
  const cancel = () => { if (savingLock.current) return; pending?.cancel?.(); setPending(null); setError(false); };
  const finish = async (save: boolean) => {
    if (!pending || savingLock.current) return;
    const records = changed();
    if (records.some((entry) => entry.current.saving)) { setError(true); return; }
    savingLock.current = true; setSaving(true); setError(false);
    try {
      for (const entry of records) {
        if (save && !await entry.current.onSave()) { setError(true); return; }
        if (!save) entry.current.onDiscard();
        entry.acknowledged = true;
      }
      const next = pending.run;
      setPending(null);
      next();
    } catch { setError(true); }
    finally { savingLock.current = false; setSaving(false); }
  };
  const context = useMemo(() => ({ request, register }), [request, register]);
  return <DraftContext.Provider value={context}>{children}
    <Modal open={Boolean(pending)} title={m("draft.title")} description={m("draft.description")} onClose={cancel} explicitI18n inertBackground layerClassName="draft-guard-layer">
      {error && <p role="alert">{m("draft.error")}</p>}
      <div className="modal__actions">
        <button type="button" className="button button--ghost" disabled={saving} onClick={cancel}>{m("draft.keep")}</button>
        <button type="button" className="button button--secondary" disabled={saving} onClick={() => void finish(false)}>{m("draft.discard")}</button>
        <button type="button" className="button" disabled={saving} onClick={() => void finish(true)}>{m(saving ? "draft.saving" : "draft.save")}</button>
      </div>
    </Modal>
  </DraftContext.Provider>;
}

export function useDraftNavigation() { return useContext(DraftContext); }

export function useUnsavedDraft(draft: Draft) {
  const navigation = useDraftNavigation();
  const id = useId();
  const registration = useRef<Registration>({ current: draft, acknowledged: false });
  useEffect(() => {
    registration.current.current = draft;
    registration.current.acknowledged = false;
  }, [draft]);
  useEffect(() => navigation.register(id, registration.current), [id, navigation]);
  const markSaved = useCallback(() => { registration.current.acknowledged = true; }, []);
  return { request: navigation.request, markSaved };
}

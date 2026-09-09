"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { UserAccess } from "@/src/domain/access";
import type { AccountPreferences, AccountUser, SignupLegalEvidence } from "@/src/repositories/interfaces/AuthRepository";
import { authService } from "@/src/services/authService";
import { useUiStore } from "@/src/stores/useUiStore";
import { clientProductEventNames, type ClientProductEventName } from "@/src/domain/productAnalytics";
import { supportService } from "@/src/services/supportService";
import { analyticsService, claimQueuedProductEvents, clearQueuedProductEvents, consumeAuthAnalyticsIntent, hasAnalyticsConsent, isPermanentAnalyticsFailure, readQueuedProductEvents, releaseAnalyticsAccount, removeQueuedProductEvent, resolveProductSession, startProductSessionHeartbeat, type ProductSessionHeartbeat, type QueuedProductEvent } from "@/src/services/analyticsService";
import { useCookieConsent } from "@/src/features/legal/CookieConsent";

interface AccountContextValue {
  configured: boolean;
  loading: boolean;
  user: AccountUser | null;
  access: UserAccess | null;
  preferences: AccountPreferences | null;
  preferencesLoading: boolean;
  error: string | null;
  refreshAccess(): Promise<void>;
  getAccessToken(): Promise<string | null>;
  signUp(input: { name: string; email: string; password: string } & SignupLegalEvidence): Promise<{ emailVerificationRequired: boolean }>;
  signIn(input: { email: string; password: string }): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signInWithMagicLink(email: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  acceptLegal(input: SignupLegalEvidence): Promise<void>;
  markOnboardingCompleted(): Promise<void>;
  signOut(): Promise<void>;
  updatePreferences(input: Partial<AccountPreferences>): Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { preferences: cookiePreferences } = useCookieConsent();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [preferences, setPreferences] = useState<AccountPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const analyticsUserIdRef = useRef<string | null>(null);
  const configured = authService.isConfigured();

  const loadForUser = useCallback(async (nextUser: AccountUser | null) => {
    if (analyticsUserIdRef.current && analyticsUserIdRef.current !== nextUser?.id) releaseAnalyticsAccount(analyticsUserIdRef.current);
    analyticsUserIdRef.current = nextUser?.id ?? null;
    setUser(nextUser);
    if (!nextUser || !nextUser.emailVerified) { setAccess(null); setPreferences(null); setPreferencesLoading(false); return; }
    setPreferencesLoading(true);
    try {
      setAccess(await authService.getOrStartAccess());
      try {
        const remotePreferences = await authService.getPreferences();
        setPreferences(remotePreferences);
        useUiStore.getState().setLanguage(remotePreferences.locale);
        useUiStore.getState().markTutorialCompleted(nextUser.id, remotePreferences.tutorialCompleted);
      } catch {
        const ui = useUiStore.getState();
        setPreferences({ locale: ui.language, tutorialCompleted: Boolean(ui.tutorialCompletedByUser[nextUser.id]) });
      }
      setError(null);
    } catch {
      setAccess(null);
      setError("No pudimos comprobar tu acceso. Inténtalo de nuevo en un momento.");
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    authService.getCurrentUser().then((nextUser) => { if (active) return loadForUser(nextUser); }).catch(() => {
      if (active) setError("No pudimos comprobar tu sesión.");
    }).finally(() => { if (active) setLoading(false); });
    const unsubscribe = authService.onAuthChange((nextUser) => { if (active) void loadForUser(nextUser); });
    return () => { active = false; unsubscribe(); };
  }, [loadForUser]);

  const markOnboardingCompleted = useCallback(async () => {
    setUser((current) => current ? { ...current, onboardingCompleted: true } : current);
    try {
      const updatedUser = await authService.markOnboardingCompleted();
      setUser((current) => current?.id === updatedUser.id ? updatedUser : current);
    } catch {
      // El perfil local sigue dando acceso; se volverá a intentar en una sesión posterior.
    }
  }, []);
  const getAccessToken = useCallback(() => authService.getAccessToken(), []);

  const value = useMemo<AccountContextValue>(() => ({
    configured, loading, user, access, preferences, preferencesLoading, error,
    refreshAccess: async () => loadForUser(user),
    getAccessToken,
    signUp: (input) => authService.signUp(input),
    signIn: (input) => authService.signIn(input),
    signInWithGoogle: () => authService.signInWithGoogle(),
    signInWithMagicLink: (email) => authService.signInWithMagicLink(email),
    requestPasswordReset: (email) => authService.requestPasswordReset(email),
    acceptLegal: async (input) => { const nextUser = await authService.acceptLegal(input); await loadForUser(nextUser); },
    markOnboardingCompleted,
    signOut: async () => { if (user) releaseAnalyticsAccount(user.id); await authService.signOut(); setUser(null); setAccess(null); setPreferences(null); },
    updatePreferences: async (input) => {
      const fallback = { locale: input.locale ?? preferences?.locale ?? useUiStore.getState().language, tutorialCompleted: input.tutorialCompleted ?? preferences?.tutorialCompleted ?? false };
      setPreferences(fallback);
      if (input.locale) useUiStore.getState().setLanguage(input.locale);
      if (user && input.tutorialCompleted !== undefined) useUiStore.getState().markTutorialCompleted(user.id, input.tutorialCompleted);
      if (!user) return;
      try { setPreferences(await authService.updatePreferences(input)); } catch { /* La preferencia local mantiene la experiencia disponible. */ }
    },
  }), [access, configured, error, getAccessToken, loadForUser, loading, markOnboardingCompleted, preferences, preferencesLoading, user]);
  return <AccountContext.Provider value={value}>{children}<ProductAnalyticsBridge userId={user?.id ?? null} emailVerifiedAt={user?.emailVerifiedAt ?? null} trialStartedAt={access?.trialStartedAt ?? null} analyticsEnabled={cookiePreferences ? cookiePreferences.analytics : null} getAccessToken={getAccessToken} /></AccountContext.Provider>;
}

export { resolveProductSession } from "@/src/services/analyticsService";

function ProductAnalyticsBridge({ userId, emailVerifiedAt, trialStartedAt, analyticsEnabled, getAccessToken }: { userId: string | null; emailVerifiedAt: string | null; trialStartedAt: string | null; analyticsEnabled: boolean | null; getAccessToken(): Promise<string | null> }) {
  const emittedSessionIds = useRef(new Set<string>());
  useEffect(() => {
    if (analyticsEnabled === false) {
      clearQueuedProductEvents();
      return;
    }
    if (!analyticsEnabled || !userId || typeof window === "undefined") return;
    claimQueuedProductEvents(userId);
    let sessionHeartbeat: ProductSessionHeartbeat | null = null;
    let flushing = false;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const abortController = new AbortController();
    const flush = async () => {
      if (flushing || !hasAnalyticsConsent() || abortController.signal.aborted) return;
      flushing = true;
      let retryNeeded = false;
      try {
        while (true) {
          if (!hasAnalyticsConsent() || abortController.signal.aborted) return;
          const batch = readQueuedProductEvents(userId);
          if (!batch.length) { retryAttempt = 0; return; }
          const token = await getAccessToken();
          if (!token || !hasAnalyticsConsent() || abortController.signal.aborted) return;
          for (const item of batch) {
            if (!hasAnalyticsConsent() || abortController.signal.aborted) return;
            try {
              await supportService.trackEvent(token, { eventName: item.event, feature: featureForEvent(item.event), sessionId: item.sessionId ?? sessionHeartbeat?.getSessionId() ?? resolveProductSession(), dedupeKey: item.dedupeKey, occurredAt: item.occurredAt, metadata: item.properties }, { signal: abortController.signal });
              removeQueuedProductEvent(item.id);
            } catch (error) {
              if (abortController.signal.aborted) return;
              if (isPermanentAnalyticsFailure(error)) {
                removeQueuedProductEvent(item.id);
                continue;
              }
              retryNeeded = true;
              return;
            }
          }
        }
      } finally {
        flushing = false;
        if (retryNeeded && hasAnalyticsConsent() && !abortController.signal.aborted) {
          const delay = Math.min(30_000, 1_000 * 2 ** retryAttempt);
          retryAttempt += 1;
          retryTimer = setTimeout(() => { void flush().catch(() => undefined); }, delay);
        }
      }
    };
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<QueuedProductEvent>).detail;
      if (!detail?.event || !clientProductEventNames.includes(detail.event)) return;
      sessionHeartbeat?.refresh();
      void flush().catch(() => undefined);
    };
    const retryOnline = () => { void flush().catch(() => undefined); };
    const emitSessionStarted = (sessionId: string) => {
      const accountSessionId = `${userId}:${sessionId}`;
      if (emittedSessionIds.current.has(accountSessionId)) return;
      emittedSessionIds.current.add(accountSessionId);
      analyticsService.track("app_session_started", { source: "authenticated_app", version: 2 }, "session:" + sessionId);
    };
    sessionHeartbeat = startProductSessionHeartbeat(emitSessionStarted);
    window.addEventListener("mbv:product-event", listener);
    window.addEventListener("online", retryOnline);
    void flush().catch(() => undefined);
    const authIntent = consumeAuthAnalyticsIntent();
    if (authIntent?.kind === "signup") analyticsService.track("signup_completed", { source: authIntent.source, version: 2 }, `callback:${authIntent.source}:v2`);
    if (authIntent?.kind === "login") analyticsService.track("login_succeeded", { source: authIntent.source, version: 2 }, `callback:${authIntent.source}:v2`);
    emitSessionStarted(sessionHeartbeat.getSessionId());
    analyticsService.track("email_verified", { source: "authenticated_access", version: 2 }, "verified:v2", emailVerifiedAt ?? undefined);
    if (trialStartedAt) analyticsService.track("trial_started", { source: "first_verified_access", version: 2 }, "started:v2", trialStartedAt);
    return () => {
      abortController.abort();
      sessionHeartbeat?.stop();
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener("mbv:product-event", listener);
      window.removeEventListener("online", retryOnline);
    };
  }, [analyticsEnabled, emailVerifiedAt, getAccessToken, trialStartedAt, userId]);
  return null;
}

function featureForEvent(event: ClientProductEventName) {
  const featureMap: Partial<Record<ClientProductEventName, string>> = {
    landing_primary_cta_clicked: "acquisition", signup_started: "account", signup_completed: "account", email_verified: "account", trial_started: "account", login_succeeded: "account",
    onboarding_started: "onboarding", onboarding_focus_selected: "onboarding", first_outcome_created: "onboarding", first_action_created: "actions", first_action_completed: "actions", first_habit_recorded: "habits", action_rescheduled: "actions",
    premium_gate_viewed: "premium", upgrade_opened: "premium", checkout_started: "checkout",
    goal_created:"goals", annual_plan_updated:"annual_planning", monthly_plan_updated:"monthly_planning", week_planned:"weekly_planning", task_created:"tasks", task_completed:"tasks", today_view_opened:"today", journal_entry_created:"journal", progress_review_created:"progress", routine_created:"routines", workout_completed:"fitness", meal_logged:"nutrition", settings_updated:"settings", suggestion_submitted:"support", bug_report_submitted:"support", support_request_submitted:"support", app_session_started:"account", sign_up_completed:"account",
  };
  return featureMap[event] ?? "onboarding";
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount debe usarse dentro de AccountProvider");
  return value;
}

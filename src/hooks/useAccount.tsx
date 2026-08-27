"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserAccess } from "@/src/domain/access";
import type { AccountPreferences, AccountUser, SignupLegalEvidence } from "@/src/repositories/interfaces/AuthRepository";
import { authService } from "@/src/services/authService";
import { useUiStore } from "@/src/stores/useUiStore";
import { productEventNames, type ProductEventName } from "@/src/domain/productAnalytics";
import { supportService } from "@/src/services/supportService";

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
  signOut(): Promise<void>;
  updatePreferences(input: Partial<AccountPreferences>): Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [preferences, setPreferences] = useState<AccountPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = authService.isConfigured();

  const loadForUser = useCallback(async (nextUser: AccountUser | null) => {
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

  const value = useMemo<AccountContextValue>(() => ({
    configured, loading, user, access, preferences, preferencesLoading, error,
    refreshAccess: async () => loadForUser(user),
    getAccessToken: () => authService.getAccessToken(),
    signUp: (input) => authService.signUp(input),
    signIn: (input) => authService.signIn(input),
    signInWithGoogle: () => authService.signInWithGoogle(),
    signInWithMagicLink: (email) => authService.signInWithMagicLink(email),
    requestPasswordReset: (email) => authService.requestPasswordReset(email),
    acceptLegal: async (input) => { const nextUser = await authService.acceptLegal(input); await loadForUser(nextUser); },
    signOut: async () => { await authService.signOut(); setUser(null); setAccess(null); setPreferences(null); },
    updatePreferences: async (input) => {
      const fallback = { locale: input.locale ?? preferences?.locale ?? useUiStore.getState().language, tutorialCompleted: input.tutorialCompleted ?? preferences?.tutorialCompleted ?? false };
      setPreferences(fallback);
      if (input.locale) useUiStore.getState().setLanguage(input.locale);
      if (user && input.tutorialCompleted !== undefined) useUiStore.getState().markTutorialCompleted(user.id, input.tutorialCompleted);
      if (!user) return;
      try { setPreferences(await authService.updatePreferences(input)); } catch { /* La preferencia local mantiene la experiencia disponible. */ }
    },
  }), [access, configured, error, loadForUser, loading, preferences, preferencesLoading, user]);
  return <AccountContext.Provider value={value}>{children}<ProductAnalyticsBridge userId={user?.id ?? null} getAccessToken={value.getAccessToken} /></AccountContext.Provider>;
}

function ProductAnalyticsBridge({ userId, getAccessToken }: { userId: string | null; getAccessToken(): Promise<string | null> }) {
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    const sessionKey = "mbv-product-session";
    const sessionId = window.sessionStorage.getItem(sessionKey) ?? crypto.randomUUID();
    window.sessionStorage.setItem(sessionKey, sessionId);
    const send = async (eventName: ProductEventName, feature: string, metadata: Record<string, unknown>, dedupeKey: string) => {
      const token = await getAccessToken(); if (!token) return;
      await supportService.trackEvent(token, { eventName, feature, sessionId, dedupeKey, metadata }).catch(() => undefined);
    };
    void send("app_session_started", "account", { source: "authenticated_app" }, `session:${sessionId}`);
    void send("sign_up_completed", "account", { source: "first_authenticated_session" }, `signup:${userId}`);
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ event?: string; properties?: Record<string, unknown>; dedupeKey?: string }>).detail;
      if (!detail?.event || !productEventNames.includes(detail.event as ProductEventName)) return;
      const feature = featureForEvent(detail.event as ProductEventName);
      void send(detail.event as ProductEventName, feature, detail.properties ?? {}, detail.dedupeKey ?? `${detail.event}:${crypto.randomUUID()}`);
    };
    window.addEventListener("mbv:product-event", listener);
    return () => window.removeEventListener("mbv:product-event", listener);
  }, [getAccessToken, userId]);
  return null;
}

function featureForEvent(event: ProductEventName) {
  const featureMap: Partial<Record<ProductEventName, string>> = { goal_created:"goals",annual_plan_updated:"annual_planning",monthly_plan_updated:"monthly_planning",week_planned:"weekly_planning",task_created:"tasks",task_completed:"tasks",today_view_opened:"today",journal_entry_created:"journal",progress_review_created:"progress",routine_created:"routines",workout_completed:"fitness",meal_logged:"nutrition",settings_updated:"settings",suggestion_submitted:"support",bug_report_submitted:"support",support_request_submitted:"support" };
  return featureMap[event] ?? "onboarding";
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount debe usarse dentro de AccountProvider");
  return value;
}

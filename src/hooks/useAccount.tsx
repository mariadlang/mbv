"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserAccess } from "@/src/domain/access";
import type { AccountPreferences, AccountUser } from "@/src/repositories/interfaces/AuthRepository";
import { authService } from "@/src/services/authService";
import { useUiStore } from "@/src/stores/useUiStore";

interface AccountContextValue {
  configured: boolean;
  loading: boolean;
  user: AccountUser | null;
  access: UserAccess | null;
  preferences: AccountPreferences | null;
  preferencesLoading: boolean;
  error: string | null;
  refreshAccess(): Promise<void>;
  signUp(input: { name: string; email: string; password: string; legalAcceptedAt: string; legalVersion: string }): Promise<{ emailVerificationRequired: boolean }>;
  signIn(input: { email: string; password: string }): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signInWithMagicLink(email: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
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
    signUp: (input) => authService.signUp(input),
    signIn: (input) => authService.signIn(input),
    signInWithGoogle: () => authService.signInWithGoogle(),
    signInWithMagicLink: (email) => authService.signInWithMagicLink(email),
    requestPasswordReset: (email) => authService.requestPasswordReset(email),
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
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount debe usarse dentro de AccountProvider");
  return value;
}

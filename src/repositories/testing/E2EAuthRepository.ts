import type { UserAccess } from "@/src/domain/access";
import type { AccountPreferences, AccountUser, AuthRepository } from "@/src/repositories/interfaces/AuthRepository";

const user: AccountUser = { id: "e2e-user", email: "e2e@mybestversion.test", displayName: "María", emailVerified: true, legalVersion: "2026-08-27.co-1", termsAcceptedAt: new Date().toISOString(), dataProcessingAcceptedAt: new Date().toISOString(), adultDeclaredAt: new Date().toISOString(), marketingConsent: false };
const access: UserAccess = { userId: user.id, email: user.email, displayName: user.displayName, role: "user", accessStatus: "active", subscriptionStatus: "active", trialStartedAt: null, trialEndsAt: null, serverNow: new Date().toISOString() };

export class E2EAuthRepository implements AuthRepository {
  private preferences: AccountPreferences = { locale: "es", tutorialCompleted: true };
  private signedIn = true;
  private listeners = new Set<(user: AccountUser | null) => void>();
  isConfigured() { return true; }
  async getCurrentUser() { return this.signedIn ? user : null; }
  async getAccessToken() { return typeof window !== "undefined" && (new URLSearchParams(window.location.search).has("e2e-admin") || window.sessionStorage.getItem("mbv-e2e-admin") === "1") ? "e2e-admin" : "e2e-user"; }
  onAuthChange(callback: (user: AccountUser | null) => void) { this.listeners.add(callback); return () => this.listeners.delete(callback); }
  async signUp() { return { emailVerificationRequired: false }; }
  async signIn() { this.signedIn = true; this.listeners.forEach((listener) => listener(user)); }
  async signInWithGoogle() {}
  async signInWithMagicLink() {}
  async signOut() { this.signedIn = false; this.listeners.forEach((listener) => listener(null)); }
  async requestPasswordReset() {}
  async acceptLegal(input: Parameters<AuthRepository["acceptLegal"]>[0]) { user.legalVersion = input.legalVersion; user.termsAcceptedAt = input.termsAcceptedAt; user.dataProcessingAcceptedAt = input.dataProcessingAcceptedAt; user.adultDeclaredAt = input.adultDeclaredAt; user.marketingConsent = input.marketingConsent; return user; }
  async getOrStartAccess() { const isAdmin = typeof window !== "undefined" && (new URLSearchParams(window.location.search).has("e2e-admin") || window.sessionStorage.getItem("mbv-e2e-admin") === "1"); if (isAdmin && typeof window !== "undefined") window.sessionStorage.setItem("mbv-e2e-admin", "1"); return { ...access, role: isAdmin ? "superadmin" as const : "user" as const }; }
  async getPreferences() {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("first-run")) {
      return { ...this.preferences, tutorialCompleted: false };
    }
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(window.localStorage.getItem("mbv-ui-preferences") ?? "null")?.state;
        if (stored?.language === "en" || stored?.language === "es") this.preferences.locale = stored.language;
      } catch { /* E2E keeps its in-memory fallback when storage is unavailable. */ }
    }
    return this.preferences;
  }
  async updatePreferences(input: Partial<AccountPreferences>) {
    this.preferences = { ...this.preferences, ...input };
    return this.preferences;
  }
}

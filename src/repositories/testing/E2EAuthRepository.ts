import type { UserAccess } from "@/src/domain/access";
import type { AccountPreferences, AccountUser, AuthRepository } from "@/src/repositories/interfaces/AuthRepository";

const user: AccountUser = { id: "e2e-user", email: "e2e@mybestversion.test", displayName: "María", emailVerified: true, emailVerifiedAt: new Date().toISOString(), legalVersion: "2026-08-27.co-1", termsAcceptedAt: new Date().toISOString(), dataProcessingAcceptedAt: new Date().toISOString(), adultDeclaredAt: new Date().toISOString(), marketingConsent: false, onboardingCompleted: false };
const access: UserAccess = { userId: user.id, email: user.email, displayName: user.displayName, role: "user", accessStatus: "active", subscriptionStatus: "active", trialStartedAt: null, trialEndsAt: null, serverNow: new Date().toISOString() };

export class E2EAuthRepository implements AuthRepository {
  private preferences: AccountPreferences = { locale: "es", tutorialCompleted: true };
  private signedIn = true;
  private listeners = new Set<(user: AccountUser | null) => void>();
  constructor() {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("e2e-auth") === "signed-out") {
      this.signedIn = false;
    }
  }
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
  async markOnboardingCompleted() { user.onboardingCompleted = true; return user; }
  async getOrStartAccess() {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const isAdmin = Boolean(params?.has("e2e-admin") || (typeof window !== "undefined" && window.sessionStorage.getItem("mbv-e2e-admin") === "1"));
    const isTrial = Boolean(params?.get("e2e-access") === "trial" || (typeof window !== "undefined" && window.sessionStorage.getItem("mbv-e2e-access") === "trial"));
    if (typeof window !== "undefined") {
      if (isAdmin) window.sessionStorage.setItem("mbv-e2e-admin", "1");
      if (isTrial) window.sessionStorage.setItem("mbv-e2e-access", "trial");
    }
    if (isTrial && !isAdmin) {
      const now = new Date();
      return {
        ...access,
        accessStatus: "trial" as const,
        subscriptionStatus: "none" as const,
        trialStartedAt: now.toISOString(),
        trialEndsAt: new Date(now.getTime() + 15 * 86_400_000).toISOString(),
        serverNow: now.toISOString(),
      };
    }
    return { ...access, role: isAdmin ? "superadmin" as const : "user" as const };
  }
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

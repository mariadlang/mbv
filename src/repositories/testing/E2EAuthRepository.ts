import type { UserAccess } from "@/src/domain/access";
import type { AccountPreferences, AccountUser, AuthRepository } from "@/src/repositories/interfaces/AuthRepository";

const user: AccountUser = { id: "e2e-user", email: "e2e@mybestversion.test", displayName: "María", emailVerified: true };
const access: UserAccess = { userId: user.id, email: user.email, displayName: user.displayName, role: "user", accessStatus: "active", subscriptionStatus: "active", trialStartedAt: null, trialEndsAt: null, serverNow: new Date().toISOString() };

export class E2EAuthRepository implements AuthRepository {
  private preferences: AccountPreferences = { locale: "es", tutorialCompleted: true };
  private signedIn = true;
  private listeners = new Set<(user: AccountUser | null) => void>();
  isConfigured() { return true; }
  async getCurrentUser() { return this.signedIn ? user : null; }
  onAuthChange(callback: (user: AccountUser | null) => void) { this.listeners.add(callback); return () => this.listeners.delete(callback); }
  async signUp() { return { emailVerificationRequired: false }; }
  async signIn() { this.signedIn = true; this.listeners.forEach((listener) => listener(user)); }
  async signInWithGoogle() {}
  async signInWithMagicLink() {}
  async signOut() { this.signedIn = false; this.listeners.forEach((listener) => listener(null)); }
  async requestPasswordReset() {}
  async getOrStartAccess() { return access; }
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

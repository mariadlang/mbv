import type { UserAccess } from "@/src/domain/access";
import type { AccountUser, AuthRepository } from "@/src/repositories/interfaces/AuthRepository";

const user: AccountUser = { id: "e2e-user", email: "e2e@mybestversion.test", displayName: "María", emailVerified: true };
const access: UserAccess = { userId: user.id, email: user.email, displayName: user.displayName, role: "user", accessStatus: "active", subscriptionStatus: "active", trialStartedAt: null, trialEndsAt: null, serverNow: new Date().toISOString() };

export class E2EAuthRepository implements AuthRepository {
  isConfigured() { return true; }
  async getCurrentUser() { return user; }
  onAuthChange() { return () => undefined; }
  async signUp() { return { emailVerificationRequired: false }; }
  async signIn() {}
  async signOut() {}
  async requestPasswordReset() {}
  async getOrStartAccess() { return access; }
}

import type { UserAccess } from "@/src/domain/access";

export interface AccountUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

export interface AuthRepository {
  isConfigured(): boolean;
  getCurrentUser(): Promise<AccountUser | null>;
  onAuthChange(callback: (user: AccountUser | null) => void): () => void;
  signUp(input: { name: string; email: string; password: string }): Promise<{ emailVerificationRequired: boolean }>;
  signIn(input: { email: string; password: string }): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signInWithMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  getOrStartAccess(): Promise<UserAccess>;
}

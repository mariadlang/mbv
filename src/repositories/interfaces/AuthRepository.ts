import type { UserAccess } from "@/src/domain/access";
import type { Language } from "@/src/stores/useUiStore";

export interface AccountUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  legalVersion: string | null;
  termsAcceptedAt: string | null;
  dataProcessingAcceptedAt: string | null;
  adultDeclaredAt: string | null;
  marketingConsent: boolean;
  onboardingCompleted: boolean;
}

export interface SignupLegalEvidence {
  legalVersion: string;
  termsAcceptedAt: string;
  dataProcessingAcceptedAt: string;
  adultDeclaredAt: string;
  marketingConsent: boolean;
  marketingAcceptedAt: string | null;
}

export interface AccountPreferences {
  locale: Language;
  tutorialCompleted: boolean;
}

export interface AuthRepository {
  isConfigured(): boolean;
  getCurrentUser(): Promise<AccountUser | null>;
  getAccessToken(): Promise<string | null>;
  onAuthChange(callback: (user: AccountUser | null) => void): () => void;
  signUp(input: { name: string; email: string; password: string } & SignupLegalEvidence): Promise<{ emailVerificationRequired: boolean }>;
  signIn(input: { email: string; password: string }): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signInWithMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  acceptLegal(input: SignupLegalEvidence): Promise<AccountUser>;
  markOnboardingCompleted(): Promise<AccountUser>;
  getOrStartAccess(): Promise<UserAccess>;
  getPreferences(): Promise<AccountPreferences>;
  updatePreferences(input: Partial<AccountPreferences>): Promise<AccountPreferences>;
}

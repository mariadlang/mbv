import { publicConfig } from "@/src/lib/publicConfig";
import type { AuthRepository } from "@/src/repositories/interfaces/AuthRepository";
import { SupabaseAuthRepository } from "@/src/repositories/supabase/SupabaseAuthRepository";
import { E2EAuthRepository } from "@/src/repositories/testing/E2EAuthRepository";

const repository: AuthRepository = publicConfig.e2eAccess ? new E2EAuthRepository() : new SupabaseAuthRepository();

export const authService = {
  isConfigured: () => repository.isConfigured(),
  getCurrentUser: () => repository.getCurrentUser(),
  onAuthChange: (callback: Parameters<AuthRepository["onAuthChange"]>[0]) => repository.onAuthChange(callback),
  signUp: (input: Parameters<AuthRepository["signUp"]>[0]) => repository.signUp(input),
  signIn: (input: Parameters<AuthRepository["signIn"]>[0]) => repository.signIn(input),
  signInWithGoogle: () => repository.signInWithGoogle(),
  signInWithMagicLink: (email: string) => repository.signInWithMagicLink(email),
  signOut: () => repository.signOut(),
  requestPasswordReset: (email: string) => repository.requestPasswordReset(email),
  getOrStartAccess: () => repository.getOrStartAccess(),
};

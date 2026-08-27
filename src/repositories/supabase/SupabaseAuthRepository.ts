import { createClient, type User } from "@supabase/supabase-js";
import type { UserAccess } from "@/src/domain/access";
import { hasSupabaseConfig, publicConfig } from "@/src/lib/publicConfig";
import type { AccountPreferences, AccountUser, AuthRepository, SignupLegalEvidence } from "@/src/repositories/interfaces/AuthRepository";

function toAccountUser(user: User | null): AccountUser | null {
  if (!user?.email) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email.split("@")[0]),
    emailVerified: Boolean(user.email_confirmed_at),
    legalVersion: typeof user.user_metadata?.legal_version === "string" ? user.user_metadata.legal_version : null,
    termsAcceptedAt: typeof user.user_metadata?.terms_accepted_at === "string" ? user.user_metadata.terms_accepted_at : null,
    dataProcessingAcceptedAt: typeof user.user_metadata?.data_processing_accepted_at === "string" ? user.user_metadata.data_processing_accepted_at : null,
    adultDeclaredAt: typeof user.user_metadata?.adult_declared_at === "string" ? user.user_metadata.adult_declared_at : null,
    marketingConsent: user.user_metadata?.marketing_consent === true,
  };
}

function callbackUrl(path: string): string {
  return typeof window === "undefined" ? path : `${window.location.origin}${path}`;
}

export class SupabaseAuthRepository implements AuthRepository {
  private client = hasSupabaseConfig ? createClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }) : null;

  isConfigured() { return Boolean(this.client); }

  async getCurrentUser() {
    if (!this.client) return null;
    const { data, error } = await this.client.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") throw error;
    return toAccountUser(data.user);
  }

  async getAccessToken() {
    if (!this.client) return null;
    const { data } = await this.client.auth.getSession();
    return data.session?.access_token ?? null;
  }

  onAuthChange(callback: (user: AccountUser | null) => void) {
    if (!this.client) return () => undefined;
    const { data } = this.client.auth.onAuthStateChange((_event, session) => callback(toAccountUser(session?.user ?? null)));
    return () => data.subscription.unsubscribe();
  }

  async signUp(input: { name: string; email: string; password: string } & SignupLegalEvidence) {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.name, legal_version: input.legalVersion, terms_accepted_at: input.termsAcceptedAt, data_processing_accepted_at: input.dataProcessingAcceptedAt, adult_declared_at: input.adultDeclaredAt, marketing_consent: input.marketingConsent, marketing_accepted_at: input.marketingAcceptedAt }, emailRedirectTo: callbackUrl("/verify-email") },
    });
    if (error) throw error;
    return { emailVerificationRequired: !data.session };
  }

  async signIn(input: { email: string; password: string }) {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { error } = await this.client.auth.signInWithPassword(input);
    if (error) throw error;
  }

  async signInWithGoogle() {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { error } = await this.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl("/app/dashboard") },
    });
    if (error) throw error;
  }

  async signInWithMagicLink(email: string) {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl("/app/dashboard"), shouldCreateUser: false },
    });
    if (error) throw error;
  }

  async signOut() {
    if (!this.client) return;
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async requestPasswordReset(email: string) {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl("/login?reset=1") });
    if (error) throw error;
  }

  async acceptLegal(input: SignupLegalEvidence) {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { data, error } = await this.client.auth.updateUser({ data: { legal_version: input.legalVersion, terms_accepted_at: input.termsAcceptedAt, data_processing_accepted_at: input.dataProcessingAcceptedAt, adult_declared_at: input.adultDeclaredAt, marketing_consent: input.marketingConsent, marketing_accepted_at: input.marketingAcceptedAt } });
    if (error) throw error;
    const user = toAccountUser(data.user);
    if (!user) throw new Error("ACCOUNT_NOT_AVAILABLE");
    return user;
  }

  async getOrStartAccess(): Promise<UserAccess> {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { data, error } = await this.client.rpc("ensure_user_access");
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("ACCESS_NOT_AVAILABLE");
    return {
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      accessStatus: row.access_status,
      subscriptionStatus: row.subscription_status,
      trialStartedAt: row.trial_started_at,
      trialEndsAt: row.trial_ends_at,
      serverNow: row.server_now,
    };
  }

  async getPreferences(): Promise<AccountPreferences> {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { data, error } = await this.client.rpc("get_account_preferences");
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { locale: row?.locale === "en" ? "en" : "es", tutorialCompleted: Boolean(row?.tutorial_completed) };
  }

  async updatePreferences(input: Partial<AccountPreferences>): Promise<AccountPreferences> {
    if (!this.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { data, error } = await this.client.rpc("update_account_preferences", {
      next_locale: input.locale ?? null,
      next_tutorial_completed: input.tutorialCompleted ?? null,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { locale: row?.locale === "en" ? "en" : "es", tutorialCompleted: Boolean(row?.tutorial_completed) };
  }
}

import type { AccessStatus, CommercialEligibilityStatus, CommercialPlanInterval, SubscriptionStatus } from "@/src/domain/access";

export interface AdminAccountRow {
  userId: string;
  email: string;
  displayName: string;
  role: "user" | "superadmin";
  accessStatus: AccessStatus;
  subscriptionStatus: SubscriptionStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  eligibilityStatus: CommercialEligibilityStatus | null;
  eligibleAt: string | null;
  eligibilityPeriodStartedOn: string | null;
  eligibilityPeriodEndedOn: string | null;
  campaignKey: string | null;
  fixedTimezone: string | null;
  currentStreakDays: number;
  trialGrantedAt: string | null;
  planInterval: CommercialPlanInterval | null;
  conflictReason: string | null;
  updatedAt: string;
}

export interface AdminTrialActivationResult {
  outcome: "activated" | "already_activated" | "conflict_paid_premium";
  userId: string;
  campaignKey: string;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  accessStatus: AccessStatus;
}

export interface AdminRepository {
  listAccounts(): Promise<AdminAccountRow[]>;
  activateCommercialTrial(input: {
    userId: string;
    campaignKey: string;
    confirmation: "ACTIVAR_TRIAL_30_DIAS";
  }): Promise<AdminTrialActivationResult>;
}

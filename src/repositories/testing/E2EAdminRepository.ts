import type {
  AdminAccountRow,
  AdminRepository,
  AdminTrialActivationResult,
} from "@/src/repositories/interfaces/AdminRepository";

const eligibleUserId = "10000000-0000-4000-8000-000000000001";
const campaignKey = "consistency-30-v1";

export class E2EAdminRepository implements AdminRepository {
  private account: AdminAccountRow = {
    userId: eligibleUserId,
    email: "eligible@mybestversion.test",
    displayName: "Cuenta elegible",
    role: "user",
    accessStatus: "eligible",
    subscriptionStatus: "none",
    trialStartedAt: null,
    trialEndsAt: null,
    eligibilityStatus: "eligible",
    eligibleAt: "2026-09-19T12:00:00.000Z",
    eligibilityPeriodStartedOn: "2026-08-21",
    eligibilityPeriodEndedOn: "2026-09-19",
    campaignKey,
    fixedTimezone: "America/Bogota",
    currentStreakDays: 30,
    trialGrantedAt: null,
    planInterval: null,
    conflictReason: null,
    updatedAt: "2026-09-19T12:00:00.000Z",
  };

  async listAccounts(): Promise<AdminAccountRow[]> {
    return [structuredClone(this.account)];
  }

  async activateCommercialTrial(
    input: Parameters<AdminRepository["activateCommercialTrial"]>[0],
  ): Promise<AdminTrialActivationResult> {
    if (input.userId !== eligibleUserId || input.campaignKey !== campaignKey) {
      throw new Error("TRIAL_ELIGIBILITY_NOT_FOUND");
    }
    if (input.confirmation !== "ACTIVAR_TRIAL_30_DIAS") {
      throw new Error("TRIAL_ACTIVATION_CONFIRMATION_REQUIRED");
    }
    if (this.account.trialGrantedAt) {
      return {
        outcome: "already_activated",
        userId: eligibleUserId,
        campaignKey,
        trialStartedAt: this.account.trialStartedAt,
        trialEndsAt: this.account.trialEndsAt,
        accessStatus: this.account.accessStatus,
      };
    }
    const startedAt = "2026-09-19T12:00:00.000Z";
    const endsAt = "2026-10-19T12:00:00.000Z";
    this.account = {
      ...this.account,
      accessStatus: "trial_active",
      eligibilityStatus: "activated",
      trialStartedAt: startedAt,
      trialEndsAt: endsAt,
      trialGrantedAt: startedAt,
      updatedAt: startedAt,
    };
    return {
      outcome: "activated",
      userId: eligibleUserId,
      campaignKey,
      trialStartedAt: startedAt,
      trialEndsAt: endsAt,
      accessStatus: "trial_active",
    };
  }
}

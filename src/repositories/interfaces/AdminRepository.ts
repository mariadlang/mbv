export interface AdminAccountRow {
  userId: string;
  email: string;
  displayName: string;
  role: "user" | "superadmin";
  accessStatus: "trial" | "active" | "expired" | "blocked";
  subscriptionStatus: "none" | "pending" | "active" | "cancelled";
  trialEndsAt: string | null;
  updatedAt: string;
}

export interface AdminRepository {
  listAccounts(): Promise<AdminAccountRow[]>;
  setPremium(input: { userId: string; enabled: boolean; note?: string }): Promise<void>;
}

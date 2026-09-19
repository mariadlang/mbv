import { SupabaseAdminRepository } from "@/src/repositories/supabase/SupabaseAdminRepository";
import { E2EAdminRepository } from "@/src/repositories/testing/E2EAdminRepository";
import type { AdminRepository } from "@/src/repositories/interfaces/AdminRepository";
import { publicConfig } from "@/src/lib/publicConfig";

const repository: AdminRepository = publicConfig.e2eAccess
  ? new E2EAdminRepository()
  : new SupabaseAdminRepository();

export const adminService = {
  listAccounts: () => repository.listAccounts(),
  activateCommercialTrial: (input: Parameters<typeof repository.activateCommercialTrial>[0]) => repository.activateCommercialTrial(input),
};

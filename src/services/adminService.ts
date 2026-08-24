import { SupabaseAdminRepository } from "@/src/repositories/supabase/SupabaseAdminRepository";

const repository = new SupabaseAdminRepository();

export const adminService = {
  listAccounts: () => repository.listAccounts(),
  setPremium: (input: Parameters<typeof repository.setPremium>[0]) => repository.setPremium(input),
};

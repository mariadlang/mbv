import type { CookiePreferences } from "@/src/domain/legal";
import { cookiePreferencesSchema, consentInputSchema, privacyAttachmentSchema, privacyRequestInputSchema } from "@/src/lib/legalSchemas";
import { SupabaseLegalPrivacyRepository } from "@/src/repositories/supabase/SupabaseLegalPrivacyRepository";
import type { CreatePrivacyRequestInput, RecordConsentInput } from "@/src/repositories/interfaces/LegalPrivacyRepository";

const repository = new SupabaseLegalPrivacyRepository();

export const legalPrivacyService = {
  listConsents: (userId: string) => repository.listConsents(userId),
  recordConsent: (input: RecordConsentInput) => repository.recordConsent({ ...input, ...consentInputSchema.parse(input) }),
  listRequests: (userId: string) => repository.listRequests(userId),
  listAllRequests: () => repository.listAllRequests(),
  createRequest: (input: CreatePrivacyRequestInput) => {
    if (input.attachment) privacyAttachmentSchema.parse(input.attachment);
    return repository.createRequest({ ...input, ...privacyRequestInputSchema.parse(input) });
  },
  updateRequestStatus: (id: string, status: Parameters<typeof repository.updateRequestStatus>[1], response?: string) => repository.updateRequestStatus(id, status, response),
  getCookiePreferences: () => repository.getCookiePreferences(),
  saveCookiePreferences: (input: CookiePreferences) => repository.saveCookiePreferences(cookiePreferencesSchema.parse(input)),
};

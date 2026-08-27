import { feedbackTicketSchema, marketingPreferenceSchema, productEventSchema, supportAttachmentSchema } from "@/src/lib/supportSchemas";
import { sanitizeProductMetadata } from "@/src/domain/productAnalytics";
import { HttpSupportRepository } from "@/src/repositories/http/HttpSupportRepository";
import type { SubmitFeedbackInput } from "@/src/repositories/interfaces/SupportRepository";

const repository = new HttpSupportRepository();

export const supportService = {
  submitFeedback(token: string, input: SubmitFeedbackInput) { if (input.attachment) supportAttachmentSchema.parse(input.attachment); return repository.submitFeedback(token, { ...input, ...feedbackTicketSchema.parse(input) }); },
  listFaqs: (token: string, locale: "es" | "en") => repository.listFaqs(token, locale),
  getMarketingPreference: (token: string) => repository.getMarketingPreference(token),
  setMarketingPreference(token: string, consent: boolean, source: string) { const parsed = marketingPreferenceSchema.parse({ consent, source }); return repository.setMarketingPreference(token, parsed.consent, parsed.source); },
  trackEvent(token: string, input: Parameters<typeof repository.trackEvent>[1]) { const parsed = productEventSchema.parse({ ...input, metadata: sanitizeProductMetadata(input.metadata ?? {}) }); return repository.trackEvent(token, parsed); },
};

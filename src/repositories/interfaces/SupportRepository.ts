import type { FeedbackTicket, SupportFaq } from "@/src/domain/support";
import type { ClientProductEventName } from "@/src/domain/productAnalytics";

export interface SubmitFeedbackInput { type: FeedbackTicket["type"]; category: string; subject: string; message: string; pageUrl?: string; attachment?: File | null }

export interface SupportRepository {
  submitFeedback(token: string, input: SubmitFeedbackInput): Promise<{ reference: string }>;
  listFaqs(token: string, locale: "es" | "en"): Promise<SupportFaq[]>;
  getMarketingPreference(token: string): Promise<boolean>;
  setMarketingPreference(token: string, consent: boolean, source: string): Promise<boolean>;
  trackEvent(token: string, input: { eventName: ClientProductEventName; feature: string; sessionId: string; dedupeKey: string; occurredAt: string; metadata?: Record<string, unknown> }, options?: { signal?: AbortSignal }): Promise<void>;
}

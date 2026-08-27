import type { SupportFaq } from "@/src/domain/support";
import type { SupportRepository, SubmitFeedbackInput } from "@/src/repositories/interfaces/SupportRepository";

async function parseResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => ({}));
  const error = data && typeof data === "object" && "error" in data ? (data as { error?: unknown }).error : undefined;
  if (!response.ok) throw new Error(typeof error === "string" ? error : "REQUEST_FAILED");
  return data as T;
}

export class HttpSupportRepository implements SupportRepository {
  async submitFeedback(token: string, input: SubmitFeedbackInput) {
    const body = new FormData();
    body.set("type", input.type); body.set("category", input.category); body.set("subject", input.subject); body.set("message", input.message); body.set("pageUrl", input.pageUrl ?? "");
    if (input.attachment) body.set("attachment", input.attachment);
    return parseResponse<{ reference: string }>(await fetch("/api/feedback", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body }));
  }

  async listFaqs(token: string, locale: "es" | "en") { return parseResponse<{ faqs: SupportFaq[] }>(await fetch(`/api/feedback?locale=${locale}`, { headers: { Authorization: `Bearer ${token}` } })).then((data) => data.faqs); }
  async getMarketingPreference(token: string) { return parseResponse<{ consent: boolean }>(await fetch("/api/marketing-preference", { headers: { Authorization: `Bearer ${token}` } })).then((data) => data.consent); }
  async setMarketingPreference(token: string, consent: boolean, source: string) { return parseResponse<{ consent: boolean }>(await fetch("/api/marketing-preference", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ consent, source }) })).then((data) => data.consent); }
  async trackEvent(token: string, input: Parameters<SupportRepository["trackEvent"]>[1]) { await parseResponse(await fetch("/api/events", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(input) })); }
}

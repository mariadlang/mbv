import { createClient } from "@supabase/supabase-js";
import type { CookiePreferences, LegalConsent, PrivacyRequest } from "@/src/domain/legal";
import { addBusinessDays } from "@/src/domain/legalRules";
import { hasSupabaseConfig, publicConfig } from "@/src/lib/publicConfig";
import type { CreatePrivacyRequestInput, LegalPrivacyRepository, RecordConsentInput } from "@/src/repositories/interfaces/LegalPrivacyRepository";

const STORAGE_KEY = "mbv-legal-privacy-v1";

interface LocalLegalState { consents: LegalConsent[]; requests: PrivacyRequest[]; cookies: CookiePreferences | null }

const emptyState = (): LocalLegalState => ({ consents: [], requests: [], cookies: null });

function readLocal(): LocalLegalState {
  if (typeof window === "undefined") return emptyState();
  try { return { ...emptyState(), ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") }; }
  catch { return emptyState(); }
}

function writeLocal(state: LocalLegalState) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toConsent(row: Record<string, unknown>): LegalConsent {
  return { id: String(row.id), userId: String(row.user_id), consentType: row.consent_type as LegalConsent["consentType"], documentVersion: String(row.document_version), timestamp: String(row.consented_at), method: row.method as LegalConsent["method"], status: row.status as LegalConsent["status"], withdrawnAt: row.withdrawn_at ? String(row.withdrawn_at) : null };
}

function toRequest(row: Record<string, unknown>): PrivacyRequest {
  return { id: String(row.id), reference: String(row.reference), userId: String(row.user_id), type: row.request_type as PrivacyRequest["type"], subject: String(row.subject), description: String(row.description), contactEmail: String(row.contact_email), status: row.status as PrivacyRequest["status"], deadlineAt: row.deadline_at ? String(row.deadline_at) : null, response: row.response ? String(row.response) : null, createdAt: String(row.created_at), closedAt: row.closed_at ? String(row.closed_at) : null, attachmentPath: row.attachment_path ? String(row.attachment_path) : null };
}

export class SupabaseLegalPrivacyRepository implements LegalPrivacyRepository {
  private client = hasSupabaseConfig ? createClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

  async listConsents(userId: string) {
    if (this.client) {
      const { data, error } = await this.client.from("user_consents").select("*").eq("user_id", userId).order("consented_at", { ascending: false });
      if (!error) return (data ?? []).map((row) => toConsent(row));
    }
    return readLocal().consents.filter((item) => item.userId === userId);
  }

  async recordConsent(input: RecordConsentInput) {
    const now = new Date().toISOString();
    if (this.client) {
      const payload = { user_id: input.userId, consent_type: input.consentType, document_version: input.documentVersion, consented_at: now, method: input.method, status: input.status, withdrawn_at: input.status === "withdrawn" ? now : null, evidence: { source: "web_app" } };
      const { data, error } = await this.client.from("user_consents").upsert(payload, { onConflict: "user_id,consent_type,document_version" }).select("*").single();
      if (!error && data) return toConsent(data);
    }
    const state = readLocal();
    const existing = state.consents.find((item) => item.userId === input.userId && item.consentType === input.consentType && item.documentVersion === input.documentVersion);
    const consent: LegalConsent = { id: existing?.id ?? crypto.randomUUID(), userId: input.userId, consentType: input.consentType, documentVersion: input.documentVersion, timestamp: now, method: input.method, status: input.status, withdrawnAt: input.status === "withdrawn" ? now : null };
    state.consents = [consent, ...state.consents.filter((item) => item.id !== consent.id)]; writeLocal(state); return consent;
  }

  async listRequests(userId: string) {
    if (this.client) {
      const { data, error } = await this.client.from("privacy_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (!error) return (data ?? []).map((row) => toRequest(row));
    }
    return readLocal().requests.filter((item) => item.userId === userId);
  }

  async listAllRequests() {
    if (this.client) {
      const { data, error } = await this.client.from("privacy_requests").select("*").order("created_at", { ascending: false });
      if (!error) return (data ?? []).map((row) => toRequest(row));
      throw error;
    }
    return readLocal().requests;
  }

  async createRequest(input: CreatePrivacyRequestInput) {
    let attachmentPath: string | null = null;
    if (this.client && input.attachment) {
      const safeName = input.attachment.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${input.userId}/${crypto.randomUUID()}-${safeName}`;
      const uploaded = await this.client.storage.from("privacy-request-attachments").upload(path, input.attachment, { upsert: false });
      if (uploaded.error) throw new Error("PRIVACY_ATTACHMENT_UPLOAD_FAILED");
      attachmentPath = path;
    }
    if (this.client) {
      const { data, error } = await this.client.rpc("create_privacy_request", { next_type: input.type, next_subject: input.subject, next_description: input.description, next_contact_email: input.contactEmail, next_attachment_path: attachmentPath });
      const row = Array.isArray(data) ? data[0] : data;
      if (!error && row) return toRequest(row);
      throw error ?? new Error("PRIVACY_REQUEST_NOT_CREATED");
    }
    const now = new Date(); const state = readLocal();
    const request: PrivacyRequest = { id: crypto.randomUUID(), reference: `MBV-LOCAL-${now.getTime().toString(36).toUpperCase()}`, userId: input.userId, type: input.type, subject: input.subject, description: input.description, contactEmail: input.contactEmail, status: "received", deadlineAt: addBusinessDays(now, input.type === "data_inquiry" ? 10 : 15).toISOString(), response: null, createdAt: now.toISOString(), closedAt: null, attachmentPath };
    state.requests = [request, ...state.requests]; writeLocal(state); return request;
  }

  async updateRequestStatus(id: string, status: PrivacyRequest["status"], response?: string) {
    const now = new Date().toISOString();
    if (this.client) {
      const { data, error } = await this.client.from("privacy_requests").update({ status, response: response?.trim() || null, closed_at: status === "closed" ? now : null, updated_at: now }).eq("id", id).select("*").single();
      if (!error && data) return toRequest(data);
      throw error ?? new Error("PRIVACY_REQUEST_NOT_UPDATED");
    }
    const state = readLocal(); const existing = state.requests.find((item) => item.id === id);
    if (!existing) throw new Error("PRIVACY_REQUEST_NOT_FOUND");
    const updated = { ...existing, status, response: response?.trim() || null, closedAt: status === "closed" ? now : null };
    state.requests = state.requests.map((item) => item.id === id ? updated : item); writeLocal(state); return updated;
  }

  async getCookiePreferences() { return readLocal().cookies; }
  async saveCookiePreferences(input: CookiePreferences) { const state = readLocal(); state.cookies = input; writeLocal(state); return input; }
}

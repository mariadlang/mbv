import type { CookiePreferences, LegalConsent, PrivacyRequest } from "@/src/domain/legal";

export interface RecordConsentInput {
  userId: string;
  consentType: LegalConsent["consentType"];
  documentVersion: string;
  method: LegalConsent["method"];
  status: LegalConsent["status"];
}

export interface CreatePrivacyRequestInput {
  userId: string;
  type: PrivacyRequest["type"];
  subject: string;
  description: string;
  contactEmail: string;
  attachment?: File | null;
}

export interface LegalPrivacyRepository {
  listConsents(userId: string): Promise<LegalConsent[]>;
  recordConsent(input: RecordConsentInput): Promise<LegalConsent>;
  listRequests(userId: string): Promise<PrivacyRequest[]>;
  listAllRequests(): Promise<PrivacyRequest[]>;
  createRequest(input: CreatePrivacyRequestInput): Promise<PrivacyRequest>;
  updateRequestStatus(id: string, status: PrivacyRequest["status"], response?: string): Promise<PrivacyRequest>;
  getCookiePreferences(): Promise<CookiePreferences | null>;
  saveCookiePreferences(input: CookiePreferences): Promise<CookiePreferences>;
}

export type ConsentType =
  | "terms"
  | "data_processing"
  | "marketing"
  | "sensitive_wellness"
  | "adult_declaration"
  | "cookies_functional"
  | "cookies_analytics"
  | "cookies_marketing";

export type ConsentStatus = "granted" | "withdrawn";

export interface LegalConsent {
  id: string;
  userId: string;
  consentType: ConsentType;
  documentVersion: string;
  timestamp: string;
  method: "signup_checkbox" | "oauth_gate" | "privacy_center" | "feature_gate" | "cookie_manager";
  status: ConsentStatus;
  withdrawnAt: string | null;
}

export type PrivacyRequestType =
  | "data_inquiry"
  | "data_claim"
  | "correction"
  | "data_deletion"
  | "consent_revocation"
  | "account_deletion"
  | "pqr"
  | "retract"
  | "security";

export type PrivacyRequestStatus = "received" | "in_review" | "answered" | "closed";

export interface PrivacyRequest {
  id: string;
  reference: string;
  userId: string;
  type: PrivacyRequestType;
  subject: string;
  description: string;
  contactEmail: string;
  status: PrivacyRequestStatus;
  deadlineAt: string | null;
  response: string | null;
  createdAt: string;
  closedAt: string | null;
  attachmentPath: string | null;
}

export interface CookiePreferences {
  version: string;
  essential: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

export interface LegalDocumentDefinition {
  id: string;
  type: string;
  title: string;
  version: string;
  effectiveDate: string;
  updatedAt: string;
  contentReference: string;
  active: boolean;
}

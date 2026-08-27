import { z } from "zod";

export const consentInputSchema = z.object({
  consentType: z.enum(["terms", "data_processing", "marketing", "sensitive_wellness", "adult_declaration", "cookies_functional", "cookies_analytics", "cookies_marketing"]),
  documentVersion: z.string().min(3).max(80),
  method: z.enum(["signup_checkbox", "oauth_gate", "privacy_center", "feature_gate", "cookie_manager"]),
  status: z.enum(["granted", "withdrawn"]),
});

export const privacyRequestInputSchema = z.object({
  type: z.enum(["data_inquiry", "data_claim", "correction", "data_deletion", "consent_revocation", "account_deletion", "pqr", "retract", "security"]),
  subject: z.string().trim().min(4, "Escribe un asunto claro.").max(160),
  description: z.string().trim().min(20, "Cuéntanos un poco más para poder ayudarte.").max(5000),
  contactEmail: z.string().trim().email("Escribe un correo válido."),
});

export const privacyAttachmentSchema = z.custom<File>((value) => typeof File !== "undefined" && value instanceof File, "Adjunto inválido.")
  .refine((file) => file.size <= 2 * 1024 * 1024, "El adjunto no puede superar 2 MB.")
  .refine((file) => ["application/pdf", "image/jpeg", "image/png", "text/plain"].includes(file.type), "Usa un PDF, JPG, PNG o TXT.");

export const cookiePreferencesSchema = z.object({
  version: z.string().min(3),
  essential: z.literal(true),
  functional: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
  decidedAt: z.string().datetime(),
});

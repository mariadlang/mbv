import { z } from "zod";
import { productEventNames } from "@/src/domain/productAnalytics";

export const feedbackTicketSchema = z.object({
  type: z.enum(["suggestion", "bug", "support"]),
  category: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(3, "Escribe un título o asunto claro.").max(160),
  message: z.string().trim().min(10, "Cuéntanos un poco más para poder ayudarte.").max(5000),
  pageUrl: z.string().max(500).optional(),
});

export const supportAttachmentSchema = z.custom<File>((value) => typeof File !== "undefined" && value instanceof File, "Archivo inválido.")
  .refine((file) => file.size <= 2 * 1024 * 1024, "El archivo no puede superar 2 MB.")
  .refine((file) => ["application/pdf", "image/jpeg", "image/png", "text/plain"].includes(file.type), "Usa un PDF, JPG, PNG o TXT.");

export const productEventSchema = z.object({ eventName: z.enum(productEventNames), feature: z.string().trim().min(2).max(60), sessionId: z.string().min(6).max(100), dedupeKey: z.string().min(6).max(180), metadata: z.record(z.string(), z.unknown()).default({}) });

export const marketingPreferenceSchema = z.object({ consent: z.boolean(), source: z.string().trim().min(2).max(60) });

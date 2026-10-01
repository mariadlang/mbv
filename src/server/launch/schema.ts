import { z } from "zod";

export const launchAccessEmailSchema = z.string()
  .trim()
  .max(254)
  .email()
  .transform((value) => value.toLowerCase());

export const launchAccessLocaleSchema = z.enum(["es", "en"]);
export type LaunchAccessLocale = z.infer<typeof launchAccessLocaleSchema>;

export const launchAccessRequestTypeSchema = z.enum(["waitlist", "newsletter_only"]);
export type LaunchAccessRequestType = z.infer<typeof launchAccessRequestTypeSchema>;

export const launchAccessRequestSchema = z.object({
  email: launchAccessEmailSchema,
  requestId: z.string().uuid(),
  locale: launchAccessLocaleSchema,
  requestType: launchAccessRequestTypeSchema,
  newsletterOptIn: z.boolean(),
  origin: z.literal("landing_launch"),
}).strict().superRefine((value, context) => {
  if (value.requestType === "newsletter_only" && !value.newsletterOptIn) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "NEWSLETTER_CONSENT_REQUIRED",
      path: ["newsletterOptIn"],
    });
  }
});

export type LaunchAccessPublicStatus = "open" | "closed" | "unavailable";

export class LaunchAccessError extends Error {
  constructor(
    readonly code:
      | "CAMPAIGN_CLOSED"
      | "INVALID_EMAIL"
      | "INVALID_REQUEST"
      | "NOT_CONFIGURED"
      | "RATE_LIMITED"
      | "REQUEST_FORBIDDEN"
      | "REQUEST_TOO_LARGE"
      | "REQUEST_UNAVAILABLE",
  ) {
    super(code);
    this.name = "LaunchAccessError";
  }
}

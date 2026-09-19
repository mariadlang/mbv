import { resolveProductFeatureFlags } from "@/src/domain/featureFlags";

export const publicConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Supabase renamed the client-safe anon key to "publishable key" for new
  // projects. Keep the legacy name as a fallback so existing installations
  // continue to work while Vercel Marketplace projects work out of the box.
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  googleCalendarEnabled: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED === "1",
  productFeatureFlags: resolveProductFeatureFlags({
    weekly_recap: process.env.NEXT_PUBLIC_FEATURE_WEEKLY_RECAP,
    return_experience: process.env.NEXT_PUBLIC_FEATURE_RETURN_EXPERIENCE,
    share_cards: process.env.NEXT_PUBLIC_FEATURE_SHARE_CARDS,
    referrals: process.env.NEXT_PUBLIC_FEATURE_REFERRALS,
    premium_contextual_prompts: process.env.NEXT_PUBLIC_FEATURE_PREMIUM_CONTEXTUAL_PROMPTS,
  }),
  e2eAccess: process.env.NEXT_PUBLIC_MBV_E2E_ACCESS === "1",
};

export const hasSupabaseConfig = Boolean(publicConfig.supabaseUrl && publicConfig.supabaseAnonKey);

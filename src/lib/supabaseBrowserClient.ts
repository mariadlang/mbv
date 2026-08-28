import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseConfig, publicConfig } from "@/src/lib/publicConfig";

let browserClient: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient() {
  if (browserClient !== undefined) return browserClient;
  browserClient = hasSupabaseConfig
    ? createClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
  return browserClient;
}

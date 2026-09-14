import type { SupabaseClient } from "@supabase/supabase-js";

export interface CalendarAccessProfile {
  account_status: string;
  role: string;
  access_status: string;
  subscription_status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  timezone: string | null;
}

function calendarAccessForbidden() {
  return new Response(JSON.stringify({ error: "CALENDAR_ACCESS_FORBIDDEN" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

export function calendarAccessAllowedForProfile(profile: CalendarAccessProfile | null, now = Date.now()): boolean {
  if (!profile) return false;
  if (profile.account_status !== "active") return false;
  if (profile.access_status === "blocked" || profile.access_status === "expired") return false;
  if (profile.role === "superadmin") return true;
  if (profile.access_status === "active" || profile.subscription_status === "active") return true;
  if (profile.access_status !== "trial" || !profile.trial_ends_at) return false;
  const trialEndsAt = new Date(profile.trial_ends_at).getTime();
  return Number.isFinite(trialEndsAt) && trialEndsAt > now;
}

function monthKeyInTimezone(value: string, timezone: string | null) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(date);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    return Number.isInteger(year) && Number.isInteger(month) ? year * 12 + month - 1 : null;
  } catch {
    return null;
  }
}

export function calendarPlanningDateAllowedForProfile(profile: CalendarAccessProfile, dateKey: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dateKey)) return false;
  const [year, month, day] = dateKey.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return false;
  if (profile.role === "superadmin" || profile.access_status === "active" || profile.subscription_status === "active") return true;
  if (profile.access_status !== "trial" || !profile.trial_started_at) return false;
  const firstMonth = monthKeyInTimezone(profile.trial_started_at, profile.timezone);
  const candidateMonth = year * 12 + month - 1;
  return firstMonth !== null && candidateMonth >= firstMonth && candidateMonth < firstMonth + 3;
}

async function loadCalendarAccessProfile(client: SupabaseClient | null, userId: string): Promise<CalendarAccessProfile | null> {
  if (!client) return null;
  const { data, error } = await client
    .from("profiles")
    .select("account_status,role,access_status,subscription_status,trial_started_at,trial_ends_at,timezone")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as CalendarAccessProfile | null;
}

export async function requireCalendarAccess(client: SupabaseClient | null, userId: string): Promise<CalendarAccessProfile> {
  const profile = await loadCalendarAccessProfile(client, userId);
  if (!calendarAccessAllowedForProfile(profile)) throw calendarAccessForbidden();
  return profile as CalendarAccessProfile;
}

export async function calendarAccessAllowed(client: SupabaseClient, userId: string): Promise<boolean> {
  return calendarAccessAllowedForProfile(await loadCalendarAccessProfile(client, userId));
}

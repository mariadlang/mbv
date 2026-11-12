// Does not print environment values or contact services.
export function validateBetaBuild(env) {
  if (env.MBV_CLOSED_BETA !== "1" && env.NEXT_PUBLIC_MBV_CLOSED_BETA !== "1") return;
  const require = (condition, message) => { if (!condition) throw new Error(`Closed beta: ${message}`); };
  require(env.MBV_CLOSED_BETA === "1" && env.NEXT_PUBLIC_MBV_CLOSED_BETA === "1", "server/client flags must match");
  require(env.NEXT_PUBLIC_MBV_E2E_ACCESS === "0", "E2E access must explicitly be 0");
  require(env.NEXT_PUBLIC_SUPABASE_URL === "https://tvdnxefyduycvrakjspv.supabase.co", "only mbv-h06-pruebas is allowed");
  require(["0", "1"].includes(env.MBV_BETA_PAUSED), "paused state must be explicit");
  const origin = new URL(env.APP_BASE_URL ?? "invalid");
  require(origin.origin === env.APP_BASE_URL && (origin.protocol === "https:" || (origin.protocol === "http:" && origin.hostname === "127.0.0.1")), "one exact HTTPS origin is required (loopback allowed for local checks)");
  require(!["mybestversion.life", "www.mybestversion.life"].includes(origin.hostname), "production origin is forbidden");
  for (const key of ["MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET"]) {
    require(!env[key], `${key} must be absent from this pilot`);
  }
  require(env.NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED === "0" && env.LAUNCH_ACCESS_ENABLED === "0", "calendar and commercial invitation services must be off");
  if (env.MBV_BETA_PAUSED === "0") {
    const start = Date.parse(env.MBV_BETA_STARTS_AT ?? "");
    const end = Date.parse(env.MBV_BETA_ENDS_AT ?? "");
    const hashes = (env.MBV_BETA_EMAIL_SHA256 ?? "").split(",").map((s) => s.trim());
    require(Number.isFinite(start) && Number.isFinite(end) && end > start && end - start <= 7 * 86400000, "window must be at most seven days");
    require(hashes.length >= 1 && hashes.length <= 5 && new Set(hashes).size === hashes.length && hashes.every((s) => /^[a-f0-9]{64}$/.test(s)), "one to five distinct server-only email hashes are required");
  }
}

import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateBetaBuild(process.env);
  console.log("Build configuration checked; no remote changes.");
}

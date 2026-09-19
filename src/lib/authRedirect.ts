import { isBillingInterval } from "@/src/domain/commercialOffer";

export const DEFAULT_AUTH_DESTINATION = "/app/dashboard";

function safeInternalPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("%")) return null;
  try {
    const parsed = new URL(value, "https://mybestversion.local");
    if (parsed.origin !== "https://mybestversion.local" || parsed.search || parsed.hash) return null;
    if (parsed.pathname === "/upgrade" || parsed.pathname.startsWith("/app/")) return parsed.pathname;
  } catch {
    return null;
  }
  return null;
}

export function resolveAuthDestination(search: string): string {
  const params = new URLSearchParams(search);
  const pathname = safeInternalPath(params.get("next"));
  if (!pathname) return DEFAULT_AUTH_DESTINATION;
  const interval = params.get("interval");
  if (pathname === "/upgrade" && isBillingInterval(interval)) return `${pathname}?interval=${interval}`;
  return pathname;
}

export function buildAuthEntryPath(entry: "/login" | "/signup", destination: string): string {
  if (!destination.startsWith("/") || destination.startsWith("//") || destination.includes("\\")) return entry;
  const parsedDestination = new URL(destination, "https://mybestversion.local");
  if (parsedDestination.origin !== "https://mybestversion.local") return entry;
  const pathname = safeInternalPath(parsedDestination.pathname);
  if (!pathname) return entry;
  const params = new URLSearchParams({ next: pathname });
  const interval = parsedDestination.searchParams.get("interval");
  if (pathname === "/upgrade" && isBillingInterval(interval)) params.set("interval", interval);
  return `${entry}?${params.toString()}`;
}

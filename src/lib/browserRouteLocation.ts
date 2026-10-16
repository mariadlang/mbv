import type { Location } from "react-router-dom";

/** Read URL and user state from one history entry, even before React commits a navigation. */
export function browserRouteLocation(routerLocation: Location, browserLocation: Pick<Location, "pathname" | "search" | "hash">, historyState: unknown): Location {
  const entry = historyState && typeof historyState === "object" ? historyState as Record<string, unknown> : {};
  return {
    ...routerLocation,
    pathname: browserLocation.pathname,
    search: browserLocation.search,
    hash: browserLocation.hash,
    state: entry.usr ?? null,
    key: typeof entry.key === "string" ? entry.key : "default",
  };
}

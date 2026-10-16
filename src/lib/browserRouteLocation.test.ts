import { describe, expect, it } from "vitest";
import type { Location } from "react-router-dom";
import { browserRouteLocation } from "./browserRouteLocation";

const previous: Location = { pathname: "/app/planning", search: "?view=year&create=month&goal=goal-1", hash: "", state: null, key: "create-month" };

describe("browser route history coherence", () => {
  it("preserves post-save feedback when the browser URL updates before the router render", () => {
    const confirmation = { goal: "Publicar una guía útil", month: "octubre 2026", preserved: false };
    const current = browserRouteLocation(previous, { pathname: previous.pathname, search: "?view=year", hash: "" }, { idx: 2, key: "saved-month", usr: { monthLinkConfirmation: confirmation } });
    expect(current).toEqual({ pathname: "/app/planning", search: "?view=year", hash: "", key: "saved-month", state: { monthLinkConfirmation: confirmation } });
  });

  it("does not carry feedback into a different history entry during browser back", () => {
    const stale = { ...previous, state: { monthLinkConfirmation: { goal: "Meta anterior" } }, key: "saved-month" };
    const current = browserRouteLocation(stale, { pathname: "/app/goals", search: "", hash: "#goal-1" }, { idx: 1, key: "goal-details", usr: null });
    expect(current).toMatchObject({ pathname: "/app/goals", search: "", hash: "#goal-1", state: null, key: "goal-details" });
  });

  it("uses an empty state for an initial direct link without router history metadata", () => {
    const current = browserRouteLocation({ ...previous, state: { stale: true } }, { pathname: "/app/planning", search: "?view=month", hash: "" }, null);
    expect(current.state).toBeNull();
    expect(current.key).toBe("default");
  });
});

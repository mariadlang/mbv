// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountProvider, useAccount } from "./useAccount";
import { authService } from "@/src/services/authService";
import type { AccountUser } from "@/src/repositories/interfaces/AuthRepository";
import type { UserAccess } from "@/src/domain/access";
import { publicConfig } from "@/src/lib/publicConfig";

vi.mock("@/src/features/legal/CookieConsent", () => ({ useCookieConsent: () => ({ preferences: { analytics: false } }) }));
vi.mock("@/src/services/participationService", () => ({ COMMERCIAL_ACCESS_UPDATED_EVENT: "test-access-refresh", participationService: { flush: vi.fn() } }));
vi.mock("@/src/services/authService", () => ({ authService: {
  isConfigured: vi.fn(() => true), getCurrentUser: vi.fn(), onAuthChange: vi.fn(),
  getOrStartAccess: vi.fn(), getPreferences: vi.fn(), signOut: vi.fn(),
} }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const account: AccountUser = { id: "synthetic-a", email: "a@example.test", displayName: "Prueba", emailVerified: true, emailVerifiedAt: null, legalVersion: null, termsAcceptedAt: null, dataProcessingAcceptedAt: null, adultDeclaredAt: null, marketingConsent: false, onboardingCompleted: true };
const access: UserAccess = { userId: account.id, email: account.email, displayName: account.displayName, role: "user", accessStatus: "free", subscriptionStatus: "none", trialStartedAt: null, trialEndsAt: null, serverNow: "2026-10-26T12:00:00Z", eligibilityStatus: null, planInterval: null, premiumSource: null, campaignKey: null, currentStreakDays: 0, eligibleAt: null, currentPeriodStartsAt: null, currentPeriodEndsAt: null, nextPaymentAt: null, cancelAtPeriodEnd: false };
let current: ReturnType<typeof useAccount>;
let emit: (user: AccountUser | null) => void;
function Probe() {
  const value = useAccount();
  useEffect(() => { current = value; }, [value]);
  return null;
}
async function mount() {
  render(<AccountProvider><Probe /></AccountProvider>);
  await waitFor(() => expect(current.loading).toBe(false));
}
describe("account access transitions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authService.isConfigured).mockReturnValue(true);
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);
    vi.mocked(authService.onAuthChange).mockImplementation(callback => { emit = callback; return () => {}; });
    vi.mocked(authService.getPreferences).mockResolvedValue({ locale: "es", tutorialCompleted: true });
  });
  afterEach(() => { cleanup(); publicConfig.closedBeta = false; vi.restoreAllMocks(); });

  it("rechecks the beta on focus, removes revoked access and ignores a late result after logout", async () => {
    publicConfig.closedBeta = true;
    vi.mocked(authService.getOrStartAccess).mockResolvedValueOnce(access);
    await mount();
    await act(async () => emit(account));
    expect(current.access?.userId).toBe(account.id);
    const pending = deferred<UserAccess>();
    vi.mocked(authService.getOrStartAccess).mockReturnValueOnce(pending.promise);
    act(() => window.dispatchEvent(new Event("focus")));
    expect(current.access?.userId).toBe(account.id);
    await act(async () => pending.reject(new Error("beta paused")));
    expect(current.access).toBeNull();
    const stale = deferred<UserAccess>();
    vi.mocked(authService.getOrStartAccess).mockReturnValueOnce(stale.promise);
    act(() => window.dispatchEvent(new Event("focus")));
    await act(async () => current.signOut());
    await act(async () => stale.resolve(access));
    expect(current.user).toBeNull();
    expect(current.access).toBeNull();
  });

  it("stays pending after login until actual access resolves, without a false error", async () => {
    const request = deferred<UserAccess>();
    vi.mocked(authService.getOrStartAccess).mockReturnValue(request.promise);
    await mount();
    act(() => emit(account));
    expect(current.user?.id).toBe(account.id);
    expect(current.loading).toBe(true);
    expect(current.access).toBeNull();
    expect(current.error).toBeNull();
    await act(async () => request.resolve(access));
    expect(current.loading).toBe(false);
    expect(current.access).toEqual(access);
  });

  it("shows a real failure, protects retry while pending and recovers only on success", async () => {
    vi.mocked(authService.getOrStartAccess).mockRejectedValueOnce(new Error("503"));
    await mount();
    await act(async () => emit(account));
    expect(current.loading).toBe(false);
    expect(current.access).toBeNull();
    expect(current.error).toContain("No pudimos comprobar tu acceso");
    const request = deferred<UserAccess>();
    vi.mocked(authService.getOrStartAccess).mockReturnValueOnce(request.promise);
    let retry!: Promise<void>;
    act(() => { retry = current.refreshAccess(); });
    expect(current.loading).toBe(true);
    expect(current.error).toBeNull();
    expect(current.access).toBeNull();
    await act(async () => { request.resolve(access); await retry; });
    expect(current.access).toEqual(access);
    expect(current.loading).toBe(false);
    expect(current.error).toBeNull();
  });

  it("does not restore access when an in-flight check finishes after logout", async () => {
    const request = deferred<UserAccess>();
    vi.mocked(authService.getOrStartAccess).mockReturnValue(request.promise);
    await mount();
    act(() => emit(account));
    await act(async () => current.signOut());
    await act(async () => request.resolve(access));
    expect(current.user).toBeNull();
    expect(current.access).toBeNull();
    expect(current.preferences).toBeNull();
    expect(current.loading).toBe(false);
  });

  it("keeps the latest check authoritative when an earlier one rejects later", async () => {
    const first = deferred<UserAccess>(), second = deferred<UserAccess>();
    vi.mocked(authService.getOrStartAccess).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await mount();
    act(() => emit(account));
    act(() => emit(account));
    await act(async () => second.resolve(access));
    await act(async () => first.reject(new Error("old request")));
    expect(current.access).toEqual(access);
    expect(current.error).toBeNull();
    expect(current.loading).toBe(false);
  });

  it("does not let the initial session lookup overwrite a newer auth event", async () => {
    const initial = deferred<AccountUser | null>(), request = deferred<UserAccess>();
    vi.mocked(authService.getCurrentUser).mockReturnValue(initial.promise);
    vi.mocked(authService.getOrStartAccess).mockReturnValue(request.promise);
    render(<AccountProvider><Probe /></AccountProvider>);
    act(() => emit(account));
    await act(async () => initial.resolve(null));
    expect(current.user?.id).toBe(account.id);
    expect(current.loading).toBe(true);
    await act(async () => request.resolve(access));
    expect(current.access).toEqual(access);
  });

  it("clears prior access during a new check and preserves a blocked server decision", async () => {
    vi.mocked(authService.getOrStartAccess).mockResolvedValueOnce(access);
    await mount();
    await act(async () => emit(account));
    const request = deferred<UserAccess>();
    vi.mocked(authService.getOrStartAccess).mockReturnValueOnce(request.promise);
    act(() => emit(account));
    expect(current.loading).toBe(true);
    expect(current.access).toBeNull();
    await act(async () => request.resolve({ ...access, accessStatus: "blocked" }));
    expect(current.access?.accessStatus).toBe("blocked");
    expect(current.loading).toBe(false);
  });
});

import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/beta/access/route";
import { proxy } from "@/proxy";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("@/src/lib/publicConfig", () => ({ hasSupabaseConfig: true, publicConfig: { e2eAccess: false, supabaseUrl: "https://tvdnxefyduycvrakjspv.supabase.co", supabaseAnonKey: "synthetic" } }));
const request = (token = "synthetic-token") => new NextRequest("https://beta.example.test/api/beta/access", { headers: { Authorization: `Bearer ${token}` } });
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-09T12:00:00Z"));
  Object.entries({ MBV_CLOSED_BETA: "1", NEXT_PUBLIC_MBV_CLOSED_BETA: "1", NEXT_PUBLIC_MBV_E2E_ACCESS: "0", NEXT_PUBLIC_SUPABASE_URL: "https://tvdnxefyduycvrakjspv.supabase.co", MBV_BETA_PAUSED: "0", MBV_BETA_STARTS_AT: "2026-11-09T00:00:00Z", MBV_BETA_ENDS_AT: "2026-11-16T00:00:00Z", MBV_BETA_EMAIL_SHA256: createHash("sha256").update("a@example.test").digest("hex"), APP_BASE_URL: "https://beta.example.test" }).forEach(([k, v]) => vi.stubEnv(k, v));
  mocks.getUser.mockResolvedValue({ data: { user: { id: "a", email: "a@example.test", email_confirmed_at: "2026-11-09T00:00:00Z" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: [{ user_id: "a", role: "user", access_status: "free", subscription_status: "none", premium_source: null }], error: null });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
describe("beta API uses normal authentication and real permissions", () => {
  it("validates the token with Auth, returns its own account row and forbids caching", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.getUser).toHaveBeenCalledWith("synthetic-token");
    expect((await response.json() as { access: { user_id: string } }).access.user_id).toBe("a");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("does not trust a forged identity or user_metadata", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("invalid") });
    expect((await GET(request("e2e-user"))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "other", email: "other@example.test", email_confirmed_at: "date", user_metadata: { email: "a@example.test", role: "user" } } }, error: null });
    expect((await GET(request())).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not grant access while pending, on an RPC failure, or for a Premium role", async () => {
    let resolve!: (value: unknown) => void;
    mocks.rpc.mockReturnValueOnce(new Promise((yes) => { resolve = yes; }));
    let completed = false;
    const pending = GET(request()).then((r) => { completed = true; return r; });
    await Promise.resolve(); await Promise.resolve();
    expect(completed).toBe(false);
    resolve({ error: new Error("real failure"), data: null });
    expect((await pending).status).toBe(503);
    mocks.rpc.mockResolvedValueOnce({ data: { user_id: "a", role: "user", access_status: "legacy_premium", subscription_status: "none", premium_source: "legacy" }, error: null });
    expect((await GET(request())).status).toBe(403);
  });
  it("stops access after pause, without changing the account or planner records", async () => {
    vi.stubEnv("MBV_BETA_PAUSED", "1");
    expect((await GET(request())).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("blocks payment routes before any handler and marks beta responses noindex", async () => {
    const denied = proxy(new NextRequest("https://beta.example.test/api/billing/checkout", { method: "POST" }));
    expect(denied.status).toBe(403);
    expect(denied.headers.get("x-robots-tag")).toContain("noindex");
    expect(proxy(new NextRequest("https://beta.example.test/login")).headers.get("x-middleware-next")).toBe("1");
    vi.stubEnv("MBV_CLOSED_BETA", "0"); vi.stubEnv("NEXT_PUBLIC_MBV_CLOSED_BETA", "0");
    expect(proxy(new NextRequest("https://normal.example.test/api/billing/checkout")).headers.get("x-middleware-next")).toBe("1");
  });
});

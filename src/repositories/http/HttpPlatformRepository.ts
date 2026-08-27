import type { PlatformData } from "@/src/domain/platform";

async function request<T>(token: string, init?: RequestInit): Promise<T> {
  const response = await fetch("/api/platform", { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 403 ? "FORBIDDEN" : "PLATFORM_REQUEST_FAILED");
  return data as T;
}

export class HttpPlatformRepository {
  getData(token: string) { return request<PlatformData>(token); }
  action(token: string, body: Record<string, unknown>) { return request<{ ok: true }>(token, { method: "POST", body: JSON.stringify(body) }); }
}

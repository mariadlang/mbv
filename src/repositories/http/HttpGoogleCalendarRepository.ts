import type { CalendarConfigurationInput, CalendarConflictResolutionInput, CalendarEventInput, CalendarEventUpdateInput, CalendarIntegrationSnapshot } from "@/src/domain/calendar";
import type { CalendarIntegrationRepository } from "@/src/repositories/interfaces/CalendarIntegrationRepository";

export class CalendarHttpError extends Error {
  constructor(public status: number, public code: string, public snapshot?: CalendarIntegrationSnapshot) {
    super(code);
    this.name = "CalendarHttpError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string; snapshot?: CalendarIntegrationSnapshot };
  if (!response.ok) throw new CalendarHttpError(response.status, data.error ?? "CALENDAR_REQUEST_FAILED", data.snapshot);
  return data;
}

const authHeaders = (token: string, json = false) => ({
  Authorization: `Bearer ${token}`,
  ...(json ? { "Content-Type": "application/json" } : {}),
});

export class HttpGoogleCalendarRepository implements CalendarIntegrationRepository {
  async getStatus(token: string) {
    return parseResponse<CalendarIntegrationSnapshot>(await fetch("/api/integrations/google-calendar/status", { headers: authHeaders(token) }));
  }

  async beginConnection(token: string, returnTo = "/app/settings") {
    const result = await parseResponse<{ authorizationUrl: string }>(await fetch("/api/integrations/google-calendar/connect", {
      method: "POST", headers: authHeaders(token, true), body: JSON.stringify({ returnTo }),
    }));
    return result.authorizationUrl;
  }

  async completeConnection(token: string) {
    return parseResponse<CalendarIntegrationSnapshot>(await fetch("/api/integrations/google-calendar/complete", {
      method: "POST", headers: authHeaders(token),
    }));
  }

  async configure(token: string, input: CalendarConfigurationInput) {
    return parseResponse<CalendarIntegrationSnapshot>(await fetch("/api/integrations/google-calendar/configure", {
      method: "POST", headers: authHeaders(token, true), body: JSON.stringify(input),
    }));
  }

  async sync(token: string) {
    return parseResponse<CalendarIntegrationSnapshot>(await fetch("/api/integrations/google-calendar/sync", { method: "POST", headers: authHeaders(token) }));
  }

  async createEvent(token: string, input: CalendarEventInput) {
    return parseResponse<CalendarIntegrationSnapshot>(await fetch("/api/integrations/google-calendar/events", {
      method: "POST", headers: authHeaders(token, true), body: JSON.stringify(input),
    }));
  }

  async updateEvent(token: string, input: CalendarEventUpdateInput) {
    return parseResponse<CalendarIntegrationSnapshot>(await fetch("/api/integrations/google-calendar/events", {
      method: "PATCH", headers: authHeaders(token, true), body: JSON.stringify(input),
    }));
  }

  async deleteEvent(token: string, input: CalendarEventUpdateInput) {
    return parseResponse<CalendarIntegrationSnapshot>(await fetch("/api/integrations/google-calendar/events", {
      method: "DELETE", headers: authHeaders(token, true), body: JSON.stringify(input),
    }));
  }

  async resolveConflict(token: string, input: CalendarConflictResolutionInput) {
    return parseResponse<CalendarIntegrationSnapshot>(await fetch("/api/integrations/google-calendar/events", {
      method: "PUT", headers: authHeaders(token, true), body: JSON.stringify(input),
    }));
  }

  async disconnect(token: string) {
    return parseResponse<CalendarIntegrationSnapshot>(await fetch("/api/integrations/google-calendar/disconnect", { method: "POST", headers: authHeaders(token) }));
  }
}

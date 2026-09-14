import type { CalendarConfigurationInput, CalendarConflictResolutionInput, CalendarEventInput, CalendarEventUpdateInput, CalendarIntegrationSnapshot } from "@/src/domain/calendar";

export interface CalendarIntegrationRepository {
  getStatus(token: string): Promise<CalendarIntegrationSnapshot>;
  beginConnection(token: string, returnTo?: string): Promise<string>;
  completeConnection(token: string): Promise<CalendarIntegrationSnapshot>;
  configure(token: string, input: CalendarConfigurationInput): Promise<CalendarIntegrationSnapshot>;
  sync(token: string): Promise<CalendarIntegrationSnapshot>;
  createEvent(token: string, input: CalendarEventInput): Promise<CalendarIntegrationSnapshot>;
  updateEvent(token: string, input: CalendarEventUpdateInput): Promise<CalendarIntegrationSnapshot>;
  deleteEvent(token: string, input: CalendarEventUpdateInput): Promise<CalendarIntegrationSnapshot>;
  resolveConflict(token: string, input: CalendarConflictResolutionInput): Promise<CalendarIntegrationSnapshot>;
  disconnect(token: string): Promise<CalendarIntegrationSnapshot>;
}

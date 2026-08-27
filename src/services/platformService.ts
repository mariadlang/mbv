import { HttpPlatformRepository } from "@/src/repositories/http/HttpPlatformRepository";

const repository = new HttpPlatformRepository();
export const platformService = {
  getData: (token: string) => repository.getData(token),
  updateTicket: (token: string, ticketId: string, status: string, priority: "low" | "normal" | "high" | "urgent") => repository.action(token, { action: "update_ticket", ticketId, status, priority }),
  addNote: (token: string, ticketId: string, note: string) => repository.action(token, { action: "add_note", ticketId, note }),
  updateFaq: (token: string, faq: { id?: string; question: string; answer: string; locale: "es" | "en"; sortOrder: number }) => repository.action(token, { action: "upsert_faq", ...faq }),
  updateSetting: (token: string, key: string, value: unknown) => repository.action(token, { action: "update_setting", key, value }),
};

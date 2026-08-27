export type FeedbackType = "suggestion" | "bug" | "support";
export type TicketStatus = "new" | "in_review" | "waiting_response" | "resolved" | "closed" | "evaluating" | "planned" | "implemented" | "not_planned";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export interface FeedbackTicket {
  id: string;
  reference: string;
  userId: string;
  type: FeedbackType;
  category: string;
  subject: string;
  message: string;
  attachmentPath: string | null;
  pageUrl: string | null;
  deviceMetadata: { browser?: string; os?: string; appVersion?: string; occurredAt?: string };
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface SupportFaq { id: string; question: string; answer: string; locale: "es" | "en"; sortOrder: number }

export const suggestionCategories = ["Organización", "Metas y planificación", "Vista de hoy", "Diario", "Progreso", "Entrenamiento", "Alimentación", "Diseño y experiencia", "Otra"] as const;

export const fallbackFaqs: SupportFaq[] = [
  { id: "edit-goal", question: "¿Cómo edito una meta?", answer: "Abre Metas, selecciona la meta y usa sus acciones para ajustar avance, hitos o estado.", locale: "es", sortOrder: 10 },
  { id: "plan-week", question: "¿Cómo organizo mi semana?", answer: "En Planificación abre Semana, define tus tres prioridades y distribuye acciones con espacio realista.", locale: "es", sortOrder: 20 },
  { id: "language", question: "¿Cómo cambio el idioma?", answer: "Ve a Ajustes y datos, busca Idioma y elige Español o English.", locale: "es", sortOrder: 30 },
  { id: "notifications", question: "¿Cómo modifico las notificaciones?", answer: "En Ajustes puedes administrar las preferencias disponibles. Los permisos del dispositivo dependen también del navegador.", locale: "es", sortOrder: 40 },
  { id: "delete-account", question: "¿Cómo elimino mi cuenta?", answer: "Abre Legal y privacidad, entra al Centro de Privacidad y radica una solicitud de eliminación de cuenta.", locale: "es", sortOrder: 50 },
  { id: "contact", question: "¿Cómo contacto a soporte?", answer: "En esta página elige Contactar a soporte y envía tu mensaje desde la cuenta asociada.", locale: "es", sortOrder: 60 },
];

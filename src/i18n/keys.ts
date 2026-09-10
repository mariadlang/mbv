import type { esMessages } from "@/src/i18n/messages/es";

export type MessageKey = keyof typeof esMessages;
export type MessageParams = Record<string, string | number>;

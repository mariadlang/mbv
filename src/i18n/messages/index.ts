import type { Language } from "@/src/stores/useUiStore";
import { enMessages } from "@/src/i18n/messages/en";
import { esMessages } from "@/src/i18n/messages/es";
import type { MessageKey, MessageParams } from "@/src/i18n/keys";

export const messageCatalogs = { es: esMessages, en: enMessages } as const;

export function formatMessage(language: Language, key: MessageKey, params?: MessageParams): string {
  const template: string = messageCatalogs[language][key];
  if (!params) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder,
  );
}

export { enMessages, esMessages };

import type { Language } from "@/src/stores/useUiStore";

export const localeByLanguage: Record<Language, string> = {
  es: "es-CO",
  en: "en-US",
};

type DateInput = Date | string | number;
type PluralForms = { zero?: string; one: string; other: string };

function asDate(input: DateInput): Date {
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(`${input}T12:00:00`);
  return new Date(input);
}

export function formatDate(language: Language, input: DateInput, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(localeByLanguage[language], options).format(asDate(input));
}

export function formatNumber(language: Language, input: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeByLanguage[language], options).format(input);
}

export function formatCurrency(
  language: Language,
  input: number,
  currency: string,
  options?: Omit<Intl.NumberFormatOptions, "style" | "currency">,
): string {
  return formatNumber(language, input, { style: "currency", currency, ...options });
}

export function formatPlural(language: Language, count: number, forms: PluralForms): string {
  const template = count === 0 && forms.zero ? forms.zero : forms[new Intl.PluralRules(localeByLanguage[language]).select(count) === "one" ? "one" : "other"];
  return template.replaceAll("{count}", formatNumber(language, count));
}

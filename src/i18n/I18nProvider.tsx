"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { translate, translateLegacyText } from "@/src/i18n/translations";
import { formatMessage } from "@/src/i18n/messages";
import type { MessageKey, MessageParams } from "@/src/i18n/keys";
import {
  formatCurrency as formatLocalizedCurrency,
  formatDate as formatLocalizedDate,
  formatNumber as formatLocalizedNumber,
  formatPlural as formatLocalizedPlural,
  localeByLanguage,
} from "@/src/i18n/formatters";
import { useUiStore, type Language } from "@/src/stores/useUiStore";

interface I18nValue {
  language: Language;
  locale: string;
  setLanguage(language: Language): void;
  m(key: MessageKey, params?: MessageParams): string;
  /** @deprecated Compatibility bridge for Spanish source strings. Do not use in new code. */
  t(source: string, params?: Record<string, string | number>): string;
  formatDate(value: Date | string, options?: Intl.DateTimeFormatOptions): string;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatCurrency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, "style" | "currency">): string;
  formatPlural(count: number, forms: { zero?: string; one: string; other: string }): string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const language = useUiStore((state) => state.language);
  const setLanguage = useUiStore((state) => state.setLanguage);
  const originalText = useRef(new WeakMap<Text, string>());
  const lastAppliedText = useRef(new WeakMap<Text, string>());
  const originalAttributes = useRef(new WeakMap<Element, Map<string, { original: string; last: string }>>());

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.i18nLegacyBridge = "active";

    const isOutsideLegacyBridge = (node: Node) => {
      const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
      if (!element) return false;
      if (element.closest("[data-no-translate='true'], [translate='no'], [data-i18n-explicit='true']")) return true;
      return ["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName);
    };

    const translateNode = (root: Node) => {
      const processText = (node: Text) => {
        if (isOutsideLegacyBridge(node)) return;
        const current = node.data;
        const last = lastAppliedText.current.get(node);
        if (!originalText.current.has(node) || (last !== undefined && current !== last)) originalText.current.set(node, current);
        const original = originalText.current.get(node) ?? current;
        const next = translateLegacyText(language, original);
        if (current !== next) node.data = next;
        lastAppliedText.current.set(node, next);
      };
      const processElement = (element: Element) => {
        if (isOutsideLegacyBridge(element)) return;
        for (const attribute of ["placeholder", "aria-label", "title"]) {
          const current = element.getAttribute(attribute);
          if (current === null) continue;
          let map = originalAttributes.current.get(element);
          if (!map) { map = new Map(); originalAttributes.current.set(element, map); }
          const saved = map.get(attribute);
          if (!saved || current !== saved.last) map.set(attribute, { original: current, last: current });
          const record = map.get(attribute)!;
          const next = translateLegacyText(language, record.original);
          if (current !== next) element.setAttribute(attribute, next);
          map.set(attribute, { original: record.original, last: next });
        }
      };
      if (root.nodeType === Node.TEXT_NODE) processText(root as Text);
      if (root.nodeType === Node.ELEMENT_NODE) processElement(root as Element);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) processText(node as Text);
        else processElement(node as Element);
        node = walker.nextNode();
      }
    };
    translateNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateNode(mutation.target);
        if (mutation.type === "attributes") translateNode(mutation.target);
        mutation.addedNodes.forEach(translateNode);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "aria-label", "title"] });
    return () => {
      observer.disconnect();
      delete document.documentElement.dataset.i18nLegacyBridge;
    };
  }, [language]);

  const value = useMemo<I18nValue>(() => ({
    language,
    locale: localeByLanguage[language],
    setLanguage,
    m: (key, params) => formatMessage(language, key, params),
    t: (source, params) => translate(language, source, params),
    formatDate: (input, options) => formatLocalizedDate(language, input, options),
    formatNumber: (input, options) => formatLocalizedNumber(language, input, options),
    formatCurrency: (input, currency, options) => formatLocalizedCurrency(language, input, currency, options),
    formatPlural: (count, forms) => formatLocalizedPlural(language, count, forms),
  }), [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

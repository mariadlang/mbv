"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { localeByLanguage, translate, translateLegacyText } from "@/src/i18n/translations";
import { useUiStore, type Language } from "@/src/stores/useUiStore";

interface I18nValue {
  language: Language;
  locale: string;
  setLanguage(language: Language): void;
  t(source: string, params?: Record<string, string | number>): string;
  formatDate(value: Date | string, options?: Intl.DateTimeFormatOptions): string;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
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
    const translateNode = (root: Node) => {
      const processText = (node: Text) => {
        const current = node.data;
        const last = lastAppliedText.current.get(node);
        if (!originalText.current.has(node) || (last !== undefined && current !== last)) originalText.current.set(node, current);
        const original = originalText.current.get(node) ?? current;
        const next = translateLegacyText(language, original);
        if (current !== next) node.data = next;
        lastAppliedText.current.set(node, next);
      };
      const processElement = (element: Element) => {
        if (element.closest("[data-no-translate='true']")) return;
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
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo<I18nValue>(() => ({
    language,
    locale: localeByLanguage[language],
    setLanguage,
    t: (source, params) => translate(language, source, params),
    formatDate: (input, options) => new Intl.DateTimeFormat(localeByLanguage[language], options).format(typeof input === "string" ? new Date(input) : input),
    formatNumber: (input, options) => new Intl.NumberFormat(localeByLanguage[language], options).format(input),
  }), [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

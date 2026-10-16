"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "@/src/i18n/I18nProvider";

const inertLocks = new Map<HTMLElement, { count: number; previous: boolean }>();
let scrollLocks = 0;
let savedOverflow = "";
let savedPaddingRight = "";

function lockBackground(elements: HTMLElement[]) {
  for (const element of elements) {
    const lock = inertLocks.get(element) ?? { count: 0, previous: element.inert };
    lock.count += 1;
    inertLocks.set(element, lock);
    element.inert = true;
  }
  return () => {
    for (const element of elements) {
      const lock = inertLocks.get(element);
      if (!lock) continue;
      if (--lock.count === 0) { element.inert = lock.previous; inertLocks.delete(element); }
    }
  };
}

export function lockModalScroll() {
  if (scrollLocks++ === 0) {
    savedOverflow = document.body.style.overflow;
    savedPaddingRight = document.body.style.paddingRight;
    const viewportWidth = document.documentElement.clientWidth;
    const scrollbarWidth = viewportWidth > 0 ? window.innerWidth - viewportWidth : 0;
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
  }
  return () => {
    if (--scrollLocks === 0) {
      document.body.style.overflow = savedOverflow;
      document.body.style.paddingRight = savedPaddingRight;
    }
  };
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  explicitI18n = false,
  eyebrow,
  leadingVisual,
  className = "",
  layerClassName = "",
  initialFocusRef,
  inertBackground = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  explicitI18n?: boolean;
  eyebrow?: string;
  leadingVisual?: ReactNode;
  className?: string;
  layerClassName?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  inertBackground?: boolean;
}) {
  const { m } = useI18n();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const backgroundElements = inertBackground
      ? Array.from(document.body.children).filter((element): element is HTMLElement => (
          element instanceof HTMLElement && !element.contains(dialogRef.current)
        ))
      : [];
    const releaseScroll = lockModalScroll();
    const releaseBackground = lockBackground(backgroundElements);
    const preferredFocus = initialFocusRef?.current;
    const initialFocus = preferredFocus && !preferredFocus.matches(":disabled, [inert], [aria-hidden='true']")
      ? preferredFocus
      : closeButtonRef.current;
    initialFocus?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== dialogRef.current) return;
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      releaseBackground();
      releaseScroll();
      if (previousActiveElement?.isConnected && !previousActiveElement.closest("[inert]")) previousActiveElement.focus();
    };
  }, [inertBackground, initialFocusRef, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={`modal-layer ${layerClassName}`.trim()} data-i18n-explicit={explicitI18n ? "true" : undefined}>
      <button
        type="button"
        className="modal-backdrop"
        aria-label={m("modal.closeDialog")}
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="modal__header">
          <div>
            {leadingVisual}
            <p className="eyebrow">{eyebrow ?? m("modal.brand")}</p>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button ref={closeButtonRef} className="icon-button" onClick={onClose} aria-label={m("modal.close")}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}

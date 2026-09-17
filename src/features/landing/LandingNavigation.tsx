"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { LanguageSwitcher } from "@/src/components/ui/LanguageSwitcher";
import type { LandingContent } from "@/src/features/landing/landingContent";

interface LandingNavigationProps {
  content: LandingContent;
  authenticated: boolean;
  onNavigation(section: LandingContent["navigation"][number]["id"]): void;
  onPrimaryAction(): void;
  onLogin(): void;
}

export function LandingNavigation({ content, authenticated, onNavigation, onPrimaryAction, onLogin }: LandingNavigationProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const firstLink = panelRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const close = () => setOpen(false);
  const destination = authenticated ? "/app/dashboard" : "/trial";
  const primaryLabel = authenticated ? content.actions.openSpace : content.actions.start;

  return (
    <>
      <div className="landing-promo" role="note"><span aria-hidden="true">✦</span>{content.promo}<span aria-hidden="true">✦</span></div>
      <header className="landing-header">
        <a className="landing-brand-link" href="#inicio" aria-label="My Best Version — inicio"><BrandMark /></a>
        <nav className="landing-nav landing-nav--desktop" aria-label="Navegación principal">
          {content.navigation.map((item) => <a key={item.id} href={`#${item.id}`} onClick={() => onNavigation(item.id)}>{item.label}</a>)}
        </nav>
        <div className="landing-header__actions">
          <LanguageSwitcher compact />
          {!authenticated && <Link className="landing-login-link" to="/login" onClick={onLogin}>{content.actions.login}</Link>}
          <Link className="landing-button landing-button--primary landing-header__cta" to={destination} onClick={onPrimaryAction}>{primaryLabel}</Link>
          <button
            ref={triggerRef}
            type="button"
            className="landing-menu-trigger"
            aria-label={open ? content.accessibility.menuClose : content.accessibility.menuOpen}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
        </div>
        <div ref={panelRef} id="landing-mobile-menu" className={`landing-mobile-menu ${open ? "is-open" : ""}`} hidden={!open}>
          <nav aria-label="Navegación móvil">
            {content.navigation.map((item) => <a key={item.id} href={`#${item.id}`} onClick={() => { onNavigation(item.id); close(); }}>{item.label}</a>)}
            {!authenticated && <Link to="/login" onClick={() => { onLogin(); close(); }}>{content.actions.login}</Link>}
            <Link className="landing-button landing-button--primary" to={destination} onClick={() => { onPrimaryAction(); close(); }}>{primaryLabel}</Link>
          </nav>
        </div>
      </header>
    </>
  );
}

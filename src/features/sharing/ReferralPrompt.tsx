"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Link2, Share2, UsersRound } from "lucide-react";
import { Button, Card } from "@/src/components/ui/Primitives";
import { buildReferralLink, createOpaqueReferralCode } from "@/src/domain/shareCards";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { SharingMessageKey } from "@/src/i18n/messages/features/sharing";
import { analyticsService } from "@/src/services/analyticsService";
import { useAccount } from "@/src/hooks/useAccount";
import { getOrCreateAccountReferralCode } from "@/src/services/referralAttributionService";

type ReferralStatus = "copied" | "shared" | "fallback" | "create_error" | "copy_error" | null;

const STATUS_KEYS: Record<Exclude<ReferralStatus, null>, SharingMessageKey> = {
  copied: "referral.copied",
  shared: "referral.shared",
  fallback: "referral.shareFallback",
  create_error: "referral.createError",
  copy_error: "referral.copyError",
};

async function copyText(value: string, fallbackInput: HTMLInputElement | null) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch { /* Some browsers expose Clipboard but block it outside secure contexts. */ }
  }
  if (!fallbackInput) throw new Error("CLIPBOARD_UNAVAILABLE");
  fallbackInput.focus();
  fallbackInput.select();
  if (!document.execCommand("copy")) throw new Error("CLIPBOARD_UNAVAILABLE");
}

export function ReferralPrompt() {
  const { m } = useI18n();
  const { user } = useAccount();
  const linkInputRef = useRef<HTMLInputElement>(null);
  const trackedPrompt = useRef(false);
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<ReferralStatus>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (trackedPrompt.current) return;
    trackedPrompt.current = true;
    analyticsService.track("referral_prompt_viewed", { surface: "progress", version: 2 });
  }, []);

  const generate = () => {
    setStatus(null);
    try {
      const code = user?.id
        ? getOrCreateAccountReferralCode(user.id)
        : createOpaqueReferralCode();
      const nextLink = buildReferralLink(code);
      setLink(nextLink);
      analyticsService.track("referral_link_created", { surface: "progress", referral_id: code, version: 2 });
    } catch {
      setStatus("create_error");
    }
  };

  const copy = async (fallback = false) => {
    if (!link) return false;
    try {
      await copyText(link, linkInputRef.current);
      analyticsService.track("referral_link_copied", { surface: "progress", channel: fallback ? "share_fallback" : "clipboard", version: 2 });
      setStatus(fallback ? "fallback" : "copied");
      return true;
    } catch {
      setStatus("copy_error");
      return false;
    }
  };

  const share = async () => {
    if (!link) return;
    const nativeShare = (navigator as unknown as { share?: (data?: ShareData) => Promise<void> }).share?.bind(navigator);
    setBusy(true);
    setStatus(null);
    analyticsService.track("referral_share_started", { surface: "progress", channel: nativeShare ? "web_share" : "clipboard", version: 2 });
    try {
      if (nativeShare) {
        try {
          await nativeShare({ title: "My Best Version", text: m("referral.webShareText"), url: link });
          setStatus("shared");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
      await copy(true);
    } finally {
      setBusy(false);
    }
  };

  return <Card className="referral-prompt" data-i18n-explicit="true">
    <span className="referral-prompt__icon"><UsersRound size={24} aria-hidden="true" /></span>
    <div className="referral-prompt__copy">
      <p className="eyebrow">{m("referral.eyebrow")}</p>
      <h2>{m("referral.title")}</h2>
      <p>{m("referral.description")}</p>
    </div>
    {!link ? <Button variant="secondary" onClick={generate}><Link2 size={17} aria-hidden="true" /> {m("referral.generate")}</Button> : <div className="referral-prompt__link">
      <label><span>{m("referral.linkLabel")}</span><input ref={linkInputRef} readOnly value={link} onFocus={(event) => event.currentTarget.select()} /></label>
      <div>
        <Button size="sm" variant="secondary" onClick={() => void copy()}><Copy size={16} aria-hidden="true" /> {m("referral.copy")}</Button>
        <Button size="sm" onClick={() => void share()} loading={busy}><Share2 size={16} aria-hidden="true" /> {m("referral.share")}</Button>
      </div>
    </div>}
    <small className="referral-prompt__disclaimer">{m("referral.disclaimer")}</small>
    {status ? <p className={`referral-prompt__status${status.endsWith("error") ? " is-error" : ""}`} role={status.endsWith("error") ? "alert" : "status"}>{m(STATUS_KEYS[status])}</p> : null}
  </Card>;
}

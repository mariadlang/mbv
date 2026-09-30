"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Modal } from "@/src/components/ui/Modal";
import { Button, FormField, InlineMessage } from "@/src/components/ui/Primitives";
import { useI18n } from "@/src/i18n/I18nProvider";
import { publicConfig } from "@/src/lib/publicConfig";
import { getLaunchAccessPublicState, requestLaunchAccess } from "@/src/services/launchAccessService";

const emailSchema = z.string().trim().max(254).email();
type RequestState = "available" | "submitting" | "confirmation_pending" | "closed" | "error";
type CampaignState = "loading" | "open" | "closed" | "unavailable";

export function LandingLaunchInvitation() {
  const { language, m } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<RequestState>("available");
  const [campaignState, setCampaignState] = useState<CampaignState>("loading");
  const [validationError, setValidationError] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const resultMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!publicConfig.launchInvitationEnabled) return;
    let active = true;
    let openFrame: number | null = null;
    void getLaunchAccessPublicState().then((result) => {
      if (!active) return;
      setCampaignState(result ?? "unavailable");
      openFrame = window.requestAnimationFrame(() => setOpen(true));
    });
    return () => {
      active = false;
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (state === "confirmation_pending") resultMessageRef.current?.focus();
    if (state === "error") emailInputRef.current?.focus();
  }, [open, state]);

  if (!publicConfig.launchInvitationEnabled || campaignState === "loading") return null;

  const closed = state === "closed" || campaignState === "closed";
  const unavailable = campaignState === "unavailable";
  const modalClosed = closed && state !== "confirmation_pending";
  const submitting = state === "submitting";
  const invitationTotalKey = unavailable
    ? "launch.invitation.unavailableTotal"
    : closed
      ? "launch.invitation.closedTotal"
      : "launch.invitation.total";
  const invitationOfferKey = unavailable
    ? "launch.invitation.unavailableOffer"
    : closed
      ? "launch.invitation.closedOffer"
      : "launch.invitation.offer";
  const invitationCtaKey = unavailable
    ? "launch.invitation.unavailableCta"
    : closed
      ? "launch.invitation.closedCta"
      : "launch.invitation.cta";
  const modalTitle = unavailable
    ? m("launch.unavailable.title")
    : modalClosed
      ? m("launch.closed.title")
      : m("launch.modal.title");
  const modalDescription = unavailable
    ? m("launch.unavailable.description")
    : modalClosed
      ? m("launch.closed.description")
      : m("launch.modal.description");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setValidationError(m("launch.validation.email"));
      setState("available");
      emailInputRef.current?.focus();
      return;
    }

    setValidationError("");
    setState("submitting");
    const result = await requestLaunchAccess(parsed.data, language);
    if (result.status === "closed") setCampaignState("closed");
    setState(result.status);
  };

  return (
    <>
      <aside className={`landing-launch-invitation ${closed || unavailable ? "is-closed" : ""}`.trim()} aria-label={m("launch.invitation.label")}>
        <div className="landing-launch-invitation__inner">
          <p className="landing-launch-invitation__copy">
            <strong>{m(invitationTotalKey)}</strong>
            <span aria-hidden="true">·</span>
            <span>{m(invitationOfferKey)}</span>
          </p>
          <button type="button" className="landing-launch-invitation__button" onClick={() => setOpen(true)}>
            {m(invitationCtaKey)}
          </button>
        </div>
      </aside>

      <Modal
        open={open}
        title={modalTitle}
        description={modalDescription}
        eyebrow={m("launch.modal.eyebrow")}
        onClose={() => setOpen(false)}
        className="landing-launch-modal"
        layerClassName="landing-launch-layer"
        initialFocusRef={emailInputRef}
        inertBackground
        explicitI18n
      >
        {state === "confirmation_pending" ? (
          <div ref={resultMessageRef} className="landing-launch-state" role="status" aria-live="polite" tabIndex={-1}>
            <strong>{m("launch.pending.title")}</strong>
            <p>{m("launch.pending.description")}</p>
          </div>
        ) : null}

        {modalClosed || unavailable ? null : state !== "confirmation_pending" ? (
          <form className="landing-launch-form" onSubmit={(event) => void submit(event)} noValidate aria-busy={submitting || undefined}>
            <FormField label={m("launch.modal.emailLabel")} error={validationError} required>
              <input
                ref={emailInputRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                disabled={submitting}
                value={email}
                placeholder={m("launch.modal.emailPlaceholder")}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (validationError) setValidationError("");
                  if (state === "error") setState("available");
                }}
              />
            </FormField>
            {state === "error" ? <InlineMessage tone="danger">{m("launch.error.recoverable")}</InlineMessage> : null}
            <Button type="submit" size="lg" loading={submitting} className="landing-launch-form__submit">
              {m(submitting ? "launch.modal.submitting" : "launch.modal.submit")}
            </Button>
            <p className="landing-launch-form__support">{m("launch.modal.support")}</p>
            <p className="landing-launch-form__privacy">
              {m("launch.modal.privacyPrefix")} <Link to="/privacy">{m("launch.modal.privacyLink")}</Link>.
            </p>
          </form>
        ) : null}
      </Modal>
    </>
  );
}

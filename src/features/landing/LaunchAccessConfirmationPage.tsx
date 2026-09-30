"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import { Button, FormField, InlineMessage } from "@/src/components/ui/Primitives";
import { PublicFrame } from "@/src/features/account/AccountPages";
import { useI18n } from "@/src/i18n/I18nProvider";
import { publicConfig } from "@/src/lib/publicConfig";
import {
  confirmLaunchAccess,
  requestLaunchAccess,
  type LaunchAccessConfirmationResult,
} from "@/src/services/launchAccessService";

const emailSchema = z.string().trim().max(254).email();
type ConfirmationState = "verifying" | "confirmed" | "expired" | "error" | "resending" | "resent" | "closed";

function readConfirmationToken() {
  const parameters = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = parameters.get("token")?.trim() ?? "";
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
  return token;
}

export function LaunchAccessConfirmationPage() {
  const { language, m } = useI18n();
  const [state, setState] = useState<ConfirmationState>("verifying");
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState("");
  const [resendError, setResendError] = useState(false);
  const confirmationRef = useRef<Promise<LaunchAccessConfirmationResult> | null>(null);

  useEffect(() => {
    if (!publicConfig.launchInvitationEnabled) return;
    confirmationRef.current ??= (() => {
      const token = readConfirmationToken();
      return token ? confirmLaunchAccess(token) : Promise.resolve({ status: "error" as const });
    })();
    let active = true;
    void confirmationRef.current.then((result) => {
      if (!active) return;
      if (result.status === "email_confirmed") setState("confirmed");
      else if (result.status === "expired") setState("expired");
      else setState("error");
    });
    return () => { active = false; };
  }, []);

  if (!publicConfig.launchInvitationEnabled) return <Navigate to="/" replace />;

  const resend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "resending") return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setValidationError(m("launch.validation.email"));
      return;
    }
    setValidationError("");
    setResendError(false);
    setState("resending");
    const result = await requestLaunchAccess(parsed.data, language);
    if (result.status === "confirmation_pending") setState("resent");
    else if (result.status === "closed") setState("closed");
    else {
      setResendError(true);
      setState("expired");
    }
  };

  const showResend = state === "expired" || state === "error" || state === "resending";
  const title = state === "verifying"
    ? m("launch.confirmation.verifyingTitle")
    : state === "confirmed"
      ? m("launch.confirmation.confirmedTitle")
      : state === "resent"
        ? m("launch.pending.title")
        : state === "closed"
          ? m("launch.closed.title")
          : state === "expired" || state === "resending"
            ? m("launch.confirmation.expiredTitle")
            : m("launch.confirmation.errorTitle");
  const description = state === "verifying"
    ? m("launch.confirmation.verifyingDescription")
    : state === "confirmed"
      ? m("launch.confirmation.confirmedDescription")
      : state === "resent"
        ? m("launch.pending.description")
        : state === "closed"
          ? m("launch.closed.description")
          : state === "expired" || state === "resending"
            ? m("launch.confirmation.expiredDescription")
            : m("launch.confirmation.errorDescription");

  return (
    <PublicFrame>
      <section className="auth-card auth-card--message launch-confirmation-page" data-i18n-explicit="true" aria-live="polite">
        <p className="eyebrow">{m("launch.confirmation.eyebrow")}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        {showResend ? (
          <form onSubmit={(event) => void resend(event)} noValidate aria-busy={state === "resending" || undefined}>
            <FormField label={m("launch.confirmation.resendEmailLabel")} error={validationError} required>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                disabled={state === "resending"}
                value={email}
                placeholder={m("launch.modal.emailPlaceholder")}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (validationError) setValidationError("");
                  if (resendError) setResendError(false);
                }}
              />
            </FormField>
            {resendError ? <InlineMessage tone="danger">{m("launch.error.recoverable")}</InlineMessage> : null}
            <Button type="submit" size="lg" loading={state === "resending"}>
              {m(state === "resending" ? "launch.confirmation.resendSubmitting" : "launch.confirmation.resendSubmit")}
            </Button>
          </form>
        ) : null}
        <Link className="button button--secondary" to="/">{m("launch.confirmation.home")}</Link>
      </section>
    </PublicFrame>
  );
}

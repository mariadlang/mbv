"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Modal } from "@/src/components/ui/Modal";
import { Button, FormField, InlineMessage } from "@/src/components/ui/Primitives";
import { useI18n } from "@/src/i18n/I18nProvider";
import { publicConfig } from "@/src/lib/publicConfig";
import { getLaunchAccessPublicState, requestLaunchAccess } from "@/src/services/launchAccessService";

const emailSchema = z.string().trim().max(254).email();
const AUTO_OPEN_DELAY_MS = 4_000;
const SEEN_STORAGE_KEY = "mbv:launch-waitlist:v1:seen";
const SESSION_STORAGE_KEY = "mbv:launch-waitlist:v1:shown-this-visit";
const SUBMITTED_STORAGE_KEY = "mbv:launch-waitlist:v1:submitted";
const PENDING_STORAGE_KEY = "mbv:launch-waitlist:v1:pending";
const PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

type CampaignState = "loading" | "open" | "closed" | "unavailable";
type ViewState = "waitlist" | "waitlist_confirmation" | "newsletter" | "newsletter_confirmation" | "unavailable";
type SubmissionState = "idle" | "submitting" | "error";
type PendingRequest = {
  requestId: string;
  email: string;
  locale: "es" | "en";
  requestType: "waitlist" | "newsletter_only";
  newsletterOptIn: boolean;
  createdAt: number;
};

const pendingRequestSchema = z.object({
  requestId: z.string().uuid(),
  email: emailSchema,
  locale: z.enum(["es", "en"]),
  requestType: z.enum(["waitlist", "newsletter_only"]),
  newsletterOptIn: z.boolean(),
  createdAt: z.number().int().nonnegative(),
});

function readStoredSubmission(): "waitlist" | "newsletter" | null {
  try {
    const value = window.localStorage.getItem(SUBMITTED_STORAGE_KEY);
    return value === "waitlist" || value === "newsletter" ? value : null;
  } catch {
    return null;
  }
}

function storageHas(key: string, storageType: "local" | "session") {
  try {
    const storage = storageType === "local" ? window.localStorage : window.sessionStorage;
    return storage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markShown() {
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, "1");
  } catch {
    // Display preferences are best-effort and never block the invitation itself.
  }
  try {
    window.localStorage.setItem(SEEN_STORAGE_KEY, "1");
  } catch {
    // Each storage mechanism remains independent if the other is unavailable.
  }
}

function markSubmitted(kind: "waitlist" | "newsletter") {
  try {
    window.localStorage.setItem(SUBMITTED_STORAGE_KEY, kind);
  } catch {
    // The persisted backend result remains authoritative when local storage is unavailable.
  }
}

function clearPendingRequest() {
  try {
    window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
  } catch {
    // Idempotency persistence is best-effort when storage is unavailable.
  }
}

function readPendingRequest(): PendingRequest | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = pendingRequestSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || Date.now() - parsed.data.createdAt > PENDING_MAX_AGE_MS) {
      clearPendingRequest();
      return null;
    }
    return parsed.data;
  } catch {
    clearPendingRequest();
    return null;
  }
}

function storePendingRequest(request: PendingRequest) {
  try {
    window.sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(request));
  } catch {
    // The in-memory request ID still protects ordinary retries in this visit.
  }
}

function pendingMatches(
  pending: PendingRequest,
  payload: Pick<PendingRequest, "email" | "locale" | "requestType" | "newsletterOptIn">,
) {
  return pending.email === payload.email
    && pending.locale === payload.locale
    && pending.requestType === payload.requestType
    && pending.newsletterOptIn === payload.newsletterOptIn;
}

export function LandingLaunchInvitation() {
  const { language, m } = useI18n();
  const [open, setOpen] = useState(false);
  const [campaignState, setCampaignState] = useState<CampaignState>("loading");
  const [viewState, setViewState] = useState<ViewState>("waitlist");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [initialPending] = useState<PendingRequest | null>(() => (
    typeof window === "undefined" ? null : readPendingRequest()
  ));
  const [email, setEmail] = useState(initialPending?.email ?? "");
  const [newsletterOptIn, setNewsletterOptIn] = useState(initialPending?.newsletterOptIn ?? false);
  const [validationError, setValidationError] = useState("");
  const [consentError, setConsentError] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const newsletterCheckboxRef = useRef<HTMLInputElement>(null);
  const resultActionRef = useRef<HTMLButtonElement>(null);
  const submitInFlightRef = useRef(false);
  const requestIdRef = useRef(initialPending?.requestId ?? "");
  const shownThisVisitRef = useRef(false);

  const submitted = viewState === "waitlist_confirmation" || viewState === "newsletter_confirmation";
  const newsletterView = viewState === "newsletter";
  const unavailable = viewState === "unavailable";
  const submitting = submissionState === "submitting";

  useEffect(() => {
    if (!publicConfig.launchInvitationEnabled) return;
    const pendingRequest = initialPending;
    let active = true;
    let stateReady = false;
    let delayElapsed = false;
    let nextCampaignState: CampaignState = "unavailable";

    const maybeAutoOpen = () => {
      if (
        !active
        || !stateReady
        || !delayElapsed
        || nextCampaignState === "unavailable"
        || shownThisVisitRef.current
        || (!pendingRequest && storageHas(SESSION_STORAGE_KEY, "session"))
        || (!pendingRequest && storageHas(SEEN_STORAGE_KEY, "local"))
        || readStoredSubmission()
      ) return;
      shownThisVisitRef.current = true;
      markShown();
      setOpen(true);
    };

    const timer = window.setTimeout(() => {
      delayElapsed = true;
      maybeAutoOpen();
    }, AUTO_OPEN_DELAY_MS);

    void getLaunchAccessPublicState().then((result) => {
      if (!active) return;
      nextCampaignState = result ?? "unavailable";
      const storedSubmission = readStoredSubmission();
      setCampaignState(nextCampaignState);

      if (storedSubmission === "waitlist") setViewState("waitlist_confirmation");
      else if (pendingRequest?.requestType === "waitlist") setViewState("waitlist");
      else if (pendingRequest?.requestType === "newsletter_only" && nextCampaignState === "closed") setViewState("newsletter");
      else if (nextCampaignState === "closed" && storedSubmission === "newsletter") setViewState("newsletter_confirmation");
      else if (nextCampaignState === "closed") setViewState("newsletter");
      else if (nextCampaignState === "unavailable") setViewState("unavailable");
      else setViewState("waitlist");
      stateReady = true;
      maybeAutoOpen();
    });

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [initialPending]);

  useEffect(() => {
    if (!open) return;
    if (submitted) resultActionRef.current?.focus();
    else if (submissionState === "error") emailInputRef.current?.focus();
  }, [open, submissionState, submitted, viewState]);

  if (!publicConfig.launchInvitationEnabled || campaignState === "loading") return null;

  const openInvitation = () => {
    const storedSubmission = readStoredSubmission();
    const pendingRequest = readPendingRequest();
    if (pendingRequest) {
      requestIdRef.current = pendingRequest.requestId;
      setEmail(pendingRequest.email);
      setNewsletterOptIn(pendingRequest.newsletterOptIn);
    }
    if (storedSubmission === "waitlist") setViewState("waitlist_confirmation");
    else if (pendingRequest?.requestType === "waitlist") setViewState("waitlist");
    else if (pendingRequest?.requestType === "newsletter_only" && campaignState === "closed") setViewState("newsletter");
    else if (campaignState === "closed" && storedSubmission === "newsletter") setViewState("newsletter_confirmation");
    else if (campaignState === "closed") setViewState("newsletter");
    else if (campaignState === "unavailable") setViewState("unavailable");
    else setViewState("waitlist");
    setSubmissionState("idle");
    setValidationError("");
    setConsentError("");
    shownThisVisitRef.current = true;
    markShown();
    setOpen(true);
  };

  const closeInvitation = () => {
    shownThisVisitRef.current = true;
    markShown();
    setOpen(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || submitInFlightRef.current || unavailable || submitted) return;

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setValidationError(m("launch.validation.email"));
      setConsentError("");
      setSubmissionState("idle");
      emailInputRef.current?.focus();
      return;
    }
    if (newsletterView && !newsletterOptIn) {
      setValidationError("");
      setConsentError(m("launch.validation.newsletterConsent"));
      setSubmissionState("idle");
      newsletterCheckboxRef.current?.focus();
      return;
    }

    setValidationError("");
    setConsentError("");
    submitInFlightRef.current = true;
    setSubmissionState("submitting");
    const requestType = newsletterView ? "newsletter_only" : "waitlist";
    const payload = {
      email: parsed.data,
      locale: language,
      requestType,
      newsletterOptIn: newsletterView ? true : newsletterOptIn,
    } as const;
    const storedPending = readPendingRequest();
    requestIdRef.current = storedPending && pendingMatches(storedPending, payload)
      ? storedPending.requestId
      : crypto.randomUUID();
    storePendingRequest({
      ...payload,
      requestId: requestIdRef.current,
      createdAt: storedPending && storedPending.requestId === requestIdRef.current
        ? storedPending.createdAt
        : Date.now(),
    });
    const result = await requestLaunchAccess(parsed.data, payload.locale, {
      requestId: requestIdRef.current,
      requestType,
      newsletterOptIn: payload.newsletterOptIn,
      origin: "landing_launch",
    });
    submitInFlightRef.current = false;

    if (result.status === "closed") {
      requestIdRef.current = "";
      clearPendingRequest();
      setCampaignState("closed");
      setNewsletterOptIn(false);
      setViewState("newsletter");
      setSubmissionState("idle");
      return;
    }
    if (result.status === "unavailable") {
      requestIdRef.current = "";
      clearPendingRequest();
      setCampaignState("unavailable");
      setViewState("unavailable");
      setSubmissionState("idle");
      return;
    }
    if (result.status === "request_received") {
      requestIdRef.current = "";
      clearPendingRequest();
      markSubmitted("waitlist");
      setViewState("waitlist_confirmation");
      setSubmissionState("idle");
      return;
    }
    if (result.status === "newsletter_subscribed") {
      requestIdRef.current = "";
      clearPendingRequest();
      markSubmitted("newsletter");
      setViewState("newsletter_confirmation");
      setSubmissionState("idle");
      return;
    }
    setSubmissionState("error");
  };

  const invitationTotalKey = campaignState === "unavailable"
    ? "launch.invitation.unavailableTotal"
    : campaignState === "closed"
      ? "launch.invitation.closedTotal"
      : "launch.invitation.total";
  const invitationOfferKey = campaignState === "unavailable"
    ? "launch.invitation.unavailableOffer"
    : campaignState === "closed"
      ? "launch.invitation.closedOffer"
      : "launch.invitation.offer";
  const invitationCtaKey = campaignState === "unavailable"
    ? "launch.invitation.unavailableCta"
    : campaignState === "closed"
      ? "launch.invitation.closedCta"
      : "launch.invitation.cta";

  const modalTitle = viewState === "waitlist_confirmation"
    ? m("launch.pending.title")
    : viewState === "newsletter_confirmation"
      ? m("launch.newsletter.pending.title")
      : newsletterView
        ? m("launch.closed.title")
        : unavailable
          ? m("launch.unavailable.title")
          : m("launch.modal.title");
  const modalDescription = viewState === "waitlist_confirmation"
    ? m("launch.pending.description")
    : viewState === "newsletter_confirmation"
      ? m("launch.newsletter.pending.description")
      : newsletterView
        ? m("launch.closed.description")
        : unavailable
          ? m("launch.unavailable.description")
          : m("launch.modal.description");

  return (
    <>
      <aside
        className={`landing-launch-invitation ${campaignState !== "open" ? "is-closed" : ""}`.trim()}
        aria-label={m("launch.invitation.label")}
      >
        <div className="landing-launch-invitation__inner">
          <p className="landing-launch-invitation__copy">
            <strong>{m(invitationTotalKey)}</strong>
            <span aria-hidden="true">·</span>
            <span>{m(invitationOfferKey)}</span>
          </p>
          <button type="button" className="landing-launch-invitation__button" onClick={openInvitation}>
            {m(invitationCtaKey)}
          </button>
        </div>
      </aside>

      <Modal
        open={open}
        title={modalTitle}
        description={modalDescription}
        eyebrow={submitted || newsletterView || unavailable ? "" : m("launch.modal.eyebrow")}
        leadingVisual={viewState === "waitlist_confirmation" ? (
          <span className="landing-launch-modal__leading" aria-hidden="true"><Check size={28} /></span>
        ) : newsletterView || viewState === "newsletter_confirmation" ? (
          <span className="landing-launch-modal__leading" aria-hidden="true"><Mail size={26} /></span>
        ) : undefined}
        onClose={closeInvitation}
        className={`landing-launch-modal landing-launch-modal--${viewState.replaceAll("_", "-")}`}
        layerClassName="landing-launch-layer"
        initialFocusRef={submitted || unavailable ? resultActionRef : emailInputRef}
        inertBackground
        explicitI18n
      >
        {submitted ? (
          <div className="landing-launch-state" role="status" aria-live="polite" aria-atomic="true">
            <span className="sr-only">{modalTitle}. {modalDescription}</span>
            <button ref={resultActionRef} type="button" onClick={closeInvitation} className="button button--primary button--lg landing-launch-state__action">
              {m("launch.pending.continue")}
            </button>
            <p className="landing-launch-form__privacy">
              <Link to="/privacy">{m("launch.modal.privacyLink")}</Link>
            </p>
          </div>
        ) : unavailable ? (
          <div className="landing-launch-state landing-launch-state--unavailable" role="status">
            <button ref={resultActionRef} type="button" onClick={closeInvitation} className="button button--outline button--lg landing-launch-state__action">
              {m("launch.pending.continue")}
            </button>
          </div>
        ) : (
          <form className="landing-launch-form" onSubmit={(event) => void submit(event)} noValidate aria-busy={submitting || undefined}>
            {newsletterView ? (
              <p className="landing-launch-form__newsletter-copy">{m("launch.closed.support")}</p>
            ) : (
              <div className="landing-launch-form__notice">
                <Mail size={24} aria-hidden="true" />
                <p>{m("launch.modal.notice")}</p>
              </div>
            )}

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
                  requestIdRef.current = "";
                  clearPendingRequest();
                  if (validationError) setValidationError("");
                  if (submissionState === "error") setSubmissionState("idle");
                }}
              />
            </FormField>

            <label className="landing-launch-form__consent">
              <input
                ref={newsletterCheckboxRef}
                type="checkbox"
                checked={newsletterOptIn}
                disabled={submitting}
                aria-invalid={Boolean(consentError) || undefined}
                aria-describedby={consentError ? "launch-newsletter-consent-error" : undefined}
                onChange={(event) => {
                  setNewsletterOptIn(event.target.checked);
                  requestIdRef.current = "";
                  clearPendingRequest();
                  if (consentError) setConsentError("");
                }}
              />
              <span>{m("launch.modal.newsletterOptIn")}</span>
            </label>
            {consentError ? (
              <div id="launch-newsletter-consent-error" className="inline-message inline-message--danger landing-launch-form__consent-error" role="alert">
                {consentError}
              </div>
            ) : null}

            {submissionState === "error" ? <InlineMessage tone="danger">{m("launch.error.recoverable")}</InlineMessage> : null}
            <Button type="submit" size="lg" loading={submitting} className="landing-launch-form__submit">
              {m(submitting
                ? "launch.modal.submitting"
                : newsletterView
                  ? "launch.closed.submit"
                  : "launch.modal.submit")}
            </Button>
            {!newsletterView ? (
              <button type="button" className="landing-launch-form__secondary" onClick={closeInvitation}>
                {m("launch.modal.secondary")}
              </button>
            ) : null}
            <p className="landing-launch-form__privacy">
              <Link to="/privacy">{m("launch.modal.privacyLink")}</Link>
            </p>
          </form>
        )}
      </Modal>
    </>
  );
}

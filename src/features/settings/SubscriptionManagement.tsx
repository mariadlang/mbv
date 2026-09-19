"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CreditCard, ShieldCheck } from "lucide-react";
import { Modal } from "@/src/components/ui/Modal";
import { Button, InlineMessage } from "@/src/components/ui/Primitives";
import type { UserAccess } from "@/src/domain/access";
import { useAccount } from "@/src/hooks/useAccount";
import { useI18n } from "@/src/i18n/I18nProvider";
import { BillingCheckoutError } from "@/src/repositories/billing/MercadoPagoBillingRepository";
import { billingService } from "@/src/services/billingService";

export function SubscriptionManagement({ access }: { access: UserAccess }) {
  const { formatDate, m } = useI18n();
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const paidSubscription = access.premiumSource === "paid_subscription";
  const cancellationScheduled = access.cancelAtPeriodEnd || access.subscriptionStatus === "cancel_at_period_end";
  const canCancel = paidSubscription
    && ["pending", "active", "past_due"].includes(access.subscriptionStatus)
    && !cancellationScheduled;
  const paidThrough = access.currentPeriodEndsAt
    ? formatDate(access.currentPeriodEndsAt, { dateStyle: "long" })
    : null;

  const confirmCancellation = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await billingService.cancelSubscription();
      setOpen(false);
      const accessUntil = result.accessUntil
        ? formatDate(result.accessUntil, { dateStyle: "long" })
        : null;
      setFeedback({
        tone: "success",
        text: result.status === "scheduled" && accessUntil
          ? m("settings.plan.cancelScheduledMessage", { date: accessUntil })
          : m("settings.plan.cancelEndedMessage"),
      });
      await account.refreshAccess().catch(() => undefined);
    } catch (error) {
      const unavailable = error instanceof BillingCheckoutError
        && ["BILLING_NOT_CONFIGURED", "BILLING_SUBSCRIPTION_NOT_FOUND"].includes(error.code);
      setFeedback({
        tone: "danger",
        text: m(unavailable ? "settings.plan.cancelUnavailable" : "settings.plan.cancelError"),
      });
    } finally {
      setBusy(false);
    }
  };

  return <div className="settings-plan-card__management">
    {cancellationScheduled && paidThrough ? <InlineMessage tone="success">
      <CalendarClock size={16} aria-hidden="true" />
      {m("settings.plan.cancelAlreadyScheduled", { date: paidThrough })}
    </InlineMessage> : null}
    {feedback ? <InlineMessage tone={feedback.tone}>{feedback.text}</InlineMessage> : null}
    <div className="settings-plan-card__actions">
      <Link className="button button--secondary" to="/payments">{m("settings.plan.manageSubscription")}</Link>
      {canCancel ? <Button variant="ghost" onClick={() => setOpen(true)}>
        {m("settings.plan.cancelAction")}
      </Button> : null}
    </div>
    <Modal
      open={open}
      title={m("settings.plan.cancelTitle")}
      description={paidThrough
        ? m("settings.plan.cancelDescriptionDated", { date: paidThrough })
        : m("settings.plan.cancelDescriptionImmediate")}
      onClose={() => { if (!busy) setOpen(false); }}
      explicitI18n
    >
      <div className="settings-plan-cancel">
        <div><ShieldCheck size={20} aria-hidden="true" /><p>{m("settings.plan.cancelKeepsData")}</p></div>
        <div><CreditCard size={20} aria-hidden="true" /><p>{m("settings.plan.cancelSeparateRights")}</p></div>
        <div className="modal__actions">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
            {m("settings.plan.cancelKeep")}
          </Button>
          <Button type="button" variant="danger" loading={busy} onClick={() => void confirmCancellation()}>
            {m("settings.plan.cancelConfirm")}
          </Button>
        </div>
      </div>
    </Modal>
  </div>;
}

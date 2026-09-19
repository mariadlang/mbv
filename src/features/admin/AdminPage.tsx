"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, MessagesSquare, ShieldCheck, Users } from "lucide-react";
import { Navigate } from "react-router-dom";
import { COMMERCIAL_TRIAL_CONFIRMATION, type AccessStatus } from "@/src/domain/access";
import type { AdminAccountRow } from "@/src/repositories/interfaces/AdminRepository";
import { useAccount } from "@/src/hooks/useAccount";
import { adminService } from "@/src/services/adminService";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";
import type { PrivacyRequest } from "@/src/domain/legal";
import { legalPrivacyService } from "@/src/services/legalPrivacyService";

const dateFormatter = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });
const dateOnlyFormatter = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? dateOnlyFormatter.format(date)
    : dateFormatter.format(date);
}

function formatDateRange(account: AdminAccountRow): string {
  if (!account.eligibilityPeriodStartedOn || !account.eligibilityPeriodEndedOn) return "—";
  return `${formatDate(account.eligibilityPeriodStartedOn)} – ${formatDate(account.eligibilityPeriodEndedOn)}`;
}

function accessLabel(status: AccessStatus): string {
  const labels: Record<AccessStatus, string> = {
    free: "Gratis",
    eligible: "Elegible",
    pending_activation: "Pendiente de activación",
    trial_active: "Prueba Premium activa",
    trial_expired: "Prueba finalizada",
    paid_monthly: "Premium mensual",
    paid_annual: "Premium anual",
    payment_pending: "Pago pendiente",
    payment_failed: "Pago fallido",
    cancellation_scheduled: "Cancelación programada",
    subscription_ended: "Suscripción terminada",
    legacy_premium: "Premium anterior",
    blocked: "Bloqueado",
    trial: "Prueba anterior",
    active: "Premium anterior",
    expired: "Prueba anterior finalizada",
  };
  return labels[status];
}

function accessTone(status: AccessStatus): "neutral" | "rose" | "sage" | "warm" | "danger" {
  if (["paid_monthly", "paid_annual", "trial_active", "legacy_premium", "active"].includes(status)) return "sage";
  if (["eligible", "pending_activation"].includes(status)) return "warm";
  if (["payment_failed", "blocked"].includes(status)) return "danger";
  if (status === "trial") return "rose";
  return "neutral";
}

function canActivateTrial(account: AdminAccountRow): boolean {
  return account.eligibilityStatus === "eligible"
    && !account.trialGrantedAt
    && !["paid_monthly", "paid_annual", "cancellation_scheduled", "legacy_premium", "active"].includes(account.accessStatus);
}

export function AdminPage({ embedded = false, focusUserId = null }: { embedded?: boolean; focusUserId?: string | null }) {
  const { access } = useAccount();
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [nextAccounts, nextRequests] = await Promise.all([
        adminService.listAccounts(),
        legalPrivacyService.listAllRequests(),
      ]);
      setAccounts(nextAccounts);
      setRequests(nextRequests);
      setError("");
    } catch {
      setError("No pudimos cargar el panel. Verifica las políticas y funciones de Supabase.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (access?.role !== "superadmin") return;
    let active = true;
    Promise.all([adminService.listAccounts(), legalPrivacyService.listAllRequests()])
      .then(([items, legalRequests]) => {
        if (!active) return;
        setAccounts(items);
        setRequests(legalRequests);
        setError("");
      })
      .catch(() => {
        if (active) setError("No pudimos cargar el panel. Verifica las políticas y funciones de Supabase.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [access?.role]);

  useEffect(() => {
    if (!focusUserId || loading) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`commercial-user-${focusUserId}`)?.scrollIntoView({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [accounts.length, focusUserId, loading]);

  if (!access) return null;
  if (access.role !== "superadmin") return <Navigate to="/app/dashboard" replace />;

  const activateTrial = async (account: AdminAccountRow) => {
    if (!account.campaignKey || !canActivateTrial(account)) return;
    const confirmed = window.confirm(
      `¿Confirmas activar una única prueba de 30 días de Premium para ${account.displayName || account.email}? No genera cobros ni una suscripción automática.`,
    );
    if (!confirmed) return;

    setMessage("");
    setError("");
    setActivatingUserId(account.userId);
    try {
      const result = await adminService.activateCommercialTrial({
        userId: account.userId,
        campaignKey: account.campaignKey,
        confirmation: COMMERCIAL_TRIAL_CONFIRMATION,
      });
      if (result.outcome === "conflict_paid_premium") {
        setError("La cuenta ya tiene Premium pagado. Se registró el conflicto para revisión y no se concedió otra prueba.");
      } else if (result.outcome === "already_activated") {
        setMessage("La prueba ya había sido activada. No se creó una concesión adicional.");
      } else {
        setMessage(`Premium gratis quedó activo hasta ${formatDate(result.trialEndsAt)} y la acción fue auditada.`);
      }
      await load();
    } catch {
      setError("No pudimos activar la prueba. No se aplicó ningún cambio local.");
    } finally {
      setActivatingUserId(null);
    }
  };

  const changeRequestStatus = async (request: PrivacyRequest, status: PrivacyRequest["status"]) => {
    try {
      await legalPrivacyService.updateRequestStatus(request.id, status);
      setMessage(`La solicitud ${request.reference} quedó actualizada.`);
      await load();
    } catch {
      setError("No pudimos actualizar la solicitud.");
    }
  };

  const pendingActivations = accounts.filter((item) => item.eligibilityStatus === "eligible").length;
  const activePremium = accounts.filter((item) => ["paid_monthly", "paid_annual", "trial_active", "legacy_premium", "active"].includes(item.accessStatus)).length;

  const Container = embedded ? "section" : "main";
  return <Container className="admin-page">
    <SectionHeading
      eyebrow="SUPERADMIN"
      title="Accesos, suscripciones y PQR"
      description="Revisa elegibilidad y activa manualmente el beneficio de 30 días mediante operaciones protegidas y auditadas en el servidor."
    />
    <div className="admin-metrics">
      <Card><Users size={20} /><strong>{accounts.length}</strong><span>Cuentas</span></Card>
      <Card><CheckCircle2 size={20} /><strong>{activePremium}</strong><span>Premium activas</span></Card>
      <Card><ShieldCheck size={20} /><strong>{pendingActivations}</strong><span>Pendientes de activación</span></Card>
      <Card><MessagesSquare size={20} /><strong>{requests.filter((item) => item.status !== "closed").length}</strong><span>Solicitudes abiertas</span></Card>
    </div>
    {message && <p className="inline-message" role="status">{message}</p>}
    {error && <p className="inline-message inline-message--error" role="alert">{error}</p>}
    {loading ? <p role="status">Cargando panel…</p> : <>
      <h2>Acceso comercial</h2>
      {accounts.length ? <div className="admin-table-wrap"><table>
        <thead><tr>
          <th>Persona</th><th>Estado</th><th>Participación</th><th>Evidencia</th><th>Prueba</th><th><span className="sr-only">Acciones</span></th>
        </tr></thead>
        <tbody>{accounts.map((account) => <tr id={`commercial-user-${account.userId}`} className={focusUserId === account.userId ? "is-focused" : undefined} key={account.userId}>
          <td data-label="Persona"><strong>{account.displayName}</strong><small>{account.email}</small></td>
          <td data-label="Estado">
            <Badge tone={accessTone(account.accessStatus)}>{accessLabel(account.accessStatus)}</Badge>
            <small>{account.planInterval ? `Plan ${account.planInterval === "monthly" ? "mensual" : "anual"}` : account.subscriptionStatus}</small>
            {account.conflictReason && <small>Revisión: {account.conflictReason}</small>}
          </td>
          <td data-label="Participación"><strong>{account.currentStreakDays} / 30 días</strong><small>{account.fixedTimezone ?? "Sin zona fijada"}</small></td>
          <td data-label="Evidencia"><span>{formatDateRange(account)}</span><small>{account.eligibleAt ? `Elegible desde ${formatDate(account.eligibleAt)}` : "Aún no elegible"}</small></td>
          <td data-label="Prueba"><span>{account.trialEndsAt ? `Hasta ${formatDate(account.trialEndsAt)}` : "—"}</span><small>{account.trialGrantedAt ? `Activada ${formatDate(account.trialGrantedAt)}` : "Sin activar"}</small></td>
          <td data-label="Acciones">
            {canActivateTrial(account)
              ? <Button
                  variant="secondary"
                  disabled={activatingUserId === account.userId}
                  onClick={() => void activateTrial(account)}
                >
                  {activatingUserId === account.userId ? "Activando…" : "Activar 30 días de Premium gratis"}
                </Button>
              : <span aria-label="Sin acción disponible">—</span>}
          </td>
        </tr>)}</tbody>
      </table></div> : <EmptyState title="No hay cuentas para mostrar" text="Las cuentas aparecerán después de aplicar la migración y registrar usuarios." />}

      <h2>Solicitudes legales y PQR</h2>
      {requests.length ? <div className="admin-table-wrap"><table>
        <thead><tr><th>Referencia</th><th>Tipo</th><th>Estado</th><th>Fecha objetivo</th><th>Acciones</th></tr></thead>
        <tbody>{requests.map((request) => <tr key={request.id}>
          <td data-label="Referencia"><strong>{request.reference}</strong><small>{request.subject}</small></td>
          <td data-label="Tipo">{request.type}</td>
          <td data-label="Estado"><Badge tone={request.status === "closed" ? "sage" : "warm"}>{request.status}</Badge></td>
          <td data-label="Fecha objetivo">{formatDate(request.deadlineAt)}</td>
          <td data-label="Acciones"><select aria-label={`Estado de ${request.reference}`} value={request.status} onChange={(event) => void changeRequestStatus(request, event.target.value as PrivacyRequest["status"])}>
            <option value="received">Recibida</option>
            <option value="in_review">En revisión</option>
            <option value="answered">Respondida</option>
            <option value="closed">Cerrada</option>
          </select></td>
        </tr>)}</tbody>
      </table></div> : <EmptyState title="No hay solicitudes" text="Las PQR y solicitudes de privacidad aparecerán aquí después de aplicar la migración." />}
    </>}
  </Container>;
}

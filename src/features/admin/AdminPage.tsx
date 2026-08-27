"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MessagesSquare, ShieldCheck, Users } from "lucide-react";
import { Navigate } from "react-router-dom";
import type { AdminAccountRow } from "@/src/repositories/interfaces/AdminRepository";
import { useAccount } from "@/src/hooks/useAccount";
import { adminService } from "@/src/services/adminService";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";
import type { PrivacyRequest } from "@/src/domain/legal";
import { legalPrivacyService } from "@/src/services/legalPrivacyService";

export function AdminPage() {
  const { access } = useAccount();
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => { try { const [nextAccounts, nextRequests] = await Promise.all([adminService.listAccounts(), legalPrivacyService.listAllRequests()]); setAccounts(nextAccounts); setRequests(nextRequests); setError(""); } catch { setError("No pudimos cargar el panel. Verifica las políticas y funciones de Supabase."); } finally { setLoading(false); } };
  useEffect(() => {
    if (access?.role !== "superadmin") return;
    let active = true;
    Promise.all([adminService.listAccounts(), legalPrivacyService.listAllRequests()]).then(([items, legalRequests]) => { if (active) { setAccounts(items); setRequests(legalRequests); setError(""); } }).catch(() => { if (active) setError("No pudimos cargar el panel. Verifica las políticas y funciones de Supabase."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [access?.role]);
  if (!access) return null;
  if (access.role !== "superadmin") return <Navigate to="/app/dashboard" replace />;
  const toggle = async (account: AdminAccountRow) => { setMessage(""); setError(""); try { const enabling = account.accessStatus !== "active"; await adminService.setPremium({ userId: account.userId, enabled: enabling, note: enabling ? "Activación manual desde el panel" : "Desactivación manual desde el panel" }); setMessage(enabling ? "Premium activado y auditado." : "Premium desactivado y auditado."); await load(); } catch { setError("No pudimos actualizar el acceso. No se aplicó ningún cambio local."); } };
  const changeRequestStatus = async (request: PrivacyRequest, status: PrivacyRequest["status"]) => { try { await legalPrivacyService.updateRequestStatus(request.id, status); setMessage(`La solicitud ${request.reference} quedó actualizada.`); await load(); } catch { setError("No pudimos actualizar la solicitud."); } };
  return <main className="admin-page"><SectionHeading eyebrow="SUPERADMIN" title="Accesos, suscripciones y PQR" description="Consulta cuentas y solicitudes mediante operaciones protegidas por políticas de servidor." /><div className="admin-metrics"><Card><Users size={20} /><strong>{accounts.length}</strong><span>Cuentas</span></Card><Card><CheckCircle2 size={20} /><strong>{accounts.filter((item) => item.accessStatus === "active").length}</strong><span>Premium activas</span></Card><Card><MessagesSquare size={20} /><strong>{requests.filter((item) => item.status !== "closed").length}</strong><span>Solicitudes abiertas</span></Card><Card><ShieldCheck size={20} /><strong>Servidor</strong><span>Autorización</span></Card></div>{message && <p className="inline-message" role="status">{message}</p>}{error && <p className="inline-message inline-message--error" role="alert">{error}</p>}{loading ? <p role="status">Cargando panel…</p> : <><h2>Cuentas</h2>{accounts.length ? <div className="admin-table-wrap"><table><thead><tr><th>Persona</th><th>Acceso</th><th>Suscripción</th><th>Prueba hasta</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{accounts.map((account) => <tr key={account.userId}><td><strong>{account.displayName}</strong><small>{account.email}</small></td><td><Badge tone={account.accessStatus === "active" ? "sage" : account.accessStatus === "trial" ? "rose" : "neutral"}>{account.accessStatus}</Badge></td><td>{account.subscriptionStatus}</td><td>{account.trialEndsAt ? new Date(account.trialEndsAt).toLocaleDateString("es-CO") : "—"}</td><td><Button variant={account.accessStatus === "active" ? "outline" : "secondary"} onClick={() => toggle(account)}>{account.accessStatus === "active" ? "Retirar Premium" : "Activar Premium"}</Button></td></tr>)}</tbody></table></div> : <EmptyState title="No hay cuentas para mostrar" text="Las cuentas aparecerán después de aplicar la migración y registrar usuarios." />}<h2>Solicitudes legales y PQR</h2>{requests.length ? <div className="admin-table-wrap"><table><thead><tr><th>Referencia</th><th>Tipo</th><th>Estado</th><th>Fecha objetivo</th><th>Acciones</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td><strong>{request.reference}</strong><small>{request.subject}</small></td><td>{request.type}</td><td><Badge tone={request.status === "closed" ? "sage" : "warm"}>{request.status}</Badge></td><td>{request.deadlineAt ? new Date(request.deadlineAt).toLocaleDateString("es-CO") : "—"}</td><td><select aria-label={`Estado de ${request.reference}`} value={request.status} onChange={(event) => void changeRequestStatus(request, event.target.value as PrivacyRequest["status"])}><option value="received">Recibida</option><option value="in_review">En revisión</option><option value="answered">Respondida</option><option value="closed">Cerrada</option></select></td></tr>)}</tbody></table></div> : <EmptyState title="No hay solicitudes" text="Las PQR y solicitudes de privacidad aparecerán aquí después de aplicar la migración." />}</>}</main>;
}

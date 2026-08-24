"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, Users } from "lucide-react";
import { Navigate } from "react-router-dom";
import type { AdminAccountRow } from "@/src/repositories/interfaces/AdminRepository";
import { useAccount } from "@/src/hooks/useAccount";
import { adminService } from "@/src/services/adminService";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";

export function AdminPage() {
  const { access } = useAccount();
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => { try { setAccounts(await adminService.listAccounts()); setError(""); } catch { setError("No pudimos cargar las cuentas. Verifica las políticas y funciones de Supabase."); } finally { setLoading(false); } };
  useEffect(() => {
    if (access?.role !== "superadmin") return;
    let active = true;
    adminService.listAccounts().then((items) => { if (active) { setAccounts(items); setError(""); } }).catch(() => { if (active) setError("No pudimos cargar las cuentas. Verifica las políticas y funciones de Supabase."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [access?.role]);
  if (!access) return null;
  if (access.role !== "superadmin") return <Navigate to="/app/dashboard" replace />;
  const toggle = async (account: AdminAccountRow) => { setMessage(""); setError(""); try { const enabling = account.accessStatus !== "active"; await adminService.setPremium({ userId: account.userId, enabled: enabling, note: enabling ? "Activación manual desde el panel" : "Desactivación manual desde el panel" }); setMessage(enabling ? "Premium activado y auditado." : "Premium desactivado y auditado."); await load(); } catch { setError("No pudimos actualizar el acceso. No se aplicó ningún cambio local."); } };
  return <main className="admin-page"><SectionHeading eyebrow="SUPERADMIN" title="Accesos y suscripciones" description="Consulta cuentas y realiza activaciones manuales mediante una operación segura y auditada." /><div className="admin-metrics"><Card><Users size={20} /><strong>{accounts.length}</strong><span>Cuentas</span></Card><Card><CheckCircle2 size={20} /><strong>{accounts.filter((item) => item.accessStatus === "active").length}</strong><span>Premium activas</span></Card><Card><ShieldCheck size={20} /><strong>Servidor</strong><span>Autorización</span></Card></div>{message && <p className="inline-message" role="status">{message}</p>}{error && <p className="inline-message inline-message--error" role="alert">{error}</p>}{loading ? <p role="status">Cargando cuentas…</p> : accounts.length ? <div className="admin-table-wrap"><table><thead><tr><th>Persona</th><th>Acceso</th><th>Suscripción</th><th>Prueba hasta</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{accounts.map((account) => <tr key={account.userId}><td><strong>{account.displayName}</strong><small>{account.email}</small></td><td><Badge tone={account.accessStatus === "active" ? "sage" : account.accessStatus === "trial" ? "rose" : "neutral"}>{account.accessStatus}</Badge></td><td>{account.subscriptionStatus}</td><td>{account.trialEndsAt ? new Date(account.trialEndsAt).toLocaleDateString("es-CO") : "—"}</td><td><Button variant={account.accessStatus === "active" ? "outline" : "secondary"} onClick={() => toggle(account)}>{account.accessStatus === "active" ? "Retirar Premium" : "Activar Premium"}</Button></td></tr>)}</tbody></table></div> : <EmptyState title="No hay cuentas para mostrar" text="Las cuentas aparecerán después de aplicar la migración y registrar usuarios." />}</main>;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Activity, BarChart3, Headphones, Lightbulb, LogOut, Settings, ShieldCheck, Users } from "lucide-react";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { Button, Card } from "@/src/components/ui/Primitives";
import type { PlatformData, PlatformTicket } from "@/src/domain/platform";
import { useAccount } from "@/src/hooks/useAccount";
import { platformService } from "@/src/services/platformService";

type View = "summary" | "users" | "usage" | "support" | "suggestions" | "audiences" | "settings";
const views: Array<{ id: View; label: string; icon: typeof BarChart3 }> = [
  { id: "summary", label: "Resumen", icon: BarChart3 }, { id: "users", label: "Usuarios", icon: Users }, { id: "usage", label: "Uso del producto", icon: Activity },
  { id: "support", label: "Soporte", icon: Headphones }, { id: "suggestions", label: "Sugerencias", icon: Lightbulb }, { id: "audiences", label: "Audiencias", icon: Users }, { id: "settings", label: "Configuración", icon: Settings },
];

const empty: PlatformData = { summary: { total_users:0,new_users_week:0,new_users_month:0,active_today:0,active_7d:0,active_30d:0,onboarding_rate:0,activation_rate:0,retention_7d:0,retention_30d:0,pending_suggestions:0,open_support:0 }, users:[], usage:[], tickets:[], faqs:[], categories:[], settings:[], audit:[] };
const labels: Record<string, string> = { new:"Nuevo",in_review:"En revisión",waiting_response:"Esperando respuesta",resolved:"Resuelto",closed:"Cerrado",evaluating:"En evaluación",planned:"Planificada",implemented:"Implementada",not_planned:"No planificada",low:"Baja",normal:"Normal",high:"Alta",urgent:"Urgente" };

export function PlatformPage() {
  const account = useAccount();
  const [view, setView] = useState<View>("summary");
  const [data, setData] = useState<PlatformData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const getAccessToken = account.getAccessToken;

  const load = useCallback(async () => {
    if (account.access?.role !== "superadmin") return;
    setLoading(true); setError("");
    try { const token = await getAccessToken(); if (!token) throw new Error("AUTH"); setData(await platformService.getData(token)); }
    catch { setError("No pudimos cargar la plataforma. Verifica la sesión y vuelve a intentar."); }
    finally { setLoading(false); }
  }, [account.access?.role, getAccessToken]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  if (account.loading) return <main className="platform-loading"><BrandMark /><p>Comprobando acceso administrativo…</p></main>;
  if (!account.user) return <Navigate to="/login" replace />;
  if (!account.access || account.access.role !== "superadmin") return <Navigate to="/app/dashboard" replace />;

  const act = async (body: Record<string, unknown>) => { const token = await getAccessToken(); if (!token) return; const response = await fetch("/api/platform", { method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" }, body:JSON.stringify(body) }); if (!response.ok) throw new Error("PLATFORM_ACTION_FAILED"); await load(); };

  return <div className="platform-shell">
    <aside className="platform-nav"><BrandMark compact /><div><small>PLATAFORMA PRIVADA</small><strong>Administración</strong></div><nav aria-label="Administración">{views.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={view === item.id ? "is-active" : ""} onClick={() => setView(item.id)}><Icon size={18} />{item.label}</button>; })}</nav><Button variant="ghost" onClick={() => void account.signOut()}><LogOut size={17} /> Cerrar sesión</Button></aside>
    <main className="platform-main"><header><div><p className="eyebrow">MY BEST VERSION</p><h1>{views.find((item) => item.id === view)?.label}</h1><p>Datos operativos reales y minimizados. El contenido privado de las usuarias no se consulta.</p></div><span><ShieldCheck size={18} /> Acceso protegido</span></header>
      {loading && <div className="route-loading" role="status">Actualizando datos reales…</div>}{error && <div className="inline-message inline-message--error" role="alert">{error} <Button variant="ghost" onClick={() => void load()}>Reintentar</Button></div>}
      {!loading && !error && view === "summary" && <Summary data={data} />}
      {!loading && !error && view === "users" && <UsersView data={data} query={query} setQuery={setQuery} />}
      {!loading && !error && view === "usage" && <UsageView data={data} />}
      {!loading && !error && view === "support" && <TicketsView tickets={data.tickets.filter((ticket) => ticket.type !== "suggestion")} onAction={act} />}
      {!loading && !error && view === "suggestions" && <TicketsView tickets={data.tickets.filter((ticket) => ticket.type === "suggestion")} suggestion onAction={act} />}
      {!loading && !error && view === "audiences" && <Audiences data={data} />}
      {!loading && !error && view === "settings" && <Configuration data={data} onAction={act} />}
    </main>
  </div>;
}

function Summary({ data }: { data: PlatformData }) {
  const metrics = [["Usuarias registradas",data.summary.total_users],["Nuevas esta semana",data.summary.new_users_week],["Nuevas este mes",data.summary.new_users_month],["Activas hoy",data.summary.active_today],["Activas · 7 días",data.summary.active_7d],["Activas · 30 días",data.summary.active_30d],["Onboarding completo",`${data.summary.onboarding_rate}%`],["Activación",`${data.summary.activation_rate}%`],["Retención · 7 días",`${data.summary.retention_7d}%`],["Retención · 30 días",`${data.summary.retention_30d}%`],["Sugerencias pendientes",data.summary.pending_suggestions],["Soporte abierto",data.summary.open_support]];
  const max = Math.max(1, ...data.usage.map((item) => item.event_count));
  return <><section className="platform-metrics">{metrics.map(([label,value]) => <Card key={label}><small>{label}</small><strong>{value}</strong></Card>)}</section><Card className="platform-chart"><h2>Uso de funcionalidades</h2><p>Eventos agregados, sin contenido escrito por las usuarias.</p>{data.usage.length ? data.usage.slice(0,10).map((item) => <div className="platform-bar" key={item.feature}><span>{item.feature}</span><i><b style={{ width:`${Math.max(3,(item.event_count/max)*100)}%` }} /></i><strong>{item.event_count}</strong></div>) : <Empty text="Todavía no hay eventos suficientes para mostrar tendencias." />}</Card></>;
}

function UsersView({ data, query, setQuery }: { data: PlatformData; query: string; setQuery(value: string): void }) {
  const rows = data.users.filter((user) => `${user.display_name} ${user.email} ${user.user_id}`.toLowerCase().includes(query.toLowerCase()));
  return <Card className="platform-table-card"><div className="platform-toolbar"><input aria-label="Buscar usuarias" placeholder="Buscar por nombre, correo o ID" value={query} onChange={(event) => setQuery(event.target.value)} /><span>{rows.length} resultados</span></div><div className="platform-table-wrap"><table><thead><tr><th>Usuaria</th><th>Registro</th><th>Última actividad</th><th>Idioma / zona</th><th>Onboarding</th><th>Activación</th><th>Sesiones</th><th>Metas</th><th>Tareas</th><th>Función principal</th><th>Marketing</th><th>Estado</th></tr></thead><tbody>{rows.map((user) => <tr key={user.user_id}><td><strong>{user.display_name || "Sin nombre"}</strong><small>{user.email}</small><small>{user.user_id.slice(0,8)}…</small></td><td>{formatDate(user.created_at)}</td><td>{formatDate(user.last_active_at)}</td><td>{user.locale} · {user.timezone}</td><td>{user.onboarding_completed ? "Completo" : "Pendiente"}</td><td>{user.activated ? "Activada" : "En proceso"}</td><td>{user.session_count}</td><td>{user.goals_created}</td><td>{user.tasks_completed}</td><td>{user.top_feature || "—"}</td><td>{user.marketing_consent ? "Sí" : "No"}</td><td>{user.account_status}</td></tr>)}</tbody></table></div>{!rows.length && <Empty text="No hay usuarias que coincidan con la búsqueda." />}</Card>;
}

function UsageView({ data }: { data: PlatformData }) { return <Card className="platform-table-card"><h2>Adopción por funcionalidad</h2><p>La definición de activación está centralizada: onboarding + una meta + una acción completada durante los primeros 7 días.</p><div className="platform-table-wrap"><table><thead><tr><th>Funcionalidad</th><th>Usuarias únicas</th><th>Eventos</th><th>Adopción</th><th>7 días</th><th>30 días</th><th>Último uso</th></tr></thead><tbody>{data.usage.map((item) => <tr key={item.feature}><td>{item.feature}</td><td>{item.unique_users}</td><td>{item.event_count}</td><td>{data.summary.total_users ? Math.round(item.unique_users/data.summary.total_users*100) : 0}%</td><td>{item.users_7d}</td><td>{item.users_30d}</td><td>{formatDate(item.last_used)}</td></tr>)}</tbody></table></div>{!data.usage.length && <Empty text="El tracking comenzará a poblar esta vista cuando las usuarias utilicen las funciones." />}</Card>; }

function TicketsView({ tickets, suggestion = false, onAction }: { tickets: PlatformTicket[]; suggestion?: boolean; onAction(body: Record<string, unknown>): Promise<void> }) {
  const [selected, setSelected] = useState<PlatformTicket | null>(null); const [note, setNote] = useState("");
  return <div className="platform-ticket-layout"><Card className="platform-inbox"><header><div><h2>{suggestion ? "Sugerencias" : "Mensajes y reportes"}</h2><p>{tickets.length} registros</p></div></header>{tickets.map((ticket) => <button type="button" key={ticket.id} className={selected?.id === ticket.id ? "is-active" : ""} onClick={() => setSelected(ticket)}><span><strong>{ticket.subject}</strong><small>{ticket.category} · {formatDate(ticket.createdAt)}</small></span><em>{labels[ticket.status] ?? ticket.status}</em></button>)}{!tickets.length && <Empty text={suggestion ? "No hay sugerencias todavía." : "No hay solicitudes de soporte todavía."} />}</Card><Card className="platform-ticket-detail">{selected ? <><header><div><p className="eyebrow">{selected.reference}</p><h2>{selected.subject}</h2><p>{selected.email} · {selected.displayName}</p></div><span>{labels[selected.priority]}</span></header><dl><div><dt>Mensaje</dt><dd>{selected.message}</dd></div><div><dt>Ruta</dt><dd>{selected.pageUrl || "No disponible"}</dd></div><div><dt>Contexto técnico</dt><dd>{JSON.stringify(selected.deviceMetadata)}</dd></div>{suggestion && <div><dt>Sugerencias relacionadas</dt><dd>{selected.similarCount ?? 1}</dd></div>}</dl><div className="platform-ticket-actions"><select aria-label="Estado" value={selected.status} onChange={(event) => setSelected({ ...selected, status:event.target.value as PlatformTicket["status"] })}>{(suggestion ? ["new","evaluating","planned","implemented","not_planned"] : ["new","in_review","waiting_response","resolved","closed"]).map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select><select aria-label="Prioridad" value={selected.priority} onChange={(event) => setSelected({ ...selected, priority:event.target.value as PlatformTicket["priority"] })}>{["low","normal","high","urgent"].map((priority) => <option key={priority} value={priority}>{labels[priority]}</option>)}</select><Button onClick={() => onAction({ action:"update_ticket",ticketId:selected.id,status:selected.status,priority:selected.priority })}>Guardar estado</Button></div><label className="form-field"><span>Nota administrativa interna</span><textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} /><small>Nunca será visible para la usuaria.</small></label><Button variant="secondary" disabled={note.trim().length < 2} onClick={async () => { await onAction({ action:"add_note", ticketId:selected.id, note }); setNote(""); }}>Añadir nota</Button></> : <Empty text="Selecciona un registro para ver su detalle operativo." />}</Card></div>;
}

function Audiences({ data }: { data: PlatformData }) {
  const [now] = useState(() => Date.now()); const days = (date: string | null) => date ? (now-new Date(date).getTime())/86400000 : Infinity;
  const segments = [
    ["Recién registradas",data.users.filter((u)=>days(u.created_at)<=7).length,"Registro en los últimos 7 días"],
    ["Onboarding pendiente",data.users.filter((u)=>!u.onboarding_completed).length,"No completaron onboarding"],
    ["Sin primera meta",data.users.filter((u)=>u.onboarding_completed&&u.goals_created===0).length,"Onboarding completo y 0 metas"],
    ["Activas · 7 días",data.users.filter((u)=>days(u.last_active_at)<=7).length,"Actividad en los últimos 7 días"],
    ["Inactivas · 14 días",data.users.filter((u)=>days(u.last_active_at)>14).length,"Sin actividad por más de 14 días"],
    ["Usan entrenamiento",data.users.filter((u)=>u.top_feature==="fitness").length,"Evento agregado de entrenamiento"],
    ["Usan alimentación",data.users.filter((u)=>u.top_feature==="nutrition").length,"Evento agregado de alimentación"],
    ["Marketing autorizado",data.users.filter((u)=>u.marketing_consent).length,"Sólo consentimiento explícito vigente"],
  ];
  return <><div className="platform-notice"><ShieldCheck size={20} /><p><strong>Fase 2 no está activa.</strong> Esta vista sólo calcula tamaños y criterios. No envía emails, no crea campañas y no muestra promociones.</p></div><section className="audience-grid">{segments.map(([name,size,criteria]) => <Card key={String(name)}><small>SEGMENTO DINÁMICO</small><h2>{name}</h2><strong>{size}</strong><p>{criteria}</p></Card>)}</section><Card><h2>Separación de comunicaciones</h2><p><strong>Operativas:</strong> seguridad, soporte y funcionamiento de cuenta. <strong>Marketing:</strong> novedades, promociones y ofertas; requiere consentimiento explícito y vigente.</p></Card></>;
}

function Configuration({ data, onAction }: { data: PlatformData; onAction(body: Record<string, unknown>): Promise<void> }) {
  const [question,setQuestion]=useState(""); const [answer,setAnswer]=useState("");
  const addFaq=async()=>{await onAction({action:"upsert_faq",question,answer,locale:"es",sortOrder:(data.faqs.at(-1)?.sortOrder??0)+10});setQuestion("");setAnswer("");};
  return <div className="platform-config-grid"><Card><h2>Categorías de soporte</h2>{data.categories.map((category)=><div className="config-row" key={category.id}><span>{category.name}<small>{category.appliesTo.join(", ")}</small></span><Button size="sm" variant="ghost" onClick={()=>onAction({action:"update_category",id:category.id,label:category.name,active:!category.active,sortOrder:category.sortOrder})}>{category.active?"Desactivar":"Activar"}</Button></div>)}{!data.categories.length&&<Empty text="Sin categorías configuradas."/>}</Card><Card><h2>Preguntas frecuentes</h2>{data.faqs.map((faq)=><details key={faq.id}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}<div className="platform-faq-form"><input aria-label="Nueva pregunta frecuente" placeholder="Nueva pregunta" value={question} onChange={(event)=>setQuestion(event.target.value)}/><textarea aria-label="Respuesta frecuente" placeholder="Respuesta" rows={3} value={answer} onChange={(event)=>setAnswer(event.target.value)}/><Button size="sm" disabled={question.trim().length<4||answer.trim().length<4} onClick={()=>void addFaq()}>Añadir pregunta</Button></div></Card><Card><h2>Parámetros, estados y taxonomía</h2>{data.settings.map((setting)=><div className="config-row" key={setting.key}><span>{setting.key}</span><code>{JSON.stringify(setting.value)}</code></div>)}<p className="platform-hint">Tickets: Nuevo · En revisión · Esperando respuesta · Resuelto · Cerrado. Sugerencias: Nueva · En evaluación · Planificada · Implementada · No planificada.</p><Button variant="secondary" onClick={() => onAction({ action:"update_setting",key:"activation_definition",value:{window_days:7,requires:["onboarding_completed","goal_created","task_completed"]} })}>Restaurar definición central</Button></Card><Card><h2>Historial administrativo</h2>{data.audit.map((item)=><div className="config-row" key={item.id}><span>{item.action}</span><small>{item.entityType} · {formatDate(item.createdAt)}</small></div>)}{!data.audit.length&&<Empty text="Aún no hay cambios administrativos registrados."/>}</Card></div>;
}

function Empty({ text }: { text: string }) { return <div className="platform-empty"><p>{text}</p></div>; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("es-CO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)) : "—"; }

"use client";

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Download, FileUp, HelpCircle, LockKeyhole, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { Badge, Button, Card, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";

export function SettingsPage({ planner }: { planner: PlannerController }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState(planner.snapshot.profile?.name ?? "");
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(planner.snapshot.profile?.weekStartsOn ?? 1);
  const [theme, setTheme] = useState<"light" | "rose" | "taupe">(planner.snapshot.profile?.theme ?? "light");

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try { await planner.importBackup(file); setMessage("El respaldo se importó correctamente."); }
    catch { setMessage("Este archivo no parece ser un respaldo válido de My Best Version Planner."); }
  };

  const saveProfile = async () => { await planner.updateProfileSettings({ name: name.trim() || "Mi Mejor Versión", weekStartsOn, theme }); setMessage("Tus preferencias quedaron guardadas."); };

  return <div className="page-stack settings-reference">
    <SectionHeading eyebrow="Tu planner, tus reglas" title="Ajustes y datos" description="Personaliza tu experiencia y administra tu información." action={<Badge tone="sage"><LockKeyhole size={14} /> Local-first</Badge>} />
    {message && <div className="inline-message" role="status">{message}</div>}
    <div className="settings-reference-layout">
      <Card className="settings-list-card">
        <section><div><strong>Perfil</strong><small>Nombre del perfil</small></div><input value={name} onChange={(event)=>setName(event.target.value)} aria-label="Nombre del perfil" /></section>
        <section><div><strong>Inicio de semana</strong><small>Selecciona el primer día de tu semana.</small></div><select value={weekStartsOn} onChange={(event)=>setWeekStartsOn(Number(event.target.value) as 0|1)}><option value={1}>Lunes</option><option value={0}>Domingo</option></select></section>
        <section className="theme-setting"><div><strong>Tema</strong><small>Elige la atmósfera visual del planner.</small></div><div>{(["light","rose","taupe"] as const).map((item)=><button key={item} className={theme===item?"is-selected":""} onClick={()=>setTheme(item)}><i className={`theme-swatch theme-swatch--${item}`}/>{item==="light"?"Claro":item==="rose"?"Rosa":"Taupe"}</button>)}</div></section>
        <section><div><strong>Guardar preferencias</strong><small>Actualiza tu perfil, semana y tema.</small></div><Button onClick={saveProfile}>Guardar</Button></section>
        <section><div><strong>Exportar copia de seguridad</strong><small>Descarga un archivo con todos tus datos.</small></div><Button variant="secondary" onClick={async () => { await planner.downloadBackup(); setMessage("Tu respaldo se descargó correctamente."); }}><Download size={16}/> Exportar</Button></section>
        <section><div><strong>Importar copia de seguridad</strong><small>Restaura tus datos desde un archivo previamente guardado.</small></div><input ref={fileInput} className="sr-only" type="file" accept="application/json" onChange={(event) => importFile(event.target.files?.[0])} /><Button variant="secondary" onClick={()=>fileInput.current?.click()}><FileUp size={16}/> Importar</Button></section>
        <section><div><strong>Restaurar datos de demostración</strong><small>Carga contenido ficticio para explorar la aplicación.</small></div><Button variant="secondary" onClick={async()=>{await planner.loadDemo();setMessage("Los datos ficticios de ejemplo están listos.");}}><RefreshCw size={16}/> Restaurar</Button></section>
        <section className="delete-setting"><div><strong>Eliminar todos los datos</strong><small>Esta acción no se puede deshacer.</small></div><Button variant="danger" onClick={()=>setDeleteOpen(true)}><Trash2 size={16}/> Eliminar</Button></section>
      </Card>
      <aside className="settings-aside"><Card><ShieldCheck size={24}/><p className="eyebrow">Aviso de privacidad</p><h2>El control es tuyo</h2><p>Tus metas, hábitos y reflexiones se guardan únicamente en tu navegador. No compartimos tu información con terceros.</p></Card><Card><HelpCircle size={24}/><h2>¿Necesitas ayuda?</h2><p>Aprende los conceptos clave o reinicia el recorrido guiado.</p><Link className="button button--secondary" to="/app/help">Ir al centro de ayuda</Link></Card></aside>
    </div>

    <Modal open={deleteOpen} title="¿Eliminar todos los datos?" description="Esta acción eliminará permanentemente todas tus metas, hábitos y configuraciones." onClose={() => { setDeleteOpen(false); setConfirmText(""); }}>
      <div className="confirm-content destructive-confirm"><span><AlertTriangle size={24}/></span><p>Esta acción no se puede deshacer. Escribe <strong>ELIMINAR</strong> para confirmar.</p><input value={confirmText} onChange={(event)=>setConfirmText(event.target.value)} placeholder="ELIMINAR" aria-label="Confirmación para eliminar todos los datos"/><div className="modal__actions"><Button variant="ghost" onClick={()=>{setDeleteOpen(false);setConfirmText("");}}>Cancelar</Button><Button variant="danger" disabled={confirmText!=="ELIMINAR"} onClick={async()=>{await planner.clearAll();setDeleteOpen(false);}}>Eliminar todo</Button></div></div>
    </Modal>
  </div>;
}

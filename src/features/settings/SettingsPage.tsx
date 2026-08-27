"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowDown, ArrowUp, Download, FileUp, HelpCircle, Languages, LifeBuoy, LockKeyhole, LogOut, Mail, MoonStar, PlayCircle, RefreshCw, ShieldCheck, Sun, Trash2 } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { Badge, Button, Card, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { useUiStore } from "@/src/stores/useUiStore";
import { imageUploadSchema } from "@/src/lib/schemas";
import { LanguageSwitcher } from "@/src/components/ui/LanguageSwitcher";
import { useAccount } from "@/src/hooks/useAccount";
import { MarketingPreferenceControl } from "@/src/features/support/SupportPage";

interface BackupPreview { exportedAt: string; name: string; areas: number; goals: number; habits: number; tasks: number; transactions: number; migrated: boolean }

export function SettingsPage({ planner, onReplayTutorial, onRequestLogout }: { planner: PlannerController; onReplayTutorial: () => void; onRequestLogout: () => void }) {
  const account = useAccount();
  const colorMode = useUiStore((state) => state.colorMode);
  const setColorMode = useUiStore((state) => state.setColorMode);
  const fileInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState(planner.snapshot.profile?.name ?? "");
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(planner.snapshot.profile?.weekStartsOn ?? 1);
  const [theme, setTheme] = useState<"light" | "rose" | "taupe">(planner.snapshot.profile?.theme ?? "light");
  const [currency, setCurrency] = useState<"COP" | "USD" | "EUR" | "MXN">(planner.snapshot.financialProfiles[0]?.baseCurrency ?? planner.snapshot.profile?.baseCurrency ?? "COP");
  const [financePrivacy, setFinancePrivacy] = useState(planner.snapshot.financialProfiles[0]?.privacyMode ?? planner.snapshot.profile?.financePrivacy ?? false);
  const [usePurpose, setUsePurpose] = useState(planner.snapshot.profile?.usePurpose ?? "");
  const [fitnessEnabled] = useState(planner.snapshot.profile?.fitnessEnabled ?? false);
  const [avatarDataUrl, setAvatarDataUrl] = useState(planner.snapshot.profile?.avatarDataUrl);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);

  const inspectFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await planner.previewBackup(file);
      setPendingFile(file);
      setPreview(result);
    } catch {
      setMessage("Este archivo no parece ser un respaldo válido. Tus datos actuales no cambiaron.");
    }
  };

  const confirmImport = async () => {
    if (!pendingFile) return;
    try {
      await planner.importBackup(pendingFile);
      setMessage("El respaldo se importó correctamente y conservó sus conexiones.");
    } catch {
      setMessage("No pudimos importar el respaldo. Tus datos actuales siguen intactos.");
    } finally {
      setPendingFile(null); setPreview(null);
    }
  };

  const saveProfile = async () => {
    await planner.updateProfileSettings({ name: name.trim() || "Mi Mejor Versión", weekStartsOn, theme, baseCurrency: currency, financePrivacy, usePurpose, fitnessEnabled, avatarDataUrl });
    setMessage("Tus preferencias quedaron guardadas.");
  };

  return <div className="page-stack settings-reference">
    <SectionHeading eyebrow="Tu planner, tus reglas" title="Ajustes y datos" description="Personaliza tu experiencia y administra tu información." action={<Badge tone="sage"><LockKeyhole size={14} /> Local-first</Badge>} />
    {message && <div className="inline-message" role="status">{message}</div>}
    <div className="settings-reference-layout">
      <Card id="account-settings" className="settings-list-card">
        <section><div><strong><Languages size={16} /> Idioma</strong><small>Selecciona el idioma de la aplicación.</small></div><LanguageSwitcher onChange={(locale) => void account.updatePreferences({ locale })} /></section>
        <section><div><strong><ShieldCheck size={16} /> Legal y privacidad</strong><small>Consulta documentos, autorizaciones, solicitudes y control de datos.</small></div><Link className="button button--secondary" to="/app/legal">Abrir centro</Link></section>
        <section><div><strong><LifeBuoy size={16} /> Ayuda y soporte</strong><small>Envía una sugerencia, reporta un problema o contacta al equipo.</small></div><Link className="button button--secondary" to="/app/support">Abrir soporte</Link></section>
        <section><div><strong><Mail size={16} /> Comunicaciones</strong><small>Decide si quieres recibir novedades y ofertas.</small></div><MarketingPreferenceControl /></section>
        <section><div><strong><PlayCircle size={16} /> Repetir tutorial</strong><small>Vuelve a recorrer las secciones principales cuando lo necesites.</small></div><Button variant="secondary" onClick={onReplayTutorial}>Repetir tutorial</Button></section>
        <section><div><strong><LogOut size={16} /> Cerrar sesión</strong><small>Tu información seguirá guardada para cuando vuelvas.</small></div><Button variant="danger" onClick={onRequestLogout}>Cerrar sesión</Button></section>
        <section><div><strong>Foto de perfil</strong><small>Se guarda de forma privada en este navegador.</small></div><div className="profile-photo-setting">{avatarDataUrl ? <img src={avatarDataUrl} alt="Vista previa de perfil" /> : <span>{name.slice(0, 1).toUpperCase()}</span>}<input ref={avatarInput} className="sr-only" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const parsed = imageUploadSchema.safeParse({ type: file.type, size: file.size }); if (!parsed.success) return setMessage(parsed.error.issues[0]?.message ?? "Revisa la imagen."); const reader = new FileReader(); reader.onload = () => setAvatarDataUrl(String(reader.result)); reader.readAsDataURL(file); }} /><Button variant="secondary" onClick={() => avatarInput.current?.click()}>Elegir foto</Button>{avatarDataUrl && <Button variant="ghost" onClick={() => setAvatarDataUrl(undefined)}>Quitar foto</Button>}</div></section>
        <section><div><strong>Perfil</strong><small>Nombre del perfil</small></div><input value={name} onChange={(event)=>setName(event.target.value)} aria-label="Nombre del perfil" /></section>
        <section><div><strong>Para qué lo quiero usar</strong><small>Tu razón para volver a este espacio.</small></div><textarea aria-label="Para qué quiero usar mi planner" rows={3} value={usePurpose} onChange={(event) => setUsePurpose(event.target.value)} /></section>
        <section><div><strong>Inicio de semana</strong><small>Selecciona el primer día de tu semana.</small></div><select aria-label="Inicio de semana" value={weekStartsOn} onChange={(event)=>setWeekStartsOn(Number(event.target.value) as 0|1)}><option value={1}>Lunes</option><option value={0}>Domingo</option></select></section>
        <section className="theme-setting"><div><strong>Tema</strong><small>Elige la atmósfera visual del planner.</small></div><div>{(["light","rose","taupe"] as const).map((item)=><button type="button" key={item} className={theme===item?"is-selected":""} onClick={()=>setTheme(item)}><i className={`theme-swatch theme-swatch--${item}`}/>{item==="light"?"Claro":item==="rose"?"Rosa":"Taupe"}</button>)}</div></section>
        <section className="theme-setting"><div><strong>Modo de color</strong><small>Reduce el brillo cuando quieras una experiencia más suave.</small></div><div className="color-mode-setting"><button type="button" className={colorMode === "light" ? "is-selected" : ""} onClick={() => setColorMode("light")} aria-pressed={colorMode === "light"}><Sun size={16} /> Claro</button><button type="button" className={colorMode === "dark" ? "is-selected" : ""} onClick={() => setColorMode("dark")} aria-pressed={colorMode === "dark"}><MoonStar size={16} /> Oscuro</button></div></section>
        <section><div><strong>Moneda base</strong><small>Se usa para todos los registros financieros.</small></div><select aria-label="Moneda base" value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)}><option value="COP">COP · Peso colombiano</option><option value="USD">USD · Dólar</option><option value="EUR">EUR · Euro</option><option value="MXN">MXN · Peso mexicano</option></select></section>
        <section><div><strong>Privacidad financiera</strong><small>Oculta los valores sin borrar tus movimientos.</small></div><button type="button" className={`privacy-toggle ${financePrivacy ? "is-on" : ""}`} aria-pressed={financePrivacy} onClick={() => setFinancePrivacy(!financePrivacy)}><span />{financePrivacy ? "Valores ocultos" : "Valores visibles"}</button></section>
        <section><div><strong>Guardar preferencias</strong><small>Actualiza perfil, semana, tema y finanzas.</small></div><Button onClick={saveProfile}>Guardar</Button></section>
        <section><div><strong>Exportar copia de seguridad</strong><small>Descarga un archivo con todos tus datos.</small></div><Button variant="secondary" onClick={async () => { await planner.downloadBackup(); setMessage("Tu respaldo se descargó correctamente."); }}><Download size={16}/> Exportar</Button></section>
        <section><div><strong>Importar copia de seguridad</strong><small>Primero podrás revisar el contenido; nada se reemplaza sin confirmar.</small></div><input ref={fileInput} className="sr-only" type="file" accept="application/json" onChange={(event) => inspectFile(event.target.files?.[0])} /><Button variant="secondary" onClick={()=>fileInput.current?.click()}><FileUp size={16}/> Seleccionar</Button></section>
        <section><div><strong>Restaurar datos de demostración</strong><small>Carga contenido ficticio para explorar la aplicación.</small></div><Button variant="secondary" onClick={async()=>{await planner.loadDemo();setMessage("Los datos ficticios de ejemplo están listos.");}}><RefreshCw size={16}/> Restaurar</Button></section>
        <section className="delete-setting"><div><strong>Eliminar todos los datos</strong><small>Esta acción no se puede deshacer.</small></div><Button variant="danger" onClick={()=>setDeleteOpen(true)}><Trash2 size={16}/> Eliminar</Button></section>
      </Card>
      <aside className="settings-aside"><Card><ShieldCheck size={24}/><p className="eyebrow">Aviso de privacidad</p><h2>El control es tuyo</h2><p>Tus metas, hábitos, finanzas y reflexiones se guardan en este navegador. No se conectan cuentas bancarias.</p><Link className="button button--secondary" to="/legal">Ver Centro Legal</Link></Card><Card><LockKeyhole size={24}/><p className="eyebrow">Privacidad local</p><h2>Tu cuenta protege el acceso</h2><p>Los datos detallados del planner permanecen en este dispositivo. Exporta un respaldo para conservarlos o trasladarlos.</p><Button variant="secondary" onClick={async () => { await planner.downloadBackup(); setMessage("Tu respaldo se descargó correctamente."); }}><Download size={16} /> Exportar respaldo</Button><Link className="button button--ghost" to="/data-deletion">Cómo eliminar mis datos</Link></Card><Card><HelpCircle size={24}/><h2>¿Necesitas ayuda?</h2><p>Aprende los conceptos clave o reinicia el recorrido guiado.</p><Link className="button button--secondary" to="/app/help">Ir al centro de ayuda</Link></Card></aside>
    </div>

    <Card className="area-settings"><header><div><p className="eyebrow">Estructura transversal</p><h2>Áreas de vida</h2><p>Renombra, activa o reordena. Las metas y registros vinculados conservan su conexión.</p></div></header><div>{[...planner.snapshot.lifeAreas].sort((a,b) => a.order - b.order).map((area, index, all) => <div key={area.id}><input defaultValue={area.name} aria-label={`Nombre de ${area.name}`} onBlur={(event) => planner.updateLifeAreaSettings(area.id, { name: event.target.value })}/><label><input type="checkbox" checked={area.active} onChange={(event) => planner.updateLifeAreaSettings(area.id, { active: event.target.checked })}/> Activa</label><button disabled={index === 0} aria-label={`Subir ${area.name}`} onClick={() => planner.updateLifeAreaSettings(area.id, { direction: "up" })}><ArrowUp size={15}/></button><button disabled={index === all.length - 1} aria-label={`Bajar ${area.name}`} onClick={() => planner.updateLifeAreaSettings(area.id, { direction: "down" })}><ArrowDown size={15}/></button></div>)}</div></Card>

    <Modal open={Boolean(preview)} title="Revisar respaldo antes de importar" description="Al confirmar, este contenido reemplazará los datos actuales del dispositivo." onClose={() => { setPreview(null); setPendingFile(null); }}>
      {preview && <div className="backup-preview"><div><strong>{preview.name}</strong><small>Exportado: {new Date(preview.exportedAt).toLocaleString("es-CO")}</small></div><dl><div><dt>Áreas</dt><dd>{preview.areas}</dd></div><div><dt>Metas</dt><dd>{preview.goals}</dd></div><div><dt>Hábitos</dt><dd>{preview.habits}</dd></div><div><dt>Tareas</dt><dd>{preview.tasks}</dd></div><div><dt>Movimientos</dt><dd>{preview.transactions}</dd></div></dl>{preview.migrated && <Badge tone="warm">Se actualizará al formato v3</Badge>}<div className="modal__actions"><Button variant="ghost" onClick={() => { setPreview(null); setPendingFile(null); }}>Cancelar</Button><Button onClick={confirmImport}>Importar y reemplazar</Button></div></div>}
    </Modal>

    <Modal open={deleteOpen} title="¿Eliminar todos los datos?" description="Esta acción eliminará permanentemente tus metas, hábitos, finanzas y configuraciones." onClose={() => { setDeleteOpen(false); setConfirmText(""); }}>
      <div className="confirm-content destructive-confirm"><span><AlertTriangle size={24}/></span><p>Esta acción no se puede deshacer. Escribe <strong>ELIMINAR</strong> para confirmar.</p><input value={confirmText} onChange={(event)=>setConfirmText(event.target.value)} placeholder="ELIMINAR" aria-label="Confirmación para eliminar todos los datos"/><div className="modal__actions"><Button variant="ghost" onClick={()=>{setDeleteOpen(false);setConfirmText("");}}>Cancelar</Button><Button variant="danger" disabled={confirmText!=="ELIMINAR"} onClick={async()=>{await planner.clearAll();setDeleteOpen(false);}}>Eliminar todo</Button></div></div>
    </Modal>
  </div>;
}

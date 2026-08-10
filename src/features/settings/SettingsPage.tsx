"use client";

import { useRef, useState } from "react";
import { Database, Download, FileUp, LockKeyhole, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { Badge, Button, Card, SectionHeading } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";

export function SettingsPage({ planner }: { planner: PlannerController }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await planner.importBackup(file);
      setMessage("El respaldo se importó correctamente.");
    } catch {
      setMessage("Este archivo no parece ser un respaldo válido de My Best Version Planner.");
    }
  };

  return (
    <div className="page-stack">
      <SectionHeading eyebrow="Control y privacidad" title="Ajustes" description="Tus datos son tuyos. Protégelos, expórtalos o comienza de nuevo cuando lo necesites." action={<Badge tone="sage"><LockKeyhole size={14} /> Local-first</Badge>} />
      {message && <div className="inline-message" role="status">{message}</div>}
      <div className="settings-grid">
        <Card className="settings-card">
          <span className="settings-card__icon"><ShieldCheck size={22} /></span>
          <div><p className="eyebrow">Privacidad</p><h2>Solo en este dispositivo</h2><p>Metas, tareas, hábitos, ánimo y journal permanecen en tu navegador. No enviamos estos datos a servicios externos.</p></div>
        </Card>
        <Card className="settings-card">
          <span className="settings-card__icon"><Database size={22} /></span>
          <div><p className="eyebrow">Respaldo</p><h2>Exporta una copia legible</h2><p>Crea un respaldo mensual o antes de cambiar de navegador o dispositivo.</p><Button onClick={async () => { await planner.downloadBackup(); setMessage("Tu respaldo se descargó correctamente."); }}><Download size={17} /> Exportar JSON</Button></div>
        </Card>
        <Card className="settings-card">
          <span className="settings-card__icon"><FileUp size={22} /></span>
          <div><p className="eyebrow">Restaurar</p><h2>Importa un respaldo</h2><p>Validaremos el archivo antes de reemplazar tus datos actuales.</p><input ref={fileInput} className="sr-only" type="file" accept="application/json" onChange={(event) => importFile(event.target.files?.[0])} /><Button variant="secondary" onClick={() => fileInput.current?.click()}><FileUp size={17} /> Seleccionar archivo</Button></div>
        </Card>
        <Card className="settings-card">
          <span className="settings-card__icon"><RefreshCw size={22} /></span>
          <div><p className="eyebrow">Explorar</p><h2>Cargar datos de ejemplo</h2><p>Esta acción sustituye el contenido actual por un recorrido ficticio de María para probar todos los módulos.</p><Button variant="secondary" onClick={async () => { await planner.loadDemo(); setMessage("Los datos ficticios de ejemplo están listos."); }}><RefreshCw size={17} /> Sustituir por demo</Button></div>
        </Card>
      </div>
      <Card className="danger-zone">
        <div><p className="eyebrow">Zona sensible</p><h2>Borrar todos los datos</h2><p>Esta acción eliminará todos los datos guardados en este navegador.</p></div>
        <Button variant="danger" onClick={() => setDeleteOpen(true)}><Trash2 size={17} /> Borrar planner</Button>
      </Card>
      <Modal open={deleteOpen} title="¿Borrar todo el planner?" description="No podrás recuperar estos datos salvo que tengas un respaldo exportado." onClose={() => setDeleteOpen(false)}>
        <div className="confirm-content"><p>Esta es una acción permanente en este dispositivo.</p><div className="modal__actions"><Button variant="ghost" onClick={() => setDeleteOpen(false)}>Conservar mis datos</Button><Button variant="danger" onClick={async () => { await planner.clearAll(); setDeleteOpen(false); }}>Sí, borrar todo</Button></div></div>
      </Modal>
    </div>
  );
}

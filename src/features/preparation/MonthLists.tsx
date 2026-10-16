"use client";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import type { BrainDumpType } from "@/src/domain/planner";
import { useI18n } from "@/src/i18n/I18nProvider";
import { Modal } from "@/src/components/ui/Modal";
import { useUnsavedDraft } from "@/src/components/navigation/UnsavedDraftProvider";
import { EditorialCard, usePreparationOperation } from "./PreparationShared";
const lists = [["want_to_read", "preparation.books"], ["want_to_learn", "preparation.learning"], ["want_to_do", "preparation.experiences"]] as const;
export function MonthLists({ planner, month, readOnly }: { planner: PlannerController; month: string; readOnly: boolean }) {
  const { m } = useI18n();
  const operation = usePreparationOperation();
  const [editor, setEditor] = useState<{ type: BrainDumpType; id?: string; title: string } | null>(null);
  const plan = planner.snapshot.cascadePlans.find((item) => item.horizon === "monthly" && item.periodKey === month);
  const saveDraft = async () => {
    if (!editor || readOnly || editor.title.trim().length < 2) return false;
    const ok = await operation.run(() => editor.id ? planner.updateBrainDumpItem(editor.id, { title: editor.title }) : planner.createBrainDumpItem({ title: editor.title, type: editor.type, tentativeDate: month + "-01" }));
    if (ok) { guard.markSaved(); setEditor(null); } return ok;
  };
  const guard = useUnsavedDraft({ dirty: Boolean(editor && editor.title !== (planner.snapshot.brainDumpItems.find((item) => item.id === editor.id)?.title || "")), saving: Boolean(editor && operation.busy), onSave: saveDraft, onDiscard: () => setEditor(null) });
  return <div className="prep-month-lists" data-i18n-explicit="true">{lists.map(([type, label]) => <EditorialCard key={type}><h2>{m(label)}</h2>{planner.snapshot.brainDumpItems.filter((item) => item.type === type && item.status !== "released" && (item.tentativeDate?.startsWith(month) || plan && item.periodPlanId === plan.id)).map((item) => <div className="prep-list-item" key={item.id}><button aria-label={item.title} aria-pressed={item.status === "completed"} disabled={readOnly || operation.busy} onClick={() => operation.run(() => planner.updateBrainDumpItem(item.id, { status: item.status === "completed" ? "idea" : "completed" }))}>{item.status === "completed" && <Check size={14} />}</button><button disabled={readOnly} data-no-translate="true" onClick={() => setEditor({ type, id: item.id, title: item.title })}>{item.title}</button></div>)}<button className="prep-text-link" disabled={readOnly} onClick={() => setEditor({ type, title: "" })}><Plus size={16} />{m("preparation.add")}</button></EditorialCard>)}
    {operation.error && <p role="alert">{m("preparation.error")}</p>}
    <Modal open={Boolean(editor)} onClose={() => guard.request(() => setEditor(null))} title={m("preparation.optionalLists")} explicitI18n inertBackground><form onSubmit={async (event) => { event.preventDefault(); await saveDraft(); }}><label className="form-field">{m("preparation.optionalLists")}<input required minLength={2} maxLength={300} disabled={operation.busy || readOnly} value={editor?.title || ""} onChange={(event) => setEditor((current) => current ? { ...current, title: event.target.value } : null)} /></label>{operation.error && <p role="alert">{m("preparation.error")}</p>}<button className="button" disabled={operation.busy || readOnly}>{m("preparation.save")}</button></form></Modal>
  </div>;
}

import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/src/components/ui/Primitives";
import { useAccount } from "@/src/hooks/useAccount";
import { useI18n } from "@/src/i18n/I18nProvider";
import { authService } from "@/src/services/authService";
import { PublicFrame } from "./AccountPages";

export function ResetPasswordPage() {
  const { m } = useI18n();
  const account = useAccount();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<"auth.password.invalid" | "auth.password.error" | null>(null);
  const pending = useRef(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current || saved) return;
    if (!z.string().min(8).max(128).safeParse(password).success || password !== confirmation) { setError("auth.password.invalid"); return; }
    if (!account.user?.emailVerified) { setError("auth.password.error"); return; }
    pending.current = true; setSaving(true); setError(null);
    try { await authService.updatePassword(password); setSaved(true); setPassword(""); setConfirmation(""); }
    catch { setError("auth.password.error"); }
    finally { pending.current = false; setSaving(false); }
  };
  return <PublicFrame><section className="auth-card" data-i18n-explicit="true">
    <h1>{m("auth.password.title")}</h1><p>{m("auth.password.description")}</p>
    {saved ? <p role="status">{m("auth.password.saved")}</p> : <form onSubmit={submit}>
      <label><span>{m("auth.field.password")}</span><input type="password" autoComplete="new-password" disabled={saving} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <label><span>{m("auth.password.confirm")}</span><input type="password" autoComplete="new-password" disabled={saving} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label>
      {error && <p className="form-error" role="alert">{m(error)}</p>}
      <Button type="submit" disabled={saving || account.loading}>{m(saving ? "auth.loading" : "auth.password.save")}</Button>
    </form>}
    <Link to={saved ? "/login" : "/forgot-password"}>{m(saved ? "public.nav.login" : "auth.recovery.title")}</Link>
  </section></PublicFrame>;
}

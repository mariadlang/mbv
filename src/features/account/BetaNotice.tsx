import { Link } from "react-router-dom";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { Button } from "@/src/components/ui/Primitives";
import { useAccount } from "@/src/hooks/useAccount";
import { useI18n } from "@/src/i18n/I18nProvider";

export function BetaNotice({ unavailable = false }: { unavailable?: boolean }) {
  const { m } = useI18n();
  const account = useAccount();
  return <main className="error-page" data-i18n-explicit="true"><BrandMark />
    <h1>{m(unavailable ? "beta.access.title" : "beta.free.title")}</h1>
    <p role={unavailable ? "alert" : "status"}>{m(unavailable ? "beta.access.description" : "beta.free.description")}</p>
    {unavailable ? <><Button onClick={account.refreshAccess}>{m("beta.retry")}</Button><Button variant="ghost" onClick={account.signOut}>{m("beta.logout")}</Button></>
      : <Link className="button button--primary" to="/app/today">{m("beta.return")}</Link>}
  </main>;
}

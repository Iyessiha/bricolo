import type { Metadata } from "next";
import { requireAdmin, day } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { markHandled } from "./actions";

export const metadata: Metadata = { title: "Inscriptions échouées", robots: { index: false } };
export const dynamic = "force-dynamic";
const KIND: Record<string, string> = { envoi_email: "Envoi de l’e-mail", limite: "Limite d’envoi", autre: "Autre erreur" };

export default async function Inscriptions() {
  await requireAdmin();
  const { data: rows } = await supabaseAdmin().from("signup_failures").select("*").order("created_at", { ascending: false }).limit(100);
  const open = (rows ?? []).filter((r) => !r.handled);
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">À traiter</p><h1>Inscriptions échouées</h1></div>
        {open.length > 0 && <form action={markHandled}><button className="btn small ghost">Tout marquer comme traité</button></form>}</div>
      <p className="meta">Personnes qui ont essayé de créer un compte et que le serveur a refusées. Écrivez-leur pour les inviter à réessayer, une fois la cause corrigée.</p>
      <div className="card pad stack">
        {rows?.length ? <div className="tw"><table className="tbl"><thead><tr><th>Quand</th><th>E-mail</th><th>Pays</th><th>Cause</th><th>Détail</th><th></th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.id} style={r.handled ? { opacity: 0.55 } : undefined}><td>{day(r.created_at)}</td>
            <td><a href={`mailto:${r.email}`}>{r.email}</a></td><td>{r.country_code ?? "—"}</td>
            <td><span className={`tag ${r.handled ? "mute" : "danger"}`}>{KIND[r.kind] ?? r.kind}</span></td>
            <td className="meta">{r.message}</td>
            <td>{!r.handled && <form action={markHandled}><input type="hidden" name="id" value={r.id} /><button className="btn small ghost">Traité</button></form>}</td></tr>)}
        </tbody></table></div> : <p className="empty">Aucune inscription échouée. Tout va bien.</p>}
      </div>
    </>
  );
}

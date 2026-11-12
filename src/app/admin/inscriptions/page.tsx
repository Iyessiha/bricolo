import type { Metadata } from "next";
import { requireAdmin, day } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { markHandled, relancer } from "./actions";

export const metadata: Metadata = { title: "Inscriptions échouées", robots: { index: false } };
export const dynamic = "force-dynamic";
const KIND: Record<string, string> = { envoi_email: "Envoi de l’e-mail", limite: "Limite d’envoi", autre: "Autre erreur" };

export default async function Inscriptions({ searchParams }: { searchParams: Promise<{ relance?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const { data: rows } = await supabaseAdmin().from("signup_failures").select("*").order("created_at", { ascending: false }).limit(100);
  const open = (rows ?? []).filter((r) => !r.handled);

  // Inscrits restés en route : compte sans fiche, ou fiche créée sans dossier d'identité.
  const db = supabaseAdmin();
  const { data: users } = await db.from("profiles").select("id, email, country_code, created_at, marketing_opt_out").eq("role", "artisan").order("created_at", { ascending: false }).limit(200);
  const { data: arts } = await db.from("artisans").select("id, user_id, name, status, created_at").in("user_id", (users ?? []).map((u) => u.id));
  const byUser = new Map((arts ?? []).map((a) => [a.user_id, a]));
  const { data: idr } = await db.from("artisan_identity").select("artisan_id").in("artisan_id", (arts ?? []).map((a) => a.id));
  const withId = new Set((idr ?? []).map((x) => x.artisan_id));
  const { data: sentRows } = await db.from("email_log").select("template, ref").in("template", ["nudge_profile", "nudge_documents"]);
  const sent = new Set((sentRows ?? []).map((x) => `${x.template}:${x.ref}`));
  type Stuck = { key: string; kind: "profile" | "documents"; id: string; who: string; step: string; since: string; sent: boolean; blocked?: string };
  const stuck: Stuck[] = [];
  for (const u of users ?? []) {
    const a = byUser.get(u.id);
    if (!a) stuck.push({ key: u.id, kind: "profile", id: u.id, who: u.email ?? "—", step: "Compte confirmé, profil non créé", since: u.created_at, sent: sent.has(`nudge_profile:${u.id}`), blocked: u.marketing_opt_out ? "a refusé les relances" : undefined });
    else if (a.status === "pending" && !withId.has(a.id)) stuck.push({ key: a.id, kind: "documents", id: a.id, who: `${a.name} · ${u.email ?? ""}`, step: "Profil créé, documents non envoyés", since: a.created_at, sent: sent.has(`nudge_documents:${a.id}`) });
  }
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">À traiter</p><h1>Inscriptions échouées</h1></div>
        {open.length > 0 && <form action={markHandled}><button className="btn small ghost">Tout marquer comme traité</button></form>}</div>
      <p className="meta">Personnes qui ont essayé de créer un compte et que le serveur a refusées. Écrivez-leur pour les inviter à réessayer, une fois la cause corrigée.</p>
      {sp.relance && <p className={`notice ${sp.relance === "ok" ? "ok" : "err"}`}>{sp.relance === "ok" ? "Relance envoyée." : `Pas envoyé : ${sp.relance}.`}</p>}
      <div className="card pad stack">
        <h2 style={{ fontSize: 18 }}>Inscrits à relancer</h2>
        <p className="meta">Personnes qui ont commencé l’inscription sans la terminer. Une relance par e-mail leur est aussi envoyée automatiquement 2 jours après, une seule fois.</p>
        {stuck.length ? <div className="tw"><table className="tbl"><thead><tr><th>Qui</th><th>Où ça bloque</th><th>Depuis</th><th></th></tr></thead><tbody>
          {stuck.map((x) => <tr key={x.key}><td>{x.who}</td><td>{x.step}</td><td>{day(x.since)}</td>
            <td>{x.sent ? <span className="tag ok">Relancé</span> : x.blocked ? <span className="tag mute">{x.blocked}</span> : <form action={relancer}><input type="hidden" name="kind" value={x.kind} /><input type="hidden" name="id" value={x.id} /><button className="btn small">Relancer par e-mail</button></form>}</td></tr>)}
        </tbody></table></div> : <p className="empty">Personne à relancer.</p>}
      </div>
      <div className="card pad stack">
        <h2 style={{ fontSize: 18 }}>Inscriptions refusées par le serveur</h2>
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

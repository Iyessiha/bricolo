import type { Metadata } from "next";
import { requireAdmin, day } from "@/lib/admin";

export const metadata: Metadata = { title: "Liste d’attente", robots: { index: false } };
export const dynamic = "force-dynamic";
const NAMES: Record<string, string> = { cm: "Cameroun", td: "Tchad", ga: "Gabon" };

export default async function Attente() {
  const { db } = await requireAdmin();
  const { data } = await db.from("waitlist").select("id, email, country, role, trade, city, created_at").order("created_at", { ascending: false }).limit(1000);
  const rows = data ?? [];
  const n = (c: string, r: string) => rows.filter((x) => x.country === c && x.role === r).length;
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Expansion</p><h1>Liste d’attente</h1></div></div>
      <div className="card pad stack">
        <h2 style={{ fontSize: 18 }}>Intérêt par pays</h2>
        <div className="tw"><table className="tbl"><thead><tr><th>Pays</th><th className="num">Artisans</th><th className="num">Clients</th></tr></thead><tbody>
          {Object.entries(NAMES).map(([c, name]) => <tr key={c}><td><b>{name}</b></td><td className="num">{n(c, "artisan")}</td><td className="num">{n(c, "client")}</td></tr>)}
        </tbody></table></div>
        <p className="hint">Page publique : <a href="/bientot" target="_blank" rel="noreferrer">/bientot</a>. Ces adresses ne servent qu’à prévenir de l’ouverture du pays.</p>
      </div>
      <div className="card pad stack">
        <h2 style={{ fontSize: 18 }}>Inscriptions ({rows.length})</h2>
        {rows.length ? <div className="tw"><table className="tbl"><thead><tr><th>Date</th><th>Pays</th><th>Profil</th><th>Ville</th><th>Métier</th><th>E-mail</th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.id}><td>{day(r.created_at)}</td><td>{NAMES[r.country] ?? r.country}</td><td>{r.role === "artisan" ? "Artisan" : "Client"}</td><td>{r.city ?? "—"}</td><td>{r.trade ?? "—"}</td><td>{r.email}</td></tr>)}
        </tbody></table></div> : <p className="empty">Personne ne s’est encore inscrit.</p>}
      </div>
    </>
  );
}

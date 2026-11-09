import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, day, ago, one } from "@/lib/admin";
import { COUNTRIES } from "@/lib/countries";
import { markRequest } from "../gestion";

export const metadata: Metadata = { title: "Demandes clients", robots: { index: false } };
export const dynamic = "force-dynamic";
const PER = 25;

export default async function Demandes({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  let q = db.from("service_requests").select("id, created_at, country_code, status, urgent, client_name, client_email, description, artisan:artisans(id, name), trade:trades(name)", { count: "exact" }).order("created_at", { ascending: false });
  if (sp.statut === "new" || sp.statut === "answered") q = q.eq("status", sp.statut);
  if (sp.pays) q = q.eq("country_code", sp.pays);
  if (sp.urgent === "1") q = q.eq("urgent", true);
  const { data: rows, count } = await q.range((page - 1) * PER, page * PER - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER));
  const keep = (p: number) => { const u = new URLSearchParams(); for (const k of ["statut", "pays", "urgent"]) if (sp[k]) u.set(k, sp[k]!); u.set("page", String(p)); return `/admin/demandes?${u}`; };
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Mise en relation</p><h1>Demandes clients</h1></div><a className="btn small" href="/admin/export?type=demandes">⬇ Exporter en CSV</a></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      <form className="afilters" method="get">
        <select name="statut" defaultValue={sp.statut ?? ""} aria-label="Statut"><option value="">Tous statuts</option><option value="new">Sans réponse</option><option value="answered">Répondues</option></select>
        <select name="pays" defaultValue={sp.pays ?? ""} aria-label="Pays"><option value="">Tous pays</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
        <select name="urgent" defaultValue={sp.urgent ?? ""} aria-label="Urgence"><option value="">Urgentes ou non</option><option value="1">Urgentes seulement</option></select>
        <button className="btn small primary" type="submit">Filtrer</button>
      </form>
      <div className="card pad stack">
        <p className="meta">{count ?? 0} demande{(count ?? 0) > 1 ? "s" : ""}</p>
        {rows?.length ? rows.map((r) => { const a = one(r.artisan as any) as any; const late = r.status === "new" && Date.now() - new Date(r.created_at).getTime() > 48 * 36e5; return (
          <div key={r.id} className="todo" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
            <span style={{ flex: "1 1 280px", minWidth: 0 }}>
              <b>{one(r.trade as any)?.name ?? "Demande"}</b> {r.urgent && <span className="tag err">Urgent</span>} <span className={`tag ${r.status === "new" ? "wait" : "ok"}`}>{r.status === "new" ? "Sans réponse" : "Répondue"}</span> {late && <span className="sla">⚠ +48 h</span>}
              <br /><span>{r.description}</span>
              <br /><span className="meta">{r.client_name ?? "Client"} · {r.client_email} · {(r.country_code ?? "").toUpperCase()} · {day(r.created_at)} ({ago(r.created_at)}) · pour {a ? <Link href={`/admin/artisan/${a.id}`}>{a.name}</Link> : "—"}</span>
            </span>
            <form action={markRequest}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value={r.status === "new" ? "answered" : "new"} /><input type="hidden" name="to" value={keep(page)} />
              <button className="btn small" type="submit">{r.status === "new" ? "Marquer répondue" : "Rouvrir"}</button></form>
          </div>); }) : <p className="empty">Aucune demande.</p>}
        {pages > 1 && <div className="pager">{page > 1 ? <Link className="btn small" href={keep(page - 1)}>← Précédent</Link> : <span />}<span className="meta">Page {page} / {pages}</span>{page < pages ? <Link className="btn small" href={keep(page + 1)}>Suivant →</Link> : <span />}</div>}
      </div>
    </>
  );
}

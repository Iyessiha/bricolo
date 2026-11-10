import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, day, one } from "@/lib/admin";
import { REPORT_REASONS } from "@/lib/email-flows";
import { resolveReport } from "../gestion";

export const metadata: Metadata = { title: "Signalements", robots: { index: false } };
export const dynamic = "force-dynamic";
const TABS = [["new", "À traiter"], ["upheld", "Retenus"], ["dismissed", "Classés"], ["all", "Tous"]] as const;
const SANCTIONS = [["", "Retenir sans sanction"], ["avertissement", "Avertissement"], ["badge_retire", "Retirer le badge « Vérifié »"], ["suspension", "Suspendre le profil"], ["bannissement", "Bannir définitivement"]] as const;

export default async function Signalements({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const st = TABS.some((t) => t[0] === sp.statut) ? sp.statut! : "new";
  let q = db.from("reports").select("id, reason, details, reporter_name, reporter_contact, status, resolution, resolved_by, resolved_at, created_at, artisan:artisans(id, name, status, verified)").order("created_at", { ascending: false }).limit(100);
  if (st !== "all") q = q.eq("status", st);
  const { data: rows } = await q;
  // Nombre de signalements retenus par artisan, pour repérer les récidivistes.
  const ids = [...new Set((rows ?? []).map((r) => (one(r.artisan as any) as any)?.id).filter(Boolean))];
  const { data: upheld } = ids.length ? await db.from("reports").select("artisan_id").eq("status", "upheld").in("artisan_id", ids) : { data: [] as { artisan_id: string }[] };
  const nUp = new Map<string, number>();
  for (const u of upheld ?? []) nUp.set(u.artisan_id, (nUp.get(u.artisan_id) ?? 0) + 1);

  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Modération</p><h1>Signalements</h1></div></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <div className="chips">{TABS.map(([k, l]) => <Link key={k} href={`/admin/signalements?statut=${k}`} className={`chip${st === k ? " on" : ""}`}>{l}</Link>)}</div>
      <div className="card pad stack">
        {rows?.length ? rows.map((r) => { const a = one(r.artisan as any) as any; const n = a ? nUp.get(a.id) ?? 0 : 0; return (
          <div key={r.id} className="todo" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <span style={{ flex: "1 1 320px", minWidth: 0 }}>
              <b>{REPORT_REASONS[r.reason] ?? r.reason}</b> · {a ? <Link href={`/admin/artisan/${a.id}`}>{a.name}</Link> : "—"}
              {a && a.status === "suspended" && <> <span className="tag mute">suspendu</span></>}
              {n >= 2 && <> <span className="tag wait">{n} déjà retenus</span></>}
              <br />{r.details}
              <br /><span className="meta">Par {r.reporter_name || "anonyme"} · {r.reporter_contact} · {day(r.created_at)}</span>
              {r.status !== "new" && <><br /><span className="meta">{r.status === "upheld" ? "Retenu" : "Classé"} par {r.resolved_by} — {r.resolution || "sans commentaire"}</span></>}
            </span>
            {r.status === "new" && (
              <form action={resolveReport} className="stack" style={{ flex: "1 1 260px", gap: 8 }}>
                <input type="hidden" name="id" value={r.id} />
                <select name="sanction" aria-label="Sanction" defaultValue="">{SANCTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                <textarea name="reason" maxLength={1000} placeholder="Motif ou réponse (communiqué à l’artisan en cas de sanction)" aria-label="Motif" />
                <span className="row" style={{ gap: 6 }}>
                  <button className="btn small primary" name="outcome" value="retenir">Retenir</button>
                  <button className="btn small" name="outcome" value="classer">Classer sans suite</button>
                </span>
              </form>
            )}
          </div>); }) : <p className="empty">Aucun signalement dans cette liste.</p>}
      </div>
    </>
  );
}

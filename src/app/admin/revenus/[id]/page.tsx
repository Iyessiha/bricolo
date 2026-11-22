import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, one } from "@/lib/admin";
import { fcfa } from "@/lib/format";
import { confirmerPaiement } from "@/app/admin/gestion";

export const metadata: Metadata = { title: "Détail du paiement", robots: { index: false } };
export const dynamic = "force-dynamic";
const T: Record<string, string> = { recherche: "Boost recherche", accueil: "Boost accueil", urgence: "Boost urgence", cible: "Boost ciblé" };
const fmt = (iso?: string | null) => (iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "medium", timeZone: "UTC" }).format(new Date(iso)) + " (UTC)" : "—");

export default async function PaiementDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const { data: p } = await db.from("payments")
    .select("id, amount, currency, status, provider, provider_ref, raw, created_at, paid_at, boost:boosts(type, duration_hours, status, starts_at, ends_at, artisan:artisans(id, name, phone, whatsapp, country_code)), sub:subscriptions(days, status, ends_at, artisan:artisans(id, name, phone, whatsapp, country_code))")
    .eq("id", id).maybeSingle();
  if (!p) notFound();
  const b = one(p.boost as any) as any, s = one(p.sub as any) as any;
  const a = one(b?.artisan) ?? one(s?.artisan) as any;
  const raw = (p.raw ?? {}) as Record<string, any>;
  const motif = raw.echec_creation as string | undefined;
  const label = p.status === "paid" ? "Payé" : p.status === "failed" ? "Échoué" : "En attente";
  const what = s ? `Forfait Pro · ${s.days} jours` : `${T[b?.type] ?? "Boost"} · ${b ? b.duration_hours / 24 : "?"} jour(s)`;
  const row = (k: string, v: React.ReactNode) => <tr><td style={{ width: 190 }}><b>{k}</b></td><td>{v}</td></tr>;

  let explain = "";
  if (p.status === "failed" && motif?.startsWith("paiements_fermes")) explain = "Les paiements sont fermés sur le serveur : GENIUSPAY_MODE doit valoir « live » (ou « sandbox ») dans Vercel, puis il faut redéployer. Le mode lu par le serveur est indiqué ci-dessous.";
  else if (p.status === "failed" && motif) explain = "GeniusPay a refusé la création du paiement. Le code indiqué ci-dessus (401/403 = clés incorrectes ou d’un autre environnement, 422 = montant ou champ refusé).";
  else if (p.status === "failed") explain = "Paiement marqué échoué (annulé ou refusé côté GeniusPay). Voir les données reçues ci-dessous.";
  else if (p.status === "pending") explain = "Aucune confirmation reçue de GeniusPay. Soit le client n’a pas terminé, soit le webhook n’arrive pas : vérifiez l’adresse du webhook et le secret whsec_ dans GeniusPay et Vercel.";

  return (
    <>
      <div className="atitle"><div><p className="eyebrow"><Link href="/admin/revenus">← Revenus</Link></p><h1>Détail du paiement</h1></div></div>
      <div className="card pad stack">
        <p><span className={`tag ${p.status === "paid" ? "ok" : p.status === "failed" ? "err" : "wait"}`}>{label}</span> <b className="num" style={{ marginLeft: 8 }}>{fcfa(p.amount)}</b></p>
        {sp.ok && <p className="notice ok">{sp.ok}</p>}
        {sp.erreur && <p className="notice err">{sp.erreur}</p>}
        {motif && <p className="notice err"><b>Motif de l’échec :</b> {motif}</p>}
        {explain && <p className="hint">{explain}</p>}
        {p.status === "pending" && (
          <form action={confirmerPaiement} className="notice stack" style={{ gap: 8 }}>
            <b>Le client a payé mais rien ne s’est activé ?</b>
            <p>Vérifiez d’abord dans votre espace GeniusPay que ce paiement ({fcfa(p.amount)}, référence ci-dessous) est bien encaissé. Ensuite, confirmez-le ici : le boost ou le forfait est activé tout de suite.</p>
            <input type="hidden" name="id" value={p.id} />
            <div><button className="btn" type="submit">Confirmer ce paiement et activer</button></div>
          </form>
        )}
        <div className="tw"><table className="tbl"><tbody>
          {row("Achat", what)}
          {row("Artisan", a ? <Link href={`/admin/artisan/${a.id}`}>{a.name}</Link> : "—")}
          {row("Téléphone", a ? `${a.phone ?? "—"}${a.whatsapp ? ` · WhatsApp ${a.whatsapp}` : ""}` : "—")}
          {row("Créé le", fmt(p.created_at))}
          {row("Payé le", fmt(p.paid_at))}
          {row("Référence", <code>{p.provider_ref}</code>)}
          {row("Prestataire", `${p.provider} · ${p.currency}`)}
          {b && row("Boost", `${b.status} · ${fmt(b.starts_at)} → ${fmt(b.ends_at)}`)}
          {s && row("Forfait", `${s.status} · fin ${fmt(s.ends_at)}`)}
          {raw.mode !== undefined && row("Mode lu par le serveur", `${raw.mode} · environnement ${raw.env ?? "?"} · clés présentes : ${raw.cles ? "oui" : "non"}`)}
        </tbody></table></div>
        <h2 style={{ fontSize: 17 }}>Données brutes</h2>
        {Object.keys(raw).length ? <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, background: "var(--surface-100)", padding: 12, borderRadius: 10 }}>{JSON.stringify(raw, null, 2)}</pre> : <p className="empty">Aucune donnée enregistrée.</p>}
      </div>
    </>
  );
}

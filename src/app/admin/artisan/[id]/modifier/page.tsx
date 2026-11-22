import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { modifierFiche } from "@/app/admin/gestion";

export const metadata: Metadata = { title: "Modifier la fiche", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ModifierFiche({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { db } = await requireAdmin();
  const [{ data: a }, { data: trades }] = await Promise.all([
    db.from("artisans").select("id, name, account_type, company_name, trade_id, headline, description, price_label, experience_years, phone, whatsapp, open_24_7, takes_urgent, country_code").eq("id", id).maybeSingle(),
    db.from("trades").select("id, name").order("name"),
  ]);
  if (!a) notFound();
  return (
    <>
      <div className="atitle"><div><p className="eyebrow"><Link href={`/admin/artisan/${id}`}>← Dossier de l’artisan</Link></p><h1>Modifier la fiche</h1></div>
        <a className="btn small" href={`/artisan/${id}`} target="_blank" rel="noopener noreferrer">Voir la fiche publique</a></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <form action={modifierFiche} className="card pad stack">
        <input type="hidden" name="id" value={a.id} />
        <p className="hint">Vous modifiez la fiche telle que les clients la voient. L’artisan reste propriétaire de son compte et peut la modifier à son tour. Chaque changement est inscrit au journal.</p>
        <div className="fld"><label htmlFor="name">Nom affiché</label><input id="name" name="name" defaultValue={a.name} required maxLength={120} /></div>
        <div className="fld"><label htmlFor="account_type">Type de compte</label>
          <select id="account_type" name="account_type" defaultValue={a.account_type ?? "individuel"}><option value="individuel">Individuel</option><option value="entreprise">Entreprise</option></select></div>
        <div className="fld"><label htmlFor="company_name">Nom de l’entreprise (si entreprise)</label><input id="company_name" name="company_name" defaultValue={a.company_name ?? ""} maxLength={120} /></div>
        <div className="fld"><label htmlFor="trade_id">Métier</label>
          <select id="trade_id" name="trade_id" defaultValue={a.trade_id}>{(trades ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div className="fld"><label htmlFor="headline">Accroche (une ligne sous le nom)</label><input id="headline" name="headline" defaultValue={a.headline ?? ""} maxLength={140} /></div>
        <div className="fld"><label htmlFor="description">Présentation</label><textarea id="description" name="description" rows={7} defaultValue={a.description ?? ""} maxLength={2000} /><span className="hint">2000 caractères au maximum.</span></div>
        <div className="fld"><label htmlFor="price_label">Tarif indicatif</label><input id="price_label" name="price_label" defaultValue={a.price_label ?? ""} maxLength={140} placeholder="Ex. Déplacement 5 000 FCFA, devis gratuit" /></div>
        <div className="fld"><label htmlFor="experience_years">Années d’expérience</label><input id="experience_years" name="experience_years" inputMode="numeric" defaultValue={a.experience_years ?? ""} maxLength={2} /></div>
        <div className="fld"><label htmlFor="phone">Téléphone</label><input id="phone" name="phone" defaultValue={a.phone ?? ""} required maxLength={30} /></div>
        <div className="fld"><label htmlFor="whatsapp">WhatsApp</label><input id="whatsapp" name="whatsapp" defaultValue={a.whatsapp ?? ""} maxLength={30} /></div>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" name="open_24_7" defaultChecked={!!a.open_24_7} /> Ouvert 24 h/24, 7 j/7</label>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" name="takes_urgent" defaultChecked={!!a.takes_urgent} /> Accepte les dépannages urgents</label>
        <div className="row" style={{ gap: 8 }}><button className="btn primary" type="submit">Enregistrer la fiche</button><Link className="btn" href={`/admin/artisan/${id}`}>Annuler</Link></div>
      </form>
    </>
  );
}

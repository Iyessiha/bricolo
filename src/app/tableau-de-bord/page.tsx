import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { countryName } from "@/lib/countries";
import Flag from "@/components/Flag";
import { BOOST_TYPES, fcfa, timeLeft } from "@/lib/format";
import { BOOST_TERMS_LINK } from "@/lib/company";
import SetupNotice from "@/components/SetupNotice";
import { requestVerification, saveProfile } from "./actions";
import { signOut } from "../auth-actions";

export const metadata: Metadata = { title: "Mon espace" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await db.from("profiles").select("country_code, role").eq("id", user.id).single();
  if (!profile?.country_code) redirect("/inscription");
  const country = profile.country_code as string;

  const [{ data: trades }, { data: zones }, { data: artisan }] = await Promise.all([
    db.from("trades").select("id, name").order("name"),
    db.from("zones").select("id, name").eq("country_code", country).order("name"),
    db.from("artisans").select("*, zones:artisan_zones(zone_id)").eq("user_id", user.id).maybeSingle(),
  ]);
  // Prérempli depuis le tunnel d’inscription tant que la fiche n’existe pas.
  const meta = (user.user_metadata ?? {}) as { business_name?: string; trade_id?: string; account_type?: string; company_registration?: string };
  const accountType = artisan?.account_type ?? (meta.account_type === "entreprise" ? "entreprise" : "individuel");
  const { data: company } = artisan ? await db.from("artisan_companies").select("registration_number").eq("artisan_id", artisan.id).maybeSingle() : { data: null };
  const myZones = new Set(((artisan as any)?.zones ?? []).map((z: any) => z.zone_id));

  const { data: grid } = artisan ? await db.from("price_grid").select("boost_type, duration_hours, amount").eq("country_code", country) : { data: null };
  const from = (t: string) => { const v = (grid ?? []).filter((g) => g.boost_type === t).map((g) => g.amount); return v.length ? Math.min(...v) : null; };
  let stats = { vues: 0, appels: 0, wa: 0, demandes: 0 };
  let boosts: any[] = [];
  if (artisan) {
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const { data: ev } = await db.from("events").select("type").eq("artisan_id", artisan.id).gte("created_at", since);
    for (const e of ev ?? []) {
      if (e.type === "view") stats.vues++; else if (e.type === "call") stats.appels++; else if (e.type === "whatsapp") stats.wa++; else stats.demandes++;
    }
    const res = await db.from("boosts").select("id, type, status, ends_at").eq("artisan_id", artisan.id).eq("status", "active").gt("ends_at", new Date().toISOString());
    boosts = res.data ?? [];
  }

  return (
    <section className="inner sec stack">
      <div className="sec-head" style={{ margin: 0 }}>
        <div><p className="eyebrow fl">Espace artisan · <Flag code={country} size={20} />{countryName(country)}</p><h1 style={{ fontSize: "clamp(26px,4.5vw,38px)" }}>{artisan ? `Bonjour, ${artisan.name}` : "Créez votre profil"}</h1></div>
        <form action={signOut}><button className="btn small" type="submit">Se déconnecter</button></form>
      </div>
      {sp.ok && <p className="notice ok">Profil enregistré.</p>}
      {sp.erreur && <p className="notice err">Vérifiez le nom, le métier et au moins une zone.</p>}

      {artisan && (
        <>
          <div className="tags">
            <span className="tag ok">E-mail confirmé</span>
            {artisan.status === "approved" && <span className="tag ok">Profil validé</span>}
            {artisan.status === "pending" && <span className="tag wait">En attente de validation</span>}
            {artisan.status === "rejected" && <span className="tag mute">Profil refusé</span>}
            {artisan.verified && <span className="tag ok">✓ Vérifié</span>}
          </div>
          <div className="stats">
            <div className="card stat"><b>{stats.vues}</b><span>Vues du profil, 7 jours</span></div>
            <div className="card stat"><b>{stats.appels}</b><span>Clics sur Appeler</span></div>
            <div className="card stat"><b>{stats.wa}</b><span>Clics sur WhatsApp</span></div>
            <div className="card stat"><b>{stats.demandes}</b><span>Demandes reçues</span></div>
          </div>
          <div className="card pad stack">
            <h2 style={{ fontSize: 20 }}>Boosts actifs</h2>
            {boosts.length ? boosts.map((b) => (
              <p key={b.id}><b>{BOOST_TYPES[b.type].name}</b> <span className="meta">· reste {timeLeft(b.ends_at)}</span></p>
            )) : <p className="meta">Aucun boost actif. Votre profil apparaît parmi les résultats naturels.</p>}
            {artisan.status === "approved" && (
              <div className="stack" style={{ gap: 8 }}>
                <p className="lbl">Options de mise en avant</p>
                {(["recherche", "accueil", "urgence"] as const).map((t) => (
                  <div key={t} className="offer" style={{ background: "var(--surface-sunken)" }}>
                    <div><b>{BOOST_TYPES[t].name}</b><span>{BOOST_TYPES[t].text}</span></div>
                    {from(t) && <span className="tag boost">dès {fcfa(from(t)!)}</span>}
                  </div>
                ))}
                <p className="hint">Durées : 24 h, 3 jours ou 7 jours, payables en Mobile Money. Emplacements limités. <Link href={BOOST_TERMS_LINK}>Conditions de vente</Link></p>
              </div>
            )}
            <div className="row">
              {artisan.status === "approved" ? <Link className="btn boost" href="/boosts">Booster mon profil</Link> : <p className="hint">Les boosts sont disponibles une fois votre profil validé.</p>}
              {artisan.status === "approved" && !artisan.verified && !artisan.verification_requested && (
                <form action={requestVerification}><button className="btn" type="submit">Demander le badge Vérifié</button></form>
              )}
              {artisan.verification_requested && !artisan.verified && <span className="tag wait">Vérification en cours</span>}
            </div>
          </div>
        </>
      )}

      <form action={saveProfile} className="card pad stack">
        <h2 style={{ fontSize: 20 }}>{artisan ? "Modifier mon profil" : "Votre profil"}</h2>
        <div className="fld"><span className="lbl" id="statut-l">Vous exercez</span>
          <div className="chips" role="radiogroup" aria-labelledby="statut-l">
            <label className="chip"><input type="radio" name="account_type" value="individuel" defaultChecked={accountType === "individuel"} />À titre individuel</label>
            <label className="chip"><input type="radio" name="account_type" value="entreprise" defaultChecked={accountType === "entreprise"} />Au nom d’une entreprise</label>
          </div></div>
        <div className="fld when-ent"><label htmlFor="company_name">Nom officiel de l’entreprise</label><input type="text" id="company_name" name="company_name" maxLength={120} defaultValue={artisan?.company_name ?? meta.business_name ?? ""} /></div>
        <div className="fld when-ent"><label htmlFor="registration_number">Numéro d’immatriculation (RCCM, IFU, NIF ou NINEA)</label><input type="text" id="registration_number" name="registration_number" maxLength={60} defaultValue={company?.registration_number ?? meta.company_registration ?? ""} /><span className="hint">Jamais affiché aux clients. Il sert à valider votre profil et à obtenir le badge Vérifié.</span></div>
        <div className="fld"><label htmlFor="name">Nom affiché aux clients</label><input type="text" id="name" name="name" required defaultValue={artisan?.name ?? meta.business_name ?? ""} /></div>
        <div className="fld"><label htmlFor="trade_id">Métier principal</label>
          <select id="trade_id" name="trade_id" required defaultValue={artisan?.trade_id ?? meta.trade_id ?? ""}>
            <option value="" disabled>Choisir…</option>
            {trades?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
        <div className="fld"><span className="lbl">Zones couvertes ({countryName(country)})</span>
          <div className="chips">{zones?.map((z) => (
            <label className="chip" key={z.id}><input type="checkbox" name="zones" value={z.id} defaultChecked={myZones.has(z.id)} />{z.name}</label>
          ))}</div></div>
        <div className="fld"><label htmlFor="price_label">Tarif indicatif (FCFA)</label><input type="text" id="price_label" name="price_label" defaultValue={artisan?.price_label ?? ""} placeholder="Dès 5 000 F" /></div>
        <div className="fld"><label htmlFor="phone">Téléphone</label><input type="tel" id="phone" name="phone" defaultValue={artisan?.phone ?? ""} placeholder="+225 07 00 00 00 00" /></div>
        <div className="fld"><label htmlFor="whatsapp">WhatsApp (si différent)</label><input type="tel" id="whatsapp" name="whatsapp" defaultValue={artisan?.whatsapp ?? ""} /></div>
        <div className="fld"><label htmlFor="description">Description</label><textarea id="description" name="description" maxLength={1000} defaultValue={artisan?.description ?? ""} placeholder="Décrivez vos services en deux ou trois phrases." /></div>
        <button className="btn primary" type="submit">{artisan ? "Enregistrer" : "Envoyer mon profil pour validation"}</button>
      </form>
      {profile.role === "admin" && <p><Link href="/admin">Ouvrir l’administration</Link></p>}
    </section>
  );
}

export const dynamic = "force-dynamic";

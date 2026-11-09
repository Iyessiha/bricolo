import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { countryName } from "@/lib/countries";
import { BOOST_TYPES, timeLeft } from "@/lib/format";
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
  const meta = (user.user_metadata ?? {}) as { business_name?: string; trade_id?: string };
  const myZones = new Set(((artisan as any)?.zones ?? []).map((z: any) => z.zone_id));

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
        <div><p className="eyebrow">Espace artisan · {countryName(country)}</p><h1 style={{ fontSize: "clamp(26px,4.5vw,38px)" }}>{artisan ? `Bonjour, ${artisan.name}` : "Créez votre profil"}</h1></div>
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
        <div className="fld"><label htmlFor="name">Nom ou nom de l’atelier</label><input type="text" id="name" name="name" required defaultValue={artisan?.name ?? meta.business_name ?? ""} /></div>
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

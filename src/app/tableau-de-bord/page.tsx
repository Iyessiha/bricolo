import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { countryName } from "@/lib/countries";
import Flag from "@/components/Flag";
import { BOOST_TYPES, fcfa, timeLeft, initials } from "@/lib/format";
import { BOOST_TERMS_LINK } from "@/lib/company";
import SetupNotice from "@/components/SetupNotice";
import PhotoUpdate from "@/components/PhotoUpdate";
import DiplomaAdd from "@/components/DiplomaAdd";
import { markAnswered, requestVerification, saveProfile } from "./actions";
import { signOut } from "../auth-actions";

export const metadata: Metadata = { title: "Mon espace" };
const day = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso));
const DOC_STATUS = { pending: ["wait", "En cours de vérification"], approved: ["ok", "✓ Vérifié"], rejected: ["mute", "Refusé"] } as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await db.from("profiles").select("country_code, role").eq("id", user.id).single();
  if (profile?.role === "admin") redirect("/admin");
  if (!profile?.country_code) redirect("/inscription");
  const country = profile.country_code as string;

  const [{ data: trades }, { data: zones }, { data: artisan }] = await Promise.all([
    db.from("trades").select("id, name").order("name"),
    db.from("zones").select("id, name").eq("country_code", country).order("name"),
    db.from("artisans").select("*, zones:artisan_zones(zone_id)").eq("user_id", user.id).maybeSingle(),
  ]);
  // Le dossier doit être complet (profil, photo, pièce d'identité) : sinon on reprend le tunnel d'activation.
  if (!artisan || !artisan.photo_url) redirect("/activation");
  const [{ data: ident }, { data: diplomas }, { data: company }] = await Promise.all([
    db.from("artisan_identity").select("status, reject_reason, submitted_at").eq("artisan_id", artisan.id).maybeSingle(),
    db.from("artisan_diplomas").select("id, title, status, reject_reason, submitted_at").eq("artisan_id", artisan.id).order("submitted_at", { ascending: false }),
    db.from("artisan_companies").select("registration_number").eq("artisan_id", artisan.id).maybeSingle(),
  ]);
  if (!ident) redirect("/activation");

  const approved = artisan.status === "approved", rejected = artisan.status === "rejected";
  const myZones = new Set(((artisan as any).zones ?? []).map((z: any) => z.zone_id));
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ data: ev }, { data: act }, { data: reqs }, { data: grid }] = await Promise.all([
    db.from("events").select("type").eq("artisan_id", artisan.id).gte("created_at", since),
    db.from("boosts").select("id, type, status, ends_at").eq("artisan_id", artisan.id).eq("status", "active").gt("ends_at", new Date().toISOString()),
    db.from("service_requests").select("id, client_name, client_email, description, urgent, status, created_at").eq("artisan_id", artisan.id).order("created_at", { ascending: false }).limit(15),
    db.from("price_grid").select("boost_type, duration_hours, amount").eq("country_code", country),
  ]);
  const stats = { vues: 0, appels: 0, wa: 0, demandes: 0 };
  for (const e of ev ?? []) { if (e.type === "view") stats.vues++; else if (e.type === "call") stats.appels++; else if (e.type === "whatsapp") stats.wa++; else stats.demandes++; }
  const from = (t: string) => { const v = (grid ?? []).filter((g) => g.boost_type === t).map((g) => g.amount); return v.length ? Math.min(...v) : null; };
  const newReqs = (reqs ?? []).filter((r) => r.status === "new").length;

  const sec = (["apercu", "demandes", "profil", "diplomes", "visibilite"] as const).find((k) => k === sp.s) ?? "apercu";
  return (
    <section className="inner sec stack">
      <div className="sec-head" style={{ margin: 0 }}>
        <div className="row" style={{ flexWrap: "nowrap", gap: 14 }}>
          {artisan.photo_url ? <img className="curphoto" style={{ width: 64, height: 64 }} src={artisan.photo_url} alt="" /> : <span className="avatar" style={{ width: 64, height: 64 }}>{initials(artisan.name)}</span>}
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow fl">Espace artisan · <Flag code={country} size={20} />{countryName(country)}</p>
            <h1 style={{ fontSize: "clamp(24px,4.5vw,36px)" }}>Bonjour, {artisan.name}</h1>
          </div>
        </div>
        <form action={signOut}><button className="btn small" type="submit">Se déconnecter</button></form>
      </div>

      <nav className="subnav" aria-label="Sections">
        {([["apercu", "Aperçu"], ["demandes", `Demandes${newReqs ? ` (${newReqs})` : ""}`], ["profil", "Profil"], ["diplomes", "Diplômes"], ["visibilite", "Visibilité"]] as const).map(([k, l]) => (
          <Link key={k} href={`/tableau-de-bord?s=${k}`} scroll={false} aria-current={sec === k ? "page" : undefined}>{l}</Link>
        ))}
      </nav>
      {sp.ok && <p className="notice ok">Profil enregistré.</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}

      <div id="apercu" className="stack" hidden={sec !== "apercu"}>
        {approved && <div className="notice ok row" style={{ justifyContent: "space-between" }}><span><b>Votre profil est en ligne.</b> Les clients peuvent vous trouver.</span><Link className="btn small" href={`/artisan/${artisan.id}`}>Voir ma fiche</Link></div>}
        {!approved && !rejected && (
          <div className="notice"><b>Dossier en cours de vérification.</b> Envoyé le {day(ident.submitted_at)}. Nous répondons en général sous 24 à 48 heures, par e-mail. Votre profil sera visible des clients dès sa validation.</div>
        )}
        {rejected && (
          <div className="notice err stack" style={{ gap: 8 }}>
            <b>Votre dossier n’a pas pu être validé.</b>
            <p>{artisan.reject_reason ?? "Certaines informations sont à corriger."}</p>
            <div><Link className="btn primary" href="/activation">Corriger mon dossier</Link></div>
          </div>
        )}
        <div className="tags">
          <span className="tag ok">E-mail confirmé</span>
          <span className={`tag ${DOC_STATUS[ident.status as keyof typeof DOC_STATUS][0]}`}>Identité : {DOC_STATUS[ident.status as keyof typeof DOC_STATUS][1].replace("✓ ", "")}</span>
          {artisan.verified && <span className="tag ok">✓ Badge Vérifié</span>}
          {artisan.diploma_verified && <span className="tag ok">🎓 Diplôme vérifié</span>}
          {artisan.experience_years != null && <span className="tag mute">{artisan.experience_years} an{artisan.experience_years > 1 ? "s" : ""} d’expérience</span>}
          {artisan.account_type === "entreprise" && <span className="tag mute">Entreprise</span>}
        </div>
        {approved && (
          <div className="stats">
            <div className="card stat"><b>{stats.vues}</b><span>Vues du profil, 7 jours</span></div>
            <div className="card stat"><b>{stats.appels}</b><span>Clics sur Appeler</span></div>
            <div className="card stat"><b>{stats.wa}</b><span>Clics sur WhatsApp</span></div>
            <div className="card stat"><b>{stats.demandes}</b><span>Demandes reçues</span></div>
          </div>
        )}
      </div>

      <div id="demandes" className="card pad stack" hidden={sec !== "demandes"}>
        <h2 style={{ fontSize: 20 }}>Demandes des clients</h2>
        {reqs?.length ? reqs.map((r) => (
          <div key={r.id} className="req">
            <div className="tags">{r.urgent && <span className="tag boost">Urgent</span>}{r.status === "new" ? <span className="tag wait">Nouvelle</span> : <span className="tag mute">Traitée</span>}<span className="meta">{day(r.created_at)}</span></div>
            <p><b>{r.client_name || "Client"}</b> · <a href={`mailto:${r.client_email}`}>{r.client_email}</a></p>
            <p>{r.description}</p>
            {r.status === "new" && <form action={markAnswered}><input type="hidden" name="id" value={r.id} /><button className="btn small" type="submit">Marquer comme traitée</button></form>}
          </div>
        )) : <p className="empty">Aucune demande pour le moment. Elles apparaîtront ici et vous seront aussi envoyées par e-mail.</p>}
      </div>

      <div id="profil" className="stack" hidden={sec !== "profil"}>
        <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Photo de profil</h2><PhotoUpdate uid={user.id} photoUrl={artisan.photo_url} name={artisan.name} /></div>
        <form action={saveProfile} className="card pad stack">
          <h2 style={{ fontSize: 20 }}>Modifier mon profil</h2>
          <div className="fld"><span className="lbl" id="statut-l">Vous exercez</span>
            <div className="chips" role="radiogroup" aria-labelledby="statut-l">
              <label className="chip"><input type="radio" name="account_type" value="individuel" defaultChecked={artisan.account_type === "individuel"} />À titre individuel</label>
              <label className="chip"><input type="radio" name="account_type" value="entreprise" defaultChecked={artisan.account_type === "entreprise"} />Au nom d’une entreprise</label>
            </div></div>
          <div className="fld when-ent"><label htmlFor="company_name">Nom officiel de l’entreprise</label><input type="text" id="company_name" name="company_name" maxLength={120} defaultValue={artisan.company_name ?? ""} /></div>
          <div className="fld when-ent"><label htmlFor="registration_number">Numéro d’immatriculation (RCCM, IFU, NIF ou NINEA)</label><input type="text" id="registration_number" name="registration_number" maxLength={60} defaultValue={company?.registration_number ?? ""} /><span className="hint">Jamais affiché aux clients. Il sert à valider votre profil.</span></div>
          <div className="fld"><label htmlFor="name">Nom affiché aux clients</label><input type="text" id="name" name="name" required defaultValue={artisan.name} /></div>
          <div className="fld"><label htmlFor="trade_id">Métier principal</label>
            <select id="trade_id" name="trade_id" required defaultValue={artisan.trade_id}>{trades?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div className="fld"><label htmlFor="experience_years">Années d’expérience</label><input type="number" inputMode="numeric" min={0} max={60} id="experience_years" name="experience_years" required defaultValue={artisan.experience_years ?? ""} /></div>
          <div className="fld"><span className="lbl">Zones couvertes ({countryName(country)})</span>
            <div className="chips">{zones?.map((z) => (<label className="chip" key={z.id}><input type="checkbox" name="zones" value={z.id} defaultChecked={myZones.has(z.id)} />{z.name}</label>))}</div></div>
          <div className="fld"><label htmlFor="price_label">Tarif indicatif (FCFA)</label><input type="text" id="price_label" name="price_label" defaultValue={artisan.price_label ?? ""} placeholder="Dès 5 000 F" /></div>
          <div className="fld"><label htmlFor="phone">Téléphone</label><input type="tel" id="phone" name="phone" required defaultValue={artisan.phone ?? ""} /></div>
          <div className="fld"><label htmlFor="whatsapp">WhatsApp (si différent)</label><input type="tel" id="whatsapp" name="whatsapp" defaultValue={artisan.whatsapp ?? ""} /></div>
          <div className="fld"><label htmlFor="description">Description</label><textarea id="description" name="description" maxLength={1000} defaultValue={artisan.description ?? ""} /></div>
          <button className="btn primary" type="submit">Enregistrer</button>
        </form>
      </div>

      <div id="diplomes" className="card pad stack" hidden={sec !== "diplomes"}>
        <h2 style={{ fontSize: 20 }}>Diplômes et certificats</h2>
        <p className="muted">Après vérification, votre fiche affiche « Diplôme vérifié », ce qui rassure les clients.</p>
        {diplomas?.map((d) => (
          <div key={d.id} className="row" style={{ justifyContent: "space-between" }}>
            <span><b>{d.title}</b>{d.status === "rejected" && d.reject_reason ? <span className="meta"> · {d.reject_reason}</span> : null}</span>
            <span className={`tag ${DOC_STATUS[d.status as keyof typeof DOC_STATUS][0]}`}>{DOC_STATUS[d.status as keyof typeof DOC_STATUS][1]}</span>
          </div>
        ))}
        {(diplomas?.filter((d) => d.status !== "rejected").length ?? 0) < 3 && <DiplomaAdd uid={user.id} />}
      </div>

      <div id="visibilite" className="card pad stack" hidden={sec !== "visibilite"}>
        <h2 style={{ fontSize: 20 }}>Visibilité</h2>
        <h3 style={{ fontSize: 16 }}>Boosts actifs</h3>
        {act?.length ? act.map((b) => (<p key={b.id}><b>{BOOST_TYPES[b.type].name}</b> <span className="meta">· reste {timeLeft(b.ends_at)}</span></p>)) : <p className="meta">Aucun boost actif. Votre profil apparaît parmi les résultats naturels.</p>}
        {approved ? (
          <div className="stack" style={{ gap: 8 }}>
            <p className="lbl">Options de mise en avant</p>
            {(["recherche", "accueil", "urgence"] as const).map((t) => (
              <div key={t} className="offer" style={{ background: "var(--surface-sunken)" }}>
                <div><b>{BOOST_TYPES[t].name}</b><span>{BOOST_TYPES[t].text}</span></div>
                {from(t) && <span className="tag boost">dès {fcfa(from(t)!)}</span>}
              </div>
            ))}
            <p className="hint">Durées : 24 h, 3 jours ou 7 jours, payables en Mobile Money. Emplacements limités. <Link href={BOOST_TERMS_LINK}>Conditions de vente</Link></p>
            <div className="row">
              <Link className="btn boost" href="/boosts">Booster mon profil</Link>
              {!artisan.verified && !artisan.verification_requested && <form action={requestVerification}><button className="btn" type="submit">Demander le badge Vérifié</button></form>}
              {artisan.verification_requested && !artisan.verified && <span className="tag wait">Badge en cours d’examen</span>}
            </div>
          </div>
        ) : <p className="hint">Les boosts sont disponibles une fois votre profil validé.</p>}
      </div>
    </section>
  );
}

export const dynamic = "force-dynamic";

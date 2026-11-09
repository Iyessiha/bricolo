import { COMPANY } from "@/lib/company";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { countryName } from "@/lib/countries";
import Flag from "@/components/Flag";
import { BOOST_TYPES, fcfa, timeLeft, initials } from "@/lib/format";
import SetupNotice from "@/components/SetupNotice";
import PhotoUpdate from "@/components/PhotoUpdate";
import Gallery from "@/components/Gallery";
import { HeadlineField, PriceField } from "@/components/ProfileFields";
import DiplomaAdd from "@/components/DiplomaAdd";
import { markAnswered, saveHours, saveProfile } from "./actions";
import HoursEditor from "@/components/HoursEditor";
import { cleanHours } from "@/lib/hours";
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
  const [{ data: ident }, { data: diplomas }, { data: company }, { data: shots }] = await Promise.all([
    db.from("artisan_identity").select("status, reject_reason, submitted_at").eq("artisan_id", artisan.id).maybeSingle(),
    db.from("artisan_diplomas").select("id, title, status, reject_reason, submitted_at").eq("artisan_id", artisan.id).order("submitted_at", { ascending: false }),
    db.from("artisan_companies").select("registration_number").eq("artisan_id", artisan.id).maybeSingle(),
    db.from("portfolio_photos").select("id, url, caption").eq("artisan_id", artisan.id).order("created_at"),
  ]);
  if (!ident) redirect("/activation");

  const approved = artisan.status === "approved", rejected = artisan.status === "rejected", suspended = artisan.status === "suspended";
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

  const sec = (["apercu", "demandes", "profil", "horaires", "boosts"] as const).find((k) => k === sp.s) ?? "apercu";
  const tradeName = trades?.find((t) => t.id === artisan.trade_id)?.name ?? "";
  const hasHours = !!(artisan as any).open_24_7 || Object.keys(cleanHours((artisan as any).hours)).length > 0;
  const checks = [
    { ok: true, l: "Adresse e-mail confirmée", s: "apercu" },
    { ok: ident.status === "approved", l: "Identité vérifiée", s: "apercu" },
    { ok: !!(artisan as any).headline, l: "Écrire votre promesse « Je vais… »", s: "profil" },
    { ok: !!artisan.description && artisan.description.length >= 30, l: "Écrire une présentation de vos services", s: "profil" },
    { ok: !!artisan.price_label, l: "Indiquer un tarif indicatif", s: "profil" },
    { ok: myZones.size >= 2, l: "Couvrir au moins 2 zones", s: "profil" },
    { ok: !!(artisan as any).cover_url || (shots ?? []).length > 0, l: "Ajouter une couverture ou des photos de vos réalisations", s: "profil" },
    { ok: hasHours, l: "Renseigner vos horaires", s: "horaires" },
    { ok: (diplomas ?? []).some((d) => d.status !== "rejected"), l: "Ajouter un diplôme (facultatif)", s: "profil" },
  ];
  const pct = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const todo = checks.filter((c) => !c.ok);
  const statusTag = approved ? ["ok", "● En ligne"] : suspended ? ["err", "Suspendu"] : rejected ? ["err", "À corriger"] : ["wait", "En vérification"];
  const NAV = [["apercu", "🏠", "Accueil"], ["demandes", "📩", "Demandes"], ["profil", "👤", "Profil"], ["horaires", "🕒", "Horaires"], ["boosts", "🚀", "Boosts"]] as const;
  return (
    <section className="inner dash">
      <aside className="dside">
        <div className="dme">
          {artisan.photo_url ? <img className="curphoto" src={artisan.photo_url} alt="" /> : <span className="avatar">{initials(artisan.name)}</span>}
          <div className="dme-t">
            <b>{artisan.name}</b>
            <span className="meta fl">{tradeName} · <Flag code={country} size={16} /></span>
            <span className={`tag ${statusTag[0]}`}>{statusTag[1]}</span>
          </div>
          <form action={signOut}><button className="dout" type="submit" aria-label="Se déconnecter" title="Se déconnecter">⎋</button></form>
        </div>
        {approved && <Link className="btn small dview" href={`/artisan/${artisan.id}`}>Voir ma fiche publique</Link>}
        <nav className="dnav" aria-label="Sections">
          {NAV.map(([k, ic, l]) => (
            <Link key={k} href={`/tableau-de-bord?s=${k}`} scroll={false} aria-current={sec === k ? "page" : undefined}>
              <span aria-hidden="true">{ic}</span><span>{l}</span>{k === "demandes" && newReqs ? <em>{newReqs}</em> : null}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="dmain stack">
        {sp.ok && <p className="notice ok">Modifications enregistrées.</p>}
        {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}

        <div className="stack" hidden={sec !== "apercu"}>
          <h1 className="dtitle">Bonjour 👋</h1>
        {approved && <div className="notice ok row" style={{ justifyContent: "space-between" }}><span><b>Votre profil est en ligne.</b> Les clients peuvent vous trouver.</span><Link className="btn small" href={`/artisan/${artisan.id}`}>Voir ma fiche</Link></div>}
        {suspended && <div className="notice err stack" style={{ gap: 6 }}><b>Votre profil est suspendu.</b><p>{artisan.reject_reason ?? "Il n’est plus visible des clients."} Pour en savoir plus ou le réactiver, contactez-nous.</p><div><a className="btn" href={`mailto:${COMPANY.email}`}>Nous contacter</a></div></div>}
        {!approved && !rejected && !suspended && (
          <div className="notice"><b>Dossier en cours de vérification.</b> Envoyé le {day(ident.submitted_at)}. Nous répondons en général sous 24 à 48 heures, par e-mail. Votre profil sera visible des clients dès sa validation.</div>
        )}
        {rejected && (
          <div className="notice err stack" style={{ gap: 8 }}>
            <b>Votre dossier n’a pas pu être validé.</b>
            <p>{artisan.reject_reason ?? "Certaines informations sont à corriger."}</p>
            <div><Link className="btn primary" href="/activation">Corriger mon dossier</Link></div>
          </div>
        )}
          <div className="card pad stack dcomplete">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}><h2 style={{ fontSize: 18 }}>Votre profil est complet à {pct} %</h2><b className="num dpct">{pct}%</b></div>
            <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Complétude du profil"><i style={{ width: `${pct}%` }} /></div>
            {todo.length ? (
              <ul className="dtodo">{todo.map((c) => <li key={c.l}><Link href={`/tableau-de-bord?s=${c.s}`} scroll={false}>{c.l} <span aria-hidden="true">→</span></Link></li>)}</ul>
            ) : <p className="meta">Bravo, votre fiche est au top. Les profils complets reçoivent plus de demandes.</p>}
          </div>
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
              <div className="card stat"><span aria-hidden="true">👁</span><b>{stats.vues}</b><span>Vues, 7 jours</span></div>
              <div className="card stat"><span aria-hidden="true">📞</span><b>{stats.appels}</b><span>Appels</span></div>
              <div className="card stat"><span aria-hidden="true">💬</span><b>{stats.wa}</b><span>WhatsApp</span></div>
              <div className="card stat"><span aria-hidden="true">📩</span><b>{stats.demandes}</b><span>Demandes</span></div>
            </div>
          )}
          <div className="card pad stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ fontSize: 18 }}>Dernières demandes</h2>{(reqs?.length ?? 0) > 0 && <Link href="/tableau-de-bord?s=demandes" scroll={false}>Tout voir</Link>}</div>
            {reqs?.length ? reqs.slice(0, 3).map((r) => (
              <div key={r.id} className="req"><div className="tags">{r.urgent && <span className="tag boost">Urgent</span>}{r.status === "new" && <span className="tag wait">Nouvelle</span>}<span className="meta">{day(r.created_at)}</span></div><p><b>{r.client_name || "Client"}</b> — {r.description.slice(0, 90)}{r.description.length > 90 ? "…" : ""}</p></div>
            )) : <p className="empty">Aucune demande pour le moment. Elles arriveront ici et par e-mail.</p>}
          </div>
          {approved && <div className="card pad dboost"><div><b>Passez devant les autres artisans</b><p className="meta">Un boost place votre profil en tête des résultats ou sur l’accueil.</p></div><Link className="btn boost" href="/tableau-de-bord?s=boosts" scroll={false}>Voir les boosts</Link></div>}
        </div>

        <div className="stack" hidden={sec !== "demandes"}>
          <h1 className="dtitle">Demandes des clients</h1>
          <div className="stack">
        {reqs?.length ? reqs.map((r) => (
          <div key={r.id} className="req card pad">
            <div className="tags">{r.urgent && <span className="tag boost">Urgent</span>}{r.status === "new" ? <span className="tag wait">Nouvelle</span> : <span className="tag mute">Traitée</span>}<span className="meta">{day(r.created_at)}</span></div>
            <p><b>{r.client_name || "Client"}</b> · <a href={`mailto:${r.client_email}`}>{r.client_email}</a></p>
            <p>{r.description}</p>
            {r.status === "new" && <form action={markAnswered}><input type="hidden" name="id" value={r.id} /><button className="btn small" type="submit">Marquer comme traitée</button></form>}
          </div>
        )) : <p className="empty">Aucune demande pour le moment. Elles apparaîtront ici et vous seront aussi envoyées par e-mail.</p>}
          </div>
        </div>

        <div className="stack" hidden={sec !== "profil"}>
          <h1 className="dtitle">Mon profil</h1>
        <details className="card pad tips"><summary><b>💡 Comment réussir ma fiche ?</b></summary>
          <ol>
            <li><b>Couverture en paysage</b> : une belle photo horizontale de votre travail, nette, en pleine lumière, sans texte.</li>
            <li><b>3 à 8 réalisations</b> : avant/après, chantiers terminés. Les fiches avec photos reçoivent bien plus d’appels.</li>
            <li><b>Une promesse « Je vais… »</b> : « Je vais installer votre climatisation ».</li>
            <li><b>Une description concrète</b> : ce que vous faites, votre expérience, vos garanties.</li>
            <li><b>Un tarif de départ</b> : « À partir de … FCFA » avec l’unité. Le prix final se discute avec le client.</li>
            <li><b>Horaires et zones</b> : plus vous couvrez de zones, plus vous apparaissez dans les recherches.</li>
            <li><b>Répondez vite</b> : dans l’heure, c’est ce qui fait décrocher les chantiers.</li>
          </ol></details>
        <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Couverture et réalisations</h2><Gallery uid={user.id} cover={(artisan as any).cover_url ?? null} shots={(shots ?? []) as any} /></div>
        <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Photo de profil <span className="hint">(pour vous identifier)</span></h2><PhotoUpdate uid={user.id} photoUrl={artisan.photo_url} name={artisan.name} /></div>
        <form action={saveProfile} className="card pad stack">
          <h2 style={{ fontSize: 20 }}>Mon profil</h2>
          <h3 className="fh">Votre activité</h3>
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
          <h3 className="fh">Où intervenez-vous ?</h3>
          <div className="fld"><span className="lbl">Zones couvertes ({countryName(country)})</span>
            <div className="chips">{zones?.map((z) => (<label className="chip" key={z.id}><input type="checkbox" name="zones" value={z.id} defaultChecked={myZones.has(z.id)} />{z.name}</label>))}</div></div>
          <h3 className="fh">Tarif et contact</h3>
          <PriceField value={artisan.price_label} />
          <div className="fld"><label htmlFor="phone">Téléphone</label><input type="tel" id="phone" name="phone" required defaultValue={artisan.phone ?? ""} /></div>
          <div className="fld"><label htmlFor="whatsapp">WhatsApp (si différent)</label><input type="tel" id="whatsapp" name="whatsapp" defaultValue={artisan.whatsapp ?? ""} /></div>
          <h3 className="fh">Présentation</h3>
          <HeadlineField value={(artisan as any).headline} />
          <div className="fld"><label htmlFor="description">Description</label><textarea id="description" name="description" maxLength={1000} defaultValue={artisan.description ?? ""} /></div>
          <button className="btn primary" type="submit">Enregistrer</button>
        </form>
      <div className="card pad stack">
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

        </div>

      <div id="horaires" className="card pad stack" hidden={sec !== "horaires"}>
        <h2 style={{ fontSize: 20 }}>Jours et heures de disponibilité</h2>
        <p className="muted">Les clients voient « Ouvert maintenant » sur votre fiche quand vous êtes disponible, et peuvent filtrer les artisans ouverts.</p>
        <HoursEditor initial={cleanHours((artisan as any).hours)} open247={!!(artisan as any).open_24_7} urgent={!!(artisan as any).takes_urgent} action={saveHours} />
      </div>


      <div id="visibilite" className="stack" hidden={sec !== "boosts"}>
        <h1 className="dtitle">Boosts</h1>
        <div className="card pad dboost big">
          <div><b>{act?.length ? "Votre boost est en cours" : "Faites-vous voir en premier"}</b>
            <p className="meta">{act?.length ? "Prolongez-le avant la fin pour garder votre place." : "Placez votre fiche en tête des résultats et recevez plus d’appels."}</p></div>
          {approved ? <Link className="btn boost" href="/boosts">{act?.length ? "Prolonger ou ajouter un boost" : "Découvrir les boosts"}</Link> : <p className="hint">Disponible une fois votre profil validé.</p>}
        </div>
        {act?.length ? <div className="card pad stack"><h2 style={{ fontSize: 18 }}>Boosts actifs</h2>{act.map((b) => (<div key={b.id} className="row" style={{ justifyContent: "space-between" }}><b>{BOOST_TYPES[b.type].name}</b><span className="tag ok">reste {timeLeft(b.ends_at)}</span></div>))}</div> : null}
      </div>
      </main>
    </section>
  );
}

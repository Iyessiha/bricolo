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
import ZonePicker from "@/components/ZonePicker";
import { PRO_LIMITS } from "@/lib/boost";
import { PLANS, planPrice } from "@/lib/plans";
import { HeadlineField, PriceField } from "@/components/ProfileFields";
import DiplomaAdd from "@/components/DiplomaAdd";
import { addService, markAnswered, removeService, saveHours, saveProfile } from "./actions";
import { priceText } from "@/lib/format";
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
  const [{ data: ident }, { data: diplomas }, { data: company }, { data: shots }, { data: services }, { data: proSub }] = await Promise.all([
    db.from("artisan_identity").select("status, reject_reason, submitted_at").eq("artisan_id", artisan.id).maybeSingle(),
    db.from("artisan_diplomas").select("id, title, status, reject_reason, submitted_at").eq("artisan_id", artisan.id).order("submitted_at", { ascending: false }),
    db.from("artisan_companies").select("registration_number").eq("artisan_id", artisan.id).maybeSingle(),
    db.from("portfolio_photos").select("id, url, caption").eq("artisan_id", artisan.id).order("created_at"),
    db.from("artisan_services").select("id, headline, price_label").eq("artisan_id", artisan.id).order("created_at"),
    db.from("subscriptions").select("ends_at").eq("artisan_id", artisan.id).eq("status", "active").gt("ends_at", new Date().toISOString()).order("ends_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const [{ data: planRow }, { data: history }] = await Promise.all([
    db.from("plan_prices").select("amount, week_amount, year_amount").eq("country_code", country).maybeSingle(),
    db.from("subscriptions").select("id, days, amount, starts_at, ends_at, created_at").eq("artisan_id", artisan.id).eq("status", "active").order("created_at", { ascending: false }).limit(10),
  ]);
  const monthPrice = planRow?.amount ?? 0;
  const planOf = planRow ?? { amount: 0 };
  const pro = !!proSub, maxServices = pro ? 10 : 1, maxPhotos = pro ? 20 : 8;
  const zonesCount = (((artisan as any).zones ?? []) as any[]).length;
  const maxZones = pro ? Infinity : Math.max(PRO_LIMITS.free.zones, zonesCount);
  const nSvc = services?.length ?? 0, nPho = shots?.length ?? 0;
  const usage = [
    { l: "Prestations", n: nSvc, max: maxServices }, { l: "Photos de réalisations", n: nPho, max: maxPhotos }, { l: "Zones d’intervention", n: zonesCount, max: maxZones },
  ];
  const nearLimit = !pro && usage.filter((u) => Number.isFinite(u.max) && u.n >= Math.ceil(u.max * 0.8) && u.max > 0);
  const limitsEl = (
    <div className="limits">
      {usage.map((u) => { const unl = !Number.isFinite(u.max); const full = !unl && u.n >= u.max; return (
        <div key={u.l} className={`lim${full ? " full" : ""}`}><b><span>{u.l}</span><span>{unl ? `${u.n} · illimité` : `${u.n} / ${u.max}`}</span></b>{!unl && <div className="bar"><i style={{ width: `${Math.min(100, (u.n / u.max) * 100)}%` }} /></div>}{full && !pro && <small>Limite atteinte, <Link href="/tableau-de-bord?s=forfait" scroll={false}>passez Pro</Link></small>}</div>); })}
      <div className="lim"><b><span>Badge Pro</span><span>{pro ? "✓ actif" : "—"}</span></b><small>Affiché sur votre fiche et vos cartes</small></div>
    </div>
  );
  const daysLeft = proSub ? Math.max(1, Math.ceil((new Date(proSub.ends_at).getTime() - Date.now()) / 864e5)) : 0;
  const leftLabel = daysLeft > 60 ? `${Math.round(daysLeft / 30)} mois` : `${daysLeft} j`;
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

  const sec = (["apercu", "demandes", "profil", "forfait", "boosts"] as const).find((k) => k === (sp.s === "horaires" ? "profil" : sp.s)) ?? "apercu";
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
  const NAV = [["apercu", "🏠", "Accueil"], ["demandes", "📩", "Demandes"], ["profil", "👤", "Profil"], ["forfait", "💎", "Forfait"], ["boosts", "🚀", "Boosts"]] as const;
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
            <Link key={k} className={k === "forfait" ? "gsep" : undefined} href={`/tableau-de-bord?s=${k}`} scroll={false} aria-current={sec === k ? "page" : undefined}>
              <span aria-hidden="true">{ic}</span><span>{l}</span>{k === "demandes" && newReqs ? <em>{newReqs}</em> : null}{k === "forfait" ? <em className={pro ? "pro" : "free"}>{pro ? "Pro" : "Gratuit"}</em> : null}
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
          {approved && (
            <div className="card pad stack">
              <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ fontSize: 18 }}>Votre offre {pro ? <span className="tag boost">Pro</span> : <span className="tag mute">Gratuit</span>}</h2><Link href="/tableau-de-bord?s=forfait" scroll={false}>{pro ? "Gérer" : "Voir les offres"}</Link></div>
              <p className="meta">{pro ? `Forfait Pro actif, il reste ${leftLabel} (jusqu’au ${day(proSub!.ends_at)}).` : "Vous êtes sur l’offre gratuite. Voici vos limites."}</p>
              {limitsEl}
              {nearLimit && nearLimit.length > 0 && <div className="notice boostnote row" style={{ justifyContent: "space-between" }}><span><b>Vous approchez de vos limites</b> ({nearLimit.map((u) => u.l.toLowerCase()).join(", ")}). Le Forfait Pro les repousse.</span><Link className="btn small boost" href="/tableau-de-bord?s=forfait" scroll={false}>Passer Pro</Link></div>}
              {pro && daysLeft <= 7 && <div className="notice boostnote row" style={{ justifyContent: "space-between" }}><span><b>Votre Forfait Pro se termine bientôt.</b> Prolongez-le pour garder le badge et vos extras.</span><Link className="btn small boost" href="/tableau-de-bord?s=forfait" scroll={false}>Prolonger</Link></div>}
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
          <nav className="subnav" aria-label="Aller à">
            {[["limites", "Limites"], ["photos", "Photos"], ["prestations", "Prestations"], ["activite", "Infos"], ["zones", "Zones"], ["diplomes", "Diplômes"], ["horaires", "Horaires"]].map(([k, l]) => <a key={k} href={`#${k}`}>{l}</a>)}
          </nav>
        <div id="limites" className="card pad stack psec"><h2>Mes limites {pro ? <span className="tag boost">Pro</span> : <span className="tag mute">Gratuit</span>}</h2>
          {limitsEl}
          <div className="row" style={{ justifyContent: "space-between" }}><span className="meta">Couverture : {(artisan as any).cover_url ? "✓ ajoutée" : "à ajouter"} (paysage 1600 × 600 px)</span><Link className={pro ? "" : "btn small boost"} href="/tableau-de-bord?s=forfait" scroll={false}>{pro ? "Gérer mon forfait" : "Voir le Forfait Pro"}</Link></div>
        </div>
        <div id="photos" className="card pad stack psec"><h2>Photos</h2>
          <p className="sub">C’est la première chose que voient les clients : soignez-les.</p>
          <Gallery uid={user.id} cover={(artisan as any).cover_url ?? null} shots={(shots ?? []) as any} max={maxPhotos} pro={pro} />
          <h3 className="fh">Photo de profil <span className="hint">(pour vous identifier)</span></h3>
          <PhotoUpdate uid={user.id} photoUrl={artisan.photo_url} name={artisan.name} /></div>
        <div id="prestations" className="card pad stack psec"><h2>Mes prestations <span className="hint">({services?.length ?? 0}/{maxServices})</span>{pro && <span className="tag boost" style={{ marginLeft: 8 }}>Pro</span>}</h2>
          <p className="hint">Listez ce que vous proposez, chacune avec son prix de départ. Elles s’affichent sur votre fiche.{pro && proSub ? ` Forfait Pro actif jusqu’au ${day(proSub.ends_at)}.` : ""}</p>
          {services?.map((s) => <form key={s.id} action={removeService} className="todo"><input type="hidden" name="id" value={s.id} /><span><b>{s.headline}</b>{priceText(s.price_label) ? <><br /><span className="meta">{priceText(s.price_label)}</span></> : null}</span><button className="btn small ghost" style={{ marginLeft: "auto" }} type="submit">Supprimer</button></form>)}
          {(services?.length ?? 0) >= maxServices && !pro && <div className="notice boostnote row" style={{ justifyContent: "space-between" }}><span><b>Forfait gratuit : 1 prestation.</b> Passez Pro pour en afficher jusqu’à 10 et 20 photos.</span><Link className="btn small boost" href="/tableau-de-bord?s=forfait">Découvrir le Forfait Pro</Link></div>}
          {(services?.length ?? 0) < maxServices && <form action={addService} className="stack" style={{ borderTop: services?.length ? "1px solid var(--line)" : 0, paddingTop: services?.length ? 14 : 0 }}>
            <HeadlineField uid="svc_h" label="Nouvelle prestation" /><PriceField uid="svc_p" label="Prix de cette prestation" />
            <div><button className="btn small primary" type="submit">Ajouter cette prestation</button></div></form>}
        </div>
        <form action={saveProfile} className="stack">
          <div id="activite" className="card pad stack psec"><h2>Mon activité</h2>
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
          </div>
          <div id="presentation" className="card pad stack psec"><h2>Ma présentation</h2>
            <p className="sub">Une promesse claire et une description concrète donnent envie d’appeler.</p>
          <HeadlineField value={(artisan as any).headline} label="Ma promesse principale (affichée sur votre carte)" />
          <div className="fld"><label htmlFor="description">Description</label><textarea id="description" name="description" maxLength={1000} defaultValue={artisan.description ?? ""} /></div>
          </div>
          <div id="zones" className="card pad stack psec"><h2>Où j’interviens</h2>
            <p className="sub">{pro ? "Forfait Pro : zones illimitées." : `Forfait gratuit : jusqu’à ${PRO_LIMITS.free.zones} zones. Passez Pro pour couvrir davantage de villes et quartiers.`}</p>
            <ZonePicker zones={(zones ?? []) as any} selected={[...myZones] as string[]} max={pro ? undefined : maxZones} />
            {!pro && <Link className="btn small boost" href="/tableau-de-bord?s=forfait" style={{ justifySelf: "start" }}>Couvrir plus de zones avec le Pro</Link>}
          </div>
          <div className="card pad stack psec"><h2>Prix et contact</h2>
          <PriceField value={artisan.price_label} label="Prix affiché sur votre carte" />
          <div className="fld"><label htmlFor="phone">Téléphone</label><input type="tel" id="phone" name="phone" required defaultValue={artisan.phone ?? ""} /></div>
          <div className="fld"><label htmlFor="whatsapp">WhatsApp (si différent)</label><input type="tel" id="whatsapp" name="whatsapp" defaultValue={artisan.whatsapp ?? ""} /></div>
          </div>
          <div className="savebar"><span className="meta">Pensez à enregistrer vos modifications.</span><button className="btn primary" type="submit">Enregistrer mes modifications</button></div>
        </form>
        <details className="card pad tips"><summary><b>💡 Comment réussir ma fiche ?</b></summary>
          <ol>
            <li><b>Couverture en paysage</b> : une belle image horizontale (1600 × 600 px), avec votre activité et votre nom en gros caractères (90 px minimum) : sur les cartes de résultats, la cover est affichée en petit, un texte fin y serait illisible.</li>
            <li><b>3 à 8 réalisations</b> : avant/après, chantiers terminés. Les fiches avec photos reçoivent bien plus d’appels.</li>
            <li><b>Une promesse « Je vais… »</b> : « Je vais installer votre climatisation ».</li>
            <li><b>Une description concrète</b> : ce que vous faites, votre expérience, vos garanties.</li>
            <li><b>Un tarif de départ</b> : « À partir de … FCFA » avec l’unité. Le prix final se discute avec le client.</li>
            <li><b>Horaires et zones</b> : plus vous couvrez de zones, plus vous apparaissez dans les recherches.</li>
            <li><b>Répondez vite</b> : dans l’heure, c’est ce qui fait décrocher les chantiers.</li>
          </ol></details>
      <div id="diplomes" className="card pad stack">
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

      <div id="horaires" className="card pad stack" hidden={sec !== "profil"}>
        <h2 style={{ fontSize: 20 }}>Mes horaires</h2>
        <p className="muted">Les clients voient « Ouvert maintenant » sur votre fiche quand vous êtes disponible, et peuvent filtrer les artisans ouverts.</p>
        <HoursEditor initial={cleanHours((artisan as any).hours)} open247={!!(artisan as any).open_24_7} urgent={!!(artisan as any).takes_urgent} action={saveHours} />
      </div>


      <div id="forfait" className="stack" hidden={sec !== "forfait"}>
        <h1 className="dtitle">Mon forfait</h1>
        {sp.paye && <p className="notice ok" role="status">Paiement reçu. Votre Forfait Pro est actif.</p>}
        <div className="card pad stack">
          <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ fontSize: 18 }}>Mon offre actuelle</h2>{pro ? <span className="tag boost">Pro</span> : <span className="tag mute">Gratuit</span>}</div>
          <p>{pro && proSub ? <><b>Forfait Pro actif jusqu’au {day(proSub.ends_at)}</b> · il reste {leftLabel}. Prolonger ajoute la durée à la fin de la période en cours.</> : <><b>Offre gratuite.</b> Elle suffit pour démarrer ; le Pro vous donne plus de place pour convaincre.</>}</p>
          {limitsEl}
        </div>
        {approved ? (monthPrice > 0 ? (
          <div className="stack">
            <h2 style={{ fontSize: 18 }}>{pro ? "Prolonger mon Forfait Pro" : "Passer au Forfait Pro"}</h2>
            <div className="agrid plans">
              {PLANS.map((pl) => { const amount = planPrice(planOf, pl.key); const perMonth = Math.round((amount / (pl.days / 30)) / 100) * 100; return (
                <form key={pl.key} method="post" action="/api/forfait/checkout" className={`card pad stack plan${pl.key === "month" ? " best" : ""}`}>
                  <span className="tag mute">{pl.note}</span>
                  <h3 style={{ fontSize: 18 }}>{pl.label}</h3><p className="price">{fcfa(amount)}</p>
                  <p className="meta">{pl.key === "week" ? `Soit ${fcfa(perMonth)} par mois` : pl.key === "year" ? `Soit ${fcfa(perMonth)} par mois · économisez ${fcfa(monthPrice * 12 - amount)}` : "Sans engagement"}</p>
                  <input type="hidden" name="plan" value={pl.key} /><button className="btn boost" type="submit">{pro ? "Prolonger" : "Passer Pro"}</button>
                </form>); })}
            </div>
            <p className="hint">Paiement sécurisé par Mobile Money ou carte. Sans engagement : le forfait s’arrête à la fin de la période payée. Vos prestations, photos et zones en plus restent enregistrées mais ne sont plus affichées.</p>
          </div>
        ) : <p className="empty">Le Forfait Pro n’est pas encore disponible dans votre pays.</p>) : <p className="empty">Le Forfait Pro sera disponible dès la validation de votre profil.</p>}
        <div className="card pad stack"><h2 style={{ fontSize: 18 }}>Gratuit ou Pro ?</h2><div className="tw"><table className="tbl"><thead><tr><th></th><th className="num">Gratuit</th><th className="num">Pro</th></tr></thead><tbody>
          {[["Prestations sur ma fiche", "1", "jusqu’à 10"], ["Photos de réalisations", "8", "jusqu’à 20"], ["Zones d’intervention", "3", "illimitées"], ["Badge « Pro » sur ma fiche et mes cartes", "—", "✓"], ["Visible dans les recherches", "✓", "✓"]].map(([l, f, p]) => <tr key={l}><td>{l}</td><td className="num">{f}</td><td className="num"><b>{p}</b></td></tr>)}</tbody></table></div></div>
        <div className="card pad stack"><h2 style={{ fontSize: 18 }}>Historique</h2>
          {history?.length ? history.map((h) => <div key={h.id} className="row" style={{ justifyContent: "space-between" }}><span>Forfait Pro · {h.days >= 365 ? "1 an" : h.days >= 30 ? `${Math.round(h.days / 30)} mois` : `${h.days} j`}<span className="meta"> · jusqu’au {day(h.ends_at)}</span></span><span className="row"><b className="num">{fcfa(h.amount)}</b><span className={`tag ${new Date(h.ends_at) > new Date() ? "ok" : "mute"}`}>{new Date(h.ends_at) > new Date() ? "Actif" : "Terminé"}</span></span></div>) : <p className="empty">Aucun paiement de forfait pour le moment.</p>}
        </div>
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

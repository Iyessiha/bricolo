import PayButton from "@/components/PayButton";
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
import MomentPopup from "@/components/MomentPopup";
import CloseMore from "@/components/CloseMore";
import PushBell from "@/components/PushBell";
import PhotoUpdate from "@/components/PhotoUpdate";
import Gallery from "@/components/Gallery";
import ZonePicker from "@/components/ZonePicker";
import { PRO_LIMITS } from "@/lib/boost";
import { countWindows, liftPct } from "@/lib/boost-stats";
import { PLANS, planPrice } from "@/lib/plans";
import { HeadlineField, PriceField } from "@/components/ProfileFields";
import DiplomaAdd from "@/components/DiplomaAdd";
import ServiceDetails from "@/components/ServiceDetails";
import AskReview from "@/components/AskReview";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addService, markAnswered, removeService, replyToReview, saveZones, updateService, saveHours, saveProfile, claimFreeBoostAction, startTrialAction } from "./actions";
import { detailedStats, freeBoostUsed, nextMonthStart, proRecap, trialStatus, TRIAL_DAYS } from "@/lib/pro-perks";
import BarChart from "@/components/BarChart";
import { priceText } from "@/lib/format";
import HoursEditor from "@/components/HoursEditor";
import { cleanHours } from "@/lib/hours";
import { signOut } from "../auth-actions";
import SupportChat from "@/components/SupportChat";
import DeleteAccount from "@/components/DeleteAccount";
import { listPayments } from "@/lib/receipts";
import MyPayments from "@/components/MyPayments";
import { unreadForArtisan } from "@/lib/support";

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
    db.from("trades").select("id, name, slug").order("name"),
    db.from("zones").select("id, name, parent_id").eq("country_code", country).order("name"),
    db.from("artisans").select("*, zones:artisan_zones(zone_id)").eq("user_id", user.id).maybeSingle(),
  ]);
  // Le dossier doit être complet (profil, photo, pièce d'identité) : sinon on reprend le tunnel d'activation.
  if (!artisan || !artisan.photo_url) redirect("/activation");
  const [{ data: ident }, { data: diplomas }, { data: company }, { data: shots }, { data: services }, { data: proSub }] = await Promise.all([
    db.from("artisan_identity").select("status, reject_reason, submitted_at").eq("artisan_id", artisan.id).maybeSingle(),
    db.from("artisan_diplomas").select("id, title, status, reject_reason, submitted_at").eq("artisan_id", artisan.id).order("submitted_at", { ascending: false }),
    db.from("artisan_companies").select("registration_number").eq("artisan_id", artisan.id).maybeSingle(),
    db.from("portfolio_photos").select("id, url, caption").eq("artisan_id", artisan.id).order("created_at"),
    db.from("artisan_services").select("id, headline, price_label, included, extras").eq("artisan_id", artisan.id).order("created_at"),
    db.from("subscriptions").select("ends_at").eq("artisan_id", artisan.id).eq("status", "active").gt("ends_at", new Date().toISOString()).order("ends_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const [{ data: planRow }, { data: history }] = await Promise.all([
    db.from("plan_prices").select("amount, week_amount, year_amount").eq("country_code", country).maybeSingle(),
    db.from("subscriptions").select("id, days, amount, starts_at, ends_at, created_at, trial").eq("artisan_id", artisan.id).eq("status", "active").order("created_at", { ascending: false }).limit(10),
  ]);
  const monthPrice = planRow?.amount ?? 0;
  const planOf = planRow ?? { amount: 0 };
  const pro = !!proSub, maxServices = pro ? 10 : 1, maxPhotos = pro ? 20 : 8;
  const zonesCount = (((artisan as any).zones ?? []) as any[]).length;
  const maxZones = Math.max(pro ? PRO_LIMITS.pro.zones : PRO_LIMITS.free.zones, zonesCount);
  const nSvc = services?.length ?? 0, nPho = shots?.length ?? 0;
  const usage = [
    { l: "Prestations", n: nSvc, max: maxServices }, { l: "Photos de réalisations", n: nPho, max: maxPhotos }, { l: "Zones d’intervention", n: zonesCount, max: maxZones },
  ];
  const nearLimit = !pro && usage.filter((u) => Number.isFinite(u.max) && u.n >= Math.ceil(u.max * 0.8) && u.max > 0);
  const limitsEl = (
    <div className="limits">
      {usage.map((u) => { const unl = !Number.isFinite(u.max); const full = !unl && u.n >= u.max; return (
        <div key={u.l} className={`lim${full ? " full" : ""}`}><b><span>{u.l}</span><span>{unl ? `${u.n} · illimité` : `${u.n} / ${u.max}`}</span></b>{!unl && <div className="bar"><i style={{ width: `${Math.min(100, (u.n / u.max) * 100)}%` }} /></div>}{full && !pro && <small>Limite atteinte, <Link href="/tableau-de-bord?s=forfait" scroll={false}>passez Pro</Link></small>}</div>); })}
    </div>
  );
  const daysLeft = proSub ? Math.max(1, Math.ceil((new Date(proSub.ends_at).getTime() - Date.now()) / 864e5)) : 0;
  const leftLabel = daysLeft > 60 ? `${Math.round(daysLeft / 30)} mois` : `${daysLeft} j`;
  if (!ident) redirect("/activation");

  const approved = artisan.status === "approved", rejected = artisan.status === "rejected", suspended = artisan.status === "suspended";
  const myZones = new Set(((artisan as any).zones ?? []).map((z: any) => z.zone_id));
  const days = [7, 30, 90].includes(Number(sp.p)) ? Number(sp.p) : 7;
  const sinceMs = Date.now() - days * 864e5, prevMs = sinceMs - days * 864e5;
  const count = (type: string, from: number, to: number) => db.from("events").select("id", { count: "exact", head: true }).eq("artisan_id", artisan.id).eq("type", type).gte("created_at", new Date(from).toISOString()).lt("created_at", new Date(to).toISOString());
  const TYPES = ["view", "call", "whatsapp", "request"] as const;
  const [cur, prev, { data: act }, { data: reqs }, { data: grid }] = await Promise.all([
    Promise.all(TYPES.map((t) => count(t, sinceMs, Date.now() + 6e4))),
    Promise.all(TYPES.map((t) => count(t, prevMs, sinceMs))),
    db.from("boosts").select("id, type, status, ends_at").eq("artisan_id", artisan.id).eq("status", "active").gt("ends_at", new Date().toISOString()),
    db.from("service_requests").select("id, client_name, client_email, client_phone, description, urgent, status, created_at").eq("artisan_id", artisan.id).order("created_at", { ascending: false }).limit(15),
    db.from("price_grid").select("boost_type, duration_hours, amount").eq("country_code", country),
  ]);
  const stats = { vues: cur[0].count ?? 0, appels: cur[1].count ?? 0, wa: cur[2].count ?? 0, demandes: cur[3].count ?? 0 };
  const before = [prev[0].count ?? 0, prev[1].count ?? 0, prev[2].count ?? 0, prev[3].count ?? 0];
  const trend = (now: number, was: number) => was === 0 ? (now > 0 ? "nouveau" : "") : `${now >= was ? "▲" : "▼"} ${Math.abs(Math.round(((now - was) / was) * 100))} %`;
  const from = (t: string) => { const v = (grid ?? []).filter((g) => g.boost_type === t).map((g) => g.amount); return v.length ? Math.min(...v) : null; };
  const newReqs = (reqs ?? []).filter((r) => r.status === "new").length;

  const unreadHelp = await unreadForArtisan(artisan.id);
  const sec = (["apercu", "demandes", "profil", "prestations", "guide", "forfait", "boosts", "notifs", "aide", "compte"] as const).find((k) => k === (sp.s === "horaires" ? "profil" : sp.s)) ?? "apercu";
  const paid = sec === "forfait" || sec === "boosts" ? await listPayments(artisan.id) : [];
  // Indicateurs du forfait : activité des 30 derniers jours, et pour un Pro, comparaison avec les 30 jours avant son début.
  const DAY = 864e5, nowMs = Date.now();
  const proStart = sec === "forfait" && pro && history?.length ? Math.min(...history.filter((h) => h.starts_at && new Date(h.ends_at).getTime() > nowMs - 400 * DAY).map((h) => new Date(h.starts_at!).getTime())) : NaN;
  const [act30, actProBefore, actProAfter] = sec === "forfait"
    ? await countWindows(supabaseAdmin(), artisan.id, [{ from: nowMs - 30 * DAY, to: nowMs }, ...(Number.isFinite(proStart) && nowMs - proStart > 3 * DAY ? [{ from: proStart - 30 * DAY, to: proStart }, { from: proStart, to: Math.min(nowMs, proStart + 30 * DAY) }] : [])])
    : [];
  // Avantages du Forfait Pro : essai gratuit, boost du mois offert, bilan chiffré.
  const perks = sec !== "forfait" ? null : await (async () => {
    const adb = supabaseAdmin();
    const [trial, freeUsed, zs, recap, detail] = await Promise.all([
      !pro && approved ? trialStatus(adb, artisan.id) : Promise.resolve(null),
      pro ? freeBoostUsed(adb, artisan.id) : Promise.resolve(null),
      pro ? adb.from("artisan_zones").select("zone:zones(id, name)").eq("artisan_id", artisan.id) : Promise.resolve({ data: [] as any[] }),
      pro && Number.isFinite(proStart) ? proRecap(adb, artisan.id, new Date(proStart).toISOString()) : Promise.resolve(null),
      pro && approved ? detailedStats(adb, artisan.id, country) : Promise.resolve(null),
    ]);
    const zlist = ((zs.data ?? []) as any[]).map((r) => (Array.isArray(r.zone) ? r.zone[0] : r.zone)).filter(Boolean) as { id: string; name: string }[];
    return { trial, freeUsed, zlist, recap, detail };
  })();
  // Avis reçus (les avis en attente de modération ne sont visibles que par l'artisan, ici, et par l'équipe).
  const { data: myReviews } = approved ? await supabaseAdmin().from("reviews").select("id, author_name, rating, comment, status, verified_by, artisan_reply, created_at").eq("artisan_id", artisan.id).neq("status", "hidden").order("created_at", { ascending: false }).limit(20) : { data: null };
  const reviewsPending = (myReviews ?? []).filter((r) => r.status === "pending").length;
  const PSUBS = [["infos", "Infos"], ["photos", "Photos"], ["zones", "Zones et horaires"], ["diplomes", "Diplômes"]] as const;
  const ptab = PSUBS.find(([k]) => k === (sp.s === "horaires" ? "zones" : sp.p))?.[0] ?? "infos";
  const tradeName = trades?.find((t) => t.id === artisan.trade_id)?.name ?? "";
  const hasHours = !!(artisan as any).open_24_7 || Object.keys(cleanHours((artisan as any).hours)).length > 0;
  const checks = [
    { ok: true, l: "Adresse e-mail confirmée", s: "apercu" },
    { ok: ident.status === "approved", l: "Identité vérifiée", s: "apercu" },
    { ok: !!(artisan as any).headline, l: "Écrire votre promesse « Je vais… »", s: "profil" },
    { ok: !!artisan.description && artisan.description.length >= 30, l: "Écrire une présentation de vos services", s: "profil" },
    { ok: nSvc > 0, l: "Ajouter au moins une prestation avec son prix", s: "prestations" },
    { ok: !!artisan.price_label, l: "Indiquer un tarif indicatif", s: "profil" },
    { ok: myZones.size >= 2, l: "Couvrir au moins 2 zones", s: "profil&p=zones" },
    { ok: !!(artisan as any).cover_url || (shots ?? []).length > 0, l: "Ajouter une couverture ou des photos de vos réalisations", s: "profil&p=photos" },
    { ok: hasHours, l: "Renseigner vos horaires", s: "profil&p=zones" },
    { ok: (diplomas ?? []).some((d) => d.status !== "rejected"), l: "Ajouter un diplôme (facultatif)", s: "profil&p=diplomes" },
  ];
  const pct = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const todo = checks.filter((c) => !c.ok);
  const statusTag = approved ? ["ok", "● En ligne"] : suspended ? ["err", "Suspendu"] : rejected ? ["err", "À corriger"] : ["wait", "En vérification"];
  const NAV = [["apercu", "🏠", "Accueil"], ["demandes", "📩", "Demandes"], ["profil", "👤", "Profil"], ["prestations", "🛠️", "Prestations"], ["guide", "💡", "Réussir ma fiche"], ["forfait", "💎", "Forfait"], ["boosts", "🚀", "Boosts"], ["notifs", "🔔", "Notifications"], ["aide", "💬", "Contacter Bricolo"], ["compte", "⚙️", "Mon compte"]] as const;
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
        <input type="checkbox" id="dmore" className="dmore" aria-hidden="true" tabIndex={-1} />
        <CloseMore section={sec} />
        <nav className="dnav" aria-label="Sections">
          {NAV.slice(0, 4).map(([k, ic, l]) => (
            <Link key={k} className={k === "profil" ? "gsep" : undefined} href={`/tableau-de-bord?s=${k}`} scroll={false} aria-current={sec === k ? "page" : undefined}>
              <span aria-hidden="true">{ic}</span><span>{l}</span>{k === "demandes" && newReqs ? <em>{newReqs}</em> : null}
            </Link>
          ))}
          <label htmlFor="dmore" className={`dplus${NAV.slice(4).some(([k]) => k === sec) ? " cur" : ""}`}>
            <span aria-hidden="true">⋯</span><span>Plus</span>{unreadHelp ? <em>{unreadHelp}</em> : null}
          </label>
          <label htmlFor="dmore" className="dback" aria-hidden="true" />
          <div className="dsheet">
            {NAV.slice(4).map(([k, ic, l]) => (
              <Link key={k} className={k === "forfait" || k === "notifs" ? "gsep" : undefined} href={k === "boosts" ? "/boosts" : `/tableau-de-bord?s=${k}`} scroll={k === "boosts"} aria-current={sec === k ? "page" : undefined}>
                <span aria-hidden="true">{ic}</span><span>{l}</span>
                {k === "aide" && unreadHelp ? <em>{unreadHelp}</em> : null}{k === "forfait" ? <em className={pro ? "pro" : "free"}>{pro ? "Pro" : "Gratuit"}</em> : null}
              </Link>
            ))}
            <form action={signOut} className="dsout"><button type="submit"><span aria-hidden="true">⎋</span><span>Se déconnecter</span></button></form>
          </div>
        </nav>
      </aside>

      <main className="dmain stack">
        {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && <PushBell publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />}
        {approved ? (
          <MomentPopup id={`online:${artisan.id}`} emoji="🎉" title="Votre profil est en ligne !" text="Les clients peuvent maintenant vous trouver. Pour recevoir vos premières demandes plus vite, partagez votre fiche à vos clients et contacts sur WhatsApp."
            actions={[{ label: "💬 Partager ma fiche sur WhatsApp", primary: true, share: { path: `/artisan/${artisan.id}`, text: `Retrouvez-moi sur Bricolo (${tradeName}) :` } }, { label: "Voir ma fiche", href: `/artisan/${artisan.id}` }]} />
        ) : null}
        {approved && newReqs > 0 ? (
          <MomentPopup id={`firstreq:${artisan.id}`} emoji="📩" title="Vous avez reçu une demande !" text="Répondez vite : un client qui reçoit une réponse rapide choisit plus souvent cet artisan. Le plus simple est de lui écrire sur WhatsApp ou de l’appeler."
            actions={[{ label: "Voir la demande", primary: true, href: "/tableau-de-bord?s=demandes" }]} />
        ) : null}
        <MomentPopup id={`welcome:${artisan.id}`} emoji="👋" title={`Bienvenue sur Bricolo, ${artisan.name.split(" ")[0]} !`} delay={1500}
          text={approved ? "Voici comment attirer vos premiers clients : complétez votre profil (photos, zones, tarif), puis partagez votre fiche. Les profils complets reçoivent plus de demandes." : "Votre dossier est en cours de vérification (24 à 48 h). En attendant, complétez votre profil : photos de réalisations, zones, tarif et horaires. Il sera visible dès sa validation."}
          actions={[{ label: "Compléter mon profil", primary: true, href: "/tableau-de-bord?s=profil" }]} />
        {sp.ok && <p className="notice ok" role="status">{sp.ok === "boost" ? "Votre boost recherche de 24 h est actif : vous passez en tête des résultats de votre zone." : sp.ok === "essai" ? `Votre essai du Forfait Pro est activé pour ${TRIAL_DAYS} jours. Profitez-en !` : "Modifications enregistrées."}</p>}
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
            <div className="stack" style={{ gap: 8 }}>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }} role="group" aria-label="Période des statistiques">
                {[7, 30, 90].map((d) => <Link key={d} className={`chip${d === days ? " on" : ""}`} aria-current={d === days ? "true" : undefined} href={`/tableau-de-bord?p=${d}`} scroll={false}>{d} jours</Link>)}
              </div>
              <div className="stats">
                {([["👁", stats.vues, "Vues"], ["📞", stats.appels, "Appels"], ["💬", stats.wa, "WhatsApp"], ["📩", stats.demandes, "Demandes"]] as const).map(([ic, n, l], i) => (
                  <div key={l} className="card stat"><span aria-hidden="true">{ic}</span><b>{n}</b><span>{l}, {days} j</span>{trend(n, before[i]) && <small className="meta" title="Par rapport aux jours précédents de même durée">{trend(n, before[i])}</small>}</div>
                ))}
              </div>
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
          {approved && <div className="card pad stack" id="avis">
            <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ fontSize: 18 }}>Avis clients</h2>{artisan.review_count ? <span className="tag ok">★ {String(artisan.avg_rating).replace(".", ",")}/5 · {artisan.review_count} avis</span> : <span className="tag mute">Pas encore d’avis</span>}</div>
            <p className="meta">Les avis rassurent les nouveaux clients. Après un chantier terminé, envoyez-leur un lien personnel : il ne sert qu’une fois et l’avis est vérifié par notre équipe avant d’être publié.</p>
            <AskReview artisanName={artisan.name} />
            {reviewsPending > 0 && <p className="notice boostnote">{reviewsPending} avis en cours de vérification par notre équipe.</p>}
            {(myReviews ?? []).filter((r) => r.status === "published").slice(0, 5).map((r) => (
              <div key={r.id} className="review">
                <b>{r.author_name}</b> <span className="meta">· ★ {r.rating}/5{r.verified_by ? " · avis vérifié" : ""}</span>
                {r.comment && <p>{r.comment}</p>}
                <form action={replyToReview} className="stack" style={{ marginTop: 8 }}><input type="hidden" name="id" value={r.id} />
                  <div className="fld"><label htmlFor={`rep_${r.id}`}>{r.artisan_reply ? "Votre réponse (publique)" : "Répondre publiquement"}</label>
                    <textarea id={`rep_${r.id}`} name="reply" rows={2} maxLength={400} defaultValue={r.artisan_reply ?? ""} placeholder="Merci pour votre confiance !" /></div>
                  <div><button className="btn small" type="submit">{r.artisan_reply ? "Modifier ma réponse" : "Publier ma réponse"}</button></div></form>
              </div>))}
          </div>}
          {approved && <div className="card pad dboost"><div><b>Passez devant les autres artisans</b><p className="meta">Un boost place votre profil en tête des résultats ou sur l’accueil.</p></div><Link className="btn boost" href="/tableau-de-bord?s=boosts" scroll={false}>Voir les boosts</Link></div>}
        </div>

        <div className="stack" hidden={sec !== "demandes"}>
          <h1 className="dtitle">Demandes des clients</h1>
          <div className="stack">
        {reqs?.length ? reqs.map((r) => (
          <div key={r.id} className="req card pad">
            <div className="tags">{r.urgent && <span className="tag boost">Urgent</span>}{r.status === "new" ? <span className="tag wait">Nouvelle</span> : <span className="tag mute">Traitée</span>}<span className="meta">{day(r.created_at)}</span></div>
            <p><b>{r.client_name || "Client"}</b>{r.client_phone ? <> · <a href={`tel:+${r.client_phone}`}>+{r.client_phone}</a></> : null}{r.client_email ? <> · <a href={`mailto:${r.client_email}`}>{r.client_email}</a></> : null}</p>
            <p>{r.description}</p>
            <div className="row reqact">
              {r.client_phone && <a className="btn small wa" href={`https://wa.me/${r.client_phone}?text=${encodeURIComponent(`🔧 *Bricolo* — Bonjour${r.client_name ? " " + r.client_name : ""}, ici ${artisan.name}. Je réponds à votre demande envoyée sur Bricolo : « ${r.description.slice(0, 80)} »`)}`} target="_blank" rel="noopener noreferrer">💬 Répondre sur WhatsApp</a>}
              {r.client_phone && <a className="btn small" href={`tel:+${r.client_phone}`}>📞 Appeler</a>}
              {r.client_email && <a className="btn small" href={`mailto:${r.client_email}?subject=${encodeURIComponent("Votre demande sur Bricolo")}`}>✉️ Répondre par e-mail</a>}
            </div>
            {r.status === "new" && <form action={markAnswered}><input type="hidden" name="id" value={r.id} /><button className="btn small" type="submit">Marquer comme traitée</button></form>}
          </div>
        )) : <p className="empty">Aucune demande pour le moment. Elles apparaîtront ici et vous seront aussi envoyées par e-mail.</p>}
          </div>
        </div>

        <div className="stack" hidden={sec !== "prestations"}>
          <h1 className="dtitle">Mes prestations</h1>
          <div id="prestations" className="card pad stack psec"><h2>Ce que je propose <span className="hint">({services?.length ?? 0}/{maxServices})</span>{pro && <span className="tag boost" style={{ marginLeft: 8 }}>Pro</span>}</h2>
            <p className="hint">Listez chaque service avec son prix de départ : le client sait tout de suite ce que vous faites et combien ça coûte. Elles s’affichent sur votre fiche.{pro && proSub ? ` Forfait Pro actif jusqu’au ${day(proSub.ends_at)}.` : ""}</p>
            {!services?.length && <p className="empty">Vous n’avez pas encore de prestation. Ajoutez la première ci-dessous.</p>}
            {services?.map((s) => (
              <details key={s.id} className="svc">
                <summary><span><b>{s.headline}</b>{priceText(s.price_label) ? <><br /><span className="meta">{priceText(s.price_label)}</span></> : null}{((s as any).included?.length ?? 0) > 0 ? <><br /><span className="meta">{(s as any).included.length} élément{(s as any).included.length > 1 ? "s" : ""} inclus{((s as any).extras?.length ?? 0) > 0 ? ` · ${(s as any).extras.length} en supplément` : ""}</span></> : null}</span><span className="btn small">Modifier</span></summary>
                <form action={updateService} className="stack svc-f"><input type="hidden" name="id" value={s.id} />
                  <HeadlineField uid={`svc_h_${s.id}`} label="Prestation" value={s.headline} /><PriceField uid={`svc_p_${s.id}`} label="Prix de cette prestation" value={s.price_label} /><ServiceDetails uid={`svc_d_${s.id}`} included={(s as any).included} extras={(s as any).extras} />
                  <div className="row"><button className="btn small primary" type="submit">Enregistrer</button></div></form>
                <form action={removeService} className="svc-del"><input type="hidden" name="id" value={s.id} /><button className="btn small ghost" type="submit">Supprimer cette prestation</button></form>
              </details>))}
            {(services?.length ?? 0) >= maxServices && !pro && <div className="notice boostnote row" style={{ justifyContent: "space-between" }}><span><b>Forfait gratuit : 1 prestation.</b> Passez Pro pour en afficher jusqu’à 10 et 20 photos.</span><Link className="btn small boost" href="/tableau-de-bord?s=forfait">Découvrir le Forfait Pro</Link></div>}
            {(services?.length ?? 0) < maxServices && <form action={addService} className="stack" style={{ borderTop: services?.length ? "1px solid var(--line)" : 0, paddingTop: services?.length ? 14 : 0 }}>
              <HeadlineField uid="svc_h" label="Nouvelle prestation" /><PriceField uid="svc_p" label="Prix de cette prestation" /><ServiceDetails uid="svc_d" />
              <div><button className="btn small primary" type="submit">Ajouter cette prestation</button></div></form>}
          </div>
        </div>

        <div className="stack" hidden={sec !== "guide"}>
          <h1 className="dtitle">Comment réussir ma fiche ?</h1>
          <p className="sub">Les fiches complètes reçoivent bien plus d’appels. Suivez ces étapes dans l’ordre : chacune vous mène directement à l’endroit où la remplir.</p>
          <div className="card pad stack">
            <ol className="gsteps">
              {([
                [!!(artisan as any).cover_url || (shots ?? []).length > 0, "Une couverture en paysage", "Une belle image horizontale (1600 × 600 px) avec votre activité et votre nom. Gardez tout le texte dans la moitié centrale : sur les cartes de résultats, les bords sont coupés.", "/tableau-de-bord?s=profil&p=photos", "Ajouter ma couverture"],
                [(shots ?? []).length >= 3, "3 à 8 réalisations", "Avant/après, chantiers terminés. Les fiches avec photos reçoivent bien plus d’appels.", "/tableau-de-bord?s=profil&p=photos", "Ajouter des photos"],
                [!!(artisan as any).headline, "Une promesse « Je vais… »", "Une phrase simple sur ce que vous faites pour le client. Exemple : « Je vais installer votre climatisation ».", "/tableau-de-bord?s=profil", "Écrire ma promesse"],
                [!!artisan.description && artisan.description.length >= 30, "Une description concrète", "Ce que vous faites, votre expérience, vos garanties. Écrivez comme vous parleriez à un client.", "/tableau-de-bord?s=profil", "Écrire ma présentation"],
                [nSvc > 0, "Des prestations avec leur prix", "Une ligne par service, avec un prix de départ : « À partir de … FCFA » et l’unité. Le prix final se discute avec le client.", "/tableau-de-bord?s=prestations", "Ajouter une prestation"],
                [(services ?? []).some((x: any) => (x.included?.length ?? 0) > 0), "Ce qui est inclus, et ce qui est en supplément", "Pour chaque prestation, dites ce que le prix comprend. Exemple, entretien de climatisation : déplacement et nettoyage des filtres inclus ; recharge de gaz en supplément (500 g = … FCFA). Le client n’a aucune mauvaise surprise et appelle avec confiance.", "/tableau-de-bord?s=prestations", "Détailler mes prestations"],
                [myZones.size >= 2 && hasHours, "Des zones et des horaires", "Plus vous couvrez de zones, plus vous apparaissez dans les recherches. Indiquez vos horaires pour être trouvé quand le client en a besoin.", "/tableau-de-bord?s=profil&p=zones", "Choisir mes zones"],
                [null, "Répondez vite", "Dans l’heure, c’est ce qui fait décrocher les chantiers. Un client qui n’a pas de réponse appelle le suivant.", "/tableau-de-bord?s=demandes", "Voir mes demandes"],
              ] as [boolean | null, string, string, string, string][]).map(([ok, t, d, href, cta], k) => (
                <li key={t} className={ok ? "done" : undefined}>
                  <span className="gnum" aria-hidden="true">{ok ? "✓" : k + 1}</span>
                  <div className="gbody"><b>{t}</b>{ok === true && <span className="tag ok">Fait</span>}<p>{d}</p><Link className="btn small" href={href} scroll={false}>{cta}</Link></div>
                </li>))}
            </ol>
          </div>
        </div>

        <div className="stack" hidden={sec !== "profil"}>
          <h1 className="dtitle">Mon profil</h1>
          <nav className="subnav" aria-label="Sections du profil">
            {PSUBS.map(([k, l]) => <Link key={k} href={`/tableau-de-bord?s=profil&p=${k}`} scroll={false} aria-current={ptab === k ? "page" : undefined}>{l}</Link>)}
          </nav>

          <div className="stack" hidden={ptab !== "infos"}>
            <div id="photo-profil" className="card pad stack psec"><h2>Photo de profil</h2>
              <p className="sub">Pour vous identifier : une photo de vous, bien nette.</p>
              <PhotoUpdate uid={user.id} photoUrl={artisan.photo_url} name={artisan.name} /></div>
            <form action={saveProfile} className="stack">
              <input type="hidden" name="keep_zones" value="1" />
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
          <div className="card pad stack psec"><h2>Prix et contact</h2>
          {["machiniste", "chauffeur"].includes(trades?.find((t) => t.id === artisan.trade_id)?.slug ?? "")
            ? <><PriceField value={artisan.price_label} label="Salaire souhaité" /><p className="hint">Laissez vide : votre fiche affichera « Prix à négocier ». Sinon vos clients verront « Salaire souhaité : … ».</p></>
            : <PriceField value={artisan.price_label} label="Prix affiché sur votre carte" />}
          <div className="fld"><label htmlFor="phone">Téléphone</label><input type="tel" id="phone" name="phone" required defaultValue={artisan.phone ?? ""} /></div>
          <div className="fld"><label htmlFor="whatsapp">WhatsApp (si différent)</label><input type="tel" id="whatsapp" name="whatsapp" defaultValue={artisan.whatsapp ?? ""} /></div>
          </div>
          <div className="savebar"><span className="meta">Pensez à enregistrer vos modifications.</span><button className="btn primary" type="submit">Enregistrer mes modifications</button></div>
        </form>
          </div>

          <div className="stack" hidden={ptab !== "photos"}>
            <div id="photos" className="card pad stack psec"><h2>Couverture et réalisations</h2>
              <p className="sub">C’est la première chose que voient les clients : soignez-les. Couverture en paysage (1600 × 600 px) : {(artisan as any).cover_url ? "✓ ajoutée" : "à ajouter"}.</p>
              <Gallery uid={user.id} cover={(artisan as any).cover_url ?? null} shots={(shots ?? []) as any} max={maxPhotos} pro={pro} /></div>
          </div>

          <div className="stack" hidden={ptab !== "zones"}>
            <form action={saveZones} className="stack">
          <div id="zones" className="card pad stack psec"><h2>Où j’interviens</h2>
            <p className="sub">{pro ? `Forfait Pro : jusqu’à ${PRO_LIMITS.pro.zones} zones, ou une ville entière.` : `Forfait gratuit : jusqu’à ${PRO_LIMITS.free.zones} zones. Le Forfait Pro permet de couvrir une ville entière ou jusqu’à ${PRO_LIMITS.pro.zones} quartiers.`}</p>
            <ZonePicker zones={(zones ?? []) as any} selected={[...myZones] as string[]} max={maxZones} canCity={pro} proHref="/tableau-de-bord?s=forfait" />
            {!pro && <Link className="btn small boost" href="/tableau-de-bord?s=forfait" style={{ justifySelf: "start" }}>Couvrir plus de zones avec le Pro</Link>}
          </div>
              <div className="savebar"><span className="meta">Pensez à enregistrer vos zones.</span><button className="btn primary" type="submit">Enregistrer mes zones</button></div>
            </form>
      <div id="horaires" className="card pad stack">
        <h2 style={{ fontSize: 20 }}>Mes horaires</h2>
        <p className="muted">Les clients voient « Ouvert maintenant » sur votre fiche quand vous êtes disponible, et peuvent filtrer les artisans ouverts.</p>
        <HoursEditor initial={cleanHours((artisan as any).hours)} open247={!!(artisan as any).open_24_7} urgent={!!(artisan as any).takes_urgent} action={saveHours} />
      </div>



          </div>

          <div className="stack" hidden={ptab !== "diplomes"}>
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
        </div>

      <div id="forfait" className="stack" hidden={sec !== "forfait"}>
        <h1 className="dtitle">Mon forfait</h1>
        {sp.paye && (paid[0]?.status === "paid" ? <p className="notice ok" role="status">Paiement reçu. Votre Forfait Pro est actif.</p> : <p className="notice" role="status">Merci ! Nous attendons la confirmation de GeniusPay. Votre forfait s’activera automatiquement dans quelques instants : rechargez cette page dans une minute.</p>)}
        {perks?.trial?.ok && (
          <div className="card pad stack dboost big">
            <div><b>Essayez le Forfait Pro {TRIAL_DAYS} jours, gratuitement</b>
              <p className="meta">Sans paiement et sans engagement : 10 prestations, 20 photos, 10 quartiers et le badge Pro. Une seule fois par artisan.</p></div>
            <form action={startTrialAction}><button className="btn boost" type="submit">Commencer mon essai gratuit</button></form>
          </div>
        )}
        {pro && perks && (
          <div className="card pad stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ fontSize: 18 }}>Mon boost du mois, offert</h2><span className="tag boost">Inclus dans le Pro</span></div>
            {perks.freeUsed ? (
              <p className="meta">Votre boost offert de ce mois est déjà pris{new Date(perks.freeUsed.ends_at) > new Date() ? ` (actif jusqu’au ${day(perks.freeUsed.ends_at)})` : ""}. Le prochain sera disponible le {day(nextMonthStart().toISOString())}.</p>
            ) : !(artisan as any).verified ? (
              <p className="meta">Il est réservé aux profils dont l’identité est vérifiée.</p>
            ) : perks.zlist.length ? (
              <form action={claimFreeBoostAction} className="stack" style={{ gap: 10 }}>
                <p className="meta">Un boost recherche de 24 h dans le quartier de votre choix : votre fiche passe en tête des résultats de votre métier. Un par mois.</p>
                <div className="fld"><label htmlFor="free_zone">Zone du boost</label>
                  <select id="free_zone" name="zone" required>{perks.zlist.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
                <div><button className="btn boost" type="submit">Activer mon boost offert (24 h)</button></div>
              </form>
            ) : <p className="meta">Ajoutez d’abord une zone d’intervention à votre fiche.</p>}
          </div>
        )}
        {approved && (
          <div className="card pad stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ fontSize: 18 }}>Mon kit WhatsApp</h2><span className="tag boost">Inclus dans le Pro</span></div>
            <p className="meta">Une affiche, un visuel pour votre statut WhatsApp et une carte de visite, à votre nom, avec un QR code qui ouvre votre fiche. Postez-les, imprimez-les, montrez-les à vos clients.</p>
            {pro ? (
              <>
                <div className="agrid">
                  {([["statut", "Statut WhatsApp", "9 / 16"], ["affiche", "Affiche", "4 / 5"], ["carte", "Carte de visite", "7 / 4"]] as const).map(([k, l, ar]) => (
                    <div key={k} className="stack" style={{ gap: 8 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/kit/${k}`} alt={`${l} de ${artisan.name}`} loading="lazy" style={{ width: "100%", maxHeight: 280, aspectRatio: ar, objectFit: "contain", borderRadius: 10, background: "var(--surface-100)" }} />
                      <a className="btn small" href={`/api/kit/${k}?dl=1`}>Télécharger : {l}</a>
                    </div>
                  ))}
                </div>
                <a className="btn small wa" style={{ justifySelf: "start" }} href={`https://wa.me/?text=${encodeURIComponent(`Retrouvez-moi sur Bricolo (${tradeName}) : ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.monbricolo.com"}/artisan/${artisan.id}?s=wa`)}`}>Partager ma fiche sur WhatsApp</a>
              </>
            ) : <p className="hint">Disponible avec le Forfait Pro (essai gratuit possible si votre identité est vérifiée).</p>}
          </div>
        )}
        {approved && (
          <div className="card pad stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ fontSize: 18 }}>Statistiques détaillées</h2><span className="tag boost">Inclus dans le Pro</span></div>
            {pro && perks?.detail ? (() => { const d = perks.detail; const max = Math.max(1, ...d.sources.map((x) => x.n)); return (
              <>
                <p className="meta">30 derniers jours : {d.views} vue{d.views > 1 ? "s" : ""}, {d.contacts} contact{d.contacts > 1 ? "s" : ""} (appels et WhatsApp){d.views ? `, soit ${d.rate} % des visiteurs` : ""}.</p>
                <BarChart label="Vues de ma fiche par jour" data={d.days} color="var(--brand)" />
                <div className="stack" style={{ gap: 8 }}>
                  <b>D’où viennent mes visiteurs</b>
                  {d.sources.length ? d.sources.map((x) => (
                    <div key={x.key} className="stack" style={{ gap: 4 }}>
                      <div className="row" style={{ justifyContent: "space-between" }}><span>{x.label}</span><b className="num">{x.n}</b></div>
                      <div className="bar" aria-hidden="true"><i style={{ width: `${Math.round((x.n / max) * 100)}%` }} /></div>
                    </div>
                  )) : <p className="empty">Pas encore de visite sur cette période.</p>}
                </div>
                {d.bestDay && d.bestHours ? <p className="notice boostnote">Vos clients vous contactent surtout le <b>{d.bestDay}</b>, entre <b>{d.bestHours}</b> (heure locale). Soyez joignable à ces moments.</p> : <p className="meta">Le jour et les heures où vous êtes le plus contacté apparaîtront dès que vous aurez quelques contacts.</p>}
                <p className="hint">La provenance est enregistrée à partir d’aujourd’hui : les visites plus anciennes sont comptées dans « Lien direct ou autre ».</p>
              </>); })() : <p className="hint">Découvrez d’où viennent vos visiteurs (recherche, accueil, QR code, WhatsApp), vos vues jour par jour et les heures où l’on vous contacte le plus. Disponible avec le Forfait Pro.</p>}
          </div>
        )}
        {pro && perks?.recap && (
          <div className="card pad stack">
            <h2 style={{ fontSize: 18 }}>Bilan de mon Forfait Pro</h2>
            <p className="meta">Depuis le début de votre forfait ({day(new Date(proStart).toISOString())}).</p>
            <div className="stats">
              {([["👁", perks.recap.vues, "Vues"], ["📞", perks.recap.appels, "Appels"], ["💬", perks.recap.wa, "WhatsApp"], ["📩", perks.recap.demandes, "Demandes"]] as const).map(([ic, n, l]) => (
                <div key={l} className="card stat"><span aria-hidden="true">{ic}</span><b>{n}</b><span>{l}</span></div>
              ))}
            </div>
          </div>
        )}
        <div className="card pad stack">
          <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ fontSize: 18 }}>Mon offre actuelle</h2>{pro ? <span className="tag boost">Pro</span> : <span className="tag mute">Gratuit</span>}</div>
          <p>{pro && proSub ? <><b>Forfait Pro actif jusqu’au {day(proSub.ends_at)}</b> · il reste {leftLabel}. Prolonger ajoute la durée à la fin de la période en cours.</> : <><b>Offre gratuite.</b> Elle suffit pour démarrer ; le Pro vous donne plus de place pour convaincre.</>}</p>
          {limitsEl}
        </div>
        {act30 && (
          <div className="card pad stack">
            <h2 style={{ fontSize: 18 }}>Mon activité, 30 derniers jours</h2>
            <div className="akpi">
              <div className="kpi"><span>Vues de ma fiche</span><b>{act30.vues}</b></div>
              <div className="kpi"><span>Appels</span><b>{act30.appels}</b></div>
              <div className="kpi"><span>Messages WhatsApp</span><b>{act30.wa}</b></div>
            </div>
            {pro && actProBefore && actProAfter ? (() => { const lift = liftPct(actProBefore.contacts, actProAfter.contacts); return (
              <p className={lift === null ? "meta" : lift >= 0 ? "up" : "down"}>{lift === null ? "Pas encore assez de données pour mesurer l’effet de votre Forfait Pro." : `Depuis le début de votre Forfait Pro : ${lift >= 0 ? "+" : ""}${lift} % d’appels et de WhatsApp, comparé aux 30 jours d’avant (${actProBefore.contacts} → ${actProAfter.contacts}). Indicatif : la saison joue aussi.`}</p>); })() : <p className="meta">{pro ? "La comparaison avant / après apparaîtra après quelques jours de Forfait Pro." : "Avec le Forfait Pro, vous verrez ici l’effet sur vos appels et vos messages."}</p>}
          </div>
        )}
        <MyPayments rows={paid} kind="forfait" />
        <div className="offers">
          <section className={`offer${pro ? "" : " cur"}`} aria-label="Offre gratuite">
            <header><h2>Gratuit</h2>{!pro && <span className="tag mute">Votre offre</span>}</header>
            <p className="offer-p"><b>0 FCFA</b></p>
            <ul>
              <li>1 prestation sur votre fiche</li><li>8 photos de réalisations</li><li>3 quartiers d’intervention</li>
              <li>Visible dans les recherches</li><li>Badge « Vérifié » après contrôle d’identité</li>
            </ul>
          </section>
          <section className={`offer pro${pro ? " cur" : ""}`} aria-label="Forfait Pro">
            <header><h2>Pro</h2>{pro ? <span className="tag boost">Votre offre</span> : <span className="tag boost">Pour aller plus loin</span>}</header>
            <p className="offer-p">{monthPrice > 0 ? <><b>{fcfa(monthPrice)}</b> <span>/ mois</span></> : <span>Bientôt disponible dans votre pays</span>}</p>
            <ul>
              <li><b>Jusqu’à 10 prestations</b> sur votre fiche</li><li><b>Jusqu’à 20 photos</b> de réalisations</li>
              <li><b>10 quartiers</b> ou une <b>ville entière</b></li><li>Badge « Pro » sur votre fiche</li><li>Tout ce que contient l’offre gratuite</li>
            </ul>
          </section>
        </div>
        {approved ? (monthPrice > 0 ? (
          <div className="stack">
            <h2 style={{ fontSize: 18 }}>{pro ? "Prolonger mon Forfait Pro" : "Choisissez la durée de votre Forfait Pro"}</h2>
            <div className="agrid plans">
              {PLANS.map((pl) => { const amount = planPrice(planOf, pl.key); const perMonth = Math.round((amount / (pl.days / 30)) / 100) * 100; return (
                <form key={pl.key} method="post" action="/api/forfait/checkout" className={`card pad stack plan${pl.key === "month" ? " best" : ""}`}>
                  <span className={`tag ${pl.key === "month" ? "boost" : "mute"}`}>{pl.note}</span>
                  <h3 style={{ fontSize: 18 }}>{pl.label}</h3>
                  <p className="price">{fcfa(amount)}</p>
                  <p className="meta">{pl.key === "week" ? `Soit ${fcfa(perMonth)} par mois` : pl.key === "quarter" ? `Soit ${fcfa(perMonth)} par mois` : pl.key === "year" ? `Soit ${fcfa(perMonth)} par mois` : "Sans engagement"}</p>
                  {pl.key === "quarter" && monthPrice * 3 - amount > 0 && <span className="tag ok">Vous économisez {fcfa(monthPrice * 3 - amount)}</span>}
                  {pl.key === "year" && monthPrice * 12 - amount > 0 && <span className="tag ok">Vous économisez {fcfa(monthPrice * 12 - amount)}</span>}
                  <input type="hidden" name="plan" value={pl.key} /><PayButton>{pro ? "Prolonger" : "Passer Pro"}</PayButton>
                </form>); })}
            </div>
            <p className="hint">Paiement sécurisé par Mobile Money ou carte. Sans engagement : le forfait s’arrête à la fin de la période payée. Vos prestations et photos en plus restent enregistrées mais ne sont plus affichées. Vos 3 premières zones restent actives ; les autres, et « toute la ville », se réactivent si vous reprenez le Pro.</p>
          </div>
        ) : <p className="empty">Le Forfait Pro n’est pas encore disponible dans votre pays.</p>) : <p className="empty">Le Forfait Pro sera disponible dès la validation de votre profil.</p>}
        <div className="card pad stack"><h2 style={{ fontSize: 18 }}>Mes périodes de Forfait Pro</h2>
          {history?.length ? history.map((h) => <div key={h.id} className="row" style={{ justifyContent: "space-between" }}><span>{(h as any).trial ? "Essai gratuit" : "Forfait Pro"} · {h.days >= 365 ? "1 an" : h.days >= 30 ? `${Math.round(h.days / 30)} mois` : `${h.days} j`}<span className="meta"> · jusqu’au {day(h.ends_at)}</span></span><span className="row"><b className="num">{(h as any).trial ? "Offert" : fcfa(h.amount)}</b><span className={`tag ${new Date(h.ends_at) > new Date() ? "ok" : "mute"}`}>{new Date(h.ends_at) > new Date() ? "Actif" : "Terminé"}</span></span></div>) : <p className="empty">Aucun paiement de forfait pour le moment.</p>}
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
              <MyPayments rows={paid} kind="boost" />
      </div>
      <div id="notifs" className="stack" hidden={sec !== "notifs"}>
        <h1 className="dtitle">Notifications</h1>
        <p className="meta">Recevez une alerte sur votre téléphone dès qu’un client vous écrit, même quand l’application est fermée.</p>
        {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && <PushBell where="menu" publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />}
      </div>
      <div id="aide" className="stack" hidden={sec !== "aide"}>
        <h1 className="dtitle">Contacter Bricolo</h1>
        <p className="meta">Un problème, une question, un doute sur votre dossier ou un paiement ? Écrivez-nous ici : l’équipe vous répond directement, et vous prévient par notification et par e-mail.</p>
        {sec === "aide" && <SupportChat as="artisan" empty="Aucun message pour le moment. Écrivez-nous, nous répondons en général sous 24 heures." />}
      </div>
      <div id="compte" className="stack" hidden={sec !== "compte"}>
        <h1 className="dtitle">Mon compte</h1>
        <p className="meta">Connecté avec {user.email}. Pour changer d’adresse e-mail, écrivez-nous depuis « Contacter Bricolo ».</p>
        {sec === "compte" && <DeleteAccount hasPaid={Boolean(pro || act?.length)} />}
      </div>
      </main>
    </section>
  );
}

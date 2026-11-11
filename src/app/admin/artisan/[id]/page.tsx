import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { countryName } from "@/lib/countries";
import { initials } from "@/lib/format";
import Flag from "@/components/Flag";
import SetupNotice from "@/components/SetupNotice";
import { reviewDiplomaAction, reviewDossier } from "../../actions";
import { removeMedia, deleteArtisan, giftBoost, giftPro, reactivateArtisan, saveNote, setVerified, suspendArtisan } from "../../gestion";
import { fcfa } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { REPORT_REASONS } from "@/lib/email-flows";

export const metadata: Metadata = { title: "Examen du dossier", robots: { index: false } };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const DOC = { cni: "Carte d’identité", passeport: "Passeport", permis: "Permis de conduire", carte_consulaire: "Carte consulaire" } as Record<string, string>;
const when = (iso: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso)) + " GMT";

export default async function Review({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: me } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/");

  const { data: a } = await db.from("artisans")
    .select("*, trade:trades(name), profile:profiles(email), zones:artisan_zones(zone:zones(name))").eq("id", id).maybeSingle();
  if (!a) notFound();
  const [{ data: ident }, { data: diplomas }, { data: company }, { data: proSub }] = await Promise.all([
    db.from("artisan_identity").select("*").eq("artisan_id", id).maybeSingle(),
    db.from("artisan_diplomas").select("*").eq("artisan_id", id).order("submitted_at", { ascending: false }),
    db.from("artisan_companies").select("registration_number").eq("artisan_id", id).maybeSingle(),
    db.from("subscriptions").select("ends_at").eq("artisan_id", id).eq("status", "active").gt("ends_at", new Date().toISOString()).order("ends_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  // Liens temporaires (10 min) vers les pièces : le stockage est privé.
  const paths = [ident?.front_path, ident?.back_path, ident?.selfie_path, ...(diplomas ?? []).map((d) => d.path)].filter(Boolean) as string[];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await db.storage.from("kyc").createSignedUrls(paths, 600);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }
  const Doc = ({ label, path }: { label: string; path?: string | null }) => path ? (
    <figure className="docfig"><a href={signed.get(path)} target="_blank" rel="noopener noreferrer">{signed.get(path) ? <img src={signed.get(path)} alt={label} /> : <span className="empty">Aperçu indisponible</span>}</a><figcaption>{label} · <a href={signed.get(path)} target="_blank" rel="noopener noreferrer">Ouvrir en grand</a></figcaption></figure>
  ) : null;

  const zones = ((a as any).zones ?? []).map((z: any) => one(z.zone)?.name).filter(Boolean).join(", ");
  const email = one((a as any).profile as any)?.email as string | undefined;
  const canDecide = !!ident && a.status !== "approved" && a.status !== "suspended";
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const cnt = (q: any) => q.then((r: any) => r.count ?? 0);
  const [views, calls, wa, reqs, { data: boosts }, { data: revs }, { data: shots }] = await Promise.all([
    cnt(db.from("events").select("id", { count: "exact", head: true }).eq("artisan_id", id).eq("type", "view").gte("created_at", since30)),
    cnt(db.from("events").select("id", { count: "exact", head: true }).eq("artisan_id", id).eq("type", "call").gte("created_at", since30)),
    cnt(db.from("events").select("id", { count: "exact", head: true }).eq("artisan_id", id).eq("type", "whatsapp").gte("created_at", since30)),
    cnt(db.from("service_requests").select("id", { count: "exact", head: true }).eq("artisan_id", id)),
    db.from("boosts").select("id, type, duration_hours, amount, status, ends_at, created_at").eq("artisan_id", id).order("created_at", { ascending: false }).limit(10),
    db.from("reviews").select("id, author_name, rating, comment, status").eq("artisan_id", id).order("created_at", { ascending: false }).limit(10),
    db.from("portfolio_photos").select("id, url").eq("artisan_id", id).order("created_at"),
  ]);
  const susp = a.status === "suspended";

  return (
    <div className="stack">
      <p><Link href="/admin/artisans">← Tous les artisans</Link></p>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}

      <div className="card pad row" style={{ gap: 16, flexWrap: "nowrap" }}>
        {a.photo_url ? <img className="curphoto" src={a.photo_url} alt="Photo de profil" /> : <span className="avatar" style={{ width: 96, height: 96 }}>{initials(a.name)}</span>}
        <div className="stack" style={{ gap: 6, minWidth: 0 }}>
          <div className="tags"><span className={`tag ${a.status === "approved" ? "ok" : susp ? "err" : a.status === "rejected" ? "mute" : "wait"}`}>{a.status === "approved" ? "En ligne" : susp ? "Suspendu" : a.status === "rejected" ? "Refusé" : "À valider"}</span>{a.account_type === "entreprise" && <span className="tag mute">Entreprise</span>}{a.verified && <span className="tag ok">✓ Vérifié</span>}{a.diploma_verified && <span className="tag ok">🎓 Diplôme vérifié</span>}</div>
          <h1 style={{ fontSize: "clamp(22px,4vw,32px)" }}>{a.name}</h1>
          <p className="meta fl"><Flag code={a.country_code} size={16} />{one(a.trade as any)?.name} · {countryName(a.country_code)} · inscrit le {when(a.created_at)}</p>
          <div><Link className="btn small" href={`/admin/support/${a.id}`}>💬 Écrire à l’artisan</Link></div>
        </div>
      </div>


      <div className="akpi">
        <div className="kpi"><span>Vues, 30 jours</span><b>{views}</b></div><div className="kpi"><span>Appels</span><b>{calls}</b></div>
        <div className="kpi"><span>WhatsApp</span><b>{wa}</b></div><div className="kpi"><span>Demandes reçues</span><b>{reqs}</b></div>
      </div>

      <div className="card pad stack">
        <h2 style={{ fontSize: 20 }}>Gestion du compte</h2>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <form action={setVerified}><input type="hidden" name="id" value={id} /><input type="hidden" name="on" value={a.verified ? "0" : "1"} /><button className="btn small" type="submit">{a.verified ? "Retirer le badge Vérifié" : "Accorder le badge Vérifié"}</button></form>
          {susp && <form action={reactivateArtisan}><input type="hidden" name="id" value={id} /><button className="btn small primary" type="submit">Réactiver le profil</button></form>}
          <a className="btn small" href={`/artisan/${id}`} target="_blank" rel="noopener noreferrer">Voir la fiche publique</a>
        </div>
        {susp && a.reject_reason && <p className="notice err">Motif de suspension : {a.reject_reason}</p>}
        <form action={saveNote} className="stack"><input type="hidden" name="id" value={id} />
          <div className="fld"><label htmlFor="note">Note interne <span className="hint">(jamais visible par l’artisan)</span></label><textarea id="note" name="note" maxLength={2000} defaultValue={(a as any).admin_note ?? ""} /></div>
          <div><button className="btn small" type="submit">Enregistrer la note</button></div></form>
        <form action={giftBoost} className="afilters" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}><input type="hidden" name="id" value={id} />
          <b>Offrir un boost :</b>
          <select name="type" aria-label="Type"><option value="recherche">Recherche</option><option value="accueil">Accueil</option><option value="urgence">Urgence</option></select>
          <select name="hours" aria-label="Durée"><option value="24">24 h</option><option value="72">3 jours</option><option value="168">7 jours</option></select>
          <button className="btn small" type="submit">Offrir</button></form>
        <form action={giftPro} className="afilters"><input type="hidden" name="id" value={id} />
          <b>Forfait Pro :</b> <span className={`tag ${proSub ? "boost" : "mute"}`}>{proSub ? `Pro jusqu’au ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(proSub.ends_at))}` : "Gratuit"}</span>
          <select name="days" aria-label="Durée offerte"><option value="7">Offrir 1 semaine</option><option value="30">Offrir 1 mois</option><option value="365">Offrir 1 an</option></select>
          <button className="btn small" type="submit">Offrir le Pro</button></form>
      </div>

      {(((a as any).cover_url) || shots?.length) ? (
        <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Photos publiées</h2><p className="hint">Retirez toute photo inappropriée (personnes, documents, contenu choquant).</p>
          <div className="shotgrid">
            {(a as any).cover_url && <figure style={{ gridColumn: "span 2", aspectRatio: "16/6" }}><img src={(a as any).cover_url} alt="Couverture" /><form action={removeMedia}><input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value="cover" /><button aria-label="Retirer la couverture">×</button></form></figure>}
            {shots?.map((p) => <figure key={p.id}><img src={p.url} alt="Réalisation" /><form action={removeMedia}><input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value="photo" /><input type="hidden" name="photo" value={p.id} /><button aria-label="Retirer cette photo">×</button></form></figure>)}
          </div></div>
      ) : null}

      {await (async () => {
        const adb = supabaseAdmin();
        const [{ data: reps }, { data: sans }] = await Promise.all([
          adb.from("reports").select("id, reason, status, created_at").eq("artisan_id", id).order("created_at", { ascending: false }).limit(20),
          adb.from("artisan_sanctions").select("id, kind, reason, created_at, created_by").eq("artisan_id", id).order("created_at", { ascending: false }).limit(20),
        ]);
        if (!reps?.length && !sans?.length) return null;
        const upheld = reps?.filter((r) => r.status === "upheld").length ?? 0;
        return (
          <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Signalements et sanctions</h2>
            {upheld >= 3 && <p className="notice err">⚠️ {upheld} signalements retenus : envisagez une suspension ou un bannissement.</p>}
            <p className="meta">{reps?.length ?? 0} signalement(s) dont {upheld} retenu(s). <Link href="/admin/signalements?statut=all">Voir et traiter</Link></p>
            {sans?.map((x) => <p key={x.id} className="meta"><b>{x.kind.replace("_", " ")}</b> · {when(x.created_at)} · {x.created_by} — {x.reason}</p>)}
            {reps?.map((r) => <p key={r.id} className="meta">{when(r.created_at)} · {REPORT_REASONS[r.reason] ?? r.reason} · {r.status === "new" ? "à traiter" : r.status === "upheld" ? "retenu" : "classé"}</p>)}
          </div>
        );
      })()}

      <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Boosts et avis</h2>
        {boosts?.length ? <table className="tbl"><tbody>{boosts.map((b) => <tr key={b.id}><td>{b.type} · {b.duration_hours / 24} j</td><td><span className={`tag ${b.status === "active" ? "ok" : "mute"}`}>{b.status}</span></td><td className="num">{b.amount ? fcfa(b.amount) : "Offert"}</td></tr>)}</tbody></table> : <p className="empty">Aucun boost.</p>}
        {revs?.length ? revs.map((r) => <p key={r.id} className="meta"><b>{"★".repeat(r.rating)}</b> {r.author_name} · {r.status} — {r.comment}</p>) : null}
      </div>

      <div className="card pad stack">
        <h2 style={{ fontSize: 20 }}>Profil</h2>
        <dl className="dl">
          <dt>E-mail</dt><dd>{email ?? "—"}</dd>
          <dt>Téléphone</dt><dd>{a.phone ?? "—"}{a.whatsapp ? ` · WhatsApp ${a.whatsapp}` : ""}</dd>
          <dt>Expérience</dt><dd>{a.experience_years != null ? `${a.experience_years} an${a.experience_years > 1 ? "s" : ""}` : "Non renseignée"}</dd>
          <dt>Zones</dt><dd>{zones || "—"}</dd>
          <dt>Tarif indicatif</dt><dd>{a.price_label ?? "—"}</dd>
          {a.account_type === "entreprise" && <><dt>Entreprise</dt><dd>{a.company_name ?? "—"}<br /><span className="meta">N° {company?.registration_number ?? "non renseigné"}</span></dd></>}
          <dt>Description</dt><dd>{a.description ?? "—"}</dd>
        </dl>
      </div>

      <div className="card pad stack">
        <h2 style={{ fontSize: 20 }}>Pièce d’identité</h2>
        {ident ? (
          <>
            <p className="meta">{DOC[ident.doc_type] ?? ident.doc_type}{ident.doc_last4 ? ` · n° …${ident.doc_last4}` : ""} · envoyée le {when(ident.submitted_at)}{ident.status === "approved" ? " · acceptée" : ident.status === "rejected" ? " · refusée" : ""}</p>
            <div className="docs"><Doc label="Recto" path={ident.front_path} /><Doc label="Verso" path={ident.back_path} /><Doc label="Selfie avec la pièce" path={ident.selfie_path} /></div>
            <div className="notice"><b>À contrôler :</b> le nom sur la pièce correspond au nom du profil · la pièce est valide et lisible · le visage du selfie correspond à la photo de la pièce · la photo de profil montre bien la personne.</div>
          </>
        ) : <p className="empty">Cet artisan n’a pas encore envoyé de pièce d’identité.</p>}
      </div>

      {canDecide && (
        <div className="card pad stack">
          <h2 style={{ fontSize: 20 }}>Décision</h2>
          <form action={reviewDossier}><input type="hidden" name="id" value={id} /><input type="hidden" name="decision" value="approve" />
            <button className="btn primary" type="submit">Valider l’identité et mettre le profil en ligne</button></form>
          <form action={reviewDossier} className="stack" style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <input type="hidden" name="id" value={id} /><input type="hidden" name="decision" value="reject" />
            <div className="fld"><label htmlFor="preset">Motif du refus</label>
              <select id="preset" name="preset" defaultValue="illisible">
                <option value="illisible">Pièce illisible ou incomplète</option><option value="nom">Nom différent du profil</option><option value="selfie">Selfie non conforme</option>
                <option value="expiree">Pièce expirée</option><option value="photo">Photo de profil non conforme</option><option value="autre">Autre (préciser)</option></select></div>
            <div className="fld"><label htmlFor="detail">Précisions pour l’artisan <span className="hint">(facultatif sauf « Autre »)</span></label><textarea id="detail" name="detail" maxLength={300} /></div>
            <div><button className="btn danger" type="submit">Refuser le dossier</button></div>
          </form>
        </div>
      )}

      <div id="diplomes" className="card pad stack">
        <h2 style={{ fontSize: 20 }}>Diplômes</h2>
        {diplomas?.length ? diplomas.map((d) => (
          <div key={d.id} className="stack" style={{ gap: 10, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
            <div className="row" style={{ justifyContent: "space-between" }}><b>{d.title}</b><span className={`tag ${d.status === "approved" ? "ok" : d.status === "rejected" ? "mute" : "wait"}`}>{d.status === "approved" ? "Vérifié" : d.status === "rejected" ? "Refusé" : "À vérifier"}</span></div>
            <div className="docs"><Doc label="Diplôme" path={d.path} /></div>
            {d.status === "pending" && (
              <div className="stack" style={{ gap: 8 }}>
                <form action={reviewDiplomaAction}><input type="hidden" name="artisan" value={id} /><input type="hidden" name="diploma" value={d.id} /><input type="hidden" name="decision" value="approve" /><button className="btn small primary" type="submit">Vérifier ce diplôme</button></form>
                <form action={reviewDiplomaAction} className="row"><input type="hidden" name="artisan" value={id} /><input type="hidden" name="diploma" value={d.id} /><input type="hidden" name="decision" value="reject" />
                  <input name="reason" placeholder="Motif du refus" maxLength={300} required style={{ flex: "1 1 200px" }} aria-label="Motif du refus" /><button className="btn small danger" type="submit">Refuser</button></form>
              </div>
            )}
            {d.reject_reason && <p className="meta">Motif : {d.reject_reason}</p>}
          </div>
        )) : <p className="empty">Aucun diplôme envoyé.</p>}
      </div>

      {!susp && (
        <form action={suspendArtisan} className="card pad stack danger-zone"><input type="hidden" name="id" value={id} />
          <h2 style={{ fontSize: 18 }}>Suspendre ce profil</h2><p className="hint">Le profil disparaît immédiatement du site. Il peut être réactivé à tout moment.</p>
          <div className="fld"><label htmlFor="reason">Motif (visible par l’artisan)</label><input id="reason" name="reason" minLength={5} maxLength={300} required /></div>
          <div><button className="btn danger" type="submit">Suspendre</button></div></form>
      )}
      <form action={deleteArtisan} className="card pad stack danger-zone"><input type="hidden" name="id" value={id} />
        <h2 style={{ fontSize: 18 }}>Supprimer définitivement le compte</h2><p className="hint">Efface le compte, le profil, les pièces et l’historique. Irréversible.</p>
        <div className="fld"><label htmlFor="confirm">Tapez SUPPRIMER pour confirmer</label><input id="confirm" name="confirm" autoComplete="off" required /></div>
        <div><button className="btn danger" type="submit">Supprimer le compte</button></div></form>
    </div>
  );
}

export const dynamic = "force-dynamic";

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
  const [{ data: ident }, { data: diplomas }, { data: company }] = await Promise.all([
    db.from("artisan_identity").select("*").eq("artisan_id", id).maybeSingle(),
    db.from("artisan_diplomas").select("*").eq("artisan_id", id).order("submitted_at", { ascending: false }),
    db.from("artisan_companies").select("registration_number").eq("artisan_id", id).maybeSingle(),
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
  const canDecide = !!ident && a.status !== "approved";

  return (
    <section className="inner sec stack">
      <p><Link href="/admin">← Retour à l’administration</Link></p>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}

      <div className="card pad row" style={{ gap: 16, flexWrap: "nowrap" }}>
        {a.photo_url ? <img className="curphoto" src={a.photo_url} alt="Photo de profil" /> : <span className="avatar" style={{ width: 96, height: 96 }}>{initials(a.name)}</span>}
        <div className="stack" style={{ gap: 6, minWidth: 0 }}>
          <div className="tags"><span className={`tag ${a.status === "approved" ? "ok" : a.status === "rejected" ? "mute" : "wait"}`}>{a.status === "approved" ? "En ligne" : a.status === "rejected" ? "Refusé" : "À valider"}</span>{a.account_type === "entreprise" && <span className="tag mute">Entreprise</span>}{a.verified && <span className="tag ok">✓ Vérifié</span>}{a.diploma_verified && <span className="tag ok">🎓 Diplôme vérifié</span>}</div>
          <h1 style={{ fontSize: "clamp(22px,4vw,32px)" }}>{a.name}</h1>
          <p className="meta fl"><Flag code={a.country_code} size={16} />{one(a.trade as any)?.name} · {countryName(a.country_code)} · inscrit le {when(a.created_at)}</p>
        </div>
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
    </section>
  );
}

export const dynamic = "force-dynamic";

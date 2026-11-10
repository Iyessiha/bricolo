import type { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { submitReview } from "./actions";

export const metadata: Metadata = { title: "Donner mon avis", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STARS = [["5", "Excellent"], ["4", "Très bien"], ["3", "Correct"], ["2", "Décevant"], ["1", "Mauvais"]] as const;

export default async function Avis({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const sp = await searchParams;
  const db = supabaseAdmin();
  const { data: link } = /^[0-9a-f]{32}$/.test(token)
    ? await db.from("review_links").select("used_at, expires_at, artisan:artisans(id, name, photo_url, trade:trades(name))").eq("token", token).maybeSingle()
    : { data: null };
  const a = Array.isArray((link as any)?.artisan) ? (link as any).artisan[0] : (link as any)?.artisan;
  const trade = Array.isArray(a?.trade) ? a.trade[0]?.name : a?.trade?.name;

  if (sp.merci) return (
    <section className="inner narrow stack" style={{ textAlign: "center", paddingBlock: 48 }}>
      <p style={{ fontSize: 48 }} aria-hidden="true">🙏</p>
      <h1>Merci pour votre avis !</h1>
      <p className="sub">Il sera publié sur la fiche de {a?.name ?? "l’artisan"} après une courte vérification par notre équipe.</p>
      <Link className="btn" href="/">Retour à Bricolo</Link>
    </section>
  );

  const invalid = !link || !a || link.used_at || new Date(link.expires_at) < new Date();
  if (invalid) return (
    <section className="inner narrow stack" style={{ textAlign: "center", paddingBlock: 48 }}>
      <h1>Ce lien n’est plus valable</h1>
      <p className="sub">{link?.used_at ? "Un avis a déjà été déposé avec ce lien." : "Le lien a expiré ou n’existe pas."} Demandez-en un nouveau à votre artisan.</p>
      <Link className="btn" href="/">Retour à Bricolo</Link>
    </section>
  );

  return (
    <section className="inner narrow stack" style={{ paddingBlock: 32 }}>
      <h1>Votre avis sur {a.name}</h1>
      <p className="sub">{trade ? `${trade} · ` : ""}Votre avis aide les prochains clients à choisir. Il prend 30 secondes.</p>
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur === "lien" ? "Ce lien n’est plus valable." : sp.erreur === "champs" ? "Indiquez votre prénom et choisissez une note." : "L’avis n’a pas pu être envoyé. Réessayez."}</p>}
      <form action={submitReview.bind(null, token)} className="card pad stack">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
        <div className="fld"><span className="lbl" id="note-l">Votre note</span>
          <div className="chips" role="radiogroup" aria-labelledby="note-l">
            {STARS.map(([v, l]) => <label key={v} className="chip"><input type="radio" name="rating" value={v} required />{"★".repeat(+v)} {l}</label>)}
          </div></div>
        <div className="fld"><label htmlFor="name">Votre prénom</label><input id="name" name="name" required minLength={2} maxLength={60} autoComplete="given-name" /><span className="hint">Il sera affiché avec votre avis.</span></div>
        <div className="fld"><label htmlFor="comment">Votre commentaire <span className="hint">(facultatif)</span></label><textarea id="comment" name="comment" rows={4} maxLength={600} placeholder="Ex. : ponctuel, travail propre, prix respecté." /></div>
        <button className="btn primary" type="submit">Envoyer mon avis</button>
        <p className="hint">Soyez honnête et respectueux. Les avis injurieux ou faux ne sont pas publiés.</p>
      </form>
    </section>
  );
}

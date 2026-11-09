import { priceText } from "@/lib/format";
import { DAYS, cleanHours, openStatus, timeLabel } from "@/lib/hours";
import { notFound } from "next/navigation";
import Link from "next/link";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { initials } from "@/lib/format";
import Flag from "@/components/Flag";
import { countryName } from "@/lib/countries";
import SetupNotice from "@/components/SetupNotice";
import { sendRequest } from "./actions";

export default async function ArtisanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await supabaseServer();
  const { data: a } = await db.from("artisans")
    .select("id, name, account_type, company_name, description, price_label, photo_url, experience_years, hours, open_24_7, takes_urgent, diploma_verified, diploma_title, verified, avg_rating, review_count, country_code, status, trade:trades(id, name), zones:artisan_zones(zone:zones(id, name))")
    .eq("id", id).maybeSingle();
  if (!a || a.status !== "approved") notFound();

  const { data: reviews } = await db.from("reviews").select("id, author_name, rating, comment").eq("artisan_id", id).eq("status", "published").order("created_at", { ascending: false }).limit(10);
  try { await supabaseAdmin().from("events").insert({ artisan_id: id, type: "view" }); } catch { /* statistiques non bloquantes */ }

  const zones = ((a as any).zones ?? []).map((z: any) => z.zone).filter(Boolean) as { id: string; name: string }[];
  const trade = (a as any).trade as { id: string; name: string };
  const action = sendRequest.bind(null, id);

  const hrs = cleanHours((a as any).hours);
  const st = openStatus((a as any).hours, (a as any).open_24_7, a.country_code);
  const price = priceText(a.price_label);
  const rating = a.review_count ? String(a.avg_rating).replace(".", ",") : null;
  const whoLine = a.account_type === "entreprise" && a.company_name && a.company_name !== a.name ? a.company_name : null;

  return (
    <section className="inner sec stack has-mbar">
      <p><Link href="/resultats">← Retour aux résultats</Link></p>
      <div className="pgrid">
        <div className="stack">
          <header className="card pfhead">
            <div className="pfphoto">{a.photo_url ? <img src={a.photo_url} alt={`Photo de ${a.name}`} /> : <span aria-hidden="true">{initials(a.name)}</span>}</div>
            <div className="pfid">
              <div className="tags">
                {a.verified && <span className="tag ok">✓ Identité vérifiée</span>}
                {a.diploma_verified && <span className="tag ok">🎓 Diplômé</span>}
                {a.account_type === "entreprise" && <span className="tag mute">Entreprise</span>}
                {(a as any).takes_urgent && <span className="tag boost">🚨 Urgences</span>}
              </div>
              <h1>{a.name}</h1>
              <p className="pftrade">{trade?.name}{whoLine ? ` · ${whoLine}` : ""}</p>
              <p className="meta fl"><Flag code={a.country_code} size={16} />{zones.length ? zones.map((z) => z.name).join(", ") : countryName(a.country_code)}</p>
            </div>
          </header>

          <div className="pfacts">
            <div><span aria-hidden="true">⭐</span><b>{rating ? `${rating}/5` : "Nouveau"}</b><small>{rating ? `${a.review_count} avis` : "pas encore d’avis"}</small></div>
            <div><span aria-hidden="true">🛠</span><b>{a.experience_years ? `${a.experience_years} an${a.experience_years > 1 ? "s" : ""}` : "—"}</b><small>d’expérience</small></div>
            <div><span aria-hidden="true">💶</span><b>{price ?? "Sur devis"}</b><small>tarif indicatif</small></div>
            <div><span aria-hidden="true">🕒</span><b className={st.state === "open" ? "pf-open" : undefined}>{st.state === "none" ? "—" : st.state === "open" ? "Ouvert" : "Fermé"}</b><small>{st.state === "none" ? "horaires non précisés" : st.text.replace(/^(Ouvert|Fermé) · ?/, "") || (st.state === "open" ? "maintenant" : "")}</small></div>
          </div>

          {(a.description || a.diploma_title) && <div className="card pad stack"><h2>À propos</h2>{a.description && <p className="pfabout">{a.description}</p>}{a.diploma_title && <p className="meta">🎓 {a.diploma_title} · diplôme vérifié par Bricolo</p>}</div>}

          {zones.length > 0 && <div className="card pad stack"><h2>Zones d’intervention</h2><div className="chips">{zones.map((z) => <span className="chip" key={z.id}>📍 {z.name}</span>)}</div></div>}

          {(Object.keys(hrs).length > 0 || (a as any).open_24_7) && (
            <div className="card pad stack"><h2>Horaires</h2>
              {(a as any).open_24_7 ? <p>Disponible 24 h/24, 7 j/7.</p> : <table className="hours-tbl wide"><tbody>{DAYS.map(([d, l]) => <tr key={d}><th scope="row">{l}</th><td>{hrs[d] ? `${timeLabel(hrs[d][0])} – ${timeLabel(hrs[d][1])}` : "Fermé"}</td></tr>)}</tbody></table>}
              {(a as any).takes_urgent && <p className="meta">🚨 Prend aussi les urgences en dehors de ces heures.</p>}
            </div>
          )}

          <div className="card pad stack">
            <h2>Avis clients</h2>
            {reviews?.length ? reviews.map((r) => (
              <div key={r.id} className="review"><b>{r.author_name}</b> <span className="meta">· ★ {r.rating}/5</span><p>{r.comment}</p></div>
            )) : <p className="meta">Pas encore d’avis. Soyez le premier à contacter cet artisan.</p>}
          </div>
        </div>
        <aside className="card aside">
          <div className="stack" style={{ gap: 4 }}>
            <p className="lbl">Contacter {a.name.split(" ")[0]}</p>
            {st.state === "open" && <p className="acard-open open"><i aria-hidden="true" />{st.text}</p>}
          </div>
          <a className="btn wa dcall" href={`/api/contact?id=${id}&type=whatsapp`}>💬 Écrire sur WhatsApp</a>
          <a className="btn dcall" href={`/api/contact?id=${id}&type=call`}>📞 Appeler</a>
          <details open={!!sp.erreur}>
            <summary className="btn" style={{ listStyle: "none" }}>Envoyer une demande</summary>
            <form action={action} className="stack" style={{ marginTop: 12 }}>
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />
              <div className="fld"><label htmlFor="zone">Commune ou ville</label>
                <select id="zone" name="zone">{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
              <div className="fld"><label htmlFor="description">Votre besoin</label><textarea id="description" name="description" required minLength={5} maxLength={1000} placeholder="Décrivez le problème ou le travail à faire." /></div>
              <label className="row"><input type="checkbox" name="urgent" /> Dépannage urgent</label>
              <div className="fld"><label htmlFor="name">Votre nom</label><input type="text" id="name" name="name" maxLength={80} /></div>
              <div className="fld"><label htmlFor="email">Votre e-mail</label><input type="email" id="email" name="email" required /><span className="hint">L’artisan vous répond par e-mail.</span></div>
              <button className="btn primary" type="submit">Envoyer ma demande</button>
            </form>
          </details>
          {sp.erreur && <p className="notice err" role="alert">{sp.erreur === "doublon" ? "Vous avez déjà contacté cet artisan il y a moins d’une heure." : sp.erreur === "limite" ? "Trop de demandes aujourd’hui. Réessayez demain." : "Vérifiez votre adresse e-mail et votre message."}</p>}
          {sp.envoye === "1" && <p className="notice ok">Demande envoyée. L’artisan vous répondra par e-mail.</p>}
          <p className="hint pftrust">🛡 Identité contrôlée par Bricolo. Ne payez jamais à l’avance sans avoir vu le travail.</p>
        </aside>
      </div>
      <div className="mbar">
        <a className="btn wa" href={`/api/contact?id=${id}&type=whatsapp`}>💬 WhatsApp</a>
        <a className="btn" href={`/api/contact?id=${id}&type=call`}>📞 Appeler</a>
      </div>
    </section>
  );
}

export const dynamic = "force-dynamic";

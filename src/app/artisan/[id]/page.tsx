import { notFound } from "next/navigation";
import Link from "next/link";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { initials } from "@/lib/format";
import SetupNotice from "@/components/SetupNotice";
import { sendRequest } from "./actions";

export default async function ArtisanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await supabaseServer();
  const { data: a } = await db.from("artisans")
    .select("id, name, account_type, company_name, description, price_label, verified, avg_rating, review_count, country_code, status, trade:trades(id, name), zones:artisan_zones(zone:zones(id, name))")
    .eq("id", id).maybeSingle();
  if (!a || a.status !== "approved") notFound();

  const { data: reviews } = await db.from("reviews").select("id, author_name, rating, comment").eq("artisan_id", id).eq("status", "published").order("created_at", { ascending: false }).limit(10);
  try { await supabaseAdmin().from("events").insert({ artisan_id: id, type: "view" }); } catch { /* statistiques non bloquantes */ }

  const zones = ((a as any).zones ?? []).map((z: any) => z.zone).filter(Boolean) as { id: string; name: string }[];
  const trade = (a as any).trade as { id: string; name: string };
  const action = sendRequest.bind(null, id);

  return (
    <section className="inner sec stack">
      <p><Link href="/resultats">← Retour aux résultats</Link></p>
      <div className="pgrid">
        <div className="stack">
          <div className="card pad row" style={{ gap: 20 }}>
            <div className="avatar" style={{ width: 80, height: 80, fontSize: 28 }} aria-hidden="true">{initials(a.name)}</div>
            <div className="stack" style={{ gap: 8 }}>
              <div className="tags">{a.account_type === "entreprise" && <span className="tag mute">Entreprise</span>}{a.verified ? <span className="tag ok">✓ Vérifié</span> : <span className="tag mute">Non vérifié</span>}</div>
              <h1 style={{ fontSize: "clamp(26px,4.5vw,36px)" }}>{a.name}</h1>
              <p className="meta">{a.account_type === "entreprise" && a.company_name && a.company_name !== a.name ? `${a.company_name} · ` : ""}{trade?.name} · {zones.map((z) => z.name).join(", ")}</p>
              <p>{a.review_count ? <b className="num">★ {String(a.avg_rating).replace(".", ",")} ({a.review_count} avis)</b> : <span className="tag mute">Nouveau</span>}</p>
            </div>
          </div>
          {a.description && <div className="card pad stack"><h2>À propos</h2><p>{a.description}</p></div>}
          <div className="card pad stack">
            <h2>Avis clients</h2>
            {reviews?.length ? reviews.map((r) => (
              <div key={r.id}><b>{r.author_name}</b> <span className="meta">· {r.rating}/5</span><p>{r.comment}</p></div>
            )) : <p className="meta">Pas encore d’avis.</p>}
          </div>
        </div>
        <aside className="card aside">
          <div><p className="lbl">Tarif indicatif</p><p className="price">{a.price_label ?? "Sur devis"}</p></div>
          <a className="btn primary" href={`/api/contact?id=${id}&type=call`}>Appeler</a>
          <a className="btn" href={`/api/contact?id=${id}&type=whatsapp`}>WhatsApp</a>
          <details open={sp.envoye !== "1"}>
            <summary className="btn" style={{ listStyle: "none" }}>Envoyer une demande</summary>
            <form action={action} className="stack" style={{ marginTop: 12 }}>
              <div className="fld"><label htmlFor="zone">Commune ou ville</label>
                <select id="zone" name="zone">{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
              <div className="fld"><label htmlFor="description">Votre besoin</label><textarea id="description" name="description" required minLength={5} maxLength={1000} placeholder="Décrivez le problème ou le travail à faire." /></div>
              <label className="row"><input type="checkbox" name="urgent" /> Dépannage urgent</label>
              <div className="fld"><label htmlFor="name">Votre nom</label><input type="text" id="name" name="name" maxLength={80} /></div>
              <div className="fld"><label htmlFor="email">Votre e-mail</label><input type="email" id="email" name="email" required /><span className="hint">L’artisan vous répond par e-mail.</span></div>
              <button className="btn primary" type="submit">Envoyer ma demande</button>
            </form>
          </details>
          {sp.envoye === "1" && <p className="notice ok">Demande envoyée. L’artisan vous répondra par e-mail.</p>}
        </aside>
      </div>
    </section>
  );
}

export const dynamic = "force-dynamic";

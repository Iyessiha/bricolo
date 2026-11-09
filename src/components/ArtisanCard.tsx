import Link from "next/link";
import { initials, priceText } from "@/lib/format";

export type ArtisanRow = {
  id: string; name: string; description?: string | null; price_label?: string | null; verified: boolean;
  avg_rating: number | null; review_count: number; sponsored?: boolean; zones?: string[]; trade?: string;
  photo_url?: string | null; experience_years?: number | null; diploma_verified?: boolean;
};

/** Fiche compacte : photo en haut, l'essentiel en dessous, contact en un geste. Toute la fiche ouvre le profil. */
export default function ArtisanCard({ a }: { a: ArtisanRow }) {
  const zones = a.zones?.length ? a.zones.slice(0, 2).join(", ") + (a.zones.length > 2 ? ` +${a.zones.length - 2}` : "") : "";
  return (
    <article className={`acard${a.sponsored ? " sp" : ""}`}>
      <div className="acard-media">
        {a.photo_url ? <img src={a.photo_url} alt="" loading="lazy" /> : <span aria-hidden="true">{initials(a.name)}</span>}
        {a.sponsored && <span className="acard-flag">Sponsorisé</span>}
        <div className="acard-badges">
          {a.verified && <span className="tag ok">✓ Vérifié</span>}
          {a.diploma_verified && <span className="tag ok">🎓 Diplômé</span>}
        </div>
      </div>
      <div className="acard-body">
        <h3><Link href={`/artisan/${a.id}`}>{a.name}</Link></h3>
        <p className="acard-trade">{a.trade}</p>
        {zones && <p className="acard-meta" title={a.zones?.join(", ")}>📍 {zones}</p>}
        <p className="acard-meta">
          {a.review_count ? <><b className="num">★ {String(a.avg_rating).replace(".", ",")}</b> ({a.review_count})</> : <span className="tag mute">Nouveau</span>}
          {a.experience_years ? <span> · {a.experience_years} an{a.experience_years > 1 ? "s" : ""}</span> : null}
        </p>
        {priceText(a.price_label) && <p className="acard-price">{priceText(a.price_label)}</p>}
      </div>
      <div className="acard-cta">
        <a className="btn wa" href={`/api/contact?id=${a.id}&type=whatsapp`}>WhatsApp</a>
        <a className="btn call" href={`/api/contact?id=${a.id}&type=call`} aria-label={`Appeler ${a.name}`}>📞</a>
      </div>
    </article>
  );
}

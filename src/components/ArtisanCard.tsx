import Link from "next/link";
import { initials, priceText } from "@/lib/format";
import { openStatus } from "@/lib/hours";

export type ArtisanRow = {
  id: string; name: string; description?: string | null; price_label?: string | null; verified: boolean;
  avg_rating: number | null; review_count: number; sponsored?: boolean; zones?: string[]; trade?: string;
  photo_url?: string | null; experience_years?: number | null; diploma_verified?: boolean;
  hours?: unknown; headline?: string | null; is_pro?: boolean; cover_url?: string | null; open_24_7?: boolean | null; takes_urgent?: boolean | null; country_code?: string;
};

/** Fiche compacte : photo en haut, l'essentiel en dessous, contact en un geste. Toute la fiche ouvre le profil. */
export default function ArtisanCard({ a, country }: { a: ArtisanRow; country?: string }) {
  const st = openStatus(a.hours, a.open_24_7, country ?? a.country_code ?? "ci");
  const zones = a.zones?.length ? a.zones.slice(0, 2).join(", ") + (a.zones.length > 2 ? ` +${a.zones.length - 2}` : "") : "";
  return (
    <article className={`acard${a.sponsored ? " sp" : ""}`}>
      <div className={`acard-media${a.cover_url ? " cov" : ""}`}>
        {a.cover_url ? <img src={a.cover_url} alt="" loading="lazy" /> : a.photo_url ? <img src={a.photo_url} alt="" loading="lazy" /> : <span aria-hidden="true">{initials(a.name)}</span>}
        {a.cover_url && <span className="acard-av">{a.photo_url ? <img src={a.photo_url} alt="" loading="lazy" /> : initials(a.name)}</span>}
        {a.sponsored && !a.cover_url && <span className="acard-flag">Sponsorisé</span>}
        <div className="acard-badges">
          {a.sponsored && a.cover_url && <span className="tag boost">Sponsorisé</span>}
          {a.is_pro && <span className="tag boost">Pro</span>}
          {a.verified && <span className="tag ok">✓ Vérifié</span>}
          {a.diploma_verified && <span className="tag ok">🎓 Diplômé</span>}
        </div>
      </div>
      <div className="acard-body">
        <h3><Link href={`/artisan/${a.id}`}>{a.name}</Link></h3>
        <p className="acard-trade">{a.trade}</p>
        {a.headline && <p className="acard-hl">{a.headline}</p>}
        {zones && <p className="acard-meta" title={a.zones?.join(", ")}>📍 {zones}</p>}
        <p className="acard-meta">
          {a.review_count ? <><b className="num">★ {String(a.avg_rating).replace(".", ",")}</b> ({a.review_count})</> : <span className="tag mute">Nouveau</span>}
          {a.experience_years ? <span> · {a.experience_years} an{a.experience_years > 1 ? "s" : ""}</span> : null}
        </p>
        {st.state !== "none" && <p className={`acard-open ${st.state}`}><i aria-hidden="true" />{st.text}</p>}
        {a.takes_urgent && <p className="acard-meta">🚨 Prend les urgences</p>}
        {priceText(a.price_label) && <p className="acard-price">{priceText(a.price_label)}</p>}
      </div>
      <div className="acard-cta">
        <a className="btn wa" href={`/api/contact?id=${a.id}&type=whatsapp`}>WhatsApp</a>
        <a className="btn call" href={`/api/contact?id=${a.id}&type=call`} aria-label={`Appeler ${a.name}`}>📞</a>
        <a className="btn msg" href={`/artisan/${a.id}?message=1#message`} aria-label={`Envoyer un message à ${a.name}`} title="Message">✉️</a>
      </div>
    </article>
  );
}

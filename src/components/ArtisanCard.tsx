import Link from "next/link";
import { initials, priceText } from "@/lib/format";
import { openStatus } from "@/lib/hours";
import TradeIcon from "@/components/TradeIcon";

export type ArtisanRow = {
  id: string; name: string; description?: string | null; price_label?: string | null; verified: boolean;
  avg_rating: number | null; review_count: number; sponsored?: boolean; zones?: string[]; trade?: string;
  photo_url?: string | null; experience_years?: number | null; diploma_verified?: boolean;
  hours?: unknown; headline?: string | null; is_pro?: boolean; cover_url?: string | null; open_24_7?: boolean | null; takes_urgent?: boolean | null; country_code?: string; trade_slug?: string; default_cover?: string | null;
};

/** Fiche compacte : photo en haut, l'essentiel en dessous, contact en un geste. Toute la fiche ouvre le profil. */
/** Pourquoi cet artisan est en tête : transparence sur la mise en avant, accessible au clavier et au toucher. */
function Why() {
  return (
    // Le texte complet est lu par les lecteurs d'écran (le visuel n'est qu'une infobulle au survol ou au focus).
    <span className="why" tabIndex={0} role="img" aria-label="Pourquoi cet artisan est mis en avant ? Cet artisan a choisi de se mettre en avant. Son identité est vérifiée par Bricolo.">
      <i aria-hidden="true">i</i>
      <span aria-hidden="true">Cet artisan a choisi de se mettre en avant. Son identité est vérifiée par Bricolo.</span>
    </span>
  );
}

export default function ArtisanCard({ a, country, lite }: { a: ArtisanRow; country?: string; lite?: boolean }) {
  const st = openStatus(a.hours, a.open_24_7, country ?? a.country_code ?? "ci");
  const zones = a.zones?.length ? a.zones.slice(0, 2).join(", ") + (a.zones.length > 2 ? ` +${a.zones.length - 2}` : "") : "";
  const cover = a.cover_url ?? a.default_cover ?? null;
  return (
    <article className={`acard${a.sponsored ? " sp" : ""}${lite ? " lite" : ""}`}>
      {/* Couverture : celle de l'artisan, sinon la photo du métier (téléversée par l'administration), sinon une illustration SVG du métier. */}
      <div className={`acard-media${cover ? " cov" : ""}`}>
        {cover ? <img src={cover} alt="" loading="lazy" /> : a.photo_url ? <img src={a.photo_url} alt="" loading="lazy" /> : a.trade_slug ? <span className="acard-art" aria-hidden="true"><TradeIcon slug={a.trade_slug} /></span> : <span aria-hidden="true">{initials(a.name)}</span>}
        {cover && <span className="acard-av">{a.photo_url ? <img src={a.photo_url} alt="" loading="lazy" /> : initials(a.name)}</span>}
        {a.sponsored && <span className="acard-flag">⭐ Mis en avant<Why /></span>}
        <div className="acard-badges">
          {a.verified && <span className="tag ok">✓ Vérifié</span>}
          {a.diploma_verified && <span className="tag ok" title="Diplôme vérifié">🎓<span className="dtx"> Diplômé</span></span>}
        </div>
      </div>
      <div className="acard-body">
        <h3><Link href={`/artisan/${a.id}`}>{a.name}</Link></h3>
        <p className="acard-trade">{a.trade}</p>
        {a.headline && !lite && <p className="acard-hl">{a.headline}</p>}
        {zones && <p className="acard-meta" title={a.zones?.join(", ")}>📍 {zones}</p>}
        <p className="acard-meta">
          {a.review_count ? <><b className="num">★ {String(a.avg_rating).replace(".", ",")}</b> ({a.review_count})</> : lite ? null : <span className="tag mute">Nouveau</span>}
          {a.experience_years ? <span> · {a.experience_years} an{a.experience_years > 1 ? "s" : ""}</span> : null}
        </p>
        {st.state !== "none" && <p className={`acard-open ${st.state}`}><i aria-hidden="true" />{st.text}</p>}
        {a.takes_urgent && <p className="acard-meta">🚨 Prend les urgences</p>}
        {!lite && priceText(a.price_label) && <p className="acard-price">{priceText(a.price_label)}</p>}
      </div>
      <div className="acard-cta">
        <a className="btn wa" href={`/api/contact?id=${a.id}&type=whatsapp`}>WhatsApp</a>
        <a className="btn call" href={`/api/contact?id=${a.id}&type=call`} aria-label={`Appeler ${a.name}`}>📞</a>
        {!lite && <a className="btn msg" href={`/artisan/${a.id}?message=1#message`} aria-label={`Envoyer un message à ${a.name}`} title="Message">✉️</a>}
      </div>
    </article>
  );
}

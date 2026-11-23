import Link from "next/link";
import { initials, priceText } from "@/lib/format";
import { openStatus } from "@/lib/hours";
import { defaultCoverUrl, isGeneratedCover } from "@/lib/default-covers";
import TradeIcon from "@/components/TradeIcon";

export type ArtisanRow = {
  id: string; name: string; description?: string | null; price_label?: string | null; verified: boolean;
  avg_rating: number | null; review_count: number; sponsored?: boolean; zones?: string[]; trade?: string;
  photo_url?: string | null; experience_years?: number | null; diploma_verified?: boolean;
  hours?: unknown; headline?: string | null; is_pro?: boolean; cover_url?: string | null; open_24_7?: boolean | null; takes_urgent?: boolean | null; country_code?: string; trade_slug?: string;
};

/** Fiche compacte : photo en haut, l'essentiel en dessous, contact en un geste. Toute la fiche ouvre le profil. */
/** Pourquoi cet artisan est en tête : transparence sur la mise en avant, accessible au clavier et au toucher. */
function Why() {
  return (
    <span className="why" tabIndex={0} role="button" aria-label="Pourquoi cet artisan est mis en avant ?">
      <i aria-hidden="true">i</i>
      <span role="tooltip">Cet artisan a choisi de se mettre en avant. Son identité est vérifiée par Bricolo.</span>
    </span>
  );
}

export default function ArtisanCard({ a, country, lite }: { a: ArtisanRow; country?: string; lite?: boolean }) {
  const st = openStatus(a.hours, a.open_24_7, country ?? a.country_code ?? "ci");
  const zones = a.zones?.length ? a.zones.slice(0, 2).join(", ") + (a.zones.length > 2 ? ` +${a.zones.length - 2}` : "") : "";
  if (lite) {
    const place = a.zones?.[0] ?? "";
    const own = a.cover_url && !isGeneratedCover(a.cover_url) ? a.cover_url : null;
    const dflt = own ? null : defaultCoverUrl(a.trade_slug);
    const img = own ?? dflt;
    return (
      <article className={`acard lite${a.sponsored ? " sp" : ""}`}>
        <div className="lc-cover">
          {img ? <img src={img} alt="" loading="lazy" /> : <span className="lc-ico" aria-hidden="true"><TradeIcon slug={a.trade_slug ?? "tous"} /></span>}
          {dflt && <span className="lc-ill">Photo illustrative</span>}
          {a.sponsored && <span className="acard-flag">⭐ Mis en avant<Why /></span>}
        </div>
        <div className="lc-head">
          <span className="lc-av">{a.photo_url ? <img src={a.photo_url} alt="" loading="lazy" /> : initials(a.name)}</span>
          <div className="lc-id">
            <h3><Link href={`/artisan/${a.id}`}>{a.name}</Link>{a.verified && <svg className="lc-check" viewBox="0 0 24 24" aria-label="Identité vérifiée" role="img"><circle cx="12" cy="12" r="11" fill="currentColor" /><path d="M7 12.5l3.4 3.4L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}</h3>
            <p className="lc-sub">{a.trade}{place ? <> · {place}</> : null}</p>
          </div>
        </div>
        <ul className="lc-chips">
          {a.diploma_verified && <li>🎓 Diplômé</li>}
          {a.experience_years ? <li>{a.experience_years} an{a.experience_years > 1 ? "s" : ""} d’expérience</li> : null}
          {a.takes_urgent && <li className="u">🚨 Urgences</li>}
          {a.review_count ? <li>★ {String(a.avg_rating).replace(".", ",")} ({a.review_count})</li> : null}
        </ul>
        {st.state !== "none" ? <p className={`acard-open lc-open ${st.state}`}><i aria-hidden="true" />{st.text}</p> : <span className="lc-open" />}
        <div className="acard-cta">
          <a className="btn wa" href={`/api/contact?id=${a.id}&type=whatsapp`}>WhatsApp</a>
          <a className="btn call" href={`/api/contact?id=${a.id}&type=call`} aria-label={`Appeler ${a.name}`}>📞</a>
        </div>
      </article>
    );
  }
  return (
    <article className={`acard${a.sponsored ? " sp" : ""}${lite ? " lite" : ""}`}>
      <div className={`acard-media${a.cover_url ? " cov" : ""}`}>
        {a.cover_url ? <img src={a.cover_url} alt="" loading="lazy" /> : a.photo_url ? <img src={a.photo_url} alt="" loading="lazy" /> : <span aria-hidden="true">{initials(a.name)}</span>}
        {a.cover_url && <span className="acard-av">{a.photo_url ? <img src={a.photo_url} alt="" loading="lazy" /> : initials(a.name)}</span>}
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

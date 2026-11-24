import Link from "next/link";
import TradeIcon from "./TradeIcon";

type T = { slug: string; plural: string };

/** Bande de métiers qui défile en continu (CSS seul, sans JavaScript) : chaque artisan peut s'y reconnaître. Se met en pause au toucher, et ne bouge pas si l'appareil demande moins d'animations. */
export default function TradeMarquee({ trades, country }: { trades: T[]; country: string }) {
  if (!trades.length) return null;
  const set = (hidden: boolean) => (
    <ul className="tmq-set" aria-hidden={hidden || undefined}>
      {trades.map((t) => (
        <li key={t.slug}><Link className="tmq-chip" href={`/artisans/${country}/${t.slug}`} tabIndex={hidden ? -1 : undefined}><i aria-hidden="true"><TradeIcon slug={t.slug} /></i>{t.plural}</Link></li>
      ))}
    </ul>
  );
  return (
    <nav className="tmq" aria-label="Métiers disponibles sur Bricolo">
      {/* Pause explicite (WCAG 2.2.2) : case cochée + CSS, comme les filtres mobiles. */}
      <input type="checkbox" id="tmq-pause" className="tmq-ftog" aria-hidden="true" tabIndex={-1} />
      <label htmlFor="tmq-pause" className="tmq-btn">
        <span className="tmq-on">Mettre en pause</span>
        <span className="tmq-off">Reprendre le défilement</span>
      </label>
      <div className="tmq-track">{set(false)}{set(true)}</div>
    </nav>
  );
}

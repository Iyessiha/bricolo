import Link from "next/link";
import { initials } from "@/lib/format";

export type ArtisanRow = {
  id: string; name: string; description?: string | null; price_label?: string | null; verified: boolean;
  avg_rating: number | null; review_count: number; sponsored?: boolean; zones?: string[]; trade?: string;
};

export default function ArtisanCard({ a }: { a: ArtisanRow }) {
  return (
    <article className={`card result${a.sponsored ? " sponsored" : ""}`}>
      <div className="avatar" aria-hidden="true">{initials(a.name)}</div>
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <div className="tags">
          {a.sponsored && <span className="tag boost">Sponsorisé</span>}
          {a.verified && <span className="tag ok">✓ Vérifié</span>}
        </div>
        <h3><Link href={`/artisan/${a.id}`}>{a.name}</Link></h3>
        <p className="meta">{[a.trade, a.zones?.join(", ")].filter(Boolean).join(" · ")}</p>
        <p className="meta">
          {a.review_count ? <><b className="num">★ {String(a.avg_rating).replace(".", ",")}</b> ({a.review_count} avis)</> : <span className="tag mute">Nouveau</span>}
          {a.price_label ? ` · ${a.price_label}` : ""}
        </p>
      </div>
      <div className="row">
        <a className="btn" href={`/api/contact?id=${a.id}&type=call`}>Appeler</a>
        <a className="btn" href={`/api/contact?id=${a.id}&type=whatsapp`}>WhatsApp</a>
      </div>
    </article>
  );
}

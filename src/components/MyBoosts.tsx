import { BOOST_TYPES } from "@/lib/format";

export type ActiveBoost = { id: string; type: string; ends_at: string; zone: string | null };
const left = (iso: string) => { const h = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 36e5)); return h >= 48 ? `${Math.ceil(h / 24)} jours` : `${h} h`; };

/** Boosts en cours de l'artisan : quoi, où, et combien de temps il reste. */
export default function MyBoosts({ rows }: { rows: ActiveBoost[] }) {
  return (
    <div className="card pad stack">
      <h2 style={{ fontSize: 18 }}>Mes boosts en cours</h2>
      {rows.length === 0 ? <p className="empty">Aucun boost actif pour le moment. Choisissez-en un ci-dessous : il s’active dès la confirmation du paiement.</p> : rows.map((b) => (
        <div key={b.id} className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span><b>{BOOST_TYPES[b.type]?.name ?? b.type}</b>{b.zone ? <> · {b.zone}</> : null}<br /><span className="meta">Jusqu’au {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(b.ends_at))}</span></span>
          <span className="tag ok">reste {left(b.ends_at)}</span>
        </div>
      ))}
    </div>
  );
}

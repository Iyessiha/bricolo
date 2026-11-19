import { BOOST_TYPES, timeLeft } from "@/lib/format";
import type { BoostResult, Counts } from "@/lib/boost-stats";

const fmt = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso));
const span = (h: number) => (h >= 48 ? `${Math.round(h / 24)} jours` : `${h} h`);

function Row({ label, a, b }: { label: string; a: number; b: number }) {
  return <tr><td>{label}</td><td className="num">{b}</td><td className="num"><b>{a}</b></td></tr>;
}
function Table({ r }: { r: BoostResult }) {
  const d: Counts = r.during, b: Counts = r.before;
  return (
    <table className="tbl bres-t">
      <thead><tr><th></th><th className="num">Avant</th><th className="num">Pendant</th></tr></thead>
      <tbody><Row label="Vues de la fiche" a={d.vues} b={b.vues} /><Row label="Appels" a={d.appels} b={b.appels} /><Row label="WhatsApp" a={d.wa} b={b.wa} /></tbody>
    </table>
  );
}

/** Ce que les boosts de l'artisan lui ont rapporté : avant / pendant, sur des périodes de même durée. Aucun chiffre inventé. */
export default function BoostResults({ results }: { results: BoostResult[] }) {
  if (!results.length) return (
    <div className="card pad stack bres">
      <h2 style={{ fontSize: 18 }}>Résultats de mes boosts</h2>
      <p className="empty">Vous n’avez pas encore de boost. Après votre premier boost, vous verrez ici combien de vues, d’appels et de messages WhatsApp il vous a apportés, comparés à la période d’avant.</p>
    </div>
  );
  return (
    <div className="card pad stack bres">
      <h2 style={{ fontSize: 18 }}>Résultats de mes boosts</h2>
      <p className="meta">Pour chaque boost : l’activité de votre fiche pendant le boost, comparée à une période de même durée juste avant. C’est une indication : la saison et la demande jouent aussi.</p>
      <div className="bres-l">
        {results.map((r) => (
          <article key={r.id} className={`bres-i${r.active ? " live" : ""}`}>
            <header>
              <b>{BOOST_TYPES[r.type]?.name ?? "Boost"}{r.zoneName ? ` · ${r.zoneName}` : ""}</b>
              <span className={`tag ${r.active ? "boost" : "mute"}`}>{r.active ? `En cours · reste ${timeLeft(r.endsAt)}` : "Terminé"}</span>
            </header>
            <p className="meta">{span(r.hours)} · du {fmt(r.startsAt)} au {fmt(r.endsAt)}</p>
            <Table r={r} />
            <p className={`bres-lift${r.lift === null ? "" : r.lift >= 0 ? " up" : " down"}`}>
              {r.lift === null ? "Pas encore assez de données pour comparer." : `Appels et WhatsApp : ${r.lift >= 0 ? "+" : ""}${r.lift} % par rapport à avant.`}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { fcfa } from "@/lib/format";
import type { PaymentRow } from "@/lib/receipts";

const when = (iso: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso));
const TAG = { paid: ["ok", "Payé"], pending: ["wait", "En attente de confirmation"], failed: ["err", "Non abouti"] } as const;

function Line({ r }: { r: PaymentRow }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
      <span><b>{r.label}</b><br /><span className="meta">{when(r.at)} · {fcfa(r.amount)}</span></span>
      <span className="row" style={{ gap: 8 }}>
        <span className={`tag ${TAG[r.status][0]}`}>{TAG[r.status][1]}</span>
        {r.status === "paid" && <Link className="btn small ghost" href={`/recu/${r.id}`}>Reçu</Link>}
      </span>
    </div>
  );
}

/** Historique des paiements, séparé par nature : « forfait » (Forfait Pro) ou « boost ». Les paiements confirmés et en attente d'abord ; les tentatives non abouties sont repliées. */
export default function MyPayments({ rows, kind, title }: { rows: PaymentRow[]; kind: "forfait" | "boost"; title?: string }) {
  const mine = rows.filter((r) => r.kind === kind);
  const main = mine.filter((r) => r.status !== "failed"), failed = mine.filter((r) => r.status === "failed");
  return (
    <div className="card pad stack">
      <h2 style={{ fontSize: 18 }}>{title ?? (kind === "boost" ? "Paiements de mes boosts" : "Paiements de mon forfait")}</h2>
      {main.length === 0 ? <p className="empty">{kind === "boost" ? "Aucun paiement de boost confirmé pour le moment." : "Aucun paiement de forfait confirmé pour le moment."}</p> : main.map((r) => <Line key={r.id} r={r} />)}
      {main.some((r) => r.status === "pending") && <p className="hint">« En attente » : le paiement n’est pas encore confirmé par GeniusPay. S’il a bien été débité et que rien ne change au bout de quelques minutes, écrivez-nous depuis « Aide et compte » avec l’heure du paiement.</p>}
      {failed.length > 0 && (
        <details className="meta"><summary>{failed.length} tentative{failed.length > 1 ? "s" : ""} non abouti{failed.length > 1 ? "es" : "e"} (aucun débit)</summary>
          <div className="stack" style={{ marginTop: 8 }}>{failed.map((r) => <Line key={r.id} r={r} />)}</div></details>
      )}
    </div>
  );
}

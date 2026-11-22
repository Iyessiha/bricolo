import Link from "next/link";
import { fcfa } from "@/lib/format";
import type { PaymentRow } from "@/lib/receipts";

const when = (iso: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso));
const TAG = { paid: ["ok", "Payé"], pending: ["wait", "En attente de confirmation"], failed: ["err", "Non abouti"] } as const;

/** Historique de tous les paiements de l'artisan, avec l'état réel de chacun et le reçu pour ceux qui sont confirmés. */
export default function MyPayments({ rows }: { rows: PaymentRow[] }) {
  return (
    <div className="card pad stack">
      <h2 style={{ fontSize: 18 }}>Mes paiements</h2>
      {rows.length === 0 ? <p className="empty">Aucun paiement pour le moment. Vos boosts et votre Forfait Pro apparaîtront ici.</p> : rows.map((r) => (
        <div key={r.id} className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span><b>{r.label}</b><br /><span className="meta">{when(r.at)} · {fcfa(r.amount)}</span></span>
          <span className="row" style={{ gap: 8 }}>
            <span className={`tag ${TAG[r.status][0]}`}>{TAG[r.status][1]}</span>
            {r.status === "paid" && <Link className="btn small ghost" href={`/recu/${r.id}`}>Reçu</Link>}
          </span>
        </div>
      ))}
      {rows.some((r) => r.status === "pending") && <p className="hint">« En attente » : le paiement n’est pas encore confirmé par GeniusPay. S’il a bien été débité et que rien ne change au bout de quelques minutes, écrivez-nous depuis « Contacter Bricolo » avec l’heure du paiement.</p>}
    </div>
  );
}

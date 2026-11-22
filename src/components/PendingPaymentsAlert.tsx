import Link from "next/link";
import type { AdminCtx } from "@/lib/admin";

/** Alerte admin : des paiements « en attente » depuis plus de 15 minutes sont probablement payés sans que la confirmation soit arrivée. */
export default async function PendingPaymentsAlert({ db }: { db: AdminCtx["db"] }) {
  const since = new Date(Date.now() - 15 * 6e4).toISOString();
  const { data } = await db.from("payments").select("id, amount").eq("status", "pending").lt("created_at", since).gt("created_at", new Date(Date.now() - 864e5).toISOString()).order("created_at", { ascending: false }).limit(20);
  if (!data?.length) return null;
  return (
    <p className="notice err" role="alert">
      <b>{data.length} paiement{data.length > 1 ? "s" : ""} en attente depuis plus de 15 minutes.</b> Si le client a bien payé, la confirmation de GeniusPay n’est pas arrivée : vérifiez chez GeniusPay, puis confirmez-le à la main.{" "}
      <Link href={`/admin/revenus/${data[0].id}`}>Ouvrir le plus récent →</Link>
    </p>
  );
}

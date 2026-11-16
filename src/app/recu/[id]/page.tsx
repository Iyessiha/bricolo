import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getReceipt } from "@/lib/receipts";
import { COMPANY } from "@/lib/company";
import { fcfa } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const metadata: Metadata = { title: "Reçu de paiement", robots: { index: false, follow: false } };

const date = (iso: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso)) + " (UTC)";

export default async function Recu({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect(`/connexion`);
  const { data: me } = await db.from("profiles").select("role").eq("id", user.id).single();
  const r = await getReceipt(id, user.id, me?.role === "admin");
  if (!r) notFound();
  return (
    <section className="inner sec stack receipt" style={{ maxWidth: 640 }}>
      <div className="card pad stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div><h1 style={{ fontSize: 26 }}>Reçu de paiement</h1><p className="meta">N° {r.no}</p></div>
          <div style={{ textAlign: "right" }}><b>{COMPANY.brand}</b><br /><span className="meta">{COMPANY.name}<br />{COMPANY.activityPlace}</span></div>
        </div>
        <table className="hours-tbl wide"><tbody>
          <tr><th scope="row">Payé par</th><td>{r.artisanName}{r.email ? <><br /><span className="meta">{r.email}</span></> : null}</td></tr>
          <tr><th scope="row">Date</th><td>{date(r.paidAt)}</td></tr>
          <tr><th scope="row">Désignation</th><td>{r.label}</td></tr>
          <tr><th scope="row">Montant payé</th><td><b>{r.currency === "XOF" ? fcfa(r.amount) : `${r.amount} ${r.currency}`}</b></td></tr>
          <tr><th scope="row">Moyen de paiement</th><td>Mobile Money, via GeniusPay</td></tr>
          <tr><th scope="row">Référence</th><td className="num">{r.ref}</td></tr>
        </tbody></table>
        <p className="meta">Une question sur ce paiement ? Écrivez-nous depuis « Contacter Bricolo » dans votre espace.</p>
        <div className="noprint"><PrintButton /></div>
      </div>
    </section>
  );
}

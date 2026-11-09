import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { fcfa } from "@/lib/format";
import SetupNotice from "@/components/SetupNotice";

export const metadata: Metadata = { title: "Forfait Pro" };
export const dynamic = "force-dynamic";
const ROWS: [string, string, string][] = [
  ["Prestations sur ma fiche", "1", "jusqu’à 10"], ["Photos de réalisations", "8", "jusqu’à 20"], ["Couverture en paysage", "✓", "✓"],
  ["Badge « Pro » sur ma fiche et mes cartes", "—", "✓"], ["Visible dans les recherches", "✓", "✓"],
];

export default async function Forfait({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: a } = await db.from("artisans").select("id, country_code, status").eq("user_id", user.id).maybeSingle();
  if (!a || a.status !== "approved") redirect("/tableau-de-bord");
  const [{ data: price }, { data: sub }] = await Promise.all([
    db.from("plan_prices").select("amount").eq("country_code", a.country_code).single(),
    db.from("subscriptions").select("ends_at").eq("artisan_id", a.id).eq("status", "active").gt("ends_at", new Date().toISOString()).order("ends_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const m1 = price?.amount ?? 0, m3 = Math.round((m1 * 3 * 0.9) / 100) * 100;
  const until = sub ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(sub.ends_at)) : null;
  return (
    <section className="inner sec stack" style={{ maxWidth: 760 }}>
      <p><Link href="/tableau-de-bord#profil">← Mon espace</Link></p>
      {sp.paye && <p className="notice ok" role="status">Paiement reçu. Votre Forfait Pro est actif.</p>}
      {sp.erreur && <p className="notice err" role="alert">Le paiement n’a pas pu démarrer. Réessayez dans un instant.</p>}
      <div><p className="eyebrow">Forfait Pro</p><h1 style={{ fontSize: "clamp(28px,5vw,42px)" }}>Montrez tout ce que vous savez faire</h1>
        <p className="meta" style={{ marginTop: 8 }}>Plus de prestations, plus de photos, et le badge Pro qui rassure les clients.</p></div>
      {until && <div className="notice ok"><b>Forfait Pro actif jusqu’au {until}.</b> Vous pouvez le prolonger : la durée s’ajoute à la fin de votre période.</div>}
      <div className="card pad stack"><div className="tw"><table className="tbl"><thead><tr><th></th><th className="num">Gratuit</th><th className="num">Pro</th></tr></thead><tbody>
        {ROWS.map(([l, f, p]) => <tr key={l}><td>{l}</td><td className="num">{f}</td><td className="num"><b>{p}</b></td></tr>)}</tbody></table></div></div>
      {m1 > 0 ? (
        <div className="agrid">
          {[[1, m1, "1 mois"], [3, m3, "3 mois · 10 % de remise"]].map(([m, amount, label]) => (
            <form key={String(m)} method="post" action="/api/forfait/checkout" className="card pad stack">
              <h2 style={{ fontSize: 18 }}>{label}</h2><p style={{ font: "800 30px var(--font-display)" }}>{fcfa(Number(amount))}</p>
              <input type="hidden" name="months" value={String(m)} /><button className="btn boost" type="submit">{until ? "Prolonger" : "Passer Pro"}</button></form>))}
        </div>
      ) : <p className="empty">Le Forfait Pro n’est pas encore disponible dans votre pays.</p>}
      <p className="hint">Paiement sécurisé par Mobile Money ou carte. Sans engagement : le forfait s’arrête à la fin de la période payée. Vos prestations et photos supplémentaires restent enregistrées mais ne sont plus affichées.</p>
    </section>
  );
}

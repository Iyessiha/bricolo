import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usedSlots, capFor } from "@/lib/boost";
import { BOOST_TYPES, DURATIONS, fcfa } from "@/lib/format";
import SetupNotice from "@/components/SetupNotice";

export const metadata: Metadata = { title: "Booster mon profil" };

export default async function Boosts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: a } = await db.from("artisans").select("id, country_code, trade_id, status, zones:artisan_zones(zone:zones(id, name, price_factor))").eq("user_id", user.id).maybeSingle();
  if (!a || a.status !== "approved") redirect("/tableau-de-bord");

  const { data: grid } = await db.from("price_grid").select("boost_type, duration_hours, amount").eq("country_code", a.country_code);
  const zones = ((a as any).zones ?? []).map((z: any) => z.zone).filter(Boolean) as { id: string; name: string; price_factor: number }[];
  const priceOf = (type: string, d: number) => grid?.find((g) => g.boost_type === (type === "cible" ? "recherche" : type) && g.duration_hours === d)?.amount ?? 0;

  // Places restantes dans la première zone de l’artisan (aperçu ; le contrôle final se fait au paiement).
  const admin = supabaseAdmin();
  const z0 = zones[0]?.id ?? null;
  const left: Record<string, number> = {};
  for (const t of ["recherche", "accueil", "urgence"]) {
    left[t] = capFor(t) - (await usedSlots(admin, { type: t, tradeId: a.trade_id, zoneId: z0, country: a.country_code }));
  }

  return (
    <section className="inner sec stack">
      <div><p className="eyebrow">Espace artisan</p><h1 style={{ fontSize: "clamp(26px,4.5vw,38px)" }}>Booster mon profil</h1></div>
      {sp.erreur && <p className="notice err">{sp.erreur === "complet" ? "Complet : toutes les places de cet emplacement sont prises. Choisissez une autre zone ou un autre boost." : "Le paiement n’a pas pu être lancé. Réessayez."}</p>}
      {sp.paye && <p className="notice ok">Paiement confirmé. Votre boost est actif.</p>}
      <form action="/api/boosts/checkout" method="post" className="stack">
        <div className="card pad stack"><h2 style={{ fontSize: 20 }}>1. Type de boost</h2>
          <div className="opts">{Object.entries(BOOST_TYPES).map(([t, v], i) => (
            <label className="opt" key={t}><input type="radio" name="type" value={t} defaultChecked={i === 0} /><b>{v.name}</b><span>{v.text}</span>
              {t !== "cible" && <span className="num">{left[t] > 0 ? `${left[t]} place${left[t] > 1 ? "s" : ""} libre${left[t] > 1 ? "s" : ""}` : "Complet"}</span>}</label>
          ))}</div></div>
        <div className="card pad stack"><h2 style={{ fontSize: 20 }}>2. Durée</h2>
          <div className="opts">{[24, 72, 168].map((d, i) => (
            <label className="opt" key={d}><input type="radio" name="duration" value={d} defaultChecked={i === 1} /><b>{DURATIONS[d]}</b>
              <span className="num">dès {fcfa(priceOf("recherche", d))}</span></label>
          ))}</div></div>
        <div className="card pad stack"><h2 style={{ fontSize: 20 }}>3. Zone</h2>
          <div className="fld"><label htmlFor="zone">Zone du boost</label>
            <select id="zone" name="zone">{zones.map((z) => <option key={z.id} value={z.id}>{z.name}{z.price_factor > 1 ? ` (×${String(z.price_factor).replace(".", ",")})` : ""}</option>)}</select>
            <span className="hint">Le prix final, calculé au paiement, dépend du boost, de la durée et de la zone.</span></div></div>
        <div className="row"><button className="btn boost" type="submit">Payer avec GeniusPay</button><Link className="btn" href="/tableau-de-bord">Retour</Link></div>
      </form>
    </section>
  );
}

export const dynamic = "force-dynamic";

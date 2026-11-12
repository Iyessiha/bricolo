import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usedSlots, capFor, CITY_BOOST_MULT } from "@/lib/boost";
import { BOOST_TYPES, DURATIONS, fcfa } from "@/lib/format";
import SetupNotice from "@/components/SetupNotice";
import BoostPicker from "@/components/BoostPicker";
import ArtisanCard from "@/components/ArtisanCard";
import { countryName } from "@/lib/countries";

export const metadata: Metadata = { title: "Booster mon profil" };

export default async function Boosts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: a } = await db.from("artisans").select("id, name, description, price_label, photo_url, experience_years, diploma_verified, verified, avg_rating, review_count, hours, open_24_7, takes_urgent, country_code, trade_id, status, trade:trades(name), zones:artisan_zones(zone:zones(id, name, price_factor))").eq("user_id", user.id).maybeSingle();
  if (!a || a.status !== "approved") redirect("/tableau-de-bord");

  if (!a.verified) return (
    <section className="inner sec stack boostpage">
      <p><Link href="/tableau-de-bord">← Mon espace</Link></p>
      <div className="notice stack" style={{ gap: 8 }}>
        <b>Les boosts sont réservés aux artisans vérifiés.</b>
        <p>Le client voit votre fiche « Mis en avant » en tête des résultats : il doit pouvoir vous faire confiance. Votre badge « Vérifié » est accordé quand notre équipe a contrôlé votre identité. Dès que c’est fait, vous pouvez booster votre fiche ici.</p>
        <div><Link className="btn" href="/tableau-de-bord">Voir l’état de mon dossier</Link></div>
      </div>
    </section>
  );

  const { data: grid } = await db.from("price_grid").select("boost_type, duration_hours, amount").eq("country_code", a.country_code);
  const zones = ((a as any).zones ?? []).map((z: any) => z.zone).filter(Boolean) as { id: string; name: string; price_factor: number }[];
  const { data: kids } = zones.length ? await db.from("zones").select("parent_id").in("parent_id", zones.map((z) => z.id)) : { data: [] as { parent_id: string | null }[] };
  const cityIds = new Set((kids ?? []).map((k) => k.parent_id));
  const prices: Record<string, Record<number, number>> = { recherche: {}, accueil: {}, urgence: {} };
  for (const g of grid ?? []) if (prices[g.boost_type]) prices[g.boost_type][g.duration_hours] = g.amount;

  const admin = supabaseAdmin();
  const left: Record<string, Record<string, number>> = { recherche: {}, urgence: {}, accueil: {} };
  left.accueil[""] = capFor("accueil") - (await usedSlots(admin, { type: "accueil", tradeId: a.trade_id, zoneId: null, country: a.country_code }));
  for (const z of zones) for (const t of ["recherche", "urgence"]) left[t][z.id] = capFor(t) - (await usedSlots(admin, { type: t, tradeId: a.trade_id, zoneId: z.id, country: a.country_code }));

  // Vrais chiffres : position actuelle dans les résultats, concurrents, activité des 7 derniers jours.
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ data: rows }, { data: ev }, { count: asks }] = await Promise.all([
    db.rpc("search_artisans", { p_country: a.country_code, p_trade: a.trade_id, p_zone: zones[0]?.id ?? null, p_verified: false, p_seed: "0" }),
    admin.from("events").select("type").eq("artisan_id", a.id).gte("created_at", since),
    admin.from("service_requests").select("id", { count: "exact", head: true }).eq("trade_id", a.trade_id).eq("country_code", a.country_code).gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
  ]);
  const list = (rows ?? []) as any[];
  const rank = list.findIndex((r) => r.id === a.id) + 1;
  const ahead = list.slice(0, Math.max(rank - 1, 0)).filter((r) => r.sponsored).length;
  const st = { vues: 0, appels: 0, wa: 0 };
  for (const e of ev ?? []) { if (e.type === "view") st.vues++; else if (e.type === "call") st.appels++; else if (e.type === "whatsapp") st.wa++; }
  const tradeName = (a as any).trade?.name ?? "artisans";
  const zoneName = zones[0]?.name;
  const contacts = st.appels + st.wa;

  const PLANS = [
    { id: "recherche" as const, icon: "🔝", name: "Boost recherche", hook: "Soyez le premier que le client voit.", star: true,
      bullets: ["En tête des résultats de votre métier", "Pastille « Mis en avant » et contour orange", "Rotation équitable avec les autres boostés"] },
    { id: "accueil" as const, icon: "🏠", name: "Boost accueil", hook: "Affichez-vous dès la page d’accueil.",
      bullets: ["Visible de tous les visiteurs du pays", "Section « Artisans à la une »", "Idéal pour se faire connaître"] },
    { id: "urgence" as const, icon: "🚨", name: "Boost urgence", hook: "Recevez les dépannages en premier.",
      bullets: ["En tête des recherches « Dépannage urgent »", "Badge « Urgences » sur votre fiche", "Les clients pressés appellent vite"] },
  ];

  return (
    <section className="inner sec stack boostpage">
      <p><Link href="/tableau-de-bord">← Mon espace</Link></p>
      {sp.erreur && <p className="notice err">{sp.erreur === "complet" ? "Complet : toutes les places de cet emplacement sont prises. Choisissez une autre zone ou un autre boost." : sp.erreur === "badge" ? "Le boost est réservé aux artisans dont l’identité est vérifiée (badge « Vérifié »)." : sp.erreur === "ferme" ? "Le paiement en ligne ouvrira très bientôt. Aucun montant n’a été débité." : "Le paiement n’a pas pu être lancé. Réessayez."}</p>}
      {sp.paye && <p className="notice ok">Paiement confirmé. Votre boost est actif : votre fiche passe devant les autres.</p>}

      <div className="bhero">
        <p className="eyebrow">Boost · {countryName(a.country_code)}</p>
        <h1>Passez devant vos concurrents</h1>
        <p className="lead">{list.length > 1
          ? <>Dans {zoneName ? <b>{zoneName}</b> : "votre zone"}, <b>{list.length} {tradeName.toLowerCase()}s</b> se partagent les clients. {rank > 0 ? <>Vous êtes aujourd’hui en <b>position {rank}</b>{ahead ? `, avec ${ahead} artisan${ahead > 1 ? "s" : ""} boosté${ahead > 1 ? "s" : ""} devant vous` : ""}.</> : null}</>
          : <>Les clients regardent d’abord les premières fiches. Avec un boost, c’est la vôtre qu’ils voient en premier.</>}</p>
        <div className="bstats">
          {rank > 0 && list.length > 1 && <div><b className="num">n°{rank}</b><span>votre place actuelle sur {list.length}</span></div>}
          <div><b className="num">{st.vues}</b><span>vues de votre fiche, 7 jours</span></div>
          <div><b className="num">{contacts}</b><span>appels et WhatsApp, 7 jours</span></div>
          {asks ? <div><b className="num">{asks}</b><span>demandes de clients dans votre métier, 30 jours</span></div> : null}
        </div>
      </div>

      <BoostPicker plans={PLANS} prices={prices} zones={zones.map((z) => ({ id: z.id, name: z.name, factor: Number(z.price_factor), city: cityIds.has(z.id) }))} cityMult={CITY_BOOST_MULT} left={left} caps={{ recherche: capFor("recherche"), accueil: capFor("accueil"), urgence: capFor("urgence") }} />
      <p className="hint bcenter"><Link href="/conditions-boosts">Conditions de vente des boosts</Link> · Emplacements limités pour rester efficaces.</p>

      <div className="card pad bprev">
        <div className="bprev-t"><h2 style={{ fontSize: 18 }}>Voici votre fiche avec un boost</h2><p className="meta">Elle passe en tête, avec la pastille « Mis en avant » et un contour orange qui attire l’œil.</p></div>
        <div className="bprev-c"><ArtisanCard country={a.country_code} a={{ ...(a as any), trade: tradeName, sponsored: true, zones: zones.map((z) => z.name) }} /></div>
      </div>

      <div className="bwhy">
        <div><span aria-hidden="true">👀</span><b>Plus de vues</b><p>Les premières fiches reçoivent l’essentiel des clics.</p></div>
        <div><span aria-hidden="true">📞</span><b>Plus de contacts</b><p>Un client qui voit votre fiche en premier vous appelle ou vous écrit sur WhatsApp.</p></div>
        <div><span aria-hidden="true">💰</span><b>Un seul chantier le rembourse</b><p>Un boost coûte moins cher qu’une journée de travail perdue faute de clients.</p></div>
      </div>

</section>
  );
}

export const dynamic = "force-dynamic";

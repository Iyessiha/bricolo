"use client";
import { useMemo, useState } from "react";

type Plan = { id: "recherche" | "accueil" | "urgence"; icon: string; name: string; hook: string; bullets: string[]; star?: boolean };
type Zone = { id: string; name: string; factor: number; city?: boolean };
const DUR: [number, string, string][] = [[24, "24 heures", "1 jour"], [72, "3 jours", "3 jours"], [168, "7 jours", "7 jours"]];
const nf = new Intl.NumberFormat("fr-FR");

/** Choix du boost en un écran : type, durée, zone, et un total qui se met à jour. Le prix réel est recalculé côté serveur au paiement. */
export default function BoostPicker({ plans, prices, zones, left, caps, cityMult = 2 }: {
  cityMult?: number; plans: Plan[]; prices: Record<string, Record<number, number>>; zones: Zone[]; left: Record<string, Record<string, number>>; caps: Record<string, number>;
}) {
  const [plan, setPlan] = useState<Plan["id"]>("recherche");
  const [dur, setDur] = useState(72);
  const [zone, setZone] = useState(zones[0]?.id ?? "");
  const z = zones.find((x) => x.id === zone);
  const price = (p: Plan["id"], d: number) => {
    const base = prices[p]?.[d] ?? 0;
    const f = (p === "recherche" && z ? z.factor : 1) * (p !== "accueil" && z?.city ? cityMult : 1);
    return f !== 1 ? Math.round((base * f) / 100) * 100 : base;
  };
  const slots = (p: Plan["id"]) => (p === "accueil" ? left.accueil?.[""] : left[p]?.[zone]) ?? 0;
  const total = price(plan, dur);
  const type = plan === "recherche" && z && z.factor > 1 ? "cible" : plan;
  const full = slots(plan) <= 0 || total <= 0;
  const perDay = (d: number) => Math.round(price(plan, d) / (d / 24) / 10) * 10;
  const save = (d: number) => { const a = perDay(24), b = perDay(d); return a > 0 && b > 0 && b < a ? Math.round((1 - b / a) * 100) : 0; };
  const cur = useMemo(() => plans.find((p) => p.id === plan)!, [plans, plan]);

  return (
    <form action="/api/boosts/checkout" method="post" className="stack bpick">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="duration" value={dur} />
      {plan !== "accueil" && <input type="hidden" name="zone" value={zone} />}

      <h2 className="bh">1. Choisissez votre boost</h2>
      <div className="bplans" role="radiogroup" aria-label="Type de boost">
        {plans.map((p) => {
          const n = slots(p.id);
          return (
            <button type="button" key={p.id} role="radio" aria-checked={plan === p.id} className={`bplan${plan === p.id ? " on" : ""}`} onClick={() => setPlan(p.id)}>
              {p.star && <span className="bstar">★ Le plus choisi</span>}
              <span className="bico" aria-hidden="true">{p.icon}</span>
              <b>{p.name}</b>
              <span className="bhook">{p.hook}</span>
              <ul>{p.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
              <span className={`bleft${n <= 0 ? " out" : n <= 2 ? " low" : ""}`}>{n <= 0 ? "Complet pour le moment" : n <= 2 ? `Plus que ${n} place${n > 1 ? "s" : ""}` : `${n} places sur ${caps[p.id]}`}</span>
            </button>
          );
        })}
      </div>

      <h2 className="bh">2. Combien de temps ?</h2>
      <div className="bdur" role="radiogroup" aria-label="Durée">
        {DUR.map(([d, label]) => (
          <button type="button" key={d} role="radio" aria-checked={dur === d} className={`bd${dur === d ? " on" : ""}`} onClick={() => setDur(d)}>
            <b>{label}</b>
            <span className="num">{nf.format(price(plan, d))} FCFA</span>
            <small>{nf.format(perDay(d))} F / jour{save(d) > 0 ? ` · −${save(d)} %` : ""}</small>
          </button>
        ))}
      </div>

      {plan !== "accueil" && (
        <>
          <h2 className="bh">3. Dans quelle zone ?</h2>
          <div className="fld">
            <select id="zone" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Zone du boost">
              {zones.map((x) => <option key={x.id} value={x.id}>{x.name}{x.city ? " · toute la ville" : x.factor > 1 && plan === "recherche" ? " · zone très demandée" : ""}</option>)}
            </select>
            <span className="hint">Votre boost apparaît quand un client cherche votre métier dans cette zone.{z?.city ? " Une ville entière touche plus de clients : le tarif est plus élevé que pour un quartier." : ""}</span>
          </div>
        </>
      )}

      <div className="bbar">
        <div className="bsum">
          <span>{cur.name} · {DUR.find((x) => x[0] === dur)![2]}{plan !== "accueil" && z ? ` · ${z.name}` : ""}</span>
          <b className="num">{nf.format(total)} FCFA</b>
        </div>
        <button className="btn boost big" type="submit" disabled={full}>{slots(plan) <= 0 ? "Complet" : total <= 0 ? "Indisponible" : "Booster maintenant"}</button>
      </div>
      <p className="hint bcenter">Paiement sécurisé par Mobile Money avec GeniusPay. Activation dès la confirmation du paiement. Montant définitif confirmé avant de payer.</p>
    </form>
  );
}

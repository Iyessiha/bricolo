"use client";
import { useState } from "react";

export const PRICE_UNITS = [
  ["intervention", "par intervention"], ["heure", "par heure"], ["jour", "par jour"], ["m²", "par m²"], ["mètre", "par mètre"], ["pièce", "par pièce"], ["devis", "Sur devis gratuit"],
] as const;

/** Retrouve montant et unité dans un ancien tarif saisi librement. */
export function parsePrice(raw?: string | null): { amount: string; unit: string } {
  const t = (raw ?? "").toLowerCase();
  const m = t.match(/\d[\d\s.,]*\d|\d/);
  const unit = /devis/.test(t) && !m ? "devis" : /heure|\/\s*h\b/.test(t) ? "heure" : /jour/.test(t) ? "jour" : /m²|m2/.test(t) ? "m²" : /m[èe]tre|\bml\b/.test(t) ? "mètre" : /pi[èe]ce|unit[ée]/.test(t) ? "pièce" : "intervention";
  return { amount: m ? m[0].replace(/[\s.,]/g, "") : "", unit };
}

/** Tarif en deux champs : « à partir de » + unité. Le client comprend tout de suite ce que le prix recouvre. */
export function PriceField({ value }: { value?: string | null }) {
  const init = parsePrice(value);
  const [unit, setUnit] = useState(init.unit);
  const [amount, setAmount] = useState(init.amount);
  const n = parseInt(amount, 10);
  return (
    <div className="fld"><span className="lbl" id="pr-l">Tarif indicatif <span className="hint">(facultatif)</span></span>
      <div className="row" style={{ flexWrap: "nowrap", gap: 8 }} role="group" aria-labelledby="pr-l">
        {unit !== "devis" && <><span style={{ alignSelf: "center", whiteSpace: "nowrap" }}>À partir de</span>
          <input name="price_amount" inputMode="numeric" pattern="[0-9 ]*" placeholder="5000" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 8))} aria-label="Montant en FCFA" style={{ minWidth: 0, flex: "1 1 90px" }} />
          <span style={{ alignSelf: "center" }}>FCFA</span></>}
        <select name="price_unit" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unité" style={{ flex: "1 1 130px", minWidth: 0 }}>
          {PRICE_UNITS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      <span className="hint">{unit === "devis" ? "Vos clients verront « Sur devis gratuit »." : n > 0 ? `Vos clients verront : « Dès ${n.toLocaleString("fr-FR").replace(/[  ]/g, " ")} FCFA ${unit === "intervention" ? "par intervention" : PRICE_UNITS.find((u) => u[0] === unit)?.[1]} ».` : "C’est un prix de départ : le prix final se discute avec le client."}</span></div>
  );
}

/** Accroche : toujours une promesse qui commence par « Je vais ». */
export function HeadlineField({ value }: { value?: string | null }) {
  const [v, setV] = useState((value ?? "").replace(/^je vais\s+/i, ""));
  return (
    <div className="fld"><label htmlFor="headline_rest">Votre promesse en une phrase</label>
      <div className="hl"><span aria-hidden="true">Je vais</span>
        <input id="headline_rest" name="headline_rest" value={v} maxLength={70} required minLength={8} placeholder="réparer votre climatisation" onChange={(e) => setV(e.target.value)} /></div>
      <span className="hint">Ce que vous faites pour le client, simplement. Exemples : « installer votre climatisation », « construire votre portail métallique », « dépanner votre prise en urgence ». {v.length}/70</span></div>
  );
}

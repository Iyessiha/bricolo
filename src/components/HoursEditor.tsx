"use client";
import { useState } from "react";
import { DAYS, type Hours } from "@/lib/hours";

type Row = { on: boolean; from: string; to: string };

/** Choix des jours et des heures d'ouverture. Tout est facultatif : sans horaires, aucun badge n'est affiché. */
export default function HoursEditor({ initial, open247, urgent, action }: { initial: Hours; open247: boolean; urgent: boolean; action: (fd: FormData) => void }) {
  const [rows, setRows] = useState<Record<string, Row>>(() => Object.fromEntries(DAYS.map(([d]) => [d, { on: !!initial[d], from: initial[d]?.[0] ?? "08:00", to: initial[d]?.[1] ?? "18:00" }])));
  const [all, setAll] = useState(open247);
  const set = (d: string, p: Partial<Row>) => setRows((r) => ({ ...r, [d]: { ...r[d], ...p } }));
  const preset = (days: string[], from: string, to: string) => { setAll(false); setRows(Object.fromEntries(DAYS.map(([d]) => [d, { on: days.includes(d), from, to }]))); };
  const json = JSON.stringify(Object.fromEntries(DAYS.filter(([d]) => rows[d].on && rows[d].from < rows[d].to).map(([d]) => [d, [rows[d].from, rows[d].to]])));
  return (
    <form action={action} className="stack">
      <input type="hidden" name="hours" value={json} />
      <input type="hidden" name="open_24_7" value={all ? "1" : ""} />
      <div className="chips" aria-label="Raccourcis">
        <button type="button" className="chip" onClick={() => preset(["1", "2", "3", "4", "5"], "08:00", "18:00")}>Lun–Ven 8h–18h</button>
        <button type="button" className="chip" onClick={() => preset(["1", "2", "3", "4", "5", "6"], "08:00", "18:00")}>Lun–Sam 8h–18h</button>
        <button type="button" className="chip" onClick={() => { setAll(true); }}>24 h/24, 7 j/7</button>
        <button type="button" className="chip" onClick={() => { setAll(false); preset([], "08:00", "18:00"); }}>Tout effacer</button>
      </div>
      {all ? <p className="notice ok">Votre fiche affichera « Ouvert 24 h/24 ».</p> : (
        <div className="hours">
          {DAYS.map(([d, label]) => (
            <div className="hrow" key={d}>
              <label className="check"><input type="checkbox" checked={rows[d].on} onChange={(e) => set(d, { on: e.target.checked })} /><span>{label}</span></label>
              {rows[d].on ? (
                <span className="hrange">
                  <input type="time" aria-label={`${label} : ouverture`} value={rows[d].from} onChange={(e) => set(d, { from: e.target.value })} />
                  <span>à</span>
                  <input type="time" aria-label={`${label} : fermeture`} value={rows[d].to} onChange={(e) => set(d, { to: e.target.value })} />
                </span>
              ) : <span className="hint">Fermé</span>}
            </div>
          ))}
        </div>
      )}
      <label className="check"><input type="checkbox" name="takes_urgent" value="1" defaultChecked={urgent} /><span>Je prends les urgences (dépannages), même en dehors de ces heures</span></label>
      <p className="hint">Les heures sont celles de votre pays. Laissez vide si vous préférez ne rien afficher. Pensez à les mettre à jour : un client qui appelle en vain perd confiance.</p>
      <button className="btn primary" type="submit">Enregistrer mes horaires</button>
    </form>
  );
}

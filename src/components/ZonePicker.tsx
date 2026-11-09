"use client";
import { useState } from "react";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Zones d'intervention : les zones choisies en haut (retirables), recherche pour en ajouter. Remplace la liste de plusieurs centaines de pastilles. */
export default function ZonePicker({ zones, selected, max }: { zones: { id: string; name: string }[]; selected: string[]; max?: number }) {
  const [sel, setSel] = useState<string[]>(selected);
  const [q, setQ] = useState("");
  const full = max !== undefined && sel.length >= max;
  const shown = zones.filter((z) => !sel.includes(z.id) && (!q || norm(z.name).includes(norm(q)))).slice(0, q ? 40 : 12);
  const name = (id: string) => zones.find((z) => z.id === id)?.name ?? "";
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="chips" aria-live="polite">
        {sel.length ? sel.map((id) => (
          <span className="chip on" key={id}>{name(id)}<input type="hidden" name="zones" value={id} />
            <button type="button" className="chipx" aria-label={`Retirer ${name(id)}`} onClick={() => setSel(sel.filter((x) => x !== id))}>×</button></span>
        )) : <span className="hint">Aucune zone choisie : choisissez au moins une zone.</span>}
      </div>
      {max !== undefined && <p className="meta">{sel.length} / {max} zone{max > 1 ? "s" : ""}{full && " · limite atteinte"}</p>}
      {!full && <>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une ville ou un quartier…" aria-label="Chercher une zone" autoComplete="off" />
        <div className="chips zlist">
          {shown.map((z) => <button type="button" className="chip" key={z.id} onClick={() => setSel([...sel, z.id])}>＋ {z.name}</button>)}
          {!shown.length && <span className="hint">Aucun résultat. Essayez une autre orthographe.</span>}
        </div>
        {!q && zones.length > 12 && <span className="hint">Tapez le nom de votre ville pour la trouver parmi {zones.length} zones.</span>}
      </>}
    </div>
  );
}

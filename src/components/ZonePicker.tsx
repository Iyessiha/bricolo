"use client";
import { useState } from "react";

type Z = { id: string; name: string; parent_id?: string | null };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Zones d'intervention, rangées par ville : on choisit « toute la ville » (une seule zone dans la limite du forfait,
 * l'artisan est trouvé dans tous ses quartiers) ou des quartiers précis. Les zones choisies sont retirables.
 */
export default function ZonePicker({ zones, selected, max, canCity = true, proHref }: { zones: Z[]; selected: string[]; max?: number; canCity?: boolean; proHref?: string }) {
  const [sel, setSel] = useState<string[]>(selected);
  const [q, setQ] = useState("");
  const byId = new Map(zones.map((z) => [z.id, z]));
  const isCity = (id: string) => zones.some((z) => z.parent_id === id);
  const label = (z: Z) => (isCity(z.id) ? `${z.name} (toute la ville)` : z.parent_id && byId.get(z.parent_id) ? `${z.name} · ${byId.get(z.parent_id)!.name}` : z.name);
  const full = max !== undefined && sel.length >= max;

  const add = (z: Z) => {
    // Une ville entière remplace les quartiers déjà choisis ; un quartier est inutile si sa ville est déjà choisie.
    if (isCity(z.id)) setSel([...sel.filter((id) => byId.get(id)?.parent_id !== z.id), z.id]);
    else if (!(z.parent_id && sel.includes(z.parent_id))) setSel([...sel, z.id]);
  };
  const candidates = zones.filter((z) => !sel.includes(z.id) && !(z.parent_id && sel.includes(z.parent_id)));
  const matches = q
    ? candidates.filter((z) => norm(z.name).includes(norm(q)) || (z.parent_id && norm(byId.get(z.parent_id)?.name ?? "").includes(norm(q)))).slice(0, 40)
    : [...candidates.filter((z) => isCity(z.id)), ...candidates.filter((z) => !isCity(z.id) && !z.parent_id)].slice(0, 12);

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="chips" aria-live="polite">
        {sel.length ? sel.map((id) => { const z = byId.get(id); if (!z) return null; return (
          <span className="chip on" key={id}>{label(z)}<input type="hidden" name="zones" value={id} />
            <button type="button" className="chipx" aria-label={`Retirer ${z.name}`} onClick={() => setSel(sel.filter((x) => x !== id))}>×</button></span>
        ); }) : <span className="hint">Aucune zone choisie : choisissez au moins une zone.</span>}
      </div>
      {max !== undefined && <p className="meta">{sel.length} / {max} zone{max > 1 ? "s" : ""}{full && " · limite atteinte"}</p>}
      {!full && <>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une ville ou un quartier…" aria-label="Chercher une zone" autoComplete="off" />
        <div className="chips zlist">
          {matches.map((z) => isCity(z.id) && !canCity
            ? (proHref
              ? <a key={z.id} className="chip" href={proHref} title="Réservé au Forfait Pro">🔒 {label(z)} · Pro</a>
              : <span key={z.id} className="chip" title="Réservé au Forfait Pro" aria-disabled="true">🔒 {label(z)} · Pro</span>)
            : <button type="button" className="chip" key={z.id} onClick={() => add(z)}>＋ {label(z)}</button>)}
          {!matches.length && <span className="hint">Aucun résultat. Essayez une autre orthographe.</span>}
        </div>
        <span className="hint">{canCity ? (q ? "« Toute la ville » compte pour une seule zone et vous rend visible dans tous ses quartiers." : `Tapez le nom de votre ville ou de votre quartier pour le trouver parmi ${zones.length} zones. « Toute la ville » compte pour une seule zone.`) : (q ? "Choisissez vos quartiers. « Toute la ville » est réservé au Forfait Pro." : `Tapez le nom de votre quartier pour le trouver parmi ${zones.length} zones. « Toute la ville » est réservé au Forfait Pro.`)}</span>
      </>}
    </div>
  );
}

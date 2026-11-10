export type Zone = { id: string; name: string; parent_id?: string | null };

/** Zones rangées par ville : [{ ville, quartiers }] pour les villes qui ont des quartiers, puis les autres villes à plat. */
export function groupZones(zones: Zone[]) {
  const kids = new Map<string, Zone[]>();
  for (const z of zones) if (z.parent_id) kids.set(z.parent_id, [...(kids.get(z.parent_id) ?? []), z]);
  const cities = zones.filter((z) => kids.has(z.id)).map((ville) => ({ ville, quartiers: kids.get(ville.id)! }));
  const others = zones.filter((z) => !z.parent_id && !kids.has(z.id));
  return { cities, others };
}

import { groupZones, type Zone } from "@/lib/zones";

/** Options d'un menu de zones : les villes avec leurs quartiers en groupes, puis les autres villes. */
export default function ZoneOptions({ zones, all = "Toutes les zones" }: { zones: Zone[]; all?: string }) {
  const { cities, others } = groupZones(zones);
  return (
    <>
      <option value="">{all}</option>
      {cities.map(({ ville, quartiers }) => (
        <optgroup key={ville.id} label={ville.name}>
          <option value={ville.id}>{ville.name} (toute la ville)</option>
          {quartiers.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
        </optgroup>
      ))}
      {others.length > 0 && (
        <optgroup label={cities.length ? "Autres villes" : "Villes"}>
          {others.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </optgroup>
      )}
    </>
  );
}

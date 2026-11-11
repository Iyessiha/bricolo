"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Menu rangé par usage : d'abord ce qui demande une action, puis l'activité, la visibilité, les réglages. */
const GROUPS: { title: string; items: readonly (readonly [string, string, string, string])[] }[] = [
  { title: "", items: [["/admin", "📊", "Aperçu", ""]] },
  { title: "À traiter", items: [["/admin/dossiers", "🪪", "Dossiers", "dossiers"], ["/admin/support", "💬", "Messages", "support"], ["/admin/inscriptions", "🚫", "Inscriptions échouées", "inscriptions"], ["/admin/signalements", "⚠️", "Signalements", "signalements"], ["/admin/avis", "⭐", "Avis", "avis"]] },
  { title: "Activité", items: [["/admin/artisans", "🧰", "Artisans", ""], ["/admin/demandes", "📩", "Demandes", "demandes"], ["/admin/revenus", "💰", "Revenus", ""]] },
  { title: "Visibilité", items: [["/admin/campagnes", "✉️", "Campagnes", ""], ["/admin/seo", "🔎", "Titres Google", ""], ["/admin/pixels", "📈", "Pixels et mesure", ""], ["/admin/attente", "🌍", "Liste d’attente", ""]] },
  { title: "Réglages", items: [["/admin/prix", "🏷", "Pays et prix", ""], ["/admin/equipe", "👥", "Équipe", ""], ["/admin/journal", "🗂", "Journal", ""]] },
];

export default function AdminNav({ badges }: { badges: Record<string, number> }) {
  const p = usePathname();
  const on = (h: string) => (h === "/admin" ? p === "/admin" : p === h || p.startsWith(h + "/"));
  return (
    <nav className="a-nav" aria-label="Administration">
      {GROUPS.map((g) => (
        <div key={g.title || "top"} className="a-grp" role="group" aria-label={g.title || undefined}>
          {g.title && <p className="a-grp-t">{g.title}</p>}
          {g.items.map(([h, ic, l, b]) => (
            <Link key={h} href={h} aria-current={on(h) ? "page" : undefined}>
              <span aria-hidden="true">{ic}</span><span>{l}</span>{b && badges[b] ? <em>{badges[b]}</em> : null}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

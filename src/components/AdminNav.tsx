"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["/admin", "📊", "Aperçu", ""],
  ["/admin/dossiers", "🪪", "Dossiers", "dossiers"],
  ["/admin/artisans", "🧰", "Artisans", ""],
  ["/admin/demandes", "📩", "Demandes", "demandes"],
  ["/admin/revenus", "💰", "Revenus", ""],
  ["/admin/avis", "⭐", "Avis", "avis"],
  ["/admin/prix", "🏷", "Pays et prix", ""],
  ["/admin/campagnes", "✉️", "Campagnes", ""],
  ["/admin/equipe", "👥", "Équipe", ""],
  ["/admin/journal", "🗂", "Journal", ""],
] as const;

export default function AdminNav({ badges }: { badges: Record<string, number> }) {
  const p = usePathname();
  const on = (h: string) => (h === "/admin" ? p === "/admin" : p === h || p.startsWith(h + "/"));
  return (
    <nav className="a-nav" aria-label="Administration">
      {ITEMS.map(([h, ic, l, b]) => (
        <Link key={h} href={h} aria-current={on(h) ? "page" : undefined}>
          <span aria-hidden="true">{ic}</span><span>{l}</span>{b && badges[b] ? <em>{badges[b]}</em> : null}
        </Link>
      ))}
    </nav>
  );
}

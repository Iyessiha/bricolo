import Link from "next/link";

const ITEMS = [
  ["apercu", "🏠", "Accueil"], ["demandes", "📩", "Demandes et avis"], ["profil", "👤", "Ma fiche"], ["forfait", "🚀", "Visibilité et forfait"], ["aide", "💬", "Aide et compte"],
] as const;

/** Menu de l'espace artisan pour les pages qui sont hors du tableau de bord (ex. /boosts) : on ne perd plus ses repères.
 *  Mobile : rangée de pastilles en haut. Ordinateur : colonne à gauche, comme dans le tableau de bord. */
export default function DashTabs({ current, children }: { current: string; children: React.ReactNode }) {
  return (
    <section className="inner dash">
      <aside className="dside">
        <nav className="dtabs" aria-label="Mon espace">
          {ITEMS.map(([k, ic, l]) => (
            <Link key={k} href={`/tableau-de-bord?s=${k}`} aria-current={current === k ? "page" : undefined}>
              <span aria-hidden="true">{ic}</span><span>{l}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="dmain stack boostpage">{children}</main>
    </section>
  );
}

import { COMPANY, LEGAL_UPDATED } from "@/lib/company";

export default function LegalPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="inner sec">
      <article className="legal">
        <p className="eyebrow">{COMPANY.brand} · {COMPANY.name}</p>
        <h1 style={{ fontSize: "clamp(28px,4.5vw,40px)" }}>{title}</h1>
        <p className="hint">Dernière mise à jour : {LEGAL_UPDATED}</p>
        {intro && <p className="lead">{intro}</p>}
        {children}
      </article>
    </section>
  );
}

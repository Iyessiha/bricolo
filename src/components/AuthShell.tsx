import type { ReactNode } from "react";

/** Formulaire + photo d’ambiance (ordinateur et tablette seulement). */
export default function AuthShell({ children, photo, alt, title, text, pos = "50% 30%" }: { children: ReactNode; photo: string; alt: string; title: string; text: string; pos?: string }) {
  return (
    <section className="inner sec authwrap">
      <div className="authmain">{children}</div>
      <aside className="authpic" aria-hidden={false}>
        <img src={photo} alt={alt} loading="lazy" style={{ objectPosition: pos }} />
        <div className="authcap"><b>{title}</b><span>{text}</span></div>
      </aside>
    </section>
  );
}

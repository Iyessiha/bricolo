import type { ReactNode } from "react";
import VideoPromo from "@/components/VideoPromo";

/** Formulaire + photo d’ambiance (ordinateur et tablette seulement). */
export default function AuthShell({ children, photo, alt, title, text, pos = "50% 30%", video = false }: { children: ReactNode; photo: string; alt: string; title: string; text: string; pos?: string; video?: boolean }) {
  return (
    <section className="inner sec authwrap">
      <div className="authmain">{children}</div>
      <aside className={`authpic${video ? " withvid" : ""}`} aria-hidden={false}>
        {video ? <VideoPromo /> : <img src={photo} alt={alt} loading="lazy" style={{ objectPosition: pos }} />}
        <div className="authcap"><b>{title}</b><span>{text}</span></div>
      </aside>
    </section>
  );
}

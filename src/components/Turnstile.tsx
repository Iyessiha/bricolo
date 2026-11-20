"use client";
import { useEffect, useRef } from "react";

declare global { interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void } } }
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Case anti-robots Cloudflare. N'affiche rien si la clé du site n'est pas configurée. Ajoute le champ « cf-turnstile-response » au formulaire. */
export default function Turnstile() {
  const ref = useRef<HTMLDivElement>(null);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!key || !ref.current) return;
    let id: string | undefined, stop = false;
    const draw = () => { if (!stop && ref.current && window.turnstile && id === undefined) id = window.turnstile.render(ref.current, { sitekey: key, language: "fr" }); };
    if (window.turnstile) draw();
    else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
      if (!s) { s = document.createElement("script"); s.src = SRC; s.async = true; document.head.appendChild(s); }
      s.addEventListener("load", draw);
    }
    return () => { stop = true; if (id !== undefined) window.turnstile?.remove(id); };
  }, [key]);
  if (!key) return null;
  return <div ref={ref} style={{ minHeight: 65 }} />;
}

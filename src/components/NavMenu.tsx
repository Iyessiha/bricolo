"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Sur mobile : bouton menu + panneau déroulant. Sur ordinateur : le panneau s'affiche en ligne (voir globals.css). */
export default function NavMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);
  return (
    <>
      <button type="button" className="burger" aria-expanded={open} aria-controls="navpanel" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOpen((o) => !o)}>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <div id="navpanel" className="navpanel" data-open={open} onSubmitCapture={() => setOpen(false)}>{children}</div>
    </>
  );
}

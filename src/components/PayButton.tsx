"use client";
import { useState, type ReactNode } from "react";

/** Bouton d'envoi qui se désactive et annonce « Redirection… » dès le clic : le paiement met quelques secondes à s'ouvrir, le client sait que ça avance et ne clique pas deux fois. */
export default function PayButton({ children, className = "btn boost", disabled, big }: { children: ReactNode; className?: string; disabled?: boolean; big?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={`${className}${big ? " big" : ""}`}
      type="submit"
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={() => { setTimeout(() => setBusy(true), 0); setTimeout(() => setBusy(false), 30000); }}
    >{busy ? "Ouverture du paiement sécurisé…" : children}</button>
  );
}

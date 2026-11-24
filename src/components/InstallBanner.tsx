"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useInstall } from "@/lib/install-store";

const KEY = "bricolo:install", PAUSE_DAYS = 14;

/** Bandeau discret proposant d'installer l'application : à partir de la 2e page vue, une seule fois, puis plus avant 14 jours si l'on ferme. */
export default function InstallBanner() {
  const { canInstall, canPrompt, install } = useInstall();
  const path = usePathname() ?? "/";
  const [seen, setSeen] = useState(false);
  const [open, setOpen] = useState(false);
  const skip = /^\/(admin|paiement|connexion|inscription|verification|boost|forfait)/.test(path);

  useEffect(() => {
    try {
      const n = Number(localStorage.getItem(KEY + ":pv") || 0) + 1;
      localStorage.setItem(KEY + ":pv", String(n));
      const until = Number(localStorage.getItem(KEY + ":until") || 0);
      if (n >= 2 && Date.now() > until) setSeen(true);
    } catch { setSeen(true); }
  }, []);

  useEffect(() => {
    if (!seen || !canInstall || skip) { setOpen(false); return; }
    const t = setTimeout(() => setOpen(true), 6000);
    return () => clearTimeout(t);
  }, [seen, canInstall, skip]);

  function close(days = PAUSE_DAYS) {
    setOpen(false);
    try { localStorage.setItem(KEY + ":until", String(Date.now() + days * 86400000)); } catch {}
  }
  if (!open) return null;
  return (
    <div className="inbanner" role="dialog" aria-label="Installer l’application Bricolo">
      <div className="inb-text">
        <b>Installez Bricolo sur votre téléphone</b>
        <span>{canPrompt ? "Accès direct depuis l’écran d’accueil, sans rien télécharger." : "Touchez Partager (le carré avec une flèche) en bas de Safari, puis « Sur l’écran d’accueil »."}</span>
      </div>
      <div className="inb-actions">
        {canPrompt && <button type="button" className="btn small primary" onClick={() => { close(60); install(); }}>Installer</button>}
        <button type="button" className="btn small ghost" onClick={() => close()}>{canPrompt ? "Plus tard" : "Compris"}</button>
      </div>
    </div>
  );
}

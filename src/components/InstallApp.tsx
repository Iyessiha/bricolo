"use client";
import { useEffect, useState } from "react";
import { useInstall } from "@/lib/install-store";

/** Enregistre le service worker et propose « Installer l'application » : bouton direct sur Android et ordinateur, mode d'emploi sur iPhone. */
export default function InstallApp({ intro }: { intro?: string }) {
  const { canInstall, canPrompt, install } = useInstall();
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  if (!canInstall) return null;
  return (
    <div className="install">
      {intro && <p className="hint">{intro}</p>}
      <button type="button" className="btn small" onClick={() => { if (canPrompt) install(); else setHelp((h) => !h); }} aria-expanded={canPrompt ? undefined : help}>
        Installer l’application
      </button>
      {help && !canPrompt && <p className="hint">Sur iPhone : touchez le bouton <b>Partager</b> (le carré avec une flèche) en bas de Safari, puis <b>Sur l’écran d’accueil</b>.</p>}
    </div>
  );
}

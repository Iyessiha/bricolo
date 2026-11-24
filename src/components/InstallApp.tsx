"use client";
import { useEffect, useState } from "react";
import { useInstall } from "@/lib/install-store";

/** Mode d'emploi selon le navigateur, quand l'installation en un clic n'est pas disponible. */
function howTo(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return /CriOS|FxiOS|EdgiOS/.test(ua) ? "Sur iPhone, l’installation se fait uniquement depuis Safari : ouvrez monbricolo.com dans Safari, touchez Partager, puis « Sur l’écran d’accueil »." : "Touchez le bouton Partager (le carré avec une flèche) en bas de Safari, puis « Sur l’écran d’accueil ».";
  if (/Firefox/.test(ua) && /Android/.test(ua)) return "Ouvrez le menu de Firefox (les trois points), puis « Installer ».";
  if (/Firefox/.test(ua)) return "Firefox ne permet pas d’installer des sites sur ordinateur. Utilisez Chrome ou Edge, ou ajoutez Bricolo à vos favoris.";
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return "Dans le menu Fichier de Safari, choisissez « Ajouter au Dock ».";
  return "Ouvrez le menu de votre navigateur et choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».";
}

/** Enregistre le service worker et propose « Installer l'application ». Avec `always`, le bouton reste affiché (sauf si l'application est déjà installée) et explique la marche à suivre quand le navigateur n'offre pas l'installation en un clic. */
export default function InstallApp({ intro, always = false }: { intro?: string; always?: boolean }) {
  const { ready, done, canInstall, canPrompt, install } = useInstall();
  const [help, setHelp] = useState("");

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  if (done || !ready || (!always && !canInstall)) return null;
  return (
    <div className="install">
      {intro && <p className="hint">{intro}</p>}
      <button type="button" className="btn small" onClick={() => { if (canPrompt) install(); else setHelp((h) => (h ? "" : howTo())); }} aria-expanded={canPrompt ? undefined : !!help}>
        Installer l’application
      </button>
      {help && !canPrompt && <p className="hint">{help}</p>}
    </div>
  );
}

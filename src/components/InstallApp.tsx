"use client";
import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Enregistre le service worker et propose « Installer l'application » : bouton direct sur Android et ordinateur, mode d'emploi sur iPhone. */
export default function InstallApp() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [done, setDone] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (standalone) { setDone(true); return; }
    const ua = navigator.userAgent;
    setIos(/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua));
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    const onInstalled = () => { setDone(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (done || (!evt && !ios)) return null;
  return (
    <div className="install">
      <button type="button" className="btn small" onClick={async () => { if (evt) { await evt.prompt(); await evt.userChoice; setEvt(null); } else setHelp((h) => !h); }} aria-expanded={evt ? undefined : help}>
        📲 Installer l’application
      </button>
      {help && !evt && <p className="hint">Sur iPhone : touchez le bouton <b>Partager</b> (le carré avec une flèche) en bas de Safari, puis <b>Sur l’écran d’accueil</b>.</p>}
    </div>
  );
}

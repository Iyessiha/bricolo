"use client";
import { useEffect, useState } from "react";

const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
type State = "chargement" | "non-supporte" | "iphone-installer" | "refuse" | "inactif" | "actif";

/** Bouton « Activer les notifications » de l'espace artisan : alertes de nouvelles demandes et nombre sur l'icône de l'application. */
export default function PushBell({ publicKey }: { publicKey: string }) {
  const [st, setSt] = useState<State>("chargement");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
      if (ios && !standalone) return setSt("iphone-installer"); // sur iPhone, les notifications n'existent que pour l'application installée
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setSt("non-supporte");
      if (Notification.permission === "denied") return setSt("refuse");
      try {
        const reg = await navigator.serviceWorker.ready;
        setSt((await reg.pushManager.getSubscription()) && Notification.permission === "granted" ? "actif" : "inactif");
      } catch { setSt("non-supporte"); }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setSt(perm === "denied" ? "refuse" : "inactif");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) }));
      const r = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      setSt(r.ok ? "actif" : "inactif");
    } catch { setSt("inactif"); } finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
      if (sub) { await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
      (navigator as any).clearAppBadge?.().catch?.(() => {});
      setSt("inactif");
    } finally { setBusy(false); }
  }

  if (st === "chargement" || st === "non-supporte") return null;
  return (
    <div className="notice" role="region" aria-label="Notifications">
      <b>🔔 Notifications</b>
      {st === "actif" && <><p className="hint">Activées sur cet appareil. Vous êtes prévenu dès qu’un client vous écrit, et le nombre de demandes à traiter s’affiche sur l’icône de l’application.</p><button type="button" className="btn small ghost" onClick={disable} disabled={busy}>Désactiver</button></>}
      {st === "inactif" && <><p className="hint">Soyez prévenu dès qu’un client vous écrit, même quand l’application est fermée. Le nombre de demandes à traiter s’affiche sur l’icône.</p><button type="button" className="btn small" onClick={enable} disabled={busy}>Activer les notifications</button></>}
      {st === "refuse" && <p className="hint">Les notifications sont bloquées pour Bricolo. Autorisez-les dans les réglages de votre téléphone ou de votre navigateur, puis revenez ici.</p>}
      {st === "iphone-installer" && <p className="hint">Sur iPhone, installez d’abord l’application : bouton <b>Partager</b> de Safari, puis <b>Sur l’écran d’accueil</b>. Ouvrez-la ensuite depuis l’icône pour activer les notifications.</p>}
    </div>
  );
}

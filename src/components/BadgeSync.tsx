"use client";
import { useEffect } from "react";

/** Dans l'application installée, met à jour le nombre affiché sur l'icône à l'ouverture et au retour sur l'application. */
export default function BadgeSync() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
    const nav = navigator as any;
    if (!nav.setAppBadge || !window.matchMedia("(display-mode: standalone)").matches) return;
    let alive = true;
    const sync = async () => {
      try {
        const { n } = await (await fetch("/api/push/badge", { cache: "no-store" })).json();
        if (!alive) return;
        if (n > 0) await nav.setAppBadge(n); else await nav.clearAppBadge();
      } catch {}
    };
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    sync(); document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return null;
}

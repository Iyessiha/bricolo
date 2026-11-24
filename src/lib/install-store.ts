"use client";
import { useEffect, useState } from "react";

export type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** L'événement d'installation n'est émis qu'une fois : on le garde ici pour que le bouton, le pied de page et la bannière le partagent. */
let evt: BIPEvent | null = null;
let installed = false;
let started = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); evt = e as BIPEvent; emit(); });
  window.addEventListener("appinstalled", () => { installed = true; evt = null; emit(); });
}

export function useInstall() {
  const [, tick] = useState(0);
  const [env, setEnv] = useState({ ready: false, standalone: false, ios: false });
  useEffect(() => {
    start();
    const ua = navigator.userAgent;
    setEnv({
      ready: true,
      standalone: window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true,
      ios: /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua),
    });
    const f = () => tick((n) => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  async function install() {
    if (!evt) return;
    const e = evt; evt = null; emit();
    try { await e.prompt(); await e.userChoice; } catch {}
  }
  const done = env.standalone || installed;
  return { ready: env.ready, done, ios: env.ios && !done, canPrompt: !!evt && !done, canInstall: !done && (!!evt || env.ios), install };
}

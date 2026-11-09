"use client";
import { useEffect, useState } from "react";

/** Barre de progression du tunnel (règle graduée de la charte). */
export function Progress({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="prog" role="group" aria-label={`Étape ${step} sur ${total}`}>
      <div className="progtop"><span className="eyebrow">Étape {step} sur {total}</span><span className="hint">{label}</span></div>
      <div className="progbar" aria-hidden="true"><i style={{ width: `${(step / total) * 100}%` }} /></div>
    </div>
  );
}

/** Compte à rebours avant de pouvoir redemander un lien. Redémarre à chaque nouvel envoi. */
export function useCooldown(trigger: number | undefined, seconds = 60) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    setLeft(seconds);
    const t = setInterval(() => setLeft((n) => (n <= 1 ? (clearInterval(t), 0) : n - 1)), 1000);
    return () => clearInterval(t);
  }, [trigger, seconds]);
  return left;
}

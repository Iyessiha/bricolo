"use client";
import { useState } from "react";

/** Champ mot de passe avec bouton afficher / masquer (utile sur téléphone). */
export default function PasswordField({ id, name, label, autoComplete, hint, value, onChange }: {
  id: string; name: string; label: string; autoComplete: "current-password" | "new-password"; hint?: string; value?: string; onChange?: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="fld">
      <label htmlFor={id}>{label}</label>
      <div className="pw">
        <input id={id} name={name} type={show ? "text" : "password"} required autoComplete={autoComplete} minLength={autoComplete === "new-password" ? 8 : undefined} maxLength={72}
          {...(onChange ? { value: value ?? "", onChange: (e) => onChange(e.target.value) } : {})} />
        <button type="button" className="pwtoggle" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{show ? "Masquer" : "Afficher"}</button>
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

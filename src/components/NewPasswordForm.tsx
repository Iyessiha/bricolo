"use client";
import { useActionState } from "react";
import { setNewPassword, type LinkState } from "@/app/auth-actions";
import PasswordField from "./PasswordField";

export default function NewPasswordForm() {
  const [state, action, pending] = useActionState<LinkState, FormData>(setNewPassword, null);
  return (
    <div className="narrow card pad stack">
      <h1 style={{ fontSize: 32 }}>Nouveau mot de passe</h1>
      <p className="muted">Choisissez un mot de passe que vous n’utilisez nulle part ailleurs.</p>
      {state?.error && <p className="notice err" role="alert">{state.error}</p>}
      <form action={action} className="stack">
        <PasswordField id="password" name="password" label="Nouveau mot de passe" autoComplete="new-password" hint="8 caractères minimum, avec au moins une lettre et un chiffre." />
        <PasswordField id="password2" name="password2" label="Confirmez le mot de passe" autoComplete="new-password" />
        <button className="btn primary" type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
      </form>
    </div>
  );
}

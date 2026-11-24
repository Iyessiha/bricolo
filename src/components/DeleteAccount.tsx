"use client";
import { useActionState } from "react";
import { deleteMyAccount, type DeleteState } from "@/app/tableau-de-bord/compte-actions";
import PasswordField from "@/components/PasswordField";

/** Zone dangereuse : suppression définitive du compte par l'artisan lui-même. */
export default function DeleteAccount({ hasPaid }: { hasPaid: boolean }) {
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteMyAccount, null);
  return (
    <details className="card pad stack" style={{ borderColor: "var(--danger, #b3261e)" }}>
      <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--danger, #b3261e)" }}>Supprimer mon compte</summary>
      <form action={action} className="stack" style={{ marginTop: 12 }}>
        <p>Votre fiche est <b>masquée tout de suite</b>. Vous avez <b>7 jours</b> pour changer d’avis (bouton « Annuler la suppression » dans cette page). Passé ce délai, la suppression est <b>définitive</b> : fiche, photos, pièces d’identité, messages et statistiques sont effacés.</p>
        {hasPaid && <p className="notice">Vous avez un Forfait Pro ou un boost en cours : il prendra fin avec le compte et <b>ne sera pas remboursé</b>.</p>}
        {state?.error && <p className="notice err" role="alert">{state.error}</p>}
        <PasswordField id="del-pw" name="password" label="Votre mot de passe" autoComplete="current-password" />
        <div className="fld"><label htmlFor="del-confirm">Tapez SUPPRIMER pour confirmer</label>
          <input id="del-confirm" name="confirm" autoComplete="off" required /></div>
        <button className="btn danger" type="submit" disabled={pending}>{pending ? "Envoi…" : "Supprimer mon compte dans 7 jours"}</button>
      </form>
    </details>
  );
}

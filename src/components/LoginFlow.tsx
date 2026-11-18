"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { loginPassword, resendConfirmation, type LinkState } from "@/app/auth-actions";
import PasswordField from "./PasswordField";

export default function LoginFlow({ linkError }: { linkError: boolean }) {
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState<LinkState, FormData>(loginPassword, null);
  const [resent, setResent] = useState("");
  const [busy, setBusy] = useState(false);
  const unconfirmed = !!state?.email && !state.ok;
  return (
    <div className="narrow card pad stack">
      <h1 style={{ fontSize: 32 }}>Connexion</h1>
      <p className="muted">Connectez-vous avec votre adresse e-mail et votre mot de passe.</p>
      {linkError && !state?.error && <p className="notice">Ce lien n’est plus valable (déjà utilisé, expiré, ou ouvert sur un autre appareil). Si vous avez déjà confirmé votre adresse, connectez-vous ci-dessous ; sinon utilisez « Mot de passe oublié ».</p>}
      {state?.error && <p className="notice err" role="alert">{state.error}</p>}
      {unconfirmed && (
        <div className="stack" style={{ gap: 8 }}>
          {resent && <p className="notice" role="status">{resent}</p>}
          <div><button className="btn" type="button" disabled={busy}
            onClick={async () => { setBusy(true); const r = await resendConfirmation(state!.email!); setResent(r.ok ? "Message renvoyé. Regardez dans votre boîte de réception et vos courriers indésirables." : r.error ?? "Erreur."); setBusy(false); }}>
            {busy ? "Envoi…" : "Renvoyer le message de confirmation"}</button></div>
        </div>
      )}
      <form action={action} className="stack">
        <div className="fld"><label htmlFor="email">Adresse e-mail</label>
          <input id="email" type="email" name="email" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <PasswordField id="password" name="password" label="Mot de passe" autoComplete="current-password" />
        <button className="btn primary" type="submit" disabled={pending || !email}>{pending ? "Connexion…" : "Me connecter"}</button>
      </form>
      <p className="hint"><Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link></p>
      <p className="hint">Pas encore de profil ? <Link href="/inscription">Devenir artisan</Link></p>
    </div>
  );
}

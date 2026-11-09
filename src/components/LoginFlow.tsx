"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { loginLink, loginPassword, type LinkState } from "@/app/auth-actions";
import { useCooldown } from "./Funnel";

export default function LoginFlow({ linkError }: { linkError: boolean }) {
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState<LinkState, FormData>(loginLink, null);
  const left = useCooldown(state?.ok ? state.sentAt : undefined);

  const [sent, setSent] = useState(false);
  const [usePw, setUsePw] = useState(false);
  const [pwState, pwAction, pwPending] = useActionState<LinkState, FormData>(loginPassword, null);
  useEffect(() => { if (state?.ok) setSent(true); }, [state]);

  if (sent) {
    return (
      <div className="narrow card pad stack" aria-live="polite">
        <h1 style={{ fontSize: 32 }}>Vérifiez votre boîte e-mail</h1>
        <p>Si un compte existe pour <b>{email}</b>, vous y recevrez un lien de connexion dans un instant. Ouvrez-le <b>sur cet appareil</b>.</p>
        <p className="hint">Pas de message ? Regardez dans les courriers indésirables, ou vérifiez l’adresse saisie.</p>
        <form action={action} className="row">{state && !state.ok && <p className="notice err" role="alert">{state.error}</p>}<input type="hidden" name="email" value={email} />
          <button className="btn" type="submit" disabled={left > 0 || pending}>{left > 0 ? `Renvoyer le lien dans ${left} s` : "Renvoyer le lien"}</button>
          <button className="btn small" type="button" onClick={() => setSent(false)}>Changer d’adresse</button></form>
      </div>
    );
  }
  if (usePw) {
    return (
      <div className="narrow card pad stack">
        <h1 style={{ fontSize: 32 }}>Connexion</h1>
        <p className="muted">Entrez votre adresse e-mail et votre mot de passe.</p>
        {pwState?.error && <p className="notice err" role="alert">{pwState.error}</p>}
        <form action={pwAction} className="stack">
          <div className="fld"><label htmlFor="email">Adresse e-mail</label><input id="email" type="email" name="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="fld"><label htmlFor="password">Mot de passe</label><input id="password" type="password" name="password" required autoComplete="current-password" /></div>
          <button className="btn primary" type="submit" disabled={pwPending || !email}>{pwPending ? "Connexion…" : "Me connecter"}</button>
        </form>
        <p className="hint"><button type="button" className="linkbtn" onClick={() => setUsePw(false)}>Recevoir plutôt un lien par e-mail</button></p>
      </div>
    );
  }
  return (
    <div className="narrow card pad stack">
      <h1 style={{ fontSize: 32 }}>Connexion</h1>
      <p className="muted">Entrez votre adresse e-mail : nous vous envoyons un lien de connexion, sans mot de passe.</p>
      {linkError && !state?.error && <p className="notice err" role="alert">Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.</p>}
      {state?.error && <p className="notice err" role="alert">{state.error}</p>}
      <form action={action} className="stack">
        <div className="fld"><label htmlFor="email">Adresse e-mail</label>
          <input id="email" type="email" name="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <button className="btn primary" type="submit" disabled={pending || !email}>{pending ? "Envoi…" : "Recevoir mon lien de connexion"}</button>
      </form>
      <p className="hint"><button type="button" className="linkbtn" onClick={() => setUsePw(true)}>Se connecter avec un mot de passe</button></p>
      <p className="hint">Pas encore de profil ? <Link href="/inscription">Devenir artisan</Link></p>
    </div>
  );
}

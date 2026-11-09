"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { signupLink, type LinkState } from "@/app/auth-actions";
import { Progress, useCooldown } from "./Funnel";

type Country = { code: string; name: string; capital: string };
type Trade = { id: string; name: string };
const TOTAL = 3;

export default function SignupFunnel({ countries, trades, initialCountry }: { countries: Country[]; trades: Trade[]; initialCountry: string }) {
  const [step, setStep] = useState(1);
  const [pays, setPays] = useState(initialCountry);
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [email, setEmail] = useState("");
  const [accept, setAccept] = useState(false);
  const [state, action, pending] = useActionState<LinkState, FormData>(signupLink, null);
  const left = useCooldown(state?.ok ? state.sentAt : undefined);
  const [sent, setSent] = useState(false);
  useEffect(() => { if (state?.ok) setSent(true); }, [state]);
  const country = countries.find((c) => c.code === pays);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [step, sent]);

  if (sent) {
    return (
      <div className="narrow card pad stack" aria-live="polite">
        <h1 style={{ fontSize: 32 }}>Vérifiez votre boîte e-mail</h1>
        <p>Nous avons envoyé un lien de confirmation à <b>{email}</b>. Cliquez dessus pour créer votre profil : il vous reste à indiquer vos zones et votre téléphone.</p>
        <p className="notice">Ouvrez le lien <b>sur cet appareil et dans ce navigateur</b>, sinon il ne fonctionnera pas.</p>
        <p className="hint">Pas de message ? Regardez dans les courriers indésirables.</p>
        {state && !state.ok && <p className="notice err" role="alert">{state.error}</p>}
        <form action={action} className="row">
          {(["pays", "trade_id", "name", "email"] as const).map((k) => <input key={k} type="hidden" name={k} value={{ pays, trade_id: trade, name, email }[k]} />)}
          <input type="hidden" name="accept" value="on" />
          <button className="btn" type="submit" disabled={left > 0 || pending}>{left > 0 ? `Renvoyer le lien dans ${left} s` : "Renvoyer le lien"}</button>
          <button className="btn small" type="button" onClick={() => { setSent(false); setStep(3); }}>Changer d’adresse</button>
        </form>
      </div>
    );
  }

  return (
    <div className="narrow card pad stack">
      <Progress step={step} total={TOTAL} label={step === 1 ? "Votre pays" : step === 2 ? "Votre activité" : "Votre e-mail"} />

      {step === 1 && (
        <>
          <h1 style={{ fontSize: 30 }}>Dans quel pays travaillez-vous ?</h1>
          <p className="muted">Votre profil sera montré aux clients de ce pays. La création est gratuite.</p>
          <div className="opts">
            {countries.map((c) => (
              <label key={c.code} className="opt"><input type="radio" name="p" value={c.code} checked={pays === c.code} onChange={() => setPays(c.code)} /><b>{c.name}</b><span>{c.capital}</span></label>
            ))}
          </div>
          <div className="row"><button className="btn primary" type="button" onClick={() => setStep(2)}>Continuer</button></div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 style={{ fontSize: 30 }}>Quelle est votre activité ?</h1>
          <div className="fld"><label htmlFor="biz">Votre nom ou nom de l’atelier</label>
            <input id="biz" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ex. Kouassi Froid Services" autoComplete="organization" /></div>
          <div className="fld"><span className="lbl" id="metier-l">Votre métier principal</span>
            <div className="chips" role="radiogroup" aria-labelledby="metier-l">
              {trades.map((t) => (
                <label key={t.id} className="chip"><input type="radio" name="m" value={t.id} checked={trade === t.id} onChange={() => setTrade(t.id)} />{t.name}</label>
              ))}
            </div></div>
          <div className="row">
            <button className="btn" type="button" onClick={() => setStep(1)}>Retour</button>
            <button className="btn primary" type="button" disabled={name.trim().length < 2 || !trade} onClick={() => setStep(3)}>Continuer</button>
          </div>
        </>
      )}

      {step === 3 && (
        <form action={action} className="stack">
          <h1 style={{ fontSize: 30 }}>Votre adresse e-mail</h1>
          <p className="muted">Aucun mot de passe : nous vous envoyons un lien de confirmation.</p>
          <p className="hint">{name} · {trades.find((t) => t.id === trade)?.name} · {country?.name}</p>
          <input type="hidden" name="pays" value={pays} /><input type="hidden" name="trade_id" value={trade} /><input type="hidden" name="name" value={name} />
          {state?.error && <p className="notice err" role="alert">{state.error}</p>}
          <div className="fld"><label htmlFor="email">Adresse e-mail</label>
            <input id="email" type="email" name="email" required autoComplete="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <label className="check"><input type="checkbox" name="accept" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
            <span>J’ai lu et j’accepte les <Link href="/conditions-utilisation" target="_blank">conditions d’utilisation</Link> et la <Link href="/confidentialite" target="_blank">politique de confidentialité</Link>.</span></label>
          <div className="row">
            <button className="btn" type="button" onClick={() => setStep(2)}>Retour</button>
            <button className="btn primary" type="submit" disabled={pending || !accept || !email}>{pending ? "Envoi…" : "Recevoir mon lien"}</button>
          </div>
        </form>
      )}
      <p className="hint">Déjà inscrit ? <Link href="/connexion">Se connecter</Link></p>
    </div>
  );
}

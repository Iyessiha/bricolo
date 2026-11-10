"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { signupAccount, resendConfirmation, type LinkState } from "@/app/auth-actions";
import { Progress, useCooldown } from "./Funnel";
import Flag from "./Flag";
import PasswordField from "./PasswordField";

type Country = { code: string; name: string; capital: string };
type Trade = { id: string; name: string };
const TOTAL = 4;

export default function SignupFunnel({ countries, trades, initialCountry }: { countries: Country[]; trades: Trade[]; initialCountry: string }) {
  const [step, setStep] = useState(1);
  const [pays, setPays] = useState(initialCountry);
  const [type, setType] = useState<"individuel" | "entreprise">("individuel");
  const [name, setName] = useState("");
  const [registration, setRegistration] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [trade, setTrade] = useState("");
  const [email, setEmail] = useState("");
  const [accept, setAccept] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [resent, setResent] = useState("");
  const [rBusy, setRBusy] = useState(false);
  const [docsAck, setDocsAck] = useState(false);
  const [state, action, pending] = useActionState<LinkState, FormData>(signupAccount, null);
  const left = useCooldown(state?.ok ? state.sentAt : undefined);
  const [sent, setSent] = useState(false);
  useEffect(() => { if (state?.ok) setSent(true); }, [state]);
  const country = countries.find((c) => c.code === pays);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [step, sent]);

  if (sent) {
    return (
      <div className="narrow card pad stack" aria-live="polite">
        <h1 style={{ fontSize: 32 }}>Confirmez votre adresse e-mail</h1>
        <p>Votre compte est créé. Nous avons envoyé un message de confirmation à <b>{email}</b> : cliquez sur le lien qu’il contient pour continuer. Il vous restera à compléter votre profil, ajouter votre photo et envoyer votre pièce d’identité (environ 5 minutes).</p>
        <p className="hint">Pas de message ? Regardez dans les courriers indésirables. Ensuite, vous vous connecterez toujours avec votre e-mail et votre mot de passe.</p>
        {resent && <p className="notice" role="status">{resent}</p>}
        <div className="row">
          <button className="btn" type="button" disabled={left > 0 || rBusy}
            onClick={async () => { setRBusy(true); const r = await resendConfirmation(email); setResent(r.ok ? "Message renvoyé." : r.error ?? "Erreur."); setRBusy(false); }}>
            {left > 0 ? `Renvoyer le message dans ${left} s` : "Renvoyer le message"}</button>
          <button className="btn small" type="button" onClick={() => { setSent(false); setStep(4); }}>Changer d’adresse</button>
        </div>
      </div>
    );
  }

  return (
    <div className="narrow card pad stack">
      <Progress step={step} total={TOTAL} label={["Votre pays", "Votre statut", type === "entreprise" ? "Votre entreprise" : "Votre activité", "Votre compte"][step - 1]} />

      {step === 1 && (
        <>
          <h1 style={{ fontSize: 30 }}>Dans quel pays travaillez-vous ?</h1>
          <p className="muted">Votre profil sera montré aux clients de ce pays. La création est gratuite.</p>
          <details className="notice" open>
            <summary><b>Avant de commencer : préparez vos documents</b></summary>
            <div className="stack" style={{ gap: 8, marginTop: 8 }}>
              <p>Votre identité est vérifiée avant l’activation du profil, pour protéger les clients. Ayez sous la main :</p>
              <ul className="ticks">
                <li>une <b>pièce d’identité valide</b> (carte d’identité, passeport, permis ou carte consulaire)</li>
                <li>de quoi vous <b>prendre en photo</b> : un portrait, et un selfie avec votre pièce</li>
                <li>vos <b>années d’expérience</b>, et votre diplôme si vous en avez un (facultatif)</li>
              </ul>
              <p className="hint">Comptez 5 minutes, depuis votre téléphone. Vos documents ne sont jamais montrés aux clients.</p>
            </div>
          </details>
          <div className="opts two">
            {countries.map((c) => (
              <label key={c.code} className="opt"><input type="radio" name="p" value={c.code} checked={pays === c.code} onChange={() => setPays(c.code)} /><b className="fl"><Flag code={c.code} size={22} />{c.name}</b><span>{c.capital}</span></label>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={docsAck} onChange={(e) => setDocsAck(e.target.checked)} />
            <span>Je comprends que mon profil ne sera activé qu’après la vérification de mon identité.</span>
          </label>
          <div className="row"><button className="btn primary" type="button" disabled={!docsAck} onClick={() => setStep(2)}>Continuer</button>{!docsAck && <span className="hint">Cochez la case ci-dessus pour continuer.</span>}</div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 style={{ fontSize: 30 }}>Comment exercez-vous ?</h1>
          <p className="muted">Vous pouvez créer votre profil à titre personnel ou au nom de votre entreprise.</p>
          <div className="opts">
            <label className="opt"><input type="radio" name="t" value="individuel" checked={type === "individuel"} onChange={() => setType("individuel")} /><b>À titre individuel</b><span>Artisan indépendant, sans entreprise enregistrée</span></label>
            <label className="opt"><input type="radio" name="t" value="entreprise" checked={type === "entreprise"} onChange={() => setType("entreprise")} /><b>Au nom d’une entreprise</b><span>Atelier, société ou entreprise enregistrée</span></label>
          </div>
          <div className="row">
            <button className="btn" type="button" onClick={() => setStep(1)}>Retour</button>
            <button className="btn primary" type="button" onClick={() => setStep(3)}>Continuer</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 style={{ fontSize: 30 }}>{type === "entreprise" ? "Votre entreprise" : "Quelle est votre activité ?"}</h1>
          <div className="fld"><label htmlFor="biz">{type === "entreprise" ? "Nom de l’entreprise" : "Votre nom ou nom de l’atelier"}</label>
            <input id="biz" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={type === "entreprise" ? "Ex. Kouassi Froid Services SARL" : "Ex. Kouassi, frigoriste"} autoComplete="organization" /></div>
          {type === "entreprise" && (
            <div className="fld"><label htmlFor="reg">Numéro d’immatriculation (facultatif)</label>
              <input id="reg" type="text" value={registration} onChange={(e) => setRegistration(e.target.value)} maxLength={60} placeholder="RCCM, IFU, NIF ou NINEA selon votre pays" />
              <span className="hint">Il n’est jamais affiché aux clients. Il nous aide à valider votre profil et à vous accorder le badge Vérifié.</span></div>
          )}
          <div className="fld"><span className="lbl" id="metier-l">Votre métier principal</span>
            <div className="chips" role="radiogroup" aria-labelledby="metier-l">
              {trades.map((t) => (
                <label key={t.id} className="chip"><input type="radio" name="m" value={t.id} checked={trade === t.id} onChange={() => setTrade(t.id)} />{t.name}</label>
              ))}
            </div></div>
          <div className="row">
            <button className="btn" type="button" onClick={() => setStep(2)}>Retour</button>
            <button className="btn primary" type="button" disabled={name.trim().length < 2 || !trade} onClick={() => setStep(4)}>Continuer</button>
          </div>
        </>
      )}

      {step === 4 && (
        <form action={action} className="stack">
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />
          <h1 style={{ fontSize: 30 }}>Votre compte</h1>
          <p className="muted">Elle servira à vous connecter, avec le mot de passe que vous choisissez ci-dessous.</p>
          <p className="hint">{name} · {type === "entreprise" ? "Entreprise" : "Individuel"} · {trades.find((t) => t.id === trade)?.name} · {country?.name}</p>
          <input type="hidden" name="pays" value={pays} /><input type="hidden" name="trade_id" value={trade} /><input type="hidden" name="name" value={name} />
          <input type="hidden" name="account_type" value={type} /><input type="hidden" name="registration" value={registration} /><input type="hidden" name="docs_ack" value="on" />
          {state?.error && <p className="notice err" role="alert">{state.error}</p>}
          <div className="fld"><label htmlFor="email">Adresse e-mail</label>
            <input id="email" type="email" name="email" required autoComplete="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <PasswordField id="password" name="password" label="Mot de passe" autoComplete="new-password" hint="8 caractères minimum, avec au moins une lettre et un chiffre." value={pw} onChange={setPw} />
          <PasswordField id="password2" name="password2" label="Confirmez le mot de passe" autoComplete="new-password" value={pw2} onChange={setPw2} />
          {type === "entreprise" && (
            <label className="check"><input type="checkbox" name="authorized" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} required />
              <span>Je confirme être habilité(e) à créer ce profil et à engager l’entreprise <b>{name}</b>.</span></label>
          )}
          <label className="check"><input type="checkbox" name="accept" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
            <span>J’ai lu et j’accepte les <Link href="/conditions-utilisation" target="_blank">conditions d’utilisation</Link> et la <Link href="/confidentialite" target="_blank">politique de confidentialité</Link>.</span></label>
          <div className="row">
            <button className="btn" type="button" onClick={() => setStep(3)}>Retour</button>
            <button className="btn primary" type="submit" disabled={pending || !accept || !email || pw.length < 8 || pw !== pw2 || (type === "entreprise" && !authorized)}>{pending ? "Création…" : "Créer mon compte"}</button>
          </div>
        </form>
      )}
      <p className="hint">Déjà inscrit ? <Link href="/connexion">Se connecter</Link></p>
    </div>
  );
}

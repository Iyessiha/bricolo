"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { signupLink, type LinkState } from "@/app/auth-actions";
import { Progress, useCooldown } from "./Funnel";
import Flag from "./Flag";

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
          {(["pays", "trade_id", "name", "email", "account_type", "registration"] as const).map((k) => <input key={k} type="hidden" name={k} value={{ pays, trade_id: trade, name, email, account_type: type, registration }[k]} />)}
          <input type="hidden" name="accept" value="on" />{type === "entreprise" && <input type="hidden" name="authorized" value="on" />}
          <button className="btn" type="submit" disabled={left > 0 || pending}>{left > 0 ? `Renvoyer le lien dans ${left} s` : "Renvoyer le lien"}</button>
          <button className="btn small" type="button" onClick={() => { setSent(false); setStep(4); }}>Changer d’adresse</button>
        </form>
      </div>
    );
  }

  return (
    <div className="narrow card pad stack">
      <Progress step={step} total={TOTAL} label={["Votre pays", "Votre statut", type === "entreprise" ? "Votre entreprise" : "Votre activité", "Votre e-mail"][step - 1]} />

      {step === 1 && (
        <>
          <h1 style={{ fontSize: 30 }}>Dans quel pays travaillez-vous ?</h1>
          <p className="muted">Votre profil sera montré aux clients de ce pays. La création est gratuite.</p>
          <div className="opts two">
            {countries.map((c) => (
              <label key={c.code} className="opt"><input type="radio" name="p" value={c.code} checked={pays === c.code} onChange={() => setPays(c.code)} /><b className="fl"><Flag code={c.code} size={22} />{c.name}</b><span>{c.capital}</span></label>
            ))}
          </div>
          <div className="row"><button className="btn primary" type="button" onClick={() => setStep(2)}>Continuer</button></div>
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
          <h1 style={{ fontSize: 30 }}>Votre adresse e-mail</h1>
          <p className="muted">Aucun mot de passe : nous vous envoyons un lien de confirmation.</p>
          <p className="hint">{name} · {type === "entreprise" ? "Entreprise" : "Individuel"} · {trades.find((t) => t.id === trade)?.name} · {country?.name}</p>
          <input type="hidden" name="pays" value={pays} /><input type="hidden" name="trade_id" value={trade} /><input type="hidden" name="name" value={name} />
          <input type="hidden" name="account_type" value={type} /><input type="hidden" name="registration" value={registration} />
          {state?.error && <p className="notice err" role="alert">{state.error}</p>}
          <div className="fld"><label htmlFor="email">Adresse e-mail</label>
            <input id="email" type="email" name="email" required autoComplete="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {type === "entreprise" && (
            <label className="check"><input type="checkbox" name="authorized" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} required />
              <span>Je confirme être habilité(e) à créer ce profil et à engager l’entreprise <b>{name}</b>.</span></label>
          )}
          <label className="check"><input type="checkbox" name="accept" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
            <span>J’ai lu et j’accepte les <Link href="/conditions-utilisation" target="_blank">conditions d’utilisation</Link> et la <Link href="/confidentialite" target="_blank">politique de confidentialité</Link>.</span></label>
          <div className="row">
            <button className="btn" type="button" onClick={() => setStep(3)}>Retour</button>
            <button className="btn primary" type="submit" disabled={pending || !accept || !email || (type === "entreprise" && !authorized)}>{pending ? "Envoi…" : "Recevoir mon lien"}</button>
          </div>
        </form>
      )}
      <p className="hint">Déjà inscrit ? <Link href="/connexion">Se connecter</Link></p>
    </div>
  );
}

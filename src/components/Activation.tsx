"use client";
import ZonePicker from "./ZonePicker";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Progress } from "./Funnel";
import { HeadlineField, PriceField } from "./ProfileFields";
import ImagePick from "./ImagePick";
import { prepareImage, IMAGE_ERRORS } from "@/lib/images";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { saveProfileStep, savePhoto, submitDossier, type StepState } from "@/app/activation/actions";

type Opt = { id: string; name: string; parent_id?: string | null };
export type ActivationProps = {
  uid: string; countryName: string; trades: Opt[]; zones: Opt[]; initialStep: number; photoUrl: string | null;
  defaults: {
    name: string; trade_id: string; zones: string[]; phone: string; whatsapp: string; price_label: string; description: string; headline?: string;
    experience_years: string; account_type: "individuel" | "entreprise"; company_name: string; registration_number: string;
  };
};

const TOTAL = 5;
const LABELS = ["Votre profil", "Votre photo", "Pièce d’identité", "Selfie de contrôle", "Envoi du dossier"];
const DOCS = [
  { v: "cni", t: "Carte d’identité", s: "CNI ou carte nationale" },
  { v: "passeport", t: "Passeport", s: "Page avec la photo" },
  { v: "permis", t: "Permis de conduire", s: "Recto et verso" },
  { v: "carte_consulaire", t: "Carte consulaire", s: "Recto et verso" },
] as const;

const errText = (e: unknown) => (e instanceof Error && IMAGE_ERRORS[e.message]) || "L’envoi a échoué. Vérifiez votre connexion et réessayez.";

export default function Activation(p: ActivationProps) {
  const [step, setStep] = useState(p.initialStep);
  const [done, setDone] = useState(false);
  const [state, setState] = useState<StepState>(null);
  const [pending, start] = useTransition();
  const onProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => { const r = await saveProfileStep(null, fd); setState(r); if (r?.ok) setStep(2); });
  };
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step, done]);

  const [photo, setPhoto] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>("cni");
  const [docNumber, setDocNumber] = useState("");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [dTitle, setDTitle] = useState("");
  const [dFile, setDFile] = useState<File | null>(null);
  const [certify, setCertify] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const d = p.defaults;

  async function putPhoto() {
    setErr("");
    if (!photo) { if (p.photoUrl) return setStep(3); return setErr("Ajoutez une photo de vous."); }
    try {
      setBusy("Envoi de la photo…");
      const blob = await prepareImage(photo, 800);
      const path = `${p.uid}/avatar-${Date.now()}.jpg`;
      const { error } = await supabaseBrowser().storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw new Error("upload");
      const r = await savePhoto(path);
      if (!r.ok) { setErr(r.error ?? "Erreur."); return; }
      setStep(3);
    } catch (e) { setErr(errText(e)); } finally { setBusy(""); }
  }

  async function send() {
    setErr("");
    if (!front || !selfie) return setErr("Il manque une photo.");
    if (!certify) return setErr("Cochez la case de certification pour envoyer.");
    if (dTitle.trim() && !dFile) return setErr("Ajoutez la photo de votre diplôme ou effacez son intitulé.");
    try {
      const sb = supabaseBrowser().storage.from("kyc");
      const up = async (f: File, name: string) => {
        setBusy("Envoi sécurisé des documents…");
        const path = `${p.uid}/${name}-${Date.now()}.jpg`;
        const { error } = await sb.upload(path, await prepareImage(f, 1600), { contentType: "image/jpeg" });
        if (error) throw new Error("upload");
        return path;
      };
      const fp = await up(front, "recto");
      const bp = back ? await up(back, "verso") : null;
      const sp = await up(selfie, "selfie");
      const dp = dTitle.trim() && dFile ? { title: dTitle.trim(), path: await up(dFile, "diplome") } : null;
      setBusy("Finalisation…");
      const r = await submitDossier({ docType, docNumber, front: fp, back: bp, selfie: sp, diploma: dp });
      if (!r.ok) { setErr(r.error ?? "Erreur."); return; }
      setDone(true);
    } catch (e) { setErr(errText(e)); } finally { setBusy(""); }
  }

  if (done) {
    return (
      <div className="narrow card pad stack" aria-live="polite">
        <span className="tag ok" style={{ width: "fit-content" }}>✓ Dossier envoyé</span>
        <h1 style={{ fontSize: 30 }}>Merci, votre dossier est en cours de vérification</h1>
        <p className="key">Notre équipe contrôle votre identité et votre profil, <b>en général sous 24 à 48 heures</b>. <b>Vous recevrez un e-mail</b> dès que votre profil est en ligne.</p>
        <ul className="ticks"><li>Vos documents ne sont jamais montrés aux clients</li><li>Seule l’administration peut les consulter</li><li>Si un point est à corriger, nous vous disons lequel</li></ul>
        <div className="row"><Link className="btn primary" href="/tableau-de-bord">Aller à mon espace</Link></div>
      </div>
    );
  }

  const nav = (back: number | null, next: React.ReactNode) => (
    <div className="row fnav">
      {back && <button type="button" className="btn" onClick={() => { setErr(""); setStep(back); }}>Retour</button>}
      {next}
    </div>
  );

  return (
    <div className="narrow card pad stack">
      <Progress step={step} total={TOTAL} label={LABELS[step - 1]} />
      {err && <p className="notice err" role="alert">{err}</p>}

      {step === 1 && (
        <form onSubmit={onProfile} className="stack">
          <h1 style={{ fontSize: 30 }}>Votre profil</h1>
          <p className="muted">Ce que les clients de {p.countryName} verront. Vous pourrez le modifier plus tard.</p>
          {state && !state.ok && <p className="notice err" role="alert">{state.error}</p>}
          <input type="hidden" name="account_type" value={d.account_type} />
          <input type="hidden" name="company_name" value={d.company_name} />
          <input type="hidden" name="registration_number" value={d.registration_number} />
          <div className="fld"><label htmlFor="name">Nom affiché aux clients</label><input id="name" name="name" required defaultValue={d.name} autoComplete="organization" /></div>
          <div className="fld"><label htmlFor="trade_id">Métier principal</label>
            <select id="trade_id" name="trade_id" required defaultValue={d.trade_id}>
              <option value="" disabled>Choisir…</option>{p.trades.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select></div>
          <div className="fld"><label htmlFor="experience_years">Années d’expérience dans ce métier</label>
            <input id="experience_years" name="experience_years" type="number" inputMode="numeric" min={0} max={60} required defaultValue={d.experience_years} placeholder="Ex. 8" />
            <span className="hint">Mettez 0 si vous débutez. Cette information est affichée sur votre fiche.</span></div>
          <div className="fld"><span className="lbl">Zones couvertes ({p.countryName})</span>
            <ZonePicker zones={p.zones} selected={p.defaults.zones} max={3} canCity={false} />
          </div>
          <div className="fld"><label htmlFor="phone">Téléphone</label><input id="phone" name="phone" type="tel" required defaultValue={d.phone} placeholder="+225 07 00 00 00 00" autoComplete="tel" /></div>
          <div className="fld"><label htmlFor="whatsapp">WhatsApp <span className="hint">(si différent)</span></label><input id="whatsapp" name="whatsapp" type="tel" defaultValue={d.whatsapp} /></div>
          <PriceField value={d.price_label} />
          <HeadlineField value={(d as any).headline} />
          <div className="fld"><label htmlFor="description">Description <span className="hint">(facultatif)</span></label><textarea id="description" name="description" maxLength={1000} defaultValue={d.description} placeholder="Vos services, votre méthode, vos garanties : 3 ou 4 phrases." /></div>
          {nav(null, <button className="btn primary" type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Continuer"}</button>)}
        </form>
      )}

      {step === 2 && (
        <>
          <h1 style={{ fontSize: 30 }}>Votre photo de profil</h1>
          <p className="key">Une photo de vous, <b>visage bien visible</b>, rassure les clients. <b>Elle sera affichée sur votre fiche.</b></p>
          {p.photoUrl && !photo && <img className="curphoto" src={p.photoUrl} alt="Votre photo actuelle" />}
          <ImagePick label="Votre photo" hint="Portrait net, bonne lumière, sans lunettes de soleil." file={photo} onFile={setPhoto} capture="user" round />
          {nav(1, <button className="btn primary" type="button" onClick={putPhoto} disabled={!!busy}>{busy || "Continuer"}</button>)}
        </>
      )}

      {step === 3 && (
        <>
          <h1 style={{ fontSize: 30 }}>Votre pièce d’identité</h1>
          <p className="must"><strong>Obligatoire pour activer votre profil.</strong> Elle n’est jamais montrée aux clients.</p>
          <div className="opts two" role="radiogroup" aria-label="Type de pièce">
            {DOCS.map((o) => (
              <label key={o.v} className="opt"><input type="radio" name="doc" value={o.v} checked={docType === o.v} onChange={() => setDocType(o.v)} /><b>{o.t}</b><span>{o.s}</span></label>
            ))}
          </div>
          <label className="field"><span>Numéro de la pièce</span>
            <input className="input" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} autoComplete="off" maxLength={40} placeholder="Tel qu’écrit sur le document" />
            <small className="muted">Sert à vérifier qu’une même pièce n’ouvre pas plusieurs comptes. Il n’est pas conservé en clair.</small>
          </label>
          <ImagePick label="Recto (face avec la photo)" hint="Les 4 coins visibles, texte lisible, sans reflet." file={front} onFile={setFront} />
          {docType !== "passeport" && <ImagePick label="Verso" optional hint="Recommandé pour la carte d’identité et le permis." file={back} onFile={setBack} />}
          {nav(2, <button className="btn primary" type="button" disabled={!front || docNumber.replace(/[^a-zA-Z0-9]/g, "").length < 5} onClick={() => { setErr(""); setStep(4); }}>Continuer</button>)}
        </>
      )}

      {step === 4 && (
        <>
          <h1 style={{ fontSize: 30 }}>Selfie de contrôle</h1>
          <p className="key">Prenez-vous en photo <b>en tenant votre pièce d’identité</b> à côté de votre visage. Cela nous permet de vérifier que la pièce est bien la vôtre.</p>
          <ImagePick label="Votre selfie avec la pièce" hint="Visage et pièce visibles sur la même photo." file={selfie} onFile={setSelfie} capture="user" />
          {nav(3, <button className="btn primary" type="button" disabled={!selfie} onClick={() => { setErr(""); setStep(5); }}>Continuer</button>)}
        </>
      )}

      {step === 5 && (
        <>
          <h1 style={{ fontSize: 30 }}>Dernière étape</h1>
          <div className="recap">
            <span className="tag ok">✓ Profil</span><span className="tag ok">✓ Photo</span>
            <span className="tag ok">✓ Pièce d’identité</span><span className="tag ok">✓ Selfie</span>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 18 }}>Un diplôme ? <span className="hint">(facultatif)</span></h2>
            <p className="muted">Si vous avez un diplôme ou un certificat, ajoutez-le : après vérification, votre fiche affichera « Diplôme vérifié ».</p>
            <div className="fld"><label htmlFor="dtitle">Intitulé du diplôme</label><input id="dtitle" value={dTitle} onChange={(e) => setDTitle(e.target.value)} maxLength={120} placeholder="Ex. CAP Froid et climatisation" /></div>
            <ImagePick label="Photo du diplôme" optional file={dFile} onFile={setDFile} />
            <p className="hint">Vous pourrez en ajouter d’autres depuis votre espace.</p>
          </div>
          <label className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
            <input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} style={{ marginTop: 4 }} />
            <span>Je certifie que ces documents sont authentiques et m’appartiennent. Ils servent uniquement à vérifier mon identité.</span>
          </label>
          {nav(4, <button className="btn primary" type="button" onClick={send} disabled={!!busy}>{busy || "Envoyer mon dossier"}</button>)}
        </>
      )}
    </div>
  );
}

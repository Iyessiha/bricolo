"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

/** Double authentification de l'équipe (application type Google Authenticator) : activation la première fois, puis code à chaque connexion. */
export default function TwoFactor() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const { data } = await sb.auth.mfa.listFactors();
      const ok = data?.totp?.find((f) => f.status === "verified");
      if (ok) { setFactorId(ok.id); return; }
      for (const f of data?.all ?? []) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
      const en = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Bricolo admin" });
      if (en.error) { setErr("Impossible d’activer la double authentification. Vérifiez qu’elle est activée dans Supabase (Authentication, Multi-factor)."); return; }
      setFactorId(en.data.id); setQr(en.data.totp.qr_code); setSecret(en.data.totp.secret);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true); setErr("");
    const sb = supabaseBrowser();
    const ch = await sb.auth.mfa.challenge({ factorId });
    if (ch.error) { setBusy(false); setErr("Erreur, réessayez."); return; }
    const v = await sb.auth.mfa.verify({ factorId, challengeId: ch.data.id, code: code.replace(/\s/g, "") });
    if (v.error) { setBusy(false); setErr("Code incorrect ou expiré."); return; }
    window.location.href = "/admin";
  }

  return (
    <form onSubmit={submit} className="card pad stack">
      <h1 style={{ fontSize: 24 }}>Vérification en deux étapes</h1>
      {qr ? (
        <>
          <p>Première connexion : scannez ce code avec une application d’authentification (Google Authenticator, Microsoft Authenticator, Authy), puis saisissez le code à 6 chiffres.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code à scanner" width={200} height={200} style={{ alignSelf: "center", background: "#fff", padding: 8, borderRadius: 8 }} />
          {secret && <p className="meta">Ou saisissez cette clé : <code>{secret}</code></p>}
        </>
      ) : <p>Saisissez le code à 6 chiffres affiché par votre application d’authentification.</p>}
      <div className="fld"><label htmlFor="code">Code à 6 chiffres</label>
        <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} required /></div>
      {err && <p className="notice err" role="alert">{err}</p>}
      <button className="btn primary" type="submit" disabled={busy || !factorId}>{busy ? "Vérification…" : "Valider"}</button>
    </form>
  );
}

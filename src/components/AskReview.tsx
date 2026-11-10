"use client";
import { useState, useTransition } from "react";
import { createReviewLink } from "@/app/tableau-de-bord/actions";

/** « Demander un avis » : crée un lien personnel à usage unique, à envoyer au client sur WhatsApp ou à copier. */
export default function AskReview({ artisanName }: { artisanName: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const msg = (u: string) => `Bonjour, merci de m’avoir fait confiance ! Pouvez-vous laisser un avis sur mon travail (${artisanName}) ? Ça prend 30 secondes : ${u}`;
  const make = () => start(async () => {
    setErr(null); setCopied(false);
    const r = await createReviewLink();
    if (r.ok) setUrl(r.url); else setErr(r.error);
  });
  const copy = async () => { try { await navigator.clipboard.writeText(msg(url!)); setCopied(true); } catch { /* le lien reste affiché */ } };
  return (
    <div className="stack">
      {!url && <div><button type="button" className="btn primary" onClick={make} disabled={pending}>{pending ? "Création du lien…" : "⭐ Demander un avis à un client"}</button></div>}
      {err && <p className="notice err" role="alert">{err}</p>}
      {url && (
        <div className="stack">
          <p className="meta">Ce lien ne sert qu’<b>une seule fois</b> : envoyez-le à un client dont le travail est terminé. Pour un autre client, créez un nouveau lien.</p>
          <div className="row">
            <a className="btn primary" href={`https://wa.me/?text=${encodeURIComponent(msg(url))}`} target="_blank" rel="noopener noreferrer">💬 Envoyer sur WhatsApp</a>
            <button type="button" className="btn" onClick={copy}>{copied ? "✓ Copié" : "Copier le message"}</button>
            <button type="button" className="btn ghost" onClick={() => setUrl(null)}>Terminer</button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { id: string; sender: "artisan" | "admin"; body: string; created_at: string };
const fmt = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso));

/** Conversation en direct (actualisée toutes les 10 s). `as="artisan"` : l'artisan écrit à Bricolo. `as="admin"` : l'équipe répond à l'artisan indiqué. */
export default function SupportChat({ as, artisanId, empty }: { as: "artisan" | "admin"; artisanId?: string; empty?: string }) {
  const url = as === "admin" ? `/api/support/${artisanId}` : "/api/support";
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null), lastCount = useRef(0);

  const load = useCallback(async () => {
    try { const r = await fetch(url, { cache: "no-store" }); const j = await r.json(); if (j.ok) setMsgs(j.messages); } catch {}
  }, [url]);
  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 10000);
    const v = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", v);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", v); };
  }, [load]);
  useEffect(() => { if (msgs && msgs.length !== lastCount.current) { lastCount.current = msgs.length; box.current?.scrollTo({ top: box.current.scrollHeight }); } }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: text }) });
      const j = await r.json().catch(() => ({}));
      if (j.ok) { setMsgs(j.messages); setText(""); } else setErr(j.error ?? "Le message n’a pas pu être envoyé.");
    } catch { setErr("Pas de connexion. Réessayez."); } finally { setBusy(false); }
  }
  const mine = as;
  return (
    <div className="chat">
      <div className="chat-box" ref={box} role="log" aria-live="polite" aria-label="Conversation">
        {msgs === null && <p className="hint">Chargement…</p>}
        {msgs?.length === 0 && <p className="hint chat-empty">{empty ?? "Aucun message pour le moment."}</p>}
        {msgs?.map((m) => (
          <div key={m.id} className={`bub ${m.sender === mine ? "me" : "them"}`}>
            <span className="bub-who">{m.sender === "admin" ? "Équipe Bricolo" : as === "admin" ? "Artisan" : "Vous"} · {fmt(m.created_at)}</span>
            <p>{m.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="chat-form">
        <label htmlFor="chat-text" className="sr-only">Votre message</label>
        <textarea id="chat-text" rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder={as === "admin" ? "Votre réponse…" : "Décrivez votre problème ou votre question…"} />
        {err && <p className="notice err" role="alert">{err}</p>}
        <div className="chat-actions"><span className="hint">{text.length}/2000</span><button className="btn primary" type="submit" disabled={busy || !text.trim()}>{busy ? "Envoi…" : "Envoyer"}</button></div>
      </form>
    </div>
  );
}

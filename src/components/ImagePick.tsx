"use client";
import { useEffect, useId, useRef, useState } from "react";
import CropEditor from "./CropEditor";

/** Sélecteur de photo avec aperçu. Sur mobile, le bouton propose l'appareil photo ou la galerie. */
export default function ImagePick({ label, hint, file, onFile, capture, round, optional }: {
  label: string; hint?: string; file: File | null; onFile: (f: File | null) => void; capture?: "user" | "environment"; round?: boolean; optional?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [raw, setRaw] = useState<File | null>(null);
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file); setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="pick">
      <span className="lbl">{label}{optional && <span className="hint"> (facultatif)</span>}</span>
      <div className="pickbox">
        <div className={`pickprev${round ? " round" : ""}`} aria-hidden="true">
          {url ? <img src={url} alt="" /> : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>}
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <input ref={ref} id={id} type="file" accept="image/*" capture={capture} hidden onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f && round) setRaw(f); else onFile(f); e.target.value = ""; }} />
          <div className="row">
            <button type="button" className="btn small" onClick={() => ref.current?.click()}>{file ? "Changer" : "Choisir une photo"}</button>
            {file && <button type="button" className="btn small ghost" onClick={() => { onFile(null); if (ref.current) ref.current.value = ""; }}>Retirer</button>}
          </div>
          {file ? <span className="hint">{round ? "Photo cadrée ✓" : file.name}</span> : hint && <span className="hint">{hint}</span>}
        </div>
      </div>
      {raw && <CropEditor file={raw} onCancel={() => setRaw(null)} onDone={(f) => { setRaw(null); onFile(f); }} />}
    </div>
  );
}

"use client";
import { useState } from "react";
import { MARK_PLAIN_D } from "@/lib/logo";

type P = { id: string; label: string; path: string; suffix: boolean; titleKey: string; descKey: string; title: string; desc: string; defTitle: string; defDesc: string };

const cut = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");
const tone = (n: number, lo: number, hi: number, max: number) => (n === 0 ? "mute" : n < lo || n > max ? "err" : n > hi ? "wait" : "ok");

/** Éditeur de titre et de description avec aperçu fidèle du résultat Google (ordinateur et mobile). */
export default function SerpEditor({ pages, base }: { pages: P[]; base: string }) {
  return <div className="stack">{pages.map((p) => <One key={p.id} p={p} base={base} />)}</div>;
}

function One({ p, base }: { p: P; base: string }) {
  const [t, setT] = useState(p.title), [d, setD] = useState(p.desc), [mob, setMob] = useState(false);
  const shownT = (t.trim() || p.defTitle) + (p.suffix ? " · Bricolo" : "");
  const shownD = d.trim() || p.defDesc;
  const host = new URL(base).host.replace(/^www\./, "");
  const crumbs = [host, ...p.path.split("/").filter(Boolean)].join(" › ");
  const tl = t.trim().length, dl = d.trim().length;
  return (
    <div className="card pad stack">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ fontSize: 18 }}>{p.label}</h2>
        <div className="tags"><button type="button" className={`tag ${mob ? "mute" : "ok"}`} onClick={() => setMob(false)}>Ordinateur</button><button type="button" className={`tag ${mob ? "ok" : "mute"}`} onClick={() => setMob(true)}>Mobile</button></div>
      </div>
      <div aria-label="Aperçu Google" style={{ background: "#fff", color: "#202124", border: "1px solid #dfe1e5", borderRadius: 12, padding: "14px 16px", maxWidth: mob ? 380 : 652, fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#27489A", display: "grid", placeItems: "center", flex: "none" }}><svg width="16" height="16" viewBox="0 0 24 24"><path d={MARK_PLAIN_D} fill="#fff" /></svg></span>
          <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 14, lineHeight: "18px" }}>Bricolo</span><span style={{ display: "block", fontSize: 12, lineHeight: "16px", color: "#4d5156", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{crumbs}</span></span>
        </div>
        <div style={{ color: "#1a0dab", fontSize: mob ? 18 : 20, lineHeight: mob ? "24px" : "26px", margin: "6px 0 3px", overflowWrap: "anywhere" }}>{cut(shownT, 60)}</div>
        <div style={{ color: "#4d5156", fontSize: 14, lineHeight: "22px", overflowWrap: "anywhere" }}>{cut(shownD, mob ? 120 : 160)}</div>
      </div>
      {(!t.trim() || !d.trim()) && <p className="hint">Les champs vides utilisent le texte par défaut, affiché ci-dessus.</p>}
      <div className="fld"><label htmlFor={p.titleKey}>Titre (balise title) <span className={`tag ${tone(tl, 30, 60, 70)}`}>{tl}/60</span></label>
        <input id={p.titleKey} name={p.titleKey} type="text" maxLength={70} value={t} onChange={(e) => setT(e.target.value)} placeholder={p.defTitle} autoComplete="off" />
        <p className="hint">Idéal : 30 à 60 caractères. Au-delà de 60, Google coupe la fin. Mettez le mot important au début.{p.suffix ? " « · Bricolo » est ajouté automatiquement." : ""}</p></div>
      <div className="fld"><label htmlFor={p.descKey}>Description (balise meta description) <span className={`tag ${tone(dl, 110, 160, 170)}`}>{dl}/160</span></label>
        <textarea id={p.descKey} name={p.descKey} rows={3} maxLength={170} value={d} onChange={(e) => setD(e.target.value)} placeholder={p.defDesc} />
        <p className="hint">Idéal : 110 à 160 caractères. Une phrase qui donne envie de cliquer. Google peut la remplacer s'il juge un autre extrait plus utile.</p></div>
      {(t || d) && <div><button type="button" className="btn small ghost" onClick={() => { setT(""); setD(""); }}>Revenir au texte par défaut</button></div>}
    </div>
  );
}

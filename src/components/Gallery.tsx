"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareImage, checkLandscape, IMAGE_ERRORS } from "@/lib/images";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { addPortfolio, removeCover, removePortfolio, saveCover } from "@/app/tableau-de-bord/actions";

export type Shot = { id: string; url: string; caption: string | null };
const MAX = 8;

/** Couverture en paysage + photos de réalisations. Les images sont réduites sur le téléphone avant l'envoi. */
export default function Gallery({ uid, cover, shots }: { uid: string; cover: string | null; shots: Shot[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const coverRef = useRef<HTMLInputElement>(null), shotRef = useRef<HTMLInputElement>(null);

  async function up(file: File, side: number, maxBytes: number) {
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    const { error } = await supabaseBrowser().storage.from("realisations").upload(path, await prepareImage(file, side, 0.85, maxBytes), { contentType: "image/jpeg" });
    if (error) throw new Error("upload");
    return path;
  }
  async function run(fn: () => Promise<string>) {
    setBusy(true); setMsg(null);
    try { const t = await fn(); setMsg({ ok: true, t }); router.refresh(); }
    catch (e) { setMsg({ ok: false, t: (e instanceof Error && (IMAGE_ERRORS[e.message] || (!/^(upload|format|lecture)$/.test(e.message) && e.message))) || "L’envoi a échoué. Réessayez." }); }
    finally { setBusy(false); }
  }
  const onCover = (f?: File) => f && run(async () => { await checkLandscape(f); const r = await saveCover(await up(f, 1600, 900_000)); if (!r.ok) throw new Error(r.error); return "Couverture mise à jour."; });
  const onShots = (files: FileList | null) => files && run(async () => {
    const list = [...files].slice(0, MAX - shots.length);
    if (!list.length) throw new Error("Vous avez atteint 8 photos. Supprimez-en une pour en ajouter.");
    for (const f of list) { const r = await addPortfolio(await up(f, 1400, 700_000), ""); if (!r.ok) throw new Error(r.error); }
    return list.length > 1 ? `${list.length} photos ajoutées.` : "Photo ajoutée.";
  });

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="stack" style={{ gap: 8 }}>
        <h3 className="fh">Photo de couverture</h3>
        <div className="covprev">{cover ? <img src={cover} alt="Votre couverture" /> : <span>Aucune couverture : c’est la première chose que voient les clients. Choisissez une belle photo de votre travail, en format paysage (horizontale).</span>}</div>
        <p className="hint">Photo en paysage, nette, en pleine lumière, sans texte ni logo. 900 px de large minimum. Elle sera automatiquement allégée.</p>
        <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { onCover(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="row"><button type="button" className="btn small primary" disabled={busy} onClick={() => coverRef.current?.click()}>{cover ? "Changer la couverture" : "Ajouter une couverture"}</button>
          {cover && <button type="button" className="btn small ghost" disabled={busy} onClick={() => run(async () => { await removeCover(); return "Couverture retirée."; })}>Retirer</button>}</div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <h3 className="fh">Mes réalisations <span className="hint">({shots.length}/{MAX})</span></h3>
        <p className="hint">Montrez vos chantiers terminés : les clients appellent plus facilement quand ils voient le résultat. Évitez les photos de personnes ou de documents.</p>
        {shots.length > 0 && <div className="shotgrid">{shots.map((s) => (
          <figure key={s.id}><img src={s.url} alt={s.caption ?? "Réalisation"} loading="lazy" />
            <button type="button" aria-label="Supprimer cette photo" disabled={busy} onClick={() => run(async () => { await removePortfolio(s.id); return "Photo supprimée."; })}>×</button></figure>))}</div>}
        <input ref={shotRef} type="file" accept="image/*" multiple hidden onChange={(e) => { onShots(e.target.files); e.target.value = ""; }} />
        <div><button type="button" className="btn small" disabled={busy || shots.length >= MAX} onClick={() => shotRef.current?.click()}>{busy ? "Envoi…" : "＋ Ajouter des photos"}</button></div>
      </div>
      {msg && <p className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.t}</p>}
    </div>
  );
}

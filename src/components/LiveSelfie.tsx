"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "idle" | "live" | "fallback";

/** Selfie pris directement avec la caméra de l'appareil (aucun choix dans la galerie), pour garantir une photo prise sur le moment.
 *  Si la caméra est refusée ou indisponible, on propose l'appareil photo du téléphone en secours. */
export default function LiveSelfie({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fallback = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [err, setErr] = useState("");
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file); setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // Une fois l'élément vidéo affiché, on y branche le flux de la caméra.
  useEffect(() => {
    if (mode === "live" && video.current && stream.current) { video.current.srcObject = stream.current; video.current.play().catch(() => {}); }
  }, [mode]);

  const stop = useCallback(() => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; }, []);
  useEffect(() => stop, [stop]);

  async function open() {
    setErr("");
    if (!navigator.mediaDevices?.getUserMedia) { setErr("Votre navigateur ne permet pas d’ouvrir la caméra ici."); setMode("fallback"); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      stream.current = s; setMode("live");
    } catch (e: any) {
      setErr(e?.name === "NotAllowedError" ? "L’accès à la caméra est refusé. Autorisez-le pour Bricolo dans les réglages de votre navigateur, puis réessayez." : "Impossible d’ouvrir la caméra.");
      setMode("fallback");
    }
  }
  function snap() {
    const v = video.current; if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0); // image non inversée : le texte de la pièce reste lisible
    c.toBlob((b) => { if (b) { onFile(new File([b], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" })); stop(); setMode("idle"); } }, "image/jpeg", 0.9);
  }
  function retake() { onFile(null); open(); }

  return (
    <div className="pick">
      <span className="lbl">Votre selfie avec la pièce</span>
      {mode === "live" ? (
        <div className="stack" style={{ gap: 10 }}>
          <div className="live"><video ref={video} playsInline muted autoPlay aria-label="Aperçu de la caméra" /></div>
          <p className="hint">Tenez la pièce à côté de votre visage : visage et pièce bien visibles, texte lisible.</p>
          <div className="row"><button type="button" className="btn primary" onClick={snap}>📸 Prendre la photo</button><button type="button" className="btn ghost" onClick={() => { stop(); setMode("idle"); }}>Annuler</button></div>
        </div>
      ) : file && url ? (
        <div className="stack" style={{ gap: 10 }}>
          <div className="live"><img src={url} alt="Votre selfie avec la pièce" /></div>
          <span className="hint">Selfie pris ✓ Vérifiez que votre visage et la pièce sont bien lisibles.</span>
          <div><button type="button" className="btn small" onClick={retake}>Reprendre le selfie</button></div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {err && <p className="notice err" role="alert">{err}</p>}
          <div className="row">
            <button type="button" className="btn primary" onClick={open}>📷 Ouvrir l’appareil photo</button>
            {mode === "fallback" && <>
              <input ref={fallback} type="file" accept="image/*" capture="user" hidden onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              <button type="button" className="btn" onClick={() => fallback.current?.click()}>Utiliser l’appareil photo du téléphone</button>
            </>}
          </div>
          <span className="hint">La photo se prend sur le moment : on ne peut pas choisir une image déjà enregistrée.</span>
        </div>
      )}
    </div>
  );
}

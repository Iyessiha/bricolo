"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ImagePick from "./ImagePick";
import { prepareImage, IMAGE_ERRORS } from "@/lib/images";
import { uploadAvatar } from "@/app/activation/actions";

export default function PhotoUpdate({ uid, photoUrl, name }: { uid: string; photoUrl: string | null; name: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function save() {
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData(); fd.set("photo", await prepareImage(file, 800), "photo.jpg");
      const r = await uploadAvatar(fd);
      if (!r.ok) { setMsg({ ok: false, t: r.error ?? "Photo refusée." }); return; }
      setFile(null); setMsg({ ok: true, t: "Photo mise à jour." }); router.refresh();
    } catch (e) { setMsg({ ok: false, t: (e instanceof Error && IMAGE_ERRORS[e.message]) || "L’envoi a échoué. Réessayez." }); }
    finally { setBusy(false); }
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row">
        {photoUrl ? <img className="curphoto" src={photoUrl} alt={`Photo de ${name}`} /> : <span className="avatar" style={{ width: 96, height: 96 }}>{name.slice(0, 2).toUpperCase()}</span>}
      </div>
      <p className="hint">Votre visage ou votre logo uniquement. Les pièces d’identité sont refusées automatiquement : elles se déposent dans votre dossier de vérification.</p>
      <ImagePick label="Changer ma photo de profil" file={file} onFile={setFile} capture="user" round />
      {msg && <p className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.t}</p>}
      {file && <div><button type="button" className="btn primary" onClick={save} disabled={busy}>{busy ? "Envoi…" : "Enregistrer la photo"}</button></div>}
    </div>
  );
}

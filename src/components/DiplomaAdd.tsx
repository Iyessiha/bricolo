"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ImagePick from "./ImagePick";
import { prepareImage, IMAGE_ERRORS } from "@/lib/images";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { addDiploma } from "@/app/tableau-de-bord/actions";

export default function DiplomaAdd({ uid }: { uid: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function send() {
    if (title.trim().length < 2 || !file) return setMsg({ ok: false, t: "Indiquez l’intitulé et ajoutez la photo du diplôme." });
    setBusy(true); setMsg(null);
    try {
      const path = `${uid}/diplome-${Date.now()}.jpg`;
      const { error } = await supabaseBrowser().storage.from("kyc").upload(path, await prepareImage(file, 1600), { contentType: "image/jpeg" });
      if (error) throw new Error("upload");
      const r = await addDiploma(title.trim(), path);
      if (!r.ok) throw new Error(r.error);
      setTitle(""); setFile(null); setMsg({ ok: true, t: "Diplôme envoyé. Nous le vérifions sous 48 h." }); router.refresh();
    } catch (e) { setMsg({ ok: false, t: (e instanceof Error && (IMAGE_ERRORS[e.message] || e.message)) || "L’envoi a échoué." }); }
    finally { setBusy(false); }
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="fld"><label htmlFor="dt">Intitulé du diplôme ou du certificat</label><input id="dt" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ex. CAP Électricité bâtiment" /></div>
      <ImagePick label="Photo du diplôme" file={file} onFile={setFile} />
      {msg && <p className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.t}</p>}
      <div><button type="button" className="btn" onClick={send} disabled={busy}>{busy ? "Envoi…" : "Envoyer pour vérification"}</button></div>
    </div>
  );
}

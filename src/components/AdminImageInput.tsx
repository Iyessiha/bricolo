"use client";
import { useState } from "react";

/** Champ fichier pour l'admin : réduit l'image dans le navigateur (1800 px de large, WebP) avant l'envoi,
 *  pour rester sous la limite de 4,5 Mo de l'hébergeur (les photos de téléphone la dépassent souvent). */
export default function AdminImageInput({ name = "file" }: { name?: string }) {
  const [msg, setMsg] = useState("");
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const f = input.files?.[0];
    if (!f) return;
    if (f.size < 1.5 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(f.type)) { setMsg(""); return; }
    setMsg("Préparation de l’image…");
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
      const k = Math.min(1, 1800 / bmp.width);
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/webp", 0.85));
      if (!blob) throw new Error("x");
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "cover.webp", { type: "image/webp" }));
      input.files = dt.files;
      setMsg(`Image réduite (${(blob.size / 1048576).toFixed(1)} Mo).`);
    } catch { setMsg("Image illisible. Essayez un fichier JPG, PNG ou WebP."); input.value = ""; }
  }
  return (<>
    <input type="file" name={name} accept="image/jpeg,image/png,image/webp,image/heic" required onChange={onChange} style={{ maxWidth: "100%" }} />
    {msg && <span className="meta" role="status">{msg}</span>}
  </>);
}

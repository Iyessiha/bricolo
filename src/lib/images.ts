import { coverProblem, shotProblem } from "./cover-rules";
/** Réduit une photo de téléphone (souvent 4 à 8 Mo) en JPEG léger avant l'envoi : utile sur réseau mobile. */
export async function prepareImage(file: File, maxSide: number, quality = 0.85, maxBytes = 0): Promise<Blob> {
  if (file.size > MAX_SOURCE) throw new Error("lourde");
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) throw new Error("format");
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new Error("lecture"); }
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d"); if (!ctx) throw new Error("lecture");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  const enc = (q: number) => new Promise<Blob>((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("lecture"))), "image/jpeg", q));
  let q = quality, blob = await enc(q);
  while (maxBytes && blob.size > maxBytes && q > 0.45) { q -= 0.1; blob = await enc(q); } // allège jusqu'à passer sous la limite
  return blob;
}

export const MAX_SOURCE = 20 * 1024 * 1024;

async function dims(file: File) {
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { throw new Error("lecture"); }
  const d = { w: bmp.width, h: bmp.height }; bmp.close?.(); return d;
}
/** Refus immédiat d'une couverture qui n'est pas en paysage assez large (voir cover-rules). */
export async function checkCover(file: File): Promise<void> {
  if (file.size > MAX_SOURCE) throw new Error("lourde");
  const { w, h } = await dims(file);
  const p = coverProblem(w, h); if (p) throw new Error(p);
}
export async function checkShot(file: File): Promise<void> {
  if (file.size > MAX_SOURCE) throw new Error("lourde");
  const { w, h } = await dims(file);
  const p = shotProblem(w, h); if (p) throw new Error(p);
}

export const IMAGE_ERRORS: Record<string, string> = {
  format: "Format non pris en charge. Utilisez une photo (JPG, PNG ou WebP).",
  lecture: "Impossible de lire cette image. Essayez-en une autre.",
  lourde: "Cette photo est trop lourde (20 Mo maximum). Choisissez-en une plus légère.",
  paysage: "Cette image n’a pas le bon format. La couverture doit être large et horizontale (format paysage, idéalement 1600 × 600 px). Sur Canva, créez un design de 1600 × 600 px.",
  petite: "Cette image est trop petite pour rester nette (couverture : 1200 px de large minimum ; réalisations : 600 px minimum).",
};

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

/** La couverture doit être une photo en paysage, assez grande pour rester nette. */
export async function checkLandscape(file: File): Promise<void> {
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { throw new Error("lecture"); }
  const { width: w, height: h } = bmp; bmp.close?.();
  if (w / h < 1.3) throw new Error("paysage");
  if (w < 900) throw new Error("petite");
}

export const IMAGE_ERRORS: Record<string, string> = {
  format: "Format non pris en charge. Utilisez une photo (JPG, PNG ou WebP).",
  lecture: "Impossible de lire cette image. Essayez-en une autre.",
  lourde: "Cette photo est trop lourde (20 Mo maximum). Choisissez-en une plus légère.",
  paysage: "La couverture doit être une photo en paysage (horizontale). Tournez votre téléphone et reprenez la photo.",
  petite: "Cette photo est trop petite : 900 pixels de large minimum pour rester nette.",
};

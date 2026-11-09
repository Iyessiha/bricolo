/** Réduit une photo de téléphone (souvent 4 à 8 Mo) en JPEG léger avant l'envoi : utile sur réseau mobile. */
export async function prepareImage(file: File, maxSide: number, quality = 0.85): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) throw new Error("format");
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new Error("lecture"); }
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d"); if (!ctx) throw new Error("lecture");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  return await new Promise<Blob>((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("lecture"))), "image/jpeg", quality));
}

export const IMAGE_ERRORS: Record<string, string> = {
  format: "Format non pris en charge. Utilisez une photo (JPG, PNG ou WebP).",
  lecture: "Impossible de lire cette image. Essayez-en une autre.",
};

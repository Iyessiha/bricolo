import "server-only";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase/admin";

const REFUS = "Cette image ressemble à une pièce d’identité. Pour votre sécurité, elle ne peut pas servir de photo de profil : envoyez une photo de vous ou de votre logo. Votre pièce d’identité se dépose dans le dossier de vérification, où seule l’équipe Bricolo la voit.";

/** Empreinte visuelle 64 bits (dHash) : deux photos du même document ont des empreintes proches. */
async function dhash(buf: Buffer): Promise<bigint> {
  const px = await sharp(buf).rotate().grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let h = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
  return h;
}
const dist = (a: bigint, b: bigint) => { let x = a ^ b, n = 0; while (x) { n += Number(x & 1n); x >>= 1n; } return n; };

/** 1) Même image que l'une des pièces déjà envoyées par l'artisan. 2) Si ANTHROPIC_API_KEY est définie : vérification par un modèle de vision (« est-ce une pièce d'identité ? »). Une panne de ce contrôle ne bloque pas l'envoi. */
export async function avatarVerdict(buf: Buffer, userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try { await sharp(buf).metadata(); } catch { return { ok: false, error: "Image illisible. Essayez une autre photo." }; }

  try {
    const db = supabaseAdmin();
    const { data: a } = await db.from("artisans").select("id").eq("user_id", userId).maybeSingle();
    const { data: ident } = a ? await db.from("artisan_identity").select("front_path, back_path, selfie_path").eq("artisan_id", a.id).maybeSingle() : { data: null };
    const paths = [ident?.front_path, ident?.back_path].filter(Boolean) as string[];
    if (paths.length) {
      const mine = await dhash(buf);
      for (const p of paths) {
        const { data } = await db.storage.from("kyc").download(p);
        if (!data) continue;
        if (dist(mine, await dhash(Buffer.from(await data.arrayBuffer()))) <= 10) return { ok: false, error: REFUS };
      }
    }
  } catch { /* contrôle facultatif */ }

  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const small = await sharp(buf).rotate().resize(768, 768, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: AbortSignal.timeout(8000),
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.AVATAR_CHECK_MODEL || "claude-haiku-5-5", max_tokens: 20,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: small.toString("base64") } },
            { type: "text", text: "Cette image est-elle une pièce d'identité ou un document officiel (carte d'identité, passeport, permis de conduire, carte consulaire, acte) ? Une photo de personne, un portrait, un logo ou une affiche publicitaire n'en est pas un. Réponds uniquement par OUI ou NON." },
          ] }],
        }),
      });
      if (r.ok) { const j = await r.json(); if (/^\s*OUI/i.test(String(j?.content?.[0]?.text ?? ""))) return { ok: false, error: REFUS }; }
    } catch { /* fail-open */ }
  }
  return { ok: true };
}

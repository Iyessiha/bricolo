import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Cover « marketing » d'un artisan : aux couleurs de Bricolo, avec sa photo de réalisation en fond ou sa photo de profil. 1600×600 (le profil affiche tout, les cartes recadrent le centre en 3:2 : tout le texte reste dans la zone centrale). */
export type CoverInput = { name: string; trade: string; slug: string; country: string; verified: boolean; urgent?: boolean; photoUrl?: string | null; shotUrl?: string | null };

const P: Record<string, string> = {
  frigoriste: "M12 2v20M4.5 7l15 10M19.5 7l-15 10M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5M3 9.5l3.5.5-.5 3.5M21 14.5l-3.5-.5.5-3.5",
  mecanicien: "M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.2-.6-.6-2.2z",
  soudeur: "M13 2L5 13h6l-1 9 9-12h-6z",
  peintre: "M5 4h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM19 7.5h2v4h-8v3M11 14.5h4v7h-4z",
  menuisier: "M3 20L14 9M12 7l5 5M15 4l5 5-3 3-5-5zM4 21l1.5-4.5L9 20z",
  ebeniste: "M6 3h12v8H6zM6 11v10M18 11v10M6 16h12",
  nettoyage: "M8 3h5v4H8zM10.5 7v3M6 10h10v11H6zM16 5l2-2M17 8h3M16 11l2 2",
  macon: "M3 5h18v5H3zM3 14h18v5H3zM9 5v5M15 14v5M12 10v4",
  informatique: "M5 5h14v10H5zM2 19h20M9 19l1-4h4l1 4",
  cameras: "M3 8h13v8H3zM16 11l5-3v8l-5-3M7 5l3 3",
};
/** Phrases d'accroche à la première personne, sans promesse de prix, de délai ni de garantie. Une variante par artisan (choisie d'après son nom). */
const SLOGANS: Record<string, string[]> = {
  frigoriste: ["Clim ou frigo en panne ? J’interviens chez vous.", "Je répare et j’entretiens votre climatiseur et votre frigo."],
  mecanicien: ["Je répare et j’entretiens votre voiture.", "Un bruit, une panne ? Je regarde votre véhicule."],
  soudeur: ["Portails, grilles, escaliers : je soude sur mesure.", "Je fabrique et je répare vos structures en métal."],
  peintre: ["Je vais peindre votre maison, votre salon, votre immeuble.", "Des murs neufs pour votre maison ou votre bureau.", "Je repeins vos murs, avec soin et propreté."],
  menuisier: ["Portes, placards, cuisines : je fabrique sur mesure.", "Je réalise vos ouvrages en bois à votre taille."],
  ebeniste: ["Je fabrique et je restaure vos meubles en bois."],
  nettoyage: ["Je nettoie votre maison, votre bureau, votre immeuble."],
  macon: ["Je construis, je répare, je rénove vos murs.", "Dalle, mur, clôture : je maçonne votre projet."],
  informatique: ["Je répare votre téléphone, Android ou iPhone : écran, batterie…", "Votre ordinateur ou votre téléphone est en panne ? Je m’en occupe."],
  cameras: ["J’installe vos caméras de surveillance."],
};
export const sloganOf = (slug: string, name: string) => {
  const l = SLOGANS[slug] ?? ["Je suis près de chez vous : contactez-moi."];
  return l[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % l.length];
};
const COUNTRY: Record<string, string> = { ci: "Côte d’Ivoire", sn: "Sénégal", bf: "Burkina Faso", ml: "Mali", ne: "Niger", bj: "Bénin", tg: "Togo" };
export const countryLabel = (c: string) => COUNTRY[c] ?? "";

let fonts: Promise<[ArrayBuffer, ArrayBuffer]> | null = null;
const loadFonts = () => (fonts ??= Promise.all([
  readFile(join(process.cwd(), "src/lib/cover-fonts/bricolage-grotesque-latin-800-normal.woff")).then((b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer),
  readFile(join(process.cwd(), "src/lib/cover-fonts/instrument-sans-latin-600-normal.woff")).then((b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer),
]));

const ticks = Array.from({ length: 201 }, (_, i) => `M${i * 8 + 1} 0V${i % 5 === 0 ? 26 : 14}`).join("");

export async function coverImage(c: CoverInput): Promise<ImageResponse> {
  const [bg, ui] = await loadFonts();
  const name = c.name.normalize("NFKC");
  const slogan = sloganOf(c.slug, name);
  const size = slogan.length <= 40 ? 58 : slogan.length <= 56 ? 50 : 44;;
  const icon = P[c.slug] ?? "M4 3h6v11h10v7H4z";
  const bgPhoto = c.shotUrl ?? null;
  const avatar = c.photoUrl ?? null;
  const framed = avatar ?? bgPhoto;
  const pill = { display: "flex", alignItems: "center", borderRadius: 999, padding: "9px 22px", fontSize: 26, color: "#fff" } as const;
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: 1600, height: 600, overflow: "hidden", background: "linear-gradient(135deg,#1d3a82 0%,#27489A 55%,#3a62c4 100%)", color: "#fff", fontFamily: "UI" }}>
        <div style={{ display: "flex", position: "absolute", right: -150, top: -190, width: 560, height: 560, borderRadius: 280, background: "rgba(255,255,255,.08)" }} />
        <div style={{ display: "flex", position: "absolute", left: -170, bottom: -270, width: 520, height: 520, borderRadius: 260, background: "rgba(255,255,255,.07)" }} />
        <div style={{ display: "flex", position: "absolute", left: 40, top: 36, alignItems: "center", background: "#fff", borderRadius: 14, padding: "10px 20px 10px 14px", fontFamily: "Display", fontSize: 32, color: "#13203A", letterSpacing: -0.6 }}>
          <svg width={38} height={38} viewBox="0 0 24 24"><path d="M4 3h6v11h10v7H4z" fill="#27489A" /></svg>
          <span style={{ marginLeft: 10 }}>Bricolo</span>
        </div>
        <div style={{ display: "flex", position: "absolute", left: 360, top: 0, width: 560, height: 554, flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: "#ffb27a" }}>{c.trade}{c.trade.length <= 16 && countryLabel(c.country) ? " · " + countryLabel(c.country) : ""}</div>
          <div style={{ display: "flex", marginTop: 14, fontFamily: "Display", fontSize: size, lineHeight: 1.05, maxWidth: 540 }}>{slogan}</div>
          <div style={{ display: "flex", marginTop: 22 }}>
            {c.urgent && <span style={{ ...pill, background: "#FF6A13", marginRight: 12 }}>Urgences</span>}
            {c.verified && <span style={{ ...pill, background: "#17783F" }}><svg width={22} height={22} viewBox="0 0 24 24" style={{ marginRight: 8 }}><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" /></svg>Identité vérifiée</span>}
          </div>
        </div>
        <div style={{ display: "flex", position: "absolute", left: 940, top: 70, width: 300, height: 400, borderRadius: 22, border: "7px solid #FF6A13", overflow: "hidden", background: "#E3EAFA", transform: "rotate(2deg)", boxShadow: "0 18px 40px rgba(10,24,64,.45)", alignItems: "center", justifyContent: "center" }}>
          {framed ? <img src={framed} width={286} height={386} style={{ width: 286, height: 386, objectFit: "cover" }} /> : <svg width={170} height={170} viewBox="0 0 24 24"><path d={icon} fill="none" stroke="#27489A" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
      </div>
    ),
    { width: 1600, height: 600, fonts: [{ name: "Display", data: bg, weight: 800, style: "normal" }, { name: "UI", data: ui, weight: 600, style: "normal" }] },
  );
}

/** Données d'un artisan nécessaires à la cover : métier, pays, badge, photo de profil et première réalisation. */
export async function coverInputOf(db: { from: (t: string) => any }, id: string): Promise<(CoverInput & { userId: string; coverUrl: string | null }) | null> {
  const { data: a } = await db.from("artisans").select("id, user_id, name, country_code, verified, takes_urgent, photo_url, cover_url, trade:trades(name, slug)").eq("id", id).maybeSingle();
  if (!a) return null;
  const { data: shots } = await db.from("portfolio_photos").select("url").eq("artisan_id", id).order("created_at").limit(1);
  const t = Array.isArray(a.trade) ? a.trade[0] : a.trade;
  const ok = (u?: string | null) => (u && /^https:\/\/.+\.(jpe?g|png)(\?.*)?$/i.test(u) ? u : null); // le moteur d'image ne lit pas le webp
  return { name: a.name, trade: t?.name ?? "Artisan", slug: t?.slug ?? "", country: a.country_code, verified: !!a.verified, urgent: !!a.takes_urgent, photoUrl: ok(a.photo_url), shotUrl: ok(shots?.[0]?.url), userId: a.user_id, coverUrl: a.cover_url };
}

/** Adresse d'image Unsplash acceptée comme photo de fond : https, domaine images.unsplash.com uniquement, taille et format normalisés (le moteur d'image lit jpg et png). */
export function unsplashBg(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" || u.hostname !== "images.unsplash.com") return null;
    u.searchParams.set("w", "1600"); u.searchParams.set("q", "80"); u.searchParams.set("fm", "jpg"); u.searchParams.set("fit", "crop");
    return u.toString();
  } catch { return null; }
}

/** Mots-clés de recherche Unsplash par métier, pour trouver vite une photo qui correspond. */
export const SEARCH_BY_SLUG: Record<string, string> = {
  frigoriste: "air-conditioning-technician", mecanicien: "mechanic-garage", soudeur: "welder", peintre: "painter-wall", menuisier: "carpenter",
  ebeniste: "woodworking-furniture", nettoyage: "car-wash", macon: "bricklayer", informatique: "computer-repair", cameras: "security-camera-installation",
};

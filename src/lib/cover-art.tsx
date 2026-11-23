import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Cover « marketing » d'un artisan : aux couleurs de Bricolo, avec sa photo de réalisation en fond ou sa photo de profil. 1600×600 (le profil affiche tout, les cartes recadrent le centre en 3:2 : tout le texte reste dans la zone centrale). */
export type CoverInput = { name: string; trade: string; slug: string; country: string; verified: boolean; photoUrl?: string | null; shotUrl?: string | null };

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
  const size = name.length <= 14 ? 84 : name.length <= 22 ? 70 : name.length <= 34 ? 56 : 46;
  const icon = P[c.slug] ?? "M4 3h6v11h10v7H4z";
  const bgPhoto = c.shotUrl ?? null;
  const avatar = c.photoUrl ?? null;
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: 1600, height: 600, background: "linear-gradient(135deg,#3459b8 0%,#27489A 50%,#1b3577 100%)", color: "#fff", fontFamily: "UI" }}>
        {bgPhoto && <img src={bgPhoto} width={1600} height={600} style={{ position: "absolute", left: 0, top: 0, width: 1600, height: 600, objectFit: "cover" }} />}
        {bgPhoto && <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 1600, height: 600, background: "linear-gradient(90deg,rgba(27,53,119,.78) 0%,rgba(39,72,154,.58) 50%,rgba(27,53,119,.78) 100%)" }} />}
        {!bgPhoto && (
          <svg width={520} height={520} viewBox="0 0 24 24" style={{ position: "absolute", left: -90, top: 50, opacity: 0.07, transform: "rotate(-12deg)" }}>
            <path d={icon} fill="none" stroke="#fff" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {!bgPhoto && (
          <svg width={520} height={520} viewBox="0 0 24 24" style={{ position: "absolute", right: -90, top: 30, opacity: 0.07, transform: "rotate(10deg)" }}>
            <path d={icon} fill="none" stroke="#fff" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <div style={{ display: "flex", position: "absolute", left: 56, top: 44, alignItems: "center", fontFamily: "Display", fontSize: 30 }}>
          <svg width={34} height={34} viewBox="0 0 24 24"><path d="M4 3h6v11h10v7H4z" fill="#fff" /></svg>
          <span style={{ marginLeft: 10 }}>Bricolo</span>
        </div>
        <div style={{ display: "flex", position: "absolute", left: 350, top: 0, width: 900, height: 554, flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          {avatar ? (
            <div style={{ display: "flex", width: 150, height: 150, borderRadius: 75, border: "5px solid #fff", overflow: "hidden", background: "#E3EAFA" }}>
              <img src={avatar} width={140} height={140} style={{ width: 140, height: 140, objectFit: "cover" }} />
            </div>
          ) : (
            <div style={{ display: "flex", width: 112, height: 112, borderRadius: 56, background: "rgba(255,255,255,.14)", border: "2px solid rgba(255,255,255,.35)", alignItems: "center", justifyContent: "center" }}>
              <svg width={60} height={60} viewBox="0 0 24 24"><path d={icon} fill="none" stroke="#fff" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          )}
          <div style={{ display: "flex", marginTop: 18, fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: "#cfdcff" }}>{c.trade}</div>
          <div style={{ display: "flex", marginTop: 14, maxWidth: 860, fontFamily: "Display", fontSize: size, lineHeight: 1.05, justifyContent: "center", textAlign: "center", textShadow: bgPhoto ? "0 2px 12px rgba(10,24,64,.7)" : undefined }}>{name}</div>
          <div style={{ display: "flex", marginTop: 18, alignItems: "center", fontSize: 24, color: "#dbe5ff" }}>
            <span>{countryLabel(c.country)}</span>
            {c.verified && <span style={{ display: "flex", alignItems: "center", marginLeft: 14, background: "#17783F", color: "#fff", borderRadius: 999, padding: "7px 18px", fontSize: 22 }}><svg width={20} height={20} viewBox="0 0 24 24" style={{ marginRight: 8 }}><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" /></svg>Identité vérifiée</span>}
          </div>
        </div>
        <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: 46, background: "rgba(10,24,64,.45)" }}>
          <svg width={1600} height={46} viewBox="0 0 1600 46"><path d={ticks} stroke="rgba(255,255,255,.55)" strokeWidth={2} /></svg>
        </div>
      </div>
    ),
    { width: 1600, height: 600, fonts: [{ name: "Display", data: bg, weight: 800, style: "normal" }, { name: "UI", data: ui, weight: 600, style: "normal" }] },
  );
}

/** Données d'un artisan nécessaires à la cover : métier, pays, badge, photo de profil et première réalisation. */
export async function coverInputOf(db: { from: (t: string) => any }, id: string): Promise<(CoverInput & { userId: string; coverUrl: string | null }) | null> {
  const { data: a } = await db.from("artisans").select("id, user_id, name, country_code, verified, photo_url, cover_url, trade:trades(name, slug)").eq("id", id).maybeSingle();
  if (!a) return null;
  const { data: shots } = await db.from("portfolio_photos").select("url").eq("artisan_id", id).order("created_at").limit(1);
  const t = Array.isArray(a.trade) ? a.trade[0] : a.trade;
  const ok = (u?: string | null) => (u && /^https:\/\/.+\.(jpe?g|png)(\?.*)?$/i.test(u) ? u : null); // le moteur d'image ne lit pas le webp
  return { name: a.name, trade: t?.name ?? "Artisan", slug: t?.slug ?? "", country: a.country_code, verified: !!a.verified, photoUrl: ok(a.photo_url), shotUrl: ok(shots?.[0]?.url), userId: a.user_id, coverUrl: a.cover_url };
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

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import QRCode from "qrcode";
import { countryLabel } from "./cover-art";

/** Kit WhatsApp du Forfait Pro : affiche (1080 × 1350), statut WhatsApp (1080 × 1920) et carte de visite (1050 × 600), avec le QR code de la fiche. */
export type KitKind = "affiche" | "statut" | "carte";
export const KIT_SIZE: Record<KitKind, [number, number]> = { affiche: [1080, 1350], statut: [1080, 1920], carte: [1050, 600] };
export type KitInput = { name: string; trade: string; country: string; headline: string | null; verified: boolean; link: string; display: string };

const buf = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
let fonts: Promise<[ArrayBuffer, ArrayBuffer]> | null = null;
const loadFonts = () => (fonts ??= Promise.all([
  readFile(join(process.cwd(), "src/lib/cover-fonts/bricolage-grotesque-latin-800-normal.woff")).then(buf),
  readFile(join(process.cwd(), "src/lib/cover-fonts/instrument-sans-latin-600-normal.woff")).then(buf),
]));

function Qr({ text, size }: { text: string; size: number }) {
  const q = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = q.modules.size, cell = size / (n + 8); // 4 modules de marge blanche de chaque côté
  const rects: string[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.modules.get(x, y)) rects.push(`M${(x + 4) * cell} ${(y + 4) * cell}h${cell}v${cell}h${-cell}z`);
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><rect width={size} height={size} fill="#fff" /><path d={rects.join("")} fill="#13203A" /></svg>;
}
const Mark = ({ s }: { s: number }) => <svg width={s} height={s} viewBox="0 0 24 24"><path d="M4 3h6v11h10v7H4z" fill="#27489A" /></svg>;

export async function kitImage(kind: KitKind, k: KitInput): Promise<ImageResponse> {
  const [bg, ui] = await loadFonts();
  const [W, H] = KIT_SIZE[kind];
  const name = k.name.normalize("NFKC");
  const trade = `${k.trade}${countryLabel(k.country) ? " · " + countryLabel(k.country) : ""}`;
  const head = k.headline?.trim() || "Contactez-moi directement";
  const opts = { width: W, height: H, fonts: [{ name: "Display", data: bg, weight: 800 as const, style: "normal" as const }, { name: "UI", data: ui, weight: 600 as const, style: "normal" as const }] };
  const base = { display: "flex", position: "relative", width: W, height: H, overflow: "hidden", background: "linear-gradient(135deg,#1d3a82 0%,#27489A 55%,#3a62c4 100%)", color: "#fff", fontFamily: "UI" } as const;
  const logo = (s: number) => (
    <div style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: 14, padding: "10px 20px 10px 14px", fontFamily: "Display", fontSize: s, color: "#13203A" }}>
      <Mark s={s + 6} /><span style={{ marginLeft: 10 }}>Bricolo</span>
    </div>
  );
  const pro = <span style={{ display: "flex", alignItems: "center", background: "#FF6A13", borderRadius: 999, padding: "8px 22px", fontSize: 28, marginRight: 12 }}><svg width={26} height={26} viewBox="0 0 24 24" style={{ marginRight: 8 }}><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="#fff" /></svg>Pro</span>;
  const ver = k.verified ? <span style={{ display: "flex", alignItems: "center", background: "#17783F", borderRadius: 999, padding: "8px 22px", fontSize: 28 }}><svg width={26} height={26} viewBox="0 0 24 24" style={{ marginRight: 8 }}><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" /></svg>Identité vérifiée</span> : null;

  if (kind === "carte") {
    return new ImageResponse((
      <div style={base}>
        <div style={{ display: "flex", position: "absolute", right: -120, top: -160, width: 460, height: 460, borderRadius: 230, background: "rgba(255,255,255,.08)" }} />
        <div style={{ display: "flex", position: "absolute", left: 44, top: 40 }}>{logo(30)}</div>
        <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 44, top: 140, width: 620 }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: "#ffb27a" }}>{trade}</div>
          <div style={{ display: "flex", fontFamily: "Display", fontSize: name.length > 22 ? 48 : 60, lineHeight: 1.05, marginTop: 10 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 30, marginTop: 14, lineHeight: 1.25 }}>{head}</div>
          <div style={{ display: "flex", marginTop: 22 }}>{pro}{ver}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "absolute", right: 44, top: 70 }}>
          <div style={{ display: "flex", background: "#fff", borderRadius: 18, padding: 10 }}><Qr text={k.link} size={330} /></div>
          <div style={{ display: "flex", fontSize: 24, marginTop: 14 }}>Scannez pour me contacter</div>
        </div>
        <div style={{ display: "flex", position: "absolute", left: 44, bottom: 30, fontSize: 24, color: "#cfd9f5" }}>{k.display}</div>
      </div>
    ), opts);
  }

  const tall = kind === "statut";
  return new ImageResponse((
    <div style={{ ...base, flexDirection: "column", alignItems: "center", padding: tall ? "120px 70px" : "70px" }}>
      <div style={{ display: "flex", position: "absolute", right: -200, top: -220, width: 700, height: 700, borderRadius: 350, background: "rgba(255,255,255,.08)" }} />
      <div style={{ display: "flex", position: "absolute", left: -240, bottom: -300, width: 680, height: 680, borderRadius: 340, background: "rgba(255,255,255,.07)" }} />
      {logo(tall ? 48 : 42)}
      <div style={{ display: "flex", marginTop: tall ? 110 : 60, fontSize: tall ? 34 : 30, letterSpacing: 5, textTransform: "uppercase", color: "#ffb27a", textAlign: "center" }}>{trade}</div>
      <div style={{ display: "flex", marginTop: 18, fontFamily: "Display", fontSize: name.length > 20 ? (tall ? 84 : 72) : (tall ? 104 : 90), lineHeight: 1.02, textAlign: "center" }}>{name}</div>
      <div style={{ display: "flex", marginTop: 30, fontSize: tall ? 48 : 42, lineHeight: 1.2, textAlign: "center", maxWidth: 900 }}>{head}</div>
      <div style={{ display: "flex", marginTop: 34 }}>{pro}{ver}</div>
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", background: "#fff", borderRadius: 28, padding: 14 }}><Qr text={k.link} size={tall ? 560 : 470} /></div>
      <div style={{ display: "flex", marginTop: 26, fontFamily: "Display", fontSize: tall ? 52 : 44 }}>Scannez pour me contacter</div>
      <div style={{ display: "flex", marginTop: 10, fontSize: 28, color: "#cfd9f5" }}>{k.display}</div>
    </div>
  ), opts);
}

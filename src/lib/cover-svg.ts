/** Cover par défaut dessinée en SVG (sans texte, sans police) aux couleurs de Bricolo : dégradé bleu, règle graduée, grand motif du métier en filigrane. Format 1600 × 600. */
const ICON: Record<string, string> = {
  frigoriste: "M12 2v20M4.5 7l15 10M19.5 7l-15 10M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5M3 9.5l3.5.5-.5 3.5M21 14.5l-3.5-.5.5-3.5",
  mecanicien: "M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.2-.6-.6-2.2z",
  carrossier: "M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.2-.6-.6-2.2z",
  soudeur: "M13 2L5 13h6l-1 9 9-12h-6z",
  peintre: "M5 4h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM19 7.5h2v4h-8v3M11 14.5h4v7h-4z",
  menuisier: "M3 20L14 9M12 7l5 5M15 4l5 5-3 3-5-5zM4 21l1.5-4.5L9 20z",
  ebeniste: "M6 3h12v8H6zM6 11v10M18 11v10M6 16h12",
  nettoyage: "M8 3h5v4H8zM10.5 7v3M6 10h10v11H6zM16 5l2-2M17 8h3M16 11l2 2",
  "femme-de-menage": "M8 3h5v4H8zM10.5 7v3M6 10h10v11H6zM16 5l2-2M17 8h3M16 11l2 2",
  macon: "M3 5h18v5H3zM3 14h18v5H3zM9 5v5M15 14v5M12 10v4",
  informatique: "M5 5h14v10H5zM2 19h20M9 19l1-4h4l1 4",
  cameras: "M3 8h13v8H3zM16 11l5-3v8l-5-3M7 5l3 3",
  electricien: "M13 2L5 13h6l-1 9 9-12h-6z",
  plombier: "M7 3v6a5 5 0 0 0 10 0V3M12 14v7M8 21h8",
  carreleur: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
  serrurier: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5zM12 15v3",
  couvreur: "M2 12l10-8 10 8M5 11v9h14v-9",
  solaire: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
  jardinier: "M12 21v-9M12 12c0-5 4-8 8-8 0 5-3 8-8 8zM12 15c0-4-3-6-7-6 0 4 3 6 7 6z",
  plaquiste: "M3 5h18v14H3zM3 12h18M12 5v14",
  vitrier: "M5 3h14v18H5zM9 7l6 4M9 12l6 4",
  tapissier: "M5 11a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6H5zM3 17h18M7 17v3M17 17v3",
  puisatier: "M4 21h16M6 21V9h12v12M9 9V4h6v5M12 12v6",
  electromenager: "M6 3h12v18H6zM9 6h2M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
};
const HUES: Record<string, [string, string, string]> = {};
const PAL: [string, string, string][] = [["#1d3a82", "#27489A", "#3a62c4"], ["#17335f", "#1f4f8f", "#3a7bc4"], ["#243b7a", "#3b3f9f", "#5a62d4"]];
const pal = (slug: string) => (HUES[slug] ??= PAL[[...slug].reduce((n, c) => n + c.charCodeAt(0), 0) % PAL.length]);

export function coverSvg(slug: string): string {
  const [a, b, c] = pal(slug);
  const icon = ICON[slug] ?? "M4 3h6v11h10v7H4z";
  const ticks = Array.from({ length: 101 }, (_, i) => `M${i * 16 + 8} 600V${i % 5 === 0 ? 566 : 584}`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 600" width="1600" height="600" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
<rect width="1600" height="600" fill="url(#g)"/>
<circle cx="1420" cy="40" r="300" fill="#fff" fill-opacity=".07"/><circle cx="160" cy="620" r="280" fill="#fff" fill-opacity=".06"/>
<g transform="translate(760 20) scale(34)" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width=".55" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></g>
<path d="${ticks}" stroke="#fff" stroke-opacity=".3" stroke-width="2"/>
<rect x="0" y="0" width="1600" height="10" fill="#FF6A13"/>
</svg>`;
}
export const hasCoverSvg = (slug: string) => /^[a-z0-9-]{2,40}$/.test(slug);

/** Drapeaux en SVG (les emojis de drapeaux ne s'affichent pas sous Windows). Rapport 3:2. */
const V = (a: string, b: string, c: string) => <><rect width="10" height="20" fill={a} /><rect x="10" width="10" height="20" fill={b} /><rect x="20" width="10" height="20" fill={c} /></>;
const H = (a: string, b: string, c: string) => <><rect width="30" height="7" fill={a} /><rect y="7" width="30" height="6" fill={b} /><rect y="13" width="30" height="7" fill={c} /></>;
const star = (cx: number, cy: number, r: number, fill: string) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.4 : r; return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`; }).join(" ");
  return <polygon points={pts} fill={fill} />;
};
const ART: Record<string, React.ReactNode> = {
  ci: V("#f77f00", "#fff", "#009e60"),
  sn: <>{V("#00853f", "#fdef42", "#e31b23")}{star(15, 10, 4.2, "#00853f")}</>,
  ml: V("#14b53a", "#fcd116", "#ce1126"),
  bf: <><rect width="30" height="10" fill="#ef2b2d" /><rect y="10" width="30" height="10" fill="#009e49" />{star(15, 10.3, 5, "#fcd116")}</>,
  ne: <>{H("#e05206", "#fff", "#0db02b")}<circle cx="15" cy="10" r="2.6" fill="#e05206" /></>,
  bj: <><rect width="12" height="20" fill="#008751" /><rect x="12" width="18" height="10" fill="#fcd116" /><rect x="12" y="10" width="18" height="10" fill="#e8112d" /></>,
  tg: <>{[0, 1, 2, 3, 4].map((i) => <rect key={i} y={i * 4} width="30" height="4" fill={i % 2 ? "#ffce00" : "#006a4e"} />)}<rect width="12" height="12" fill="#d21034" />{star(6, 6, 3.4, "#fff")}</>,
};

export default function Flag({ code, size = 20 }: { code: string; size?: number }) {
  const art = ART[code];
  if (!art) return null;
  return (
    <svg className="flag" width={size} height={Math.round((size * 2) / 3)} viewBox="0 0 30 20" preserveAspectRatio="none" role="img" aria-label="" aria-hidden="true">
      <g>{art}</g>
    </svg>
  );
}

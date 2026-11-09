/** Petit histogramme en SVG (aucune dépendance). Une barre par jour ; les valeurs sont lisibles au survol et au lecteur d'écran. */
export default function BarChart({ data, label, unit = "", color = "var(--brand)" }: { data: { d: string; v: number }[]; label: string; unit?: string; color?: string }) {
  const max = Math.max(1, ...data.map((x) => x.v));
  const w = 100 / data.length;
  const total = data.reduce((s, x) => s + x.v, 0);
  return (
    <figure className="chart" aria-label={`${label} : ${total}${unit} sur ${data.length} jours`}>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-hidden="true">
        {data.map((x, i) => {
          const h = (x.v / max) * 36;
          return <rect key={x.d} x={i * w + w * 0.14} y={40 - h - 0.5} width={w * 0.72} height={Math.max(h, x.v ? 0.8 : 0.35)} rx="0.6" fill={color} opacity={x.v ? 1 : 0.25}><title>{`${x.d} : ${x.v}${unit}`}</title></rect>;
        })}
      </svg>
      <figcaption><span>{data[0]?.d.slice(5).replace("-", "/")}</span><b>{label}</b><span>{data.at(-1)?.d.slice(5).replace("-", "/")}</span></figcaption>
    </figure>
  );
}

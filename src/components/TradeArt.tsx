import type { ReactNode } from "react";
import TradeIcon from "@/components/TradeIcon";

/**
 * Scènes illustrées par métier, utilisées quand un artisan n'a ni couverture ni photo.
 * Vectoriel, sans photo ni droit à l'image. Les couleurs viennent de `currentColor` (donc de la marque et du thème),
 * en trois intensités : fond (léger), forme (moyen), détail (plein).
 */
const soft = { fill: "currentColor", fillOpacity: 0.16 } as const;
const mid = { fill: "currentColor", fillOpacity: 0.38 } as const;
const solid = { fill: "currentColor" } as const;
const ink = { stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
const ground = <rect x="0" y="102" width="160" height="18" {...soft} />;

const SCENES: Record<string, ReactNode> = {
  // Climatisation : unité murale, flux d'air et flocon.
  frigoriste: (<>
    <rect x="34" y="26" width="84" height="32" rx="6" {...mid} />
    <path d="M44 46h64" {...ink} strokeWidth={2} />
    <path d="M48 66c6 6 12 6 18 0s12-6 18 0 12 6 18 0" {...ink} />
    <path d="M52 80c6 6 12 6 18 0s12-6 18 0 12 6 18 0" {...ink} />
    <g {...ink} strokeWidth={2.5}><path d="M126 36v20M116 46h20M119 39l14 14M133 39l-14 14" /></g>
    {ground}
  </>),
  // Mécanique : voiture de profil et roues.
  mecanicien: (<>
    <path d="M22 84l12-18 28-5h22l20 9 22 4 8 7v8H22z" {...mid} />
    <path d="M54 66l8-12h18l-2 12z" {...soft} />
    <circle cx="50" cy="88" r="10" {...solid} /><circle cx="50" cy="88" r="4" {...soft} />
    <circle cx="112" cy="88" r="10" {...solid} /><circle cx="112" cy="88" r="4" {...soft} />
    {ground}
  </>),
  // Menuiserie : porte à panneaux et poignée.
  menuisier: (<>
    <rect x="50" y="20" width="60" height="82" rx="3" {...mid} />
    <rect x="58" y="28" width="44" height="30" rx="2" {...ink} strokeWidth={2} />
    <rect x="58" y="64" width="44" height="30" rx="2" {...ink} strokeWidth={2} />
    <circle cx="98" cy="66" r="3" {...solid} />
    {ground}
  </>),
  // Ébénisterie : fauteuil en bois sur mesure.
  ebeniste: (<>
    <rect x="50" y="26" width="52" height="40" rx="6" {...mid} />
    <rect x="42" y="66" width="68" height="10" rx="3" {...solid} />
    <path d="M48 76v26M104 76v26" {...ink} strokeWidth={5} />
    <path d="M62 36v22M80 36v22M98 36v22" {...ink} strokeWidth={2} />
    {ground}
  </>),
  // Électricité : tableau de répartition et éclair.
  electricien: (<>
    <rect x="46" y="24" width="68" height="62" rx="8" {...mid} />
    <path d="M86 34L68 62h12l-6 22 18-30H80z" {...solid} />
    <path d="M114 58c10 0 18 8 18 18v26" {...ink} strokeWidth={3} />
    {ground}
  </>),
  // Plomberie : tuyau coudé, robinet et gouttes.
  plombier: (<>
    <path d="M26 46h64q14 0 14 14v44" {...ink} strokeWidth={9} stroke="currentColor" opacity={0.5} />
    <rect x="16" y="40" width="16" height="14" rx="3" {...solid} />
    <rect x="22" y="30" width="4" height="10" {...solid} />
    <path d="M120 58c6 10 6 16 0 22-6-6-6-12 0-22z" {...solid} />
    <path d="M132 70c4 7 4 11 0 15-4-4-4-8 0-15z" {...mid} />
    {ground}
  </>),
  // Peinture : rouleau sur un mur à moitié peint.
  peintre: (<>
    <rect x="16" y="20" width="128" height="82" rx="3" {...soft} />
    <rect x="16" y="20" width="62" height="82" rx="3" {...mid} />
    <rect x="84" y="28" width="40" height="16" rx="4" {...solid} />
    <path d="M124 44l16 28" {...ink} strokeWidth={4} />
    <rect x="136" y="68" width="10" height="20" rx="3" {...solid} />
    {ground}
  </>),
  // Soudure : étincelles, torche et tôle.
  soudeur: (<>
    <rect x="18" y="74" width="124" height="14" rx="2" {...mid} />
    <path d="M44 42L92 70" {...ink} strokeWidth={7} />
    <path d="M82 66q12-10 24 0" {...ink} strokeWidth={2} />
    <circle cx="104" cy="58" r="2" {...solid} /><circle cx="114" cy="48" r="2.5" {...solid} />
    <circle cx="122" cy="62" r="1.8" {...solid} /><circle cx="110" cy="36" r="1.6" {...solid} />
    {ground}
  </>),
  // Maçonnerie : mur de briques et truelle.
  macon: (<>
    {[0, 1, 2, 3].map((r) => (
      <g key={r}>
        {[0, 1, 2].map((c) => (
          <rect key={c} x={(r % 2 ? 36 : 24) + c * 38} y={26 + r * 16} width="34" height="13" rx="1" {...(r % 2 ? mid : soft)} />
        ))}
      </g>
    ))}
    <path d="M30 96h36" {...ink} strokeWidth={4} />
    <path d="M66 96l22-6" {...ink} strokeWidth={4} />
    {ground}
  </>),
  // Tapisserie : fauteuil rembourré.
  tapissier: (<>
    <rect x="38" y="40" width="84" height="36" rx="12" {...mid} />
    <rect x="26" y="56" width="20" height="34" rx="7" {...solid} />
    <rect x="114" y="56" width="20" height="34" rx="7" {...solid} />
    <rect x="46" y="70" width="68" height="16" rx="4" {...solid} />
    <path d="M52 40v30M80 40v30M108 40v30" {...ink} strokeWidth={1.5} />
    {ground}
  </>),
  // Carrelage : grille de carreaux et un carreau posé.
  carreleur: (<>
    {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
      <rect key={`${r}-${c}`} x={20 + c * 32} y={26 + r * 24} width="28" height="20" rx="2" {...(r === 1 && c === 2 ? solid : mid)} />
    )))}
    <path d="M118 96l22-12" {...ink} strokeWidth={4} />
    {ground}
  </>),
  // Plâtrerie : cloison en plaques, vis et plaque en cours de pose.
  plaquiste: (<>
    <rect x="20" y="22" width="120" height="78" rx="3" {...soft} />
    <path d="M60 22v78M104 22v78" {...ink} strokeWidth={2} />
    <rect x="66" y="36" width="34" height="46" rx="2" {...mid} transform="rotate(-6 83 59)" />
    {[0, 1].map((i) => <circle key={i} cx={74 + i * 22} cy={44} r="1.8" {...solid} />)}
    <circle cx="74" cy="74" r="1.8" {...solid} /><circle cx="92" cy="74" r="1.8" {...solid} />
    {ground}
  </>),
  // Serrurerie : cadenas et trou de serrure.
  serrurier: (<>
    <path d="M58 62V46a22 22 0 0 1 44 0v16" {...ink} strokeWidth={8} />
    <rect x="46" y="58" width="68" height="50" rx="9" {...solid} />
    <rect x="78" y="76" width="4" height="12" rx="2" {...soft} />
    <circle cx="80" cy="78" r="5" {...soft} />
    {ground}
  </>),
  // Couverture : toit en tuiles et maison.
  couvreur: (<>
    <rect x="34" y="68" width="92" height="32" {...soft} />
    <path d="M16 70L80 24l64 46z" {...mid} />
    <path d="M36 58h88M50 48h60M64 37h32" {...ink} strokeWidth={1.5} />
    <rect x="70" y="80" width="20" height="22" rx="2" {...solid} />
    {ground}
  </>),
  // Électroménager : lave-linge et son hublot.
  electromenager: (<>
    <rect x="40" y="22" width="80" height="78" rx="9" {...mid} />
    <circle cx="80" cy="66" r="24" {...soft} stroke="currentColor" strokeWidth={4} />
    <circle cx="80" cy="66" r="12" {...ink} strokeWidth={2} />
    <circle cx="56" cy="36" r="3" {...solid} /><circle cx="68" cy="36" r="3" {...solid} />
    <path d="M96 36h14" {...ink} strokeWidth={2} />
    {ground}
  </>),
  // Vitrerie : fenêtre à petits carreaux.
  vitrier: (<>
    <rect x="36" y="22" width="88" height="76" rx="3" {...mid} />
    <rect x="46" y="32" width="30" height="24" rx="1" {...soft} />
    <rect x="84" y="32" width="30" height="24" rx="1" {...soft} />
    <rect x="46" y="64" width="30" height="24" rx="1" {...soft} />
    <rect x="84" y="64" width="30" height="24" rx="1" {...soft} />
    <path d="M52 40l8-4M52 72l8-4" {...ink} strokeWidth={2} />
    {ground}
  </>),
  // Vidéosurveillance : caméra et ondes d'alarme.
  cameras: (<>
    <rect x="30" y="52" width="72" height="40" rx="7" {...solid} />
    <circle cx="66" cy="72" r="13" {...soft} />
    <circle cx="66" cy="72" r="6" {...solid} />
    <rect x="48" y="42" width="22" height="12" rx="2" {...solid} />
    <path d="M112 56q8 8 0 16M122 48q14 14 0 30" {...ink} strokeWidth={3} />
    {ground}
  </>),
  // Solaire : panneau incliné et soleil.
  solaire: (<>
    <circle cx="132" cy="26" r="11" {...solid} />
    <path d="M30 56L112 36l14 42-82 20z" {...mid} />
    <path d="M47 52l13 36M68 47l13 36M89 42l13 36M30 70l82-20" {...ink} strokeWidth={1.5} />
    <path d="M84 96v8M78 104h12" {...ink} strokeWidth={3} />
    {ground}
  </>),
  // Carrosserie : portière bosselée et bombe de peinture.
  carrossier: (<>
    <rect x="36" y="32" width="70" height="60" rx="10" {...mid} />
    <path d="M60 52q10-8 20 2q4 10-4 16q-10 4-16-4z" {...soft} />
    <rect x="114" y="44" width="16" height="36" rx="4" {...solid} />
    <rect x="118" y="36" width="8" height="8" {...solid} />
    <circle cx="136" cy="36" r="2.5" {...solid} /><circle cx="142" cy="46" r="2" {...solid} /><circle cx="134" cy="52" r="2" {...solid} />
    {ground}
  </>),
  // Jardinage : plante en pot et feuilles.
  jardinier: (<>
    <path d="M56 80h48l-6 24H62z" {...solid} />
    <path d="M80 80V40" {...ink} strokeWidth={3} />
    <ellipse cx="66" cy="54" rx="15" ry="7" {...mid} transform="rotate(-30 66 54)" />
    <ellipse cx="94" cy="46" rx="15" ry="7" {...mid} transform="rotate(30 94 46)" />
    <ellipse cx="78" cy="30" rx="10" ry="6" {...soft} />
    {ground}
  </>),
  // Nettoyage : seau d'eau et étincelles de propreté.
  nettoyage: (<>
    <path d="M48 56h64l-8 44H56z" {...solid} />
    <ellipse cx="80" cy="56" rx="32" ry="6" {...mid} />
    <path d="M126 24v14M119 31h14M134 48v10M129 53h10" {...ink} strokeWidth={2} />
    <rect x="22" y="38" width="22" height="14" rx="3" {...mid} />
    {ground}
  </>),
  // Puits : margelle, poulie et seau.
  puisatier: (<>
    <path d="M46 30v26M114 30v26" {...ink} strokeWidth={4} />
    <path d="M36 28h88" {...ink} strokeWidth={5} />
    <path d="M80 30v22" {...ink} strokeWidth={2} />
    <rect x="46" y="54" width="68" height="46" rx="4" {...mid} />
    <ellipse cx="80" cy="54" rx="30" ry="7" {...solid} />
    <path d="M74 60h12l-2 10h-8z" {...soft} />
    {ground}
  </>),
  // Informatique : ordinateur portable et téléphone.
  informatique: (<>
    <rect x="28" y="30" width="82" height="54" rx="5" {...mid} />
    <rect x="34" y="36" width="70" height="42" rx="2" {...soft} />
    <rect x="22" y="86" width="94" height="7" rx="3" {...solid} />
    <rect x="116" y="50" width="28" height="48" rx="6" {...solid} />
    <rect x="121" y="58" width="18" height="30" rx="2" {...soft} />
    {ground}
  </>),
  // Ménage : balai et flacon de produit.
  "femme-de-menage": (<>
    <path d="M48 22L92 92" {...ink} strokeWidth={4} />
    <path d="M80 84h30l8 18H72z" {...solid} />
    <rect x="116" y="58" width="22" height="42" rx="5" {...mid} />
    <rect x="122" y="48" width="10" height="10" rx="2" {...solid} />
    <path d="M126 30v10M121 35h10" {...ink} strokeWidth={2} />
    <circle cx="136" cy="22" r="2" {...solid} />
    {ground}
  </>),
  // Conduite : volant et route.
  chauffeur: (<>
    <circle cx="80" cy="56" r="34" {...ink} strokeWidth={9} />
    <circle cx="80" cy="56" r="9" {...solid} />
    <path d="M52 62l-16 8M108 62l16 8M80 65v30" {...ink} strokeWidth={6} />
    <path d="M14 110h132" {...ink} strokeWidth={2} strokeDasharray="10 8" />
    {ground}
  </>),
  // Bus : carrosserie, vitres et roues.
  machiniste: (<>
    <rect x="26" y="30" width="108" height="62" rx="12" {...mid} />
    <rect x="34" y="38" width="92" height="26" rx="5" {...soft} />
    <path d="M70 38v26" {...ink} strokeWidth={2} />
    <rect x="26" y="74" width="108" height="6" {...solid} />
    <circle cx="56" cy="96" r="9" {...solid} /><circle cx="56" cy="96" r="3.5" {...soft} />
    <circle cx="106" cy="96" r="9" {...solid} /><circle cx="106" cy="96" r="3.5" {...soft} />
    <circle cx="128" cy="82" r="3" {...solid} />
    {ground}
  </>),
};

/** Illustration du métier : scène détaillée si elle existe, sinon son icône. */
export default function TradeArt({ slug }: { slug: string }) {
  const scene = SCENES[slug];
  if (!scene) return <TradeIcon slug={slug} />;
  return (
    <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true" focusable="false">
      {scene}
    </svg>
  );
}

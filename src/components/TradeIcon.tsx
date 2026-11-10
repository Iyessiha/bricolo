import type { ReactNode } from "react";

/** Une icône dessinée par métier, au trait, à la couleur de la marque. */
const P: Record<string, ReactNode> = {
  plombier: <><path d="M4 8h8a4 4 0 0 1 4 4v2" /><path d="M13 8V5M10 5h6" /><path d="M16 17c-1.2 1.6-2 2.6-2 3.6a2 2 0 0 0 4 0c0-1-.8-2-2-3.6z" /></>,
  electricien: <path d="M13 2 5 13h6l-1 9 8-11h-6z" />,
  frigoriste: <><path d="M12 2v20M4.2 7l15.6 10M19.8 7 4.2 17" /><path d="M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" /></>,
  macon: <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M3 10h18M3 15h18M9 5v5M15 10v5M9 15v4" /></>,
  peintre: <><rect x="4" y="3" width="14" height="5" rx="1" /><path d="M18 5.5h2v5h-9v3" /><rect x="9.5" y="13.5" width="3" height="7" rx="1" /></>,
  mecanicien: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  menuisier: <g transform="rotate(45 12 12)"><rect x="4" y="3" width="16" height="6" rx="1.5" /><path d="M12 9v13" /></g>,
  ebeniste: <><path d="M7 3h10v8H7z" /><path d="M5 11h14v3H5zM7 14v7M17 14v7" /></>,
  soudeur: <><path d="M3 21 12.5 11.5" /><path d="M16 9V4M16 9l3.5-3.5M16 9h5M16 9l3.5 3.5M16 9l-3.5-3.5" /><path d="M12 17h9" /></>,
  tapissier: <><path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" /><path d="M2 14a2 2 0 0 1 4 0v1h12v-1a2 2 0 0 1 4 0v4H2z" /><path d="M5 18v2M19 18v2" /></>,
  carreleur: <><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></>,
  plaquiste: <><path d="M3 4h18M7 4v4M17 4v4" /><rect x="3" y="8" width="18" height="9" rx="1" /><path d="M12 8v9" /><circle cx="7.5" cy="12.5" r=".7" /><circle cx="16.5" cy="12.5" r=".7" /><path d="M3 20h18" /></>,
  serrurier: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l3 3M14 9l2 2" /></>,
  couvreur: <><path d="M2 13 12 4l10 9" /><path d="M5.5 13.5 12 8l6.5 5.5M8 17.5l4-3.2 4 3.2M5 21h14" /></>,
  electromenager: <><rect x="4" y="2" width="16" height="20" rx="2" /><circle cx="12" cy="14" r="4.5" /><path d="M7.5 6h1M11 6h1.5" /></>,
  vitrier: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M12 3v18M4 12h16M7 8l2-2" /></>,
  cameras: <><g transform="rotate(10 11 9.5)"><rect x="3" y="6" width="15" height="7" rx="2" /><circle cx="15" cy="9.5" r="1.6" /></g><path d="M8 14.5V20M5 21h6" /></>,
  solaire: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  carrossier: <><path d="M3 14l2-6a2 2 0 0 1 2-1.4h10a2 2 0 0 1 2 1.4l2 6v4H3z" /><circle cx="7.5" cy="17" r="1.5" /><circle cx="16.5" cy="17" r="1.5" /><path d="M3 12h18" /></>,
  jardinier: <><path d="M12 21v-9" /><path d="M12 12C12 7 8 5 4 5c0 5 3 7 8 7z" /><path d="M12 14c0-4 3-6 8-6 0 4-3 6-8 6z" /></>,
  nettoyage: <><rect x="7" y="10" width="8" height="12" rx="2" /><path d="M9 10V7h5l3-2M17 8h3M17 5h3" /></>,
  puisatier: <><path d="M5 20V10M19 20V10M3 10h18M12 10v5" /><path d="M10 15h4l-.6 4h-2.8zM3 20h18" /></>,
  informatique: <><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></>,
  tous: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></>,
};
const DEFAULT = P.mecanicien;

export default function TradeIcon({ slug }: { slug: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {P[slug] ?? DEFAULT}
    </svg>
  );
}

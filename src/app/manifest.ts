import type { MetadataRoute } from "next";

/** Rend Bricolo installable sur l'écran d'accueil (Android, iPhone, ordinateur). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bricolo : artisans de confiance",
    short_name: "Bricolo",
    description: "Trouvez un artisan vérifié près de chez vous en Afrique de l’Ouest francophone : plombier, électricien, menuisier, frigoriste…",
    lang: "fr",
    dir: "ltr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef1f6",
    theme_color: "#27489a",
    categories: ["business", "lifestyle", "utilities"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/192?m=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icon/512?m=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Trouver un artisan", short_name: "Chercher", url: "/resultats?source=pwa", icons: [{ src: "/pwa-icon/192", sizes: "192x192", type: "image/png" }] },
      { name: "Mon espace artisan", short_name: "Mon espace", url: "/tableau-de-bord?source=pwa", icons: [{ src: "/pwa-icon/192", sizes: "192x192", type: "image/png" }] },
    ],
  };
}

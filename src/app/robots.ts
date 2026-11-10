import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/tableau-de-bord", "/avis/", "/activation", "/boosts", "/forfait", "/nouveau-mot-de-passe", "/mot-de-passe-oublie", "/desabonnement", "/auth/", "/connexion", "/conditions-boosts"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

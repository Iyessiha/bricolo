import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Téléversement d'images par l'administration (photos par défaut des métiers).
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  // Les polices de la cover sont lues sur le disque : on les inclut dans les fonctions qui génèrent l'image.
  outputFileTracingIncludes: { "/admin/covers": ["./src/lib/cover-fonts/**/*"], "/admin/covers/image/[id]": ["./src/lib/cover-fonts/**/*"] },
  poweredByHeader: false,
  // Les navigateurs et Google demandent /favicon.ico par défaut : on le sert depuis l'icône du site au lieu de répondre 404.
  async rewrites() { return [{ source: "/favicon.ico", destination: "/icon" }]; },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Frame-Options", value: "DENY" },
      // La politique de sécurité des contenus (CSP) est posée par src/middleware.ts : elle intègre les domaines des pixels personnalisés.
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
    ] }];
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.join(root, "src");
    return config;
  },
};
export default nextConfig;

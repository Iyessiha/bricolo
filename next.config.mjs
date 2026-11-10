import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const dev = process.env.NODE_ENV !== "production";
let supa = "";
try { supa = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin; } catch {}
const csp = [
  "default-src 'self'",
  // Pixels de mesure : uniquement les domaines officiels de Google Analytics, Meta et TikTok.
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: ${supa} https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://analytics.tiktok.com https://*.tiktok.com`.replace(/\s+/g, " ").trim(),
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${supa} ${supa.replace("https://", "wss://")} https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net https://analytics.tiktok.com https://*.tiktok.com${dev ? " ws:" : ""}`.replace(/\s+/g, " ").trim(),
  "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: csp },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.join(root, "src");
    return config;
  },
};
export default nextConfig;

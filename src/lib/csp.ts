/** Politique de sécurité des contenus. Les domaines des pixels personnalisés s'ajoutent à la volée (voir middleware). */
const GOOGLE = ["https://www.googletagmanager.com", "https://www.google-analytics.com", "https://*.google-analytics.com", "https://*.analytics.google.com", "https://www.googleadservices.com", "https://googleads.g.doubleclick.net", "https://stats.g.doubleclick.net", "https://*.doubleclick.net", "https://www.google.com"];
const META = ["https://connect.facebook.net", "https://www.facebook.com"];
const TIKTOK = ["https://analytics.tiktok.com", "https://*.tiktok.com"];

export function buildCsp(opts: { supabaseUrl?: string; dev: boolean; extraHosts?: string[] }) {
  let supa = "";
  try { supa = new URL(opts.supabaseUrl ?? "").origin; } catch {}
  const extra = (opts.extraHosts ?? []).map((h) => `https://${h}`);
  const j = (...a: (string | string[])[]) => a.flat().filter(Boolean).join(" ");
  return [
    "default-src 'self'",
    `script-src ${j("'self' 'unsafe-inline'", GOOGLE.slice(0, 1), META.slice(0, 1), TIKTOK.slice(0, 1), "https://www.googleadservices.com", extra, opts.dev ? "'unsafe-eval'" : "")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src ${j("'self' data: blob:", supa, GOOGLE, META.slice(1), TIKTOK, extra)}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${j("'self'", supa, supa.replace("https://", "wss://"), GOOGLE, META, TIKTOK, extra, opts.dev ? "ws:" : "")}`,
    "frame-src https://www.googletagmanager.com",
    "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'",
  ].join("; ");
}

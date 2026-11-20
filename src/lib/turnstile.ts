import "server-only";

/** Cloudflare Turnstile (CAPTCHA discret). Sans clés configurées, la vérification est ignorée : le site fonctionne comme avant. */
export const turnstileEnabled = () => Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);

export async function turnstileOk(fd: FormData, ip?: string): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  const token = String(fd.get("cf-turnstile-response") ?? "");
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
    if (ip && ip !== "inconnue") body.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(4000) });
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return true; // Cloudflare injoignable : on ne bloque pas les vrais utilisateurs (les limites en base restent actives)
  }
}

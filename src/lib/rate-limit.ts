import "server-only";
import { headers } from "next/headers";

/**
 * Limite de requêtes « au mieux » : mémoire de l'instance serveur. Elle freine les robots simples (rafales depuis une même adresse)
 * mais n'est pas partagée entre instances : les limites strictes (comptes, demandes par jour) restent en base, et Turnstile complète.
 */
const hits = new Map<string, number[]>();

export function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return list.length > max;
}

/** Adresse du visiteur (en-têtes Vercel), ou « inconnue ». */
export async function visitorIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "inconnue";
}

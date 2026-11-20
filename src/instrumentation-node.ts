import { notifyAppError } from "@/lib/email-flows";

/** Écrit l'erreur dans les journaux Vercel et prévient les administrateurs par e-mail (au plus un message par demi-heure). */
export async function reportError(err: unknown, request: { path: string; method: string }, routeType: string) {
  const e = err as { message?: string; digest?: string };
  console.error("[erreur]", request.method, request.path, routeType, e?.message ?? err);
  try { await notifyAppError({ path: request.path, method: request.method, message: String(e?.message ?? err), digest: e?.digest }); }
  catch { /* la surveillance ne doit jamais aggraver une panne */ }
}

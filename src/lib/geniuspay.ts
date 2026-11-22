import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Adaptateur GeniusPay.
 * Mode « mock » : paiement simulé en local (aucun appel réseau).
 * Mode « live » : API marchande GeniusPay (https://pay.genius.ci/doc), authentifiée par X-API-Key + X-API-Secret.
 * Tout le reste du code ne parle qu’à ces deux fonctions.
 */
/** Valeur lue, sans espaces ni majuscules : « Live », « live » ou « live  » (copié-collé) ouvrent tous le paiement. */
export const modeValue = () => (process.env.GENIUSPAY_MODE ?? "").trim().toLowerCase();
/** « live » appelle l'API GeniusPay ; ce sont les clés (pk_sandbox_… ou pk_live_…) qui décident si l'argent est réel. « sandbox » et « test » sont acceptés comme synonymes. */
export const isLive = () => ["live", "sandbox", "test"].includes(modeValue());
/** Le paiement simulé n’existe jamais en production : sans mode « live », les paiements sont simplement fermés (jamais gratuits). */
export const isMock = () => modeValue() === "mock" && process.env.VERCEL_ENV !== "production";
/** Pour comprendre une fermeture : ce que le serveur lit vraiment (le mode n'est pas un secret). */
export const modeDiagnostic = () => ({ mode: modeValue() || "absent", env: process.env.VERCEL_ENV ?? "inconnu", cles: Boolean(process.env.GENIUSPAY_API_KEY && process.env.GENIUSPAY_API_SECRET) });
export const paymentsOpen = () => isLive() || isMock();

const API = () => ((process.env.GENIUSPAY_API_URL ?? "").trim() || "https://pay.genius.ci/api/v1/merchant").replace(/\/$/, "");

export async function createCheckout(o: { reference: string; amount: number; currency: string; description: string; returnUrl: string; webhookUrl: string; customerEmail: string }) {
  if (!paymentsOpen()) throw new Error(`paiements_fermes (mode lu : « ${modeValue() || "absent"} », environnement : ${process.env.VERCEL_ENV ?? "inconnu"})`);
  if (isMock()) return { checkoutUrl: `${new URL(o.returnUrl).origin}/api/dev/confirm?ref=${encodeURIComponent(o.reference)}` };
  // Retour en cas d'échec ou d'abandon : même page, sans « paye », avec un message.
  const err = new URL(o.returnUrl); err.searchParams.delete("paye"); err.searchParams.set("erreur", "Le paiement n’a pas abouti. Aucun montant n’a été débité.");
  const res = await fetch(`${API()}/payments`, {
    method: "POST", signal: AbortSignal.timeout(20000),
    headers: { "content-type": "application/json", "x-api-key": (process.env.GENIUSPAY_API_KEY ?? "").trim(), "x-api-secret": (process.env.GENIUSPAY_API_SECRET ?? "").trim() },
    // Sans « payment_method », GeniusPay renvoie une page de paiement où le client choisit Wave, Orange Money, MTN, Moov ou carte.
    body: JSON.stringify({
      amount: o.amount, currency: o.currency, description: o.description.slice(0, 500),
      customer: { email: o.customerEmail },
      success_url: o.returnUrl, error_url: err.toString(),
      metadata: { reference: o.reference }, // notre référence : elle revient dans le webhook
    }),
  });
  if (!res.ok) throw new Error(`GeniusPay a refusé la création du paiement (${res.status}) : ${(await res.text().catch(() => "")).slice(0, 300)}`);
  const json = (await res.json()) as { data?: { checkout_url?: string; payment_url?: string } };
  const checkoutUrl = json.data?.checkout_url ?? json.data?.payment_url;
  if (!checkoutUrl) throw new Error("Réponse GeniusPay sans lien de paiement");
  return { checkoutUrl };
}

/** Signature HMAC-SHA256 de « horodatage.corps » avec le secret du webhook (en-têtes X-Webhook-Signature et X-Webhook-Timestamp). Rejette aussi les envois vieux de plus de 5 minutes. */
export function verifySignature(rawBody: string, signature: string | null, timestamp: string | null) {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
  if (!secret || !signature || !timestamp) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim().replace(/^sha256=/, ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Lit la notification : seul « payment.success » (statut « completed ») active un achat. Notre référence est dans data.metadata.reference. */
export function parseWebhook(body: any): { reference: string; paid: boolean; amount: number } | null {
  const d = body?.data;
  const reference = d?.metadata?.reference;
  if (!reference) return null;
  const paid = body?.event === "payment.success" && String(d?.status ?? "").toLowerCase() === "completed";
  return { reference: String(reference), paid, amount: Number(d?.amount ?? 0) };
}

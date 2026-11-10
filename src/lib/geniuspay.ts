import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Adaptateur GeniusPay.
 * Mode « mock » : paiement simulé en local (aucun appel réseau).
 * Mode « live » : API marchande GeniusPay (https://pay.genius.ci/doc), authentifiée par X-API-Key + X-API-Secret.
 * Tout le reste du code ne parle qu’à ces deux fonctions.
 */
export const isLive = () => process.env.GENIUSPAY_MODE === "live";
/** Le paiement simulé n’existe jamais en production : sans GENIUSPAY_MODE=live, les paiements sont simplement fermés (jamais gratuits). */
export const isMock = () => process.env.GENIUSPAY_MODE === "mock" && process.env.VERCEL_ENV !== "production";
export const paymentsOpen = () => isLive() || isMock();

const API = () => (process.env.GENIUSPAY_API_URL || "https://pay.genius.ci/api/v1/merchant").replace(/\/$/, "");

export async function createCheckout(o: { reference: string; amount: number; currency: string; description: string; returnUrl: string; webhookUrl: string; customerEmail: string }) {
  if (!paymentsOpen()) throw new Error("paiements_fermes");
  if (isMock()) return { checkoutUrl: `${new URL(o.returnUrl).origin}/api/dev/confirm?ref=${encodeURIComponent(o.reference)}` };
  // Retour en cas d'échec ou d'abandon : même page, sans « paye », avec un message.
  const err = new URL(o.returnUrl); err.searchParams.delete("paye"); err.searchParams.set("erreur", "Le paiement n’a pas abouti. Aucun montant n’a été débité.");
  const res = await fetch(`${API()}/payments`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.GENIUSPAY_API_KEY ?? "", "x-api-secret": process.env.GENIUSPAY_API_SECRET ?? "" },
    // Sans « payment_method », GeniusPay renvoie une page de paiement où le client choisit Wave, Orange Money, MTN, Moov ou carte.
    body: JSON.stringify({
      amount: o.amount, currency: o.currency, description: o.description.slice(0, 500),
      customer: { email: o.customerEmail },
      success_url: o.returnUrl, error_url: err.toString(),
      metadata: { reference: o.reference }, // notre référence : elle revient dans le webhook
    }),
  });
  if (!res.ok) throw new Error(`GeniusPay a refusé la création du paiement (${res.status})`);
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

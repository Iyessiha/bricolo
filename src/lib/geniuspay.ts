import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Adaptateur GeniusPay.
 * Mode « mock » : paiement simulé en local (aucun appel réseau).
 * Mode « live » : à ajuster avec la documentation officielle de GeniusPay (URL, champs, en-tête de signature).
 * Tout le reste du code ne parle qu’à ces deux fonctions.
 */
export const isMock = () => (process.env.GENIUSPAY_MODE ?? "mock") !== "live";

export async function createCheckout(o: { reference: string; amount: number; currency: string; description: string; returnUrl: string; webhookUrl: string; customerEmail: string }) {
  if (isMock()) return { checkoutUrl: `${o.returnUrl.split("/boosts")[0]}/api/dev/confirm?ref=${encodeURIComponent(o.reference)}` };
  const res = await fetch(`${process.env.GENIUSPAY_API_URL}/payments`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GENIUSPAY_API_KEY}` },
    body: JSON.stringify({
      reference: o.reference, amount: o.amount, currency: o.currency, description: o.description,
      return_url: o.returnUrl, callback_url: o.webhookUrl, customer_email: o.customerEmail,
    }),
  });
  if (!res.ok) throw new Error(`GeniusPay a refusé la création du paiement (${res.status})`);
  const json = (await res.json()) as { checkout_url?: string; url?: string };
  const checkoutUrl = json.checkout_url ?? json.url;
  if (!checkoutUrl) throw new Error("Réponse GeniusPay sans lien de paiement");
  return { checkoutUrl };
}

/** Vérifie la signature HMAC-SHA256 du corps brut (en-tête x-geniuspay-signature à confirmer). */
export function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.replace(/^sha256=/, ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Lit la notification de paiement (noms de champs à confirmer avec la documentation). */
export function parseWebhook(body: any): { reference: string; paid: boolean; amount: number } | null {
  const reference = body?.reference ?? body?.data?.reference;
  const status = String(body?.status ?? body?.data?.status ?? "").toLowerCase();
  const amount = Number(body?.amount ?? body?.data?.amount ?? 0);
  if (!reference) return null;
  return { reference: String(reference), paid: ["paid", "success", "succeeded", "completed"].includes(status), amount };
}

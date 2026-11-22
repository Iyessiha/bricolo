import { NextResponse, after, type NextRequest } from "next/server";
import { notifyBoostPaid } from "@/lib/email-flows";
import { parseWebhook, verifySignature } from "@/lib/geniuspay";
import { activateFromPayment } from "@/lib/boost";

/** GeniusPay confirme un paiement ici. Seule cette route active un boost. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-webhook-signature"), ts = req.headers.get("x-webhook-timestamp");
  if (!verifySignature(raw, sig, ts)) {
    // Sans cette trace, un webhook refusé est invisible : on note seulement l'état des en-têtes, jamais le secret.
    console.error("[webhook] signature refusée", { signature: Boolean(sig), timestamp: ts, secretConfiguré: Boolean(process.env.GENIUSPAY_WEBHOOK_SECRET), tailleCorps: raw.length });
    return NextResponse.json({ error: "signature invalide" }, { status: 401 });
  }
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "corps illisible" }, { status: 400 }); }
  const evt = parseWebhook(body);
  if (!evt) { console.error("[webhook] notification illisible", raw.slice(0, 300)); return NextResponse.json({ error: "notification inconnue" }, { status: 400 }); }
  if (!evt.paid) return NextResponse.json({ received: true });
  const res = await activateFromPayment(evt.reference, evt.amount, body);
  if (!res.ok) console.error("[webhook] activation refusée", { reference: evt.reference, reason: res.reason, montant: evt.amount });
  if (res.ok && !res.already) after(() => notifyBoostPaid(evt.reference)); // sans effet pour un forfait (aucun boost lié)
  return NextResponse.json(res.ok ? { received: true } : { error: res.reason }, { status: res.ok ? 200 : 422 });
}

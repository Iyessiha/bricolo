import { NextResponse, after, type NextRequest } from "next/server";
import { notifyBoostPaid } from "@/lib/email-flows";
import { parseWebhook, verifySignature } from "@/lib/geniuspay";
import { activateFromPayment } from "@/lib/boost";

/** GeniusPay confirme un paiement ici. Seule cette route active un boost. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-webhook-signature"), req.headers.get("x-webhook-timestamp"))) return NextResponse.json({ error: "signature invalide" }, { status: 401 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "corps illisible" }, { status: 400 }); }
  const evt = parseWebhook(body);
  if (!evt) return NextResponse.json({ error: "notification inconnue" }, { status: 400 });
  if (!evt.paid) return NextResponse.json({ received: true });
  const res = await activateFromPayment(evt.reference, evt.amount);
  if (res.ok && !res.already) after(() => notifyBoostPaid(evt.reference)); // sans effet pour un forfait (aucun boost lié)
  return NextResponse.json(res.ok ? { received: true } : { error: res.reason }, { status: res.ok ? 200 : 422 });
}

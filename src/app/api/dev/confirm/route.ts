import { NextResponse, type NextRequest } from "next/server";
import { activateFromPayment } from "@/lib/boost";
import { isMock } from "@/lib/geniuspay";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";

/** Simulation de paiement, disponible uniquement avec GENIUSPAY_MODE=mock. */
export async function GET(req: NextRequest) {
  if (!isMock()) return new NextResponse("Indisponible", { status: 404 });
  const ref = req.nextUrl.searchParams.get("ref") ?? "";
  const { data: p } = await supabaseAdmin().from("payments").select("amount").eq("provider_ref", ref).maybeSingle();
  if (!p) return new NextResponse("Paiement inconnu", { status: 404 });
  await activateFromPayment(ref, p.amount);
  return NextResponse.redirect(new URL("/boosts?paye=1", siteUrl()), 303);
}

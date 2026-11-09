import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { unsubValid } from "@/lib/email";

/** Désabonnement marketing : bouton de la page (formulaire) ou « un clic » du client mail (RFC 8058). */
export async function POST(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "", t = req.nextUrl.searchParams.get("t") ?? "";
  if (!unsubValid(u, t)) return new NextResponse("Lien invalide", { status: 400 });
  await supabaseAdmin().from("profiles").update({ marketing_opt_out: true }).eq("id", u);
  const oneClick = (await req.text()).includes("List-Unsubscribe=One-Click");
  return oneClick ? new NextResponse("OK") : NextResponse.redirect(new URL("/desabonnement?ok=1", req.url), 303);
}

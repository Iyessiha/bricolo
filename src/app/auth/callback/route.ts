import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const NEXT = new Set(["/activation", "/tableau-de-bord", "/nouveau-mot-de-passe"]);

/** Retour du lien de confirmation d'e-mail ou de réinitialisation de mot de passe (échange du code contre une session). */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const asked = req.nextUrl.searchParams.get("next") ?? "";
  const next = NEXT.has(asked) ? asked : "/tableau-de-bord";
  if (code) {
    const db = await supabaseServer();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, req.url));
  }
  // Lien déjà utilisé, expiré ou ouvert dans un autre navigateur : l'adresse est en général déjà confirmée.
  return NextResponse.redirect(new URL(next === "/nouveau-mot-de-passe" ? "/mot-de-passe-oublie?erreur=lien" : "/connexion?erreur=lien", req.url));
}

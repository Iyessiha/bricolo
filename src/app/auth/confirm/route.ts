import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/** Variante qui fonctionne même si le lien est ouvert sur un autre appareil (modèles d'e-mail Supabase avec {{ .TokenHash }}). */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const tokenHash = q.get("token_hash"), type = q.get("type") as EmailOtpType | null;
  const recovery = type === "recovery";
  if (tokenHash && (type === "signup" || type === "recovery" || type === "email")) {
    const db = await supabaseServer();
    const { error } = await db.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(recovery ? "/nouveau-mot-de-passe" : "/activation", req.url));
  }
  return NextResponse.redirect(new URL(recovery ? "/mot-de-passe-oublie?erreur=lien" : "/connexion?erreur=lien", req.url));
}

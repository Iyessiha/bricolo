import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { badgeCountFor } from "@/lib/push";

export const dynamic = "force-dynamic";
/** Nombre à afficher sur l'icône de l'application (0 si la personne n'est pas un artisan connecté). */
export async function GET() {
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  let n = 0;
  if (user) {
    const { data: a } = await supabaseAdmin().from("artisans").select("id").eq("user_id", user.id).maybeSingle();
    if (a) n = await badgeCountFor(a.id);
  }
  return NextResponse.json({ n }, { headers: { "cache-control": "no-store" } });
}

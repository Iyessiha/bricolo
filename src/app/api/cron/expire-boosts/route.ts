import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Passe les boosts terminés à « expired ». Le classement ignore déjà les boosts échus : ceci tient la base propre. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Non autorisé", { status: 401 });
  const { data } = await supabaseAdmin().from("boosts").update({ status: "expired" }).eq("status", "active").lt("ends_at", new Date().toISOString()).select("id");
  return NextResponse.json({ expired: data?.length ?? 0 });
}

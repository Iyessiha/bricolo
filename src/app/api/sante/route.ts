import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Point de contrôle pour un moniteur de disponibilité : 200 si le site et la base répondent, 503 sinon. Aucune donnée sensible. */
export async function GET() {
  const t = Date.now();
  let db = false;
  try { const { error } = await supabaseAdmin().from("countries").select("code", { head: true, count: "exact" }).limit(1); db = !error; } catch { db = false; }
  return NextResponse.json({ ok: db, db, ms: Date.now() - t }, { status: db ? 200 : 503, headers: { "cache-control": "no-store" } });
}

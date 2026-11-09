import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Compte le clic (Appeler / WhatsApp) puis redirige vers l’application du téléphone. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const type = req.nextUrl.searchParams.get("type") === "whatsapp" ? "whatsapp" : "call";
  const back = new URL(`/artisan/${id}`, req.url);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(new URL("/resultats", req.url));
  const db = supabaseAdmin();
  const { data: a } = await db.from("artisans").select("phone, whatsapp, status").eq("id", id).maybeSingle();
  if (!a || a.status !== "approved") return NextResponse.redirect(new URL("/resultats", req.url));
  await db.from("events").insert({ artisan_id: id, type });
  const num = ((type === "whatsapp" ? a.whatsapp ?? a.phone : a.phone) ?? "").replace(/[^\d+]/g, "");
  if (!num) return NextResponse.redirect(back);
  return NextResponse.redirect(type === "whatsapp" ? `https://wa.me/${num.replace(/^\+/, "")}` : `tel:${num}`);
}

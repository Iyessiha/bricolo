import { NextResponse } from "next/server";
import { addMessage, currentAdmin, listMessages } from "@/lib/support";
import { notifySupportReply } from "@/lib/email-flows";
import { pushToArtisan } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Ctx = { params: Promise<{ artisanId: string }> };
const NO = { headers: { "cache-control": "no-store" } };

/** Conversation d'un artisan, côté équipe (administrateurs uniquement). */
export async function GET(_: Request, { params }: Ctx) {
  const { artisanId } = await params;
  if (!(await currentAdmin()) || !UUID.test(artisanId)) return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true, messages: await listMessages(artisanId, "admin") }, NO);
}
export async function POST(req: Request, { params }: Ctx) {
  const { artisanId } = await params;
  const admin = await currentAdmin();
  if (!admin || !UUID.test(artisanId)) return NextResponse.json({ ok: false }, { status: 403 });
  if (!req.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ ok: false }, { status: 415 });
  const { data: art } = await supabaseAdmin().from("artisans").select("id").eq("id", artisanId).maybeSingle();
  if (!art) return NextResponse.json({ ok: false, error: "Artisan introuvable." }, { status: 404 });
  const b = await req.json().catch(() => null) as { body?: string } | null;
  const r = await addMessage(artisanId, "admin", admin.id, b?.body);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  const text = String(b?.body ?? "");
  await pushToArtisan(artisanId, { title: "Réponse de l’équipe Bricolo", body: text.slice(0, 120), url: "/tableau-de-bord?s=aide", tag: "aide" });
  if (r.firstUnread) await notifySupportReply(artisanId, text);
  return NextResponse.json({ ok: true, messages: await listMessages(artisanId, "admin") }, NO);
}

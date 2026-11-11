import { NextResponse } from "next/server";
import { addMessage, currentArtisan, listMessages } from "@/lib/support";
import { notifySupportToAdmins } from "@/lib/email-flows";

export const dynamic = "force-dynamic";
const NO = { headers: { "cache-control": "no-store" } };

/** Conversation de l'artisan connecté avec l'équipe Bricolo. */
export async function GET() {
  const a = await currentArtisan();
  if (!a) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, messages: await listMessages(a.id, "artisan") }, NO);
}
export async function POST(req: Request) {
  const a = await currentArtisan();
  if (!a) return NextResponse.json({ ok: false, error: "Connectez-vous." }, { status: 401 });
  if (!req.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ ok: false }, { status: 415 });
  const b = await req.json().catch(() => null) as { body?: string } | null;
  const r = await addMessage(a.id, "artisan", a.userId, b?.body);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  if (r.firstUnread) await notifySupportToAdmins(a.id, String(b?.body ?? ""));
  return NextResponse.json({ ok: true, messages: await listMessages(a.id, "artisan") }, NO);
}

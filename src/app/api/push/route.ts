import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Enregistre (POST) ou supprime (DELETE) l'abonnement aux notifications de l'appareil de l'artisan connecté. */
async function user() { const { data: { user } } = await (await supabaseServer()).auth.getUser(); return user; }

export async function POST(req: Request) {
  const u = await user();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const b = await req.json().catch(() => null) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null;
  const { endpoint, keys } = b ?? {};
  if (!endpoint || !/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !keys?.p256dh || !keys?.auth || keys.p256dh.length > 200 || keys.auth.length > 100) return NextResponse.json({ ok: false }, { status: 400 });
  const { data: art } = await supabaseAdmin().from("artisans").select("id").eq("user_id", u.id).maybeSingle();
  if (!art) return NextResponse.json({ ok: false }, { status: 403 }); // réservé aux artisans
  const { error } = await supabaseAdmin().from("push_subscriptions").upsert(
    { user_id: u.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300) },
    { onConflict: "endpoint" });
  return NextResponse.json({ ok: !error }, { status: error ? 500 : 200 });
}

export async function DELETE(req: Request) {
  const u = await user();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const b = await req.json().catch(() => null) as { endpoint?: string } | null;
  if (b?.endpoint) await supabaseAdmin().from("push_subscriptions").delete().eq("user_id", u.id).eq("endpoint", b.endpoint);
  return NextResponse.json({ ok: true });
}

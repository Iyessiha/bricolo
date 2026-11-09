import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Resend signale un rebond ou une plainte : on coupe le marketing pour cette adresse (protège la réputation du domaine). */
function valid(raw: string, req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = req.headers.get("svix-id"), ts = req.headers.get("svix-timestamp"), sig = req.headers.get("svix-signature");
  if (!secret || !id || !ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest("base64");
  return sig.split(" ").some((p) => {
    const v = p.split(",")[1] ?? "";
    return v.length === expected.length && timingSafeEqual(Buffer.from(v), Buffer.from(expected));
  });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!valid(raw, req)) return NextResponse.json({ error: "signature invalide" }, { status: 401 });
  let evt: any;
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: "corps illisible" }, { status: 400 }); }
  if (evt?.type === "email.bounced" || evt?.type === "email.complained") {
    const to: string[] = evt.data?.to ?? [];
    if (to.length) await supabaseAdmin().from("profiles").update({ marketing_opt_out: true }).in("email", to);
  }
  return NextResponse.json({ received: true });
}

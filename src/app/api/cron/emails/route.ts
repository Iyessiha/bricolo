import { NextResponse, type NextRequest } from "next/server";
import { runReminders } from "@/lib/email-flows";

/** Rappels quotidiens : boost qui se termine, profil à terminer, premier boost. Protégé par CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Non autorisé", { status: 401 });
  return NextResponse.json(await runReminders());
}

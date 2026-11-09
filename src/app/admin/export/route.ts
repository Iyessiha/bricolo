import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, audit } from "@/lib/admin";

export const dynamic = "force-dynamic";
const cell = (v: unknown) => { let t = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
const one = (v: any) => (Array.isArray(v) ? v[0] : v) ?? null;

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin();
  const p = req.nextUrl.searchParams, type = p.get("type");
  let head: string[] = [], rows: unknown[][] = [];
  if (type === "artisans") {
    let q = ctx.db.from("artisans").select("name, country_code, status, verified, account_type, phone, whatsapp, created_at, avg_rating, review_count, trade:trades(name), profile:profiles(email)").order("created_at", { ascending: false }).limit(10000);
    if (p.get("statut")) q = q.eq("status", p.get("statut")!);
    if (p.get("pays")) q = q.eq("country_code", p.get("pays")!);
    if (p.get("metier")) q = q.eq("trade_id", p.get("metier")!);
    if (p.get("badge")) q = q.eq("verified", p.get("badge") === "1");
    const term = (p.get("q") ?? "").replace(/[%,()]/g, " ").trim().slice(0, 60);
    if (term) q = q.or(`name.ilike.%${term}%,phone.ilike.%${term}%,company_name.ilike.%${term}%`);
    const { data } = await q;
    head = ["Nom", "Métier", "Pays", "Statut", "Vérifié", "Type", "E-mail", "Téléphone", "WhatsApp", "Note", "Avis", "Inscrit le"];
    rows = (data ?? []).map((a: any) => [a.name, one(a.trade)?.name, a.country_code, a.status, a.verified ? "oui" : "non", a.account_type, one(a.profile)?.email, a.phone, a.whatsapp, a.avg_rating, a.review_count, a.created_at]);
  } else if (type === "paiements") {
    const { data } = await ctx.db.from("payments").select("paid_at, created_at, amount, currency, status, provider_ref, boost:boosts(type, duration_hours, artisan:artisans(name, country_code)), sub:subscriptions(months, artisan:artisans(name, country_code))").order("created_at", { ascending: false }).limit(10000);
    head = ["Date", "Statut", "Montant", "Devise", "Boost", "Durée (h)", "Artisan", "Pays", "Référence"];
    rows = (data ?? []).map((x: any) => { const b = one(x.boost), s = one(x.sub), a = one(b?.artisan) ?? one(s?.artisan); return [x.paid_at ?? x.created_at, x.status, x.amount, x.currency, s ? "forfait_pro" : b?.type, s ? s.months * 720 : b?.duration_hours, a?.name, a?.country_code, x.provider_ref]; });
  } else if (type === "demandes") {
    const { data } = await ctx.db.from("service_requests").select("created_at, country_code, status, urgent, client_name, client_email, description, artisan:artisans(name), trade:trades(name)").order("created_at", { ascending: false }).limit(10000);
    head = ["Date", "Pays", "Statut", "Urgent", "Client", "E-mail", "Métier", "Artisan", "Description"];
    rows = (data ?? []).map((x: any) => [x.created_at, x.country_code, x.status, x.urgent ? "oui" : "non", x.client_name, x.client_email, one(x.trade)?.name, one(x.artisan)?.name, x.description]);
  } else return new NextResponse("Type inconnu", { status: 400 });
  await audit(ctx, "export.csv", undefined, { type, lignes: rows.length });
  const body = "﻿" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new NextResponse(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="bricolo-${type}-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
}

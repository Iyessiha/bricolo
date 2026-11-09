"use server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function sendRequest(artisanId: string, formData: FormData) {
  const db = supabaseAdmin();
  const { data: a } = await db.from("artisans").select("country_code, trade_id").eq("id", artisanId).eq("status", "approved").single();
  if (!a) redirect("/resultats");
  const email = String(formData.get("email") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!email || description.length < 5) redirect(`/artisan/${artisanId}`);
  await db.from("service_requests").insert({
    artisan_id: artisanId, country_code: a.country_code, trade_id: a.trade_id,
    zone_id: String(formData.get("zone") || "") || null, description: description.slice(0, 1000),
    urgent: formData.get("urgent") === "on", client_name: String(formData.get("name") ?? "").slice(0, 80) || null, client_email: email,
  });
  await db.from("events").insert({ artisan_id: artisanId, type: "request" });
  redirect(`/artisan/${artisanId}?envoye=1`);
}

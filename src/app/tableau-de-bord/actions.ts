"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyProfileReceived } from "@/lib/email-flows";
import { supabaseServer } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: profile } = await db.from("profiles").select("country_code").eq("id", user.id).single();
  if (!profile?.country_code) redirect("/inscription");

  const fields = {
    name: String(formData.get("name") ?? "").trim(),
    trade_id: String(formData.get("trade_id") ?? ""),
    description: String(formData.get("description") ?? "").trim() || null,
    price_label: String(formData.get("price_label") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
    account_type: formData.get("account_type") === "entreprise" ? "entreprise" : "individuel",
    company_name: null as string | null,
  };
  if (fields.account_type === "entreprise") fields.company_name = String(formData.get("company_name") ?? "").trim().slice(0, 120) || fields.name;
  const registration = String(formData.get("registration_number") ?? "").trim().slice(0, 60);
  const zoneIds = formData.getAll("zones").map(String);
  if (fields.name.length < 2 || !fields.trade_id || !zoneIds.length) redirect("/tableau-de-bord?erreur=champs");

  const { data: existing } = await db.from("artisans").select("id").eq("user_id", user.id).maybeSingle();
  let artisanId = existing?.id as string | undefined;
  if (artisanId) {
    await db.from("artisans").update(fields).eq("id", artisanId);
  } else {
    const { data, error } = await db.from("artisans").insert({ ...fields, user_id: user.id, country_code: profile.country_code }).select("id").single();
    if (error || !data) redirect("/tableau-de-bord?erreur=enregistrement");
    artisanId = data.id;
    const newId = data.id as string;
    after(() => notifyProfileReceived(newId));
  }
  if (fields.account_type === "entreprise" && registration) await db.from("artisan_companies").upsert({ artisan_id: artisanId!, registration_number: registration, updated_at: new Date().toISOString() });
  else await db.from("artisan_companies").delete().eq("artisan_id", artisanId!);
  await db.from("artisan_zones").delete().eq("artisan_id", artisanId!);
  await db.from("artisan_zones").insert(zoneIds.map((zone_id) => ({ artisan_id: artisanId!, zone_id })));
  revalidatePath("/tableau-de-bord");
  redirect("/tableau-de-bord?ok=1");
}

export async function requestVerification() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  await db.from("artisans").update({ verification_requested: true }).eq("user_id", user.id);
  revalidatePath("/tableau-de-bord");
}

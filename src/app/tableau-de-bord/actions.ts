"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  };
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
  }
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

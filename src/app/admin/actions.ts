"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyBadge, notifyDecision } from "@/lib/email-flows";
import { supabaseServer } from "@/lib/supabase/server";

async function admin() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" ? db : null;
}

export async function decide(formData: FormData) {
  const db = await admin();
  if (!db) return;
  const status = formData.get("decision") === "approve" ? "approved" : "rejected";
  const id = String(formData.get("id"));
  await db.from("artisans").update({ status }).eq("id", id);
  after(() => notifyDecision(id, status === "approved"));
  revalidatePath("/admin");
}

export async function verifyArtisan(formData: FormData) {
  const db = await admin();
  if (!db) return;
  const id = String(formData.get("id"));
  await db.from("artisans").update({ verified: true, verification_requested: false }).eq("id", id);
  after(() => notifyBadge(id));
  revalidatePath("/admin");
}

export async function savePrices(formData: FormData) {
  const db = await admin();
  if (!db) return;
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("p:")) continue;
    const amount = Math.max(0, parseInt(String(value), 10) || 0);
    await db.from("price_grid").update({ amount }).eq("id", key.slice(2));
  }
  revalidatePath("/admin");
  revalidatePath("/boosts");
}

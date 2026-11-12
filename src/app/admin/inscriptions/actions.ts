"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { relanceNow } from "@/lib/email-flows";

/** Marque une ou toutes les inscriptions échouées comme traitées (la personne a été relancée ou le problème corrigé). */
export async function markHandled(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const q = supabaseAdmin().from("signup_failures").update({ handled: true });
  await (id ? q.eq("id", id) : q.eq("handled", false));
  revalidatePath("/admin/inscriptions"); revalidatePath("/admin");
}

/** Envoie le rappel à une personne dont l'inscription est restée en route. */
export async function relancer(fd: FormData) {
  await requireAdmin();
  const kind = String(fd.get("kind")) === "documents" ? "documents" : "profile";
  const id = String(fd.get("id") ?? "");
  const r = id ? await relanceNow(kind, id) : { ok: false, why: "Identifiant manquant" };
  revalidatePath("/admin/inscriptions");
  redirect(`/admin/inscriptions?${r.ok ? "relance=ok" : `relance=${encodeURIComponent(r.why ?? "echec")}`}`);
}

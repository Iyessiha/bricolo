"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Marque une ou toutes les inscriptions échouées comme traitées (la personne a été relancée ou le problème corrigé). */
export async function markHandled(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const q = supabaseAdmin().from("signup_failures").update({ handled: true });
  await (id ? q.eq("id", id) : q.eq("handled", false));
  revalidatePath("/admin/inscriptions"); revalidatePath("/admin");
}

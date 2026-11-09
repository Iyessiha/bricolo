"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { audienceOf, sendCampaign, sendTest, type Audience } from "@/lib/email-flows";

async function adminUser() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" ? user : null;
}

function read(fd: FormData) {
  const subject = String(fd.get("subject") ?? "").trim().slice(0, 120);
  const body = String(fd.get("body") ?? "").trim().slice(0, 5000);
  const audience: Audience = {
    country: String(fd.get("country") ?? "") || undefined,
    trade: String(fd.get("trade") ?? "") || undefined,
    noBoost: fd.get("noBoost") === "on",
  };
  return { subject, body, audience };
}

export async function campaignAction(fd: FormData) {
  const user = await adminUser();
  if (!user) redirect("/");
  const { subject, body, audience } = read(fd);
  const q = new URLSearchParams();
  if (subject.length < 3 || body.length < 10) { q.set("erreur", "champs"); redirect(`/admin/campagnes?${q}`); }

  const mode = String(fd.get("mode"));
  if (mode === "count") {
    q.set("n", String((await audienceOf(audience)).length));
  } else if (mode === "test") {
    const r = await sendTest(user.email!, user.id, subject, body);
    q.set(r.failed ? "erreur" : "test", r.failed ? "envoi" : "1");
  } else if (mode === "send") {
    if (String(fd.get("confirm")).trim().toUpperCase() !== "ENVOYER") { q.set("erreur", "confirmation"); redirect(`/admin/campagnes?${q}`); }
    const r = await sendCampaign({ subject, body, audience, by: user.id });
    q.set("envoye", String(r.sent)); q.set("echec", String(r.failed));
  }
  redirect(`/admin/campagnes?${q}`);
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import TwoFactor from "./TwoFactor";

export const metadata: Metadata = { title: "Vérification en deux étapes", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: me } = await s.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/");
  return <section className="inner" style={{ maxWidth: 460, margin: "40px auto" }}><TwoFactor /></section>;
}

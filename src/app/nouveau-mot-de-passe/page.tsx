import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import SetupNotice from "@/components/SetupNotice";
import NewPasswordForm from "@/components/NewPasswordForm";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewPassword() {
  if (!hasSupabase()) return <SetupNotice />;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/mot-de-passe-oublie?erreur=lien");
  return <section className="inner sec"><NewPasswordForm /></section>;
}

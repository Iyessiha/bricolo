import type { Metadata } from "next";
import { COUNTRIES } from "@/lib/countries";
import { getCountry } from "@/lib/country";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import SetupNotice from "@/components/SetupNotice";
import AuthShell from "@/components/AuthShell";
import SignupFunnel from "@/components/SignupFunnel";

export const metadata: Metadata = { title: "Devenir artisan" };
export const dynamic = "force-dynamic";

export default async function Signup() {
  if (!hasSupabase()) return <SetupNotice />;
  const db = await supabaseServer();
  const [{ data: trades }, country] = await Promise.all([db.from("trades").select("id, name").order("name"), getCountry()]);
  return (
    <AuthShell photo="/photos/portrait-artisan.jpg" alt="Portrait d’un artisan expérimenté, casque de chantier sur la tête" title="Soyez trouvé par vos futurs clients" text="Créez votre profil gratuitement. Il est activé après la vérification de votre identité." pos="50% 20%">
      <SignupFunnel countries={COUNTRIES.map((c) => ({ ...c }))} trades={trades ?? []} initialCountry={country} />
    </AuthShell>
  );
}

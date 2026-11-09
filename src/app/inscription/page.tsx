import type { Metadata } from "next";
import { COUNTRIES } from "@/lib/countries";
import { getCountry } from "@/lib/country";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import SetupNotice from "@/components/SetupNotice";
import SignupFunnel from "@/components/SignupFunnel";

export const metadata: Metadata = { title: "Devenir artisan" };
export const dynamic = "force-dynamic";

export default async function Signup() {
  if (!hasSupabase()) return <SetupNotice />;
  const db = await supabaseServer();
  const [{ data: trades }, country] = await Promise.all([db.from("trades").select("id, name").order("name"), getCountry()]);
  return (
    <section className="inner sec">
      <SignupFunnel countries={COUNTRIES.map((c) => ({ ...c }))} trades={trades ?? []} initialCountry={country} />
    </section>
  );
}

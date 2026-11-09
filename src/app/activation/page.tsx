import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { countryName } from "@/lib/countries";
import SetupNotice from "@/components/SetupNotice";
import Activation from "@/components/Activation";

export const metadata: Metadata = { title: "Activer mon compte", robots: { index: false } };

export default async function ActivationPage() {
  if (!hasSupabase()) return <SetupNotice />;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: profile } = await db.from("profiles").select("country_code, role").eq("id", user.id).single();
  if (profile?.role === "admin") redirect("/admin");
  if (!profile?.country_code) redirect("/inscription");
  const country = profile.country_code as string;

  const [{ data: trades }, { data: zones }, { data: a }] = await Promise.all([
    db.from("trades").select("id, name").order("name"),
    db.from("zones").select("id, name").eq("country_code", country).order("name"),
    db.from("artisans").select("id, name, trade_id, description, headline, price_label, phone, whatsapp, experience_years, account_type, company_name, photo_url, zones:artisan_zones(zone_id)").eq("user_id", user.id).maybeSingle(),
  ]);
  const { data: ident } = a ? await db.from("artisan_identity").select("status").eq("artisan_id", a.id).maybeSingle() : { data: null };
  if (a && ident && ident.status !== "rejected") redirect("/tableau-de-bord");
  const { data: company } = a ? await db.from("artisan_companies").select("registration_number").eq("artisan_id", a.id).maybeSingle() : { data: null };

  const meta = (user.user_metadata ?? {}) as { business_name?: string; trade_id?: string; account_type?: string; company_registration?: string };
  const type = (a?.account_type ?? (meta.account_type === "entreprise" ? "entreprise" : "individuel")) as "individuel" | "entreprise";
  const initialStep = !a ? 1 : !a.photo_url ? 2 : 3;

  return (
    <section className="inner sec">
      <Activation
        uid={user.id} countryName={countryName(country)} trades={trades ?? []} zones={zones ?? []} initialStep={initialStep} photoUrl={a?.photo_url ?? null}
        defaults={{
          name: a?.name ?? meta.business_name ?? "", trade_id: a?.trade_id ?? meta.trade_id ?? "",
          zones: ((a as any)?.zones ?? []).map((z: any) => z.zone_id), phone: a?.phone ?? "", whatsapp: a?.whatsapp ?? "",
          price_label: a?.price_label ?? "", description: a?.description ?? "", headline: a?.headline ?? "", experience_years: a?.experience_years != null ? String(a.experience_years) : "",
          account_type: type, company_name: a?.company_name ?? meta.business_name ?? "", registration_number: company?.registration_number ?? meta.company_registration ?? "",
        }}
      />
    </section>
  );
}

export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { hasSupabase } from "@/lib/env";
import SetupNotice from "@/components/SetupNotice";
import ForgotFlow from "@/components/ForgotFlow";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Forgot({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  return <section className="inner sec"><ForgotFlow linkError={sp.erreur === "lien"} /></section>;
}

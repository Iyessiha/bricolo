import type { Metadata } from "next";
import { hasSupabase } from "@/lib/env";
import SetupNotice from "@/components/SetupNotice";
import LoginFlow from "@/components/LoginFlow";

export const metadata: Metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  return <section className="inner sec"><LoginFlow linkError={sp.erreur === "lien"} /></section>;
}

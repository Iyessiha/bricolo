import type { Metadata } from "next";
import { hasSupabase } from "@/lib/env";
import SetupNotice from "@/components/SetupNotice";
import AuthShell from "@/components/AuthShell";
import LoginFlow from "@/components/LoginFlow";

export const metadata: Metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  return <AuthShell photo="/photos/mecanicienne-portrait.jpg" alt="Mécanicienne en combinaison rouge, son casque sous le bras" title="Bon retour parmi les artisans" text="Suivez vos demandes, votre profil et votre forfait au même endroit." pos="50% 18%"><LoginFlow linkError={sp.erreur === "lien"} /></AuthShell>;
}

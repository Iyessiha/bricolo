import type { Metadata } from "next";
import { hasSupabase } from "@/lib/env";
import SetupNotice from "@/components/SetupNotice";
import { sendMagicLink } from "../auth-actions";

export const metadata: Metadata = { title: "Connexion" };

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  return (
    <section className="inner sec">
      <div className="narrow card pad stack">
        <h1 style={{ fontSize: 32 }}>Connexion</h1>
        {sp.envoye === "1" ? (
          <p>Lien envoyé à <b>{sp.email}</b>. Ouvrez-le pour accéder à votre espace.</p>
        ) : (
          <form action={sendMagicLink} className="stack">
            {sp.erreur && <p className="notice err">Adresse invalide ou envoi impossible. Réessayez.</p>}
            <div className="fld"><label htmlFor="email">Adresse e-mail</label><input type="email" id="email" name="email" required autoComplete="email" /></div>
            <button className="btn primary" type="submit">Recevoir mon lien de connexion</button>
          </form>
        )}
      </div>
    </section>
  );
}

export const dynamic = "force-dynamic";

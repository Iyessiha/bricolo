import type { Metadata } from "next";
import { unsubValid } from "@/lib/email";

export const metadata: Metadata = { title: "Désabonnement", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Desabonnement({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const u = sp.u ?? "", t = sp.t ?? "";
  return (
    <section className="inner sec stack" style={{ maxWidth: 560 }}>
      {sp.ok ? (
        <div className="card pad stack"><h1 style={{ fontSize: 26 }}>Vous êtes désabonné</h1>
          <p>Vous ne recevrez plus de messages marketing de Bricolo. Vous continuerez à recevoir les e-mails liés à votre compte (validation du profil, demandes de clients, paiements).</p></div>
      ) : unsubValid(u, t) ? (
        <form method="post" action={`/api/desabonnement?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`} className="card pad stack">
          <h1 style={{ fontSize: 26 }}>Se désabonner</h1>
          <p>Confirmez pour ne plus recevoir les messages marketing de Bricolo. Les e-mails liés à votre compte restent actifs.</p>
          <div><button className="btn primary" type="submit">Me désabonner</button></div>
        </form>
      ) : (
        <div className="card pad stack"><h1 style={{ fontSize: 26 }}>Lien invalide</h1><p>Ce lien de désabonnement est incorrect ou a expiré. Utilisez le lien dans un e-mail récent de Bricolo.</p></div>
      )}
    </section>
  );
}

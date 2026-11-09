import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { COUNTRIES } from "@/lib/countries";
import { emailConfigured } from "@/lib/email";
import SetupNotice from "@/components/SetupNotice";
import { campaignAction } from "./actions";

export const metadata: Metadata = { title: "Campagnes e-mail" };
export const dynamic = "force-dynamic";

export default async function Campagnes({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!hasSupabase()) return <SetupNotice />;
  const sp = await searchParams;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: me } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/");

  const [{ data: trades }, { data: past }] = await Promise.all([
    db.from("trades").select("id, name").order("name"),
    db.from("campaigns").select("id, subject, recipients, sent, failed, created_at").order("created_at", { ascending: false }).limit(10),
  ]);
  const errors: Record<string, string> = { champs: "Renseignez un objet (3 caractères minimum) et un message (10 minimum).", confirmation: "Tapez ENVOYER pour confirmer l'envoi.", envoi: "L'envoi du test a échoué. Vérifiez la clé Resend et l'expéditeur." };

  return (
    <section className="inner sec stack">
      <div><p className="eyebrow"><a href="/admin">Administration</a></p><h1 style={{ fontSize: "clamp(26px,4.5vw,38px)" }}>Campagnes e-mail</h1></div>
      {!emailConfigured() && <div className="card pad"><b>Mode simulation.</b> <span>RESEND_API_KEY n'est pas défini : rien n'est réellement envoyé.</span></div>}
      {sp.test && <div className="card pad">Test envoyé à votre adresse.</div>}
      {sp.n && <div className="card pad">Cette audience compte <b>{sp.n}</b> artisan(s) joignable(s).</div>}
      {sp.envoye && <div className="card pad">Campagne envoyée : <b>{sp.envoye}</b> e-mail(s), {sp.echec ?? 0} échec(s).</div>}
      {sp.erreur && <div className="card pad" role="alert">{errors[sp.erreur] ?? "Une erreur est survenue."}</div>}

      <form action={campaignAction} className="card pad stack">
        <h2 style={{ fontSize: 20 }}>Nouveau message</h2>
        <label className="stack">Objet<input name="subject" maxLength={120} required /></label>
        <label className="stack">Message<textarea name="body" rows={8} maxLength={5000} required placeholder={"Bonjour {{nom}},\n\nSéparez les paragraphes par une ligne vide."} /></label>
        <p className="hint">{"{{nom}}"} est remplacé par le nom de chaque artisan. Un lien de désabonnement est ajouté automatiquement.</p>
        <div className="row">
          <label>Pays <select name="country"><option value="">Tous</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
          <label>Métier <select name="trade"><option value="">Tous</option>{trades?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className="row"><input type="checkbox" name="noBoost" /> Sans boost actif</label>
        </div>
        <div className="row">
          <button className="btn" name="mode" value="count">Compter l'audience</button>
          <button className="btn" name="mode" value="test">M'envoyer un test</button>
        </div>
        <div className="row">
          <label>Pour envoyer à l'audience, tapez ENVOYER <input name="confirm" autoComplete="off" /></label>
          <button className="btn primary" name="mode" value="send">Envoyer la campagne</button>
        </div>
        <p className="hint">Seuls les artisans validés, joignables et non désabonnés reçoivent la campagne. Plan gratuit Resend : 100 e-mails par jour.</p>
      </form>

      <div className="card pad stack"><h2 style={{ fontSize: 20 }}>Dernières campagnes</h2>
        {past?.length ? <div className="tw"><table className="tbl"><thead><tr><th>Date</th><th>Objet</th><th>Destinataires</th><th>Envoyés</th><th>Échecs</th></tr></thead><tbody>
          {past.map((c) => <tr key={c.id}><td>{new Date(c.created_at).toLocaleDateString("fr-FR")}</td><td><b>{c.subject}</b></td><td className="num">{c.recipients}</td><td className="num">{c.sent}</td><td className="num">{c.failed}</td></tr>)}
        </tbody></table></div> : <p className="empty">Aucune campagne envoyée.</p>}
      </div>
    </section>
  );
}

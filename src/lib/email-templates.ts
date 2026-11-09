import { siteUrl } from "./env";
import { fcfa } from "./format";

/** Modèles HTML (mise en page en tableaux, styles en ligne : compatible Gmail, Outlook, mobile). */
const BLUE = "#27489a", ORANGE = "#ff6a13", INK = "#1b2333", MUTED = "#5b6478", BG = "#f3f5fa";
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const p = (t: string) => `<p style="margin:0 0 16px;line-height:1.6">${esc(t.trim()).replace(/\n/g, "<br>")}</p>`;
export const paragraphs = (t: string) => t.split(/\n{2,}/).filter((x) => x.trim()).map(p).join("");
const when = (iso: string) => {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(d);
  return `${date} à ${String(d.getUTCHours())} h GMT`;
};

const btn = (label: string, href: string, boost = false) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="background:${boost ? ORANGE : BLUE};border-radius:8px">
   <a href="${href}" style="display:inline-block;padding:13px 22px;color:#fff;font-weight:700;text-decoration:none;font-size:15px">${esc(label)}</a></td></tr></table>`;

type Mail = { subject: string; html: string; text: string };
function layout(o: { subject: string; pre: string; title: string; body: string; unsub?: string }): Mail {
  const foot = o.unsub
    ? `Vous recevez ce message car vous avez un profil sur Bricolo. <a href="${o.unsub}" style="color:${MUTED}">Se désabonner des messages marketing</a>.`
    : `Message automatique envoyé par Bricolo suite à une action sur votre compte.`;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:${BG};font-family:Arial,Helvetica,sans-serif;color:${INK}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.pre)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:${BLUE};padding:18px 28px;color:#fff;font-size:22px;font-weight:700;letter-spacing:-.3px">Bricolo</td></tr>
<tr><td style="padding:28px 28px 8px"><h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${INK}">${esc(o.title)}</h1>${o.body}</td></tr>
<tr><td style="padding:16px 28px 26px;border-top:1px solid #e3e7f0;font-size:12px;line-height:1.5;color:${MUTED}">${foot}<br>Bricolo · artisans de confiance en Afrique de l'Ouest francophone</td></tr>
</table></td></tr></table></body></html>`;
  const text = html.replace(/<span[\s\S]*?<\/span>/, "").replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, "$2 : $1")
    .replace(/<\/td>(?=\s*<td)/g, " : ").replace(/<\/(p|h1|tr|blockquote)>/g, "\n\n").replace(/<br>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n").trim();
  return { subject: o.subject, html, text };
}


/** Guide de démarrage : ce qui fait la différence entre une fiche qui reçoit des appels et une fiche ignorée. */
const guide = (intro: string, max = 7) => {
  const steps: [string, string][] = [
    ["Une couverture en paysage", "Première chose que voit le client. Une belle photo horizontale de votre travail, nette, en pleine lumière, sans texte ni logo. Tournez le téléphone avant de photographier."],
    ["3 à 8 photos de vos réalisations", "Avant/après, chantier terminé, détails soignés. Une fiche avec des photos reçoit beaucoup plus d'appels. Pas de photos de personnes ni de documents."],
    ["Une promesse qui commence par « Je vais… »", "Exemples : « Je vais installer votre climatisation », « Je vais construire votre portail métallique ». Le client comprend en une seconde ce que vous faites pour lui."],
    ["Une description concrète", "3 ou 4 phrases : ce que vous faites, depuis combien de temps, vos garanties, le matériel que vous utilisez, votre rapidité. Écrivez comme vous parleriez à un client."],
    ["Un tarif de départ clair", "Choisissez « À partir de … FCFA » avec l'unité (par intervention, par heure, par m²…). Un prix visible rassure, le prix final se discute ensuite. Vous pouvez aussi choisir « Sur devis gratuit »."],
    ["Vos horaires et vos zones", "Indiquez vos jours et heures de disponibilité, et toutes les villes ou communes où vous vous déplacez : vous apparaissez dans plus de recherches."],
    ["Répondre vite", "Répondez aux appels et aux messages WhatsApp dans l'heure : c'est le critère n° 1 pour décrocher le chantier."],
  ];
  const rows = steps.slice(0, max).map(([h, d], i) => `<tr><td valign="top" style="padding:0 12px 14px 0;width:26px"><div style="width:26px;height:26px;border-radius:13px;background:${BLUE};color:#fff;font-weight:700;font-size:13px;line-height:26px;text-align:center">${i + 1}</div></td><td style="padding:0 0 14px;line-height:1.55"><b>${esc(h)}</b><br><span style="color:${MUTED}">${esc(d)}</span></td></tr>`).join("");
  return p(intro) + `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;width:100%">${rows}</table>`;
};

/* ───────── Transactionnels ───────── */
export const profileReceived = (name: string) => layout({
  subject: "Votre dossier Bricolo est en cours de vérification", pre: "Nous vérifions votre identité, réponse sous 24 à 48 h.",
  title: `Merci ${name}, votre dossier est bien reçu`,
  body: p("Notre équipe vérifie votre pièce d'identité et votre profil. Vous recevrez un e-mail dès que votre profil est en ligne, en général sous 24 à 48 heures.") +
    p("Vos documents ne sont jamais montrés aux clients : seule l'administration peut les consulter.") +
    guide("En attendant, préparez votre fiche : c'est elle qui vous fera gagner des clients. Voici comment la réussir.") +
    btn("Compléter ma fiche", `${siteUrl()}/tableau-de-bord#profil`),
});

export const profileDecision = (name: string, approved: boolean, artisanId: string, reason?: string) => approved
  ? layout({
    subject: "Votre profil Bricolo est en ligne", pre: "Votre identité est vérifiée, les clients peuvent vous trouver.",
    title: `${name}, votre profil est validé`,
    body: p("Votre identité est vérifiée et votre profil est visible dans les résultats de recherche. Les clients peuvent vous appeler, vous écrire sur WhatsApp ou vous envoyer une demande.") +
      btn("Voir ma fiche", `${siteUrl()}/artisan/${artisanId}`) +
      guide("Dernier conseil avant les premiers appels : les 3 choses qui font choisir votre fiche.", 3) +
      btn("Améliorer ma fiche", `${siteUrl()}/tableau-de-bord#profil`) +
      p("Quand votre fiche est complète, vous pouvez aussi apparaître en tête des résultats de votre métier avec un boost, depuis votre tableau de bord."),
  })
  : layout({
    subject: "Votre profil Bricolo n'a pas pu être validé", pre: "Quelques informations sont à corriger.",
    title: "Votre profil n'a pas pu être validé",
    body: p(`Bonjour ${name}, nous n'avons pas pu valider votre profil pour le moment.`) +
      (reason ? `<blockquote style="margin:0 0 16px;padding:12px 16px;background:${BG};border-left:4px solid ${ORANGE};line-height:1.6"><b>Motif :</b> ${esc(reason)}</blockquote>` : "") +
      p("Corrigez le point indiqué et renvoyez votre dossier : cela prend quelques minutes. Vous pouvez aussi répondre à ce message pour en discuter.") +
      btn("Corriger mon dossier", `${siteUrl()}/activation`),
  });

export const badgeGranted = (name: string, artisanId: string) => layout({
  subject: "Vous avez le badge Vérifié sur Bricolo", pre: "Votre fiche inspire plus de confiance.",
  title: `${name}, le badge Vérifié est activé`,
  body: p("Votre fiche affiche désormais le badge Vérifié et remonte mieux dans les résultats, à égalité de boost.") + btn("Voir ma fiche", `${siteUrl()}/artisan/${artisanId}`),
});

export const requestForArtisan = (o: { client: string | null; email: string; description: string; urgent: boolean; artisanId: string }) => layout({
  subject: `${o.urgent ? "Urgent : " : ""}Nouvelle demande sur Bricolo`, pre: o.description.slice(0, 90),
  title: o.urgent ? "Nouvelle demande urgente" : "Vous avez une nouvelle demande",
  body: p(`${o.client || "Un client"} vous écrit :`) +
    `<blockquote style="margin:0 0 16px;padding:12px 16px;background:${BG};border-left:4px solid ${BLUE};line-height:1.6">${esc(o.description).replace(/\n/g, "<br>")}</blockquote>` +
    p(`Pour répondre, écrivez directement à ${o.email} (il suffit de répondre à ce message).`) +
    btn("Voir mes demandes", `${siteUrl()}/tableau-de-bord`),
});

export const requestForClient = (artisan: string, description: string) => layout({
  subject: `Votre demande a été envoyée à ${artisan}`, pre: "L'artisan vous répond directement par e-mail.",
  title: "Votre demande est envoyée",
  body: p(`${artisan} a reçu votre demande et vous répondra directement à cette adresse e-mail.`) +
    `<blockquote style="margin:0 0 16px;padding:12px 16px;background:${BG};border-left:4px solid ${BLUE};line-height:1.6">${esc(description).replace(/\n/g, "<br>")}</blockquote>` +
    p("Pour un dépannage urgent, vous pouvez aussi l'appeler depuis sa fiche."),
});

export const boostReceipt = (o: { name: string; label: string; zone: string | null; duration: string; amount: number; endsAt: string; merged: boolean }) => layout({
  subject: `Paiement reçu : ${o.label} activé`, pre: `Actif jusqu'au ${when(o.endsAt)}.`,
  title: o.merged ? "Votre boost est prolongé" : "Votre boost est actif",
  body: p(`Bonjour ${o.name}, nous avons bien reçu votre paiement.`) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:15px;line-height:1.5">
      <tr><td style="padding:6px 0;color:${MUTED}">Boost</td><td align="right"><b>${esc(o.label)}</b></td></tr>
      ${o.zone ? `<tr><td style="padding:6px 0;color:${MUTED}">Zone</td><td align="right"><b>${esc(o.zone)}</b></td></tr>` : ""}
      <tr><td style="padding:6px 0;color:${MUTED}">Durée ajoutée</td><td align="right"><b>${esc(o.duration)}</b></td></tr>
      <tr><td style="padding:6px 0;color:${MUTED}">Montant</td><td align="right"><b>${fcfa(o.amount)}</b></td></tr>
      <tr><td style="padding:6px 0;color:${MUTED}">Actif jusqu'au</td><td align="right"><b>${when(o.endsAt)}</b></td></tr></table>` +
    btn("Voir mes boosts", `${siteUrl()}/boosts`, true),
});

export const boostExpiring = (name: string, label: string, endsAt: string) => layout({
  subject: `Votre ${label.toLowerCase()} se termine bientôt`, pre: `Fin le ${when(endsAt)}.`,
  title: "Votre boost se termine bientôt",
  body: p(`Bonjour ${name}, votre ${label.toLowerCase()} prend fin le ${when(endsAt)}.`) +
    p("Renouvelez-le maintenant pour garder votre place en tête des résultats : la durée s'ajoute à celle qui reste, rien n'est perdu.") +
    btn("Renouveler mon boost", `${siteUrl()}/boosts`, true),
});

export const documentsReminder = (name: string) => layout({
  subject: "Finalisez votre profil Bricolo : il manque vos documents", pre: "Photo et pièce d'identité requises pour être en ligne.",
  title: `${name}, votre profil n'est pas encore en ligne`,
  body: p("Pour activer votre profil, nous devons vérifier votre identité : une photo de vous, votre pièce d'identité et un selfie avec cette pièce. Comptez cinq minutes, depuis votre téléphone.") +
    btn("Envoyer mes documents", `${siteUrl()}/activation`),
});

/* ───────── Marketing (avec désabonnement) ───────── */
export const completeProfileNudge = (unsub: string) => layout({
  subject: "Terminez votre profil Bricolo", pre: "Il ne manque que quelques informations.", unsub,
  title: "Il ne manque plus grand-chose",
  body: p("Vous avez créé votre compte Bricolo mais votre fiche n'est pas encore en ligne. Ajoutez votre métier, vos zones et votre téléphone : cela prend deux minutes, et les clients de votre pays pourront vous trouver.") +
    btn("Terminer mon profil", `${siteUrl()}/tableau-de-bord`),
});

export const firstBoostNudge = (name: string, unsub: string) => layout({
  subject: "Passez en tête des résultats de votre métier", pre: "À partir de 500 FCFA pour 24 h.", unsub,
  title: `${name}, faites-vous remarquer`,
  body: p("Votre profil est en ligne. Avec un boost, vous passez en tête des résultats de votre métier dans votre zone, ou à la une de l'accueil. Les prix démarrent à 500 FCFA pour 24 heures, payables en Mobile Money.") +
    btn("Découvrir les boosts", `${siteUrl()}/boosts`, true),
});

export const campaign = (subject: string, text: string, name: string, unsub: string) => layout({
  subject, pre: text.replace(/\s+/g, " ").slice(0, 100), unsub, title: subject,
  body: paragraphs(text.replace(/\{\{\s*nom\s*\}\}/gi, name)),
});

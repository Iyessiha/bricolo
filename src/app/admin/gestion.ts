"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { notifyBadge, notifySanction } from "@/lib/email-flows";
import { pushToArtisan } from "@/lib/push";
import { audit, requireAdmin } from "@/lib/admin";
import { activateFromPayment } from "@/lib/boost";
import sharp from "sharp";
import { resetUploadedDefaults } from "@/lib/default-covers-server";
import { coverImage, coverInputOf, unsplashBg } from "@/lib/cover-art";

const back = (path: string, kind: "ok" | "erreur", msg: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
const s = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const UUID = /^[0-9a-f-]{36}$/i;

async function target(f: FormData) {
  const ctx = await requireAdmin();
  const id = s(f, "id", 40);
  if (!UUID.test(id)) redirect("/admin/artisans");
  const { data: a } = await ctx.db.from("artisans").select("id, name, user_id, status, verified").eq("id", id).maybeSingle();
  if (!a) redirect("/admin/artisans");
  return { ctx, a, page: `/admin/artisan/${id}` };
}
const refresh = (id: string) => { revalidatePath("/admin"); revalidatePath("/admin/artisans"); revalidatePath(`/admin/artisan/${id}`); revalidatePath("/"); revalidatePath("/resultats"); };

export async function suspendArtisan(f: FormData) {
  const { ctx, a, page } = await target(f);
  const reason = s(f, "reason");
  if (reason.length < 5) back(page, "erreur", "Indiquez le motif de la suspension (5 caractères minimum).");
  await ctx.db.from("artisans").update({ status: "suspended", suspended_at: new Date().toISOString(), reject_reason: reason }).eq("id", a.id);
  await audit(ctx, "artisan.suspendre", { type: "artisan", id: a.id, label: a.name }, { reason });
  refresh(a.id); back(page, "ok", "Profil suspendu : il n’apparaît plus sur le site.");
}
export async function reactivateArtisan(f: FormData) {
  const { ctx, a, page } = await target(f);
  const { error } = await ctx.db.from("artisans").update({ status: "approved", suspended_at: null, reject_reason: null }).eq("id", a.id);
  if (error) back(page, "erreur", /identite_requise|photo_requise/.test(error.message) ? "Réactivation impossible : identité non validée ou photo manquante." : "Réactivation impossible.");
  await audit(ctx, "artisan.reactiver", { type: "artisan", id: a.id, label: a.name });
  refresh(a.id); back(page, "ok", "Profil de nouveau en ligne.");
}
export async function setVerified(f: FormData) {
  const { ctx, a, page } = await target(f);
  const on = s(f, "on") === "1";
  await ctx.db.from("artisans").update({ verified: on, verification_requested: false }).eq("id", a.id);
  if (on) after(() => notifyBadge(a.id));
  await audit(ctx, on ? "artisan.badge_donner" : "artisan.badge_retirer", { type: "artisan", id: a.id, label: a.name });
  refresh(a.id); back(page, "ok", on ? "Badge « Vérifié » accordé." : "Badge « Vérifié » retiré.");
}
export async function saveNote(f: FormData) {
  const { ctx, a, page } = await target(f);
  await ctx.db.from("artisans").update({ admin_note: s(f, "note", 2000) || null }).eq("id", a.id);
  await audit(ctx, "artisan.note", { type: "artisan", id: a.id, label: a.name });
  back(page, "ok", "Note interne enregistrée.");
}
export async function giftBoost(f: FormData) {
  const { ctx, a, page } = await target(f);
  const type = s(f, "type", 12), hours = parseInt(s(f, "hours", 4), 10);
  if (!["recherche", "accueil", "urgence"].includes(type) || ![24, 72, 168].includes(hours)) back(page, "erreur", "Boost ou durée invalide.");
  const now = new Date();
  const { error } = await ctx.db.from("boosts").insert({ artisan_id: a.id, type, duration_hours: hours, amount: 0, status: "active", starts_at: now.toISOString(), ends_at: new Date(now.getTime() + hours * 36e5).toISOString() });
  if (error) back(page, "erreur", /badge_requis/.test(error.message) ? "Impossible : un boost ne peut être offert qu’à un artisan dont l’identité est vérifiée (badge « Vérifié »)." : "Le boost n’a pas pu être créé.");
  await audit(ctx, "boost.offrir", { type: "artisan", id: a.id, label: a.name }, { type, hours });
  refresh(a.id); back(page, "ok", `Boost offert : ${type}, ${hours / 24} jour(s).`);
}
export async function giftPro(f: FormData) {
  const { ctx, a, page } = await target(f);
  const days = parseInt(s(f, "days", 4), 10);
  if (![7, 30, 365].includes(days)) back(page, "erreur", "Durée invalide.");
  const now = new Date();
  const { data: cur } = await ctx.db.from("subscriptions").select("ends_at").eq("artisan_id", a.id).eq("status", "active").gt("ends_at", now.toISOString()).order("ends_at", { ascending: false }).limit(1).maybeSingle();
  const start = cur ? new Date(cur.ends_at) : now; const end = new Date(start); end.setUTCDate(end.getUTCDate() + days);
  const { error } = await ctx.db.from("subscriptions").insert({ artisan_id: a.id, days, amount: 0, status: "active", starts_at: now.toISOString(), ends_at: end.toISOString() });
  if (error) back(page, "erreur", "Le Forfait Pro n’a pas pu être offert.");
  await audit(ctx, "pro.offrir", { type: "artisan", id: a.id, label: a.name }, { days });
  refresh(a.id); back(page, "ok", `Forfait Pro offert : ${days} jours.`);
}
export async function deleteArtisan(f: FormData) {
  const { ctx, a, page } = await target(f);
  if (s(f, "confirm", 20).toUpperCase() !== "SUPPRIMER") back(page, "erreur", "Tapez SUPPRIMER pour confirmer la suppression.");
  await audit(ctx, "artisan.supprimer", { type: "artisan", id: a.id, label: a.name });
  const { error } = await ctx.db.auth.admin.deleteUser(a.user_id);
  if (error) back(page, "erreur", "Suppression impossible.");
  refresh(a.id); back("/admin/artisans", "ok", `Compte de ${a.name} supprimé définitivement.`);
}

export async function moderateReview(f: FormData) {
  const ctx = await requireAdmin();
  const id = s(f, "id", 40), act = s(f, "act", 10), to = s(f, "to", 60) || "/admin/avis";
  if (!UUID.test(id)) redirect(to);
  if (act === "delete") await ctx.db.from("reviews").delete().eq("id", id);
  else if (act === "publish" || act === "hide") {
    const { data: rv } = await ctx.db.from("reviews").update({ status: act === "publish" ? "published" : "hidden" }).eq("id", id).select("artisan_id, rating").maybeSingle();
    if (act === "publish" && rv?.artisan_id) after(() => pushToArtisan(rv.artisan_id, { title: "Nouvel avis publié", body: `${"★".repeat(rv.rating)}${"☆".repeat(5 - rv.rating)} Un client a laissé un avis sur votre profil.`, tag: "avis" }));
  }
  await audit(ctx, `avis.${act}`, { type: "avis", id });
  revalidatePath("/admin/avis"); revalidatePath("/admin");
  back(to.startsWith("/admin") ? to : "/admin/avis", "ok", act === "publish" ? "Avis publié." : act === "hide" ? "Avis masqué." : "Avis supprimé.");
}

export async function markRequest(f: FormData) {
  const ctx = await requireAdmin();
  const id = s(f, "id", 40), st = s(f, "status", 10);
  if (UUID.test(id) && (st === "new" || st === "answered")) { await ctx.db.from("service_requests").update({ status: st }).eq("id", id); await audit(ctx, "demande.statut", { type: "demande", id }, { status: st }); }
  revalidatePath("/admin/demandes"); revalidatePath("/admin");
  back(s(f, "to", 120).startsWith("/admin/demandes") ? s(f, "to", 120) : "/admin/demandes", "ok", "Demande mise à jour.");
}

export async function savePrices(f: FormData) {
  const ctx = await requireAdmin();
  let n = 0;
  for (const [key, value] of f.entries()) {
    if (key.startsWith("p:")) { await ctx.db.from("price_grid").update({ amount: Math.max(0, parseInt(String(value), 10) || 0) }).eq("id", key.slice(2)); n++; }
    else if (key.startsWith("plan:")) {
      // plan:<pays>:<month|week|year> ; vide = prix automatique (semaine, année). Le prix du mois est obligatoire.
      const [, cc, kind] = key.split(":"); const raw = String(value).replace(/\s/g, "");
      const v = raw === "" ? null : Math.max(0, parseInt(raw, 10) || 0);
      if (kind === "month") { if (v !== null) await ctx.db.from("plan_prices").upsert({ country_code: cc, amount: v }, { onConflict: "country_code" }); }
      else if (kind === "week" || kind === "year") await ctx.db.from("plan_prices").update({ [kind === "week" ? "week_amount" : "year_amount"]: v === 0 ? null : v }).eq("country_code", cc);
      n++;
    }
    else if (key.startsWith("z:")) { const v = Math.min(9.99, Math.max(0.1, parseFloat(String(value).replace(",", ".")) || 1)); await ctx.db.from("zones").update({ price_factor: v }).eq("id", key.slice(2)); n++; }
  }
  await audit(ctx, "prix.modifier", undefined, { lignes: n });
  revalidatePath("/admin/prix"); revalidatePath("/boosts");
  back("/admin/prix", "ok", "Modifications enregistrées.");
}
export async function addZone(f: FormData) {
  const ctx = await requireAdmin();
  const country = s(f, "country", 2).toLowerCase(), name = s(f, "name", 60);
  if (name.length < 2) back("/admin/prix", "erreur", "Nom de zone trop court.");
  const { error } = await ctx.db.from("zones").insert({ country_code: country, name, price_factor: 1 });
  if (error) back("/admin/prix", "erreur", /duplicate|unique/.test(error.message) ? "Cette zone existe déjà." : "Zone non ajoutée.");
  await audit(ctx, "zone.ajouter", { type: "zone", id: name, label: name }, { country });
  revalidatePath("/admin/prix"); back("/admin/prix", "ok", `Zone « ${name} » ajoutée.`);
}

export async function setRole(f: FormData) {
  const ctx = await requireAdmin();
  const email = s(f, "email", 120).toLowerCase(), role = s(f, "role", 10);
  if (!/^[^@\s]+@[^@\s]+$/.test(email) || !["admin", "artisan"].includes(role)) back("/admin/equipe", "erreur", "E-mail ou rôle invalide.");
  const { data: p } = await ctx.db.from("profiles").select("id, email").ilike("email", email).maybeSingle();
  if (!p) back("/admin/equipe", "erreur", "Aucun compte avec cet e-mail : la personne doit d’abord s’inscrire.");
  if (p!.id === ctx.id && role !== "admin") back("/admin/equipe", "erreur", "Vous ne pouvez pas retirer votre propre accès.");
  await ctx.db.from("profiles").update({ role }).eq("id", p!.id);
  await audit(ctx, role === "admin" ? "equipe.ajouter" : "equipe.retirer", { type: "profil", id: p!.id, label: p!.email });
  revalidatePath("/admin/equipe"); back("/admin/equipe", "ok", role === "admin" ? "Administrateur ajouté." : "Accès administrateur retiré.");
}

/** Retire une photo jugée inappropriée (couverture ou réalisation). */
export async function removeMedia(f: FormData) {
  const { ctx, a, page } = await target(f);
  const kind = s(f, "kind", 8), pid = s(f, "photo", 40);
  const key = (u?: string | null) => u?.split("/object/public/realisations/")[1];
  if (kind === "cover") {
    const { data } = await ctx.db.from("artisans").select("cover_url").eq("id", a.id).single();
    await ctx.db.from("artisans").update({ cover_url: null }).eq("id", a.id);
    if (key(data?.cover_url)) await ctx.db.storage.from("realisations").remove([key(data!.cover_url)!]);
  } else if (UUID.test(pid)) {
    const { data } = await ctx.db.from("portfolio_photos").select("path").eq("id", pid).eq("artisan_id", a.id).maybeSingle();
    await ctx.db.from("portfolio_photos").delete().eq("id", pid).eq("artisan_id", a.id);
    if (data?.path) await ctx.db.storage.from("realisations").remove([data.path]);
  }
  await audit(ctx, "photo.retirer", { type: "artisan", id: a.id, label: a.name }, { kind });
  refresh(a.id); back(page, "ok", "Photo retirée.");
}

const KINDS = ["avertissement", "badge_retire", "suspension", "bannissement"] as const;

/** Traite un signalement : le classer, ou le retenir avec (ou sans) sanction. L'artisan est prévenu par e-mail. */
export async function resolveReport(f: FormData) {
  const ctx = await requireAdmin();
  const id = s(f, "id", 40);
  const to = "/admin/signalements";
  if (!UUID.test(id)) redirect(to);
  const outcome = s(f, "outcome", 12); // classer | retenir
  const sanction = s(f, "sanction", 20);
  const reason = s(f, "reason", 1000);
  const { data: r } = await ctx.db.from("reports").select("id, artisan_id, artisan:artisans(id, name, verified)").eq("id", id).maybeSingle();
  if (!r) redirect(to);
  const a = (Array.isArray((r as any).artisan) ? (r as any).artisan[0] : (r as any).artisan) as { id: string; name: string; verified: boolean };
  const stamp = { resolved_by: ctx.email, resolved_at: new Date().toISOString() };
  if (outcome === "classer") {
    await ctx.db.from("reports").update({ status: "dismissed", resolution: reason || "Sans suite.", ...stamp }).eq("id", id);
    await audit(ctx, "signalement.classer", { type: "artisan", id: a.id, label: a.name }, { report: id });
    revalidatePath(to); back(to, "ok", "Signalement classé sans suite.");
  }
  const kind = (KINDS as readonly string[]).includes(sanction) ? (sanction as (typeof KINDS)[number]) : null;
  if (kind && reason.length < 5) back(to, "erreur", "Indiquez le motif de la sanction (5 caractères minimum) : il sera communiqué à l’artisan.");
  await ctx.db.from("reports").update({ status: "upheld", resolution: reason || null, ...stamp }).eq("id", id);
  if (kind) {
    await ctx.db.from("artisan_sanctions").insert({ artisan_id: a.id, report_id: id, kind, reason, created_by: ctx.email });
    if (kind === "badge_retire") await ctx.db.from("artisans").update({ verified: false }).eq("id", a.id);
    if (kind === "suspension" || kind === "bannissement") await ctx.db.from("artisans").update({ status: "suspended", suspended_at: new Date().toISOString(), reject_reason: kind === "bannissement" ? `Banni : ${reason}` : reason }).eq("id", a.id);
    after(() => notifySanction(a.id, kind, reason));
    await audit(ctx, `sanction.${kind}`, { type: "artisan", id: a.id, label: a.name }, { report: id, reason });
    refresh(a.id);
  } else {
    await audit(ctx, "signalement.retenir", { type: "artisan", id: a.id, label: a.name }, { report: id });
  }
  revalidatePath(to);
  back(to, "ok", kind ? "Signalement retenu et sanction appliquée. L’artisan a été prévenu par e-mail." : "Signalement retenu (sans sanction).");
}

/** Confirmation manuelle d'un paiement dont la notification GeniusPay n'est pas arrivée. À n'utiliser qu'après avoir vérifié l'encaissement chez GeniusPay. */
export async function confirmerPaiement(f: FormData) {
  const ctx = await requireAdmin();
  const id = s(f, "id", 40);
  const page = `/admin/revenus/${id}`;
  if (!UUID.test(id)) redirect("/admin/revenus");
  const { data: p } = await ctx.db.from("payments").select("id, amount, provider_ref, status").eq("id", id).maybeSingle();
  if (!p) redirect("/admin/revenus");
  if (p.status === "paid") back(page, "erreur", "Ce paiement est déjà confirmé.");
  const res = await activateFromPayment(p.provider_ref, p.amount, { confirmation_manuelle: { par: ctx.email, le: new Date().toISOString() } });
  if (!res.ok) back(page, "erreur", `Activation impossible : ${res.reason}.`);
  await audit(ctx, "paiement.confirmer_manuellement", { type: "paiement", id: p.id, label: p.provider_ref }, { amount: p.amount });
  revalidatePath("/admin/revenus");
  back(page, "ok", "Paiement confirmé et boost activé.");
}

/** Modification de la fiche d'un artisan par l'équipe : textes, métier, contacts, options. Chaque changement est inscrit au journal avec les champs touchés. */
export async function modifierFiche(f: FormData) {
  const ctx = await requireAdmin();
  const id = s(f, "id", 40);
  if (!UUID.test(id)) redirect("/admin/artisans");
  const page = `/admin/artisan/${id}/modifier`;
  const { data: a } = await ctx.db.from("artisans").select("*").eq("id", id).maybeSingle();
  if (!a) redirect("/admin/artisans");
  const text = (k: string, max: number) => s(f, k, max) || null;
  const exp = s(f, "experience_years", 3);
  const experience = /^\d{1,2}$/.test(exp) ? parseInt(exp, 10) : null;
  const entreprise = f.get("account_type") === "entreprise";
  const name = s(f, "name", 120);
  if (name.length < 2) back(page, "erreur", "Le nom affiché doit avoir au moins 2 caractères.");
  const trade = s(f, "trade_id", 40);
  if (!UUID.test(trade)) back(page, "erreur", "Choisissez un métier.");
  const phone = text("phone", 30);
  if (!phone || phone.replace(/\D/g, "").length < 8) back(page, "erreur", "Indiquez un numéro de téléphone valide.");
  const next = {
    name, trade_id: trade, account_type: entreprise ? "entreprise" : "individuel",
    company_name: entreprise ? (text("company_name", 120) ?? name) : null,
    headline: text("headline", 140), description: text("description", 2000), price_label: text("price_label", 140),
    experience_years: experience, phone, whatsapp: text("whatsapp", 30),
    open_24_7: f.get("open_24_7") === "on", takes_urgent: f.get("takes_urgent") === "on",
  };
  const changed = Object.keys(next).filter((k) => JSON.stringify((a as any)[k] ?? null) !== JSON.stringify((next as any)[k] ?? null));
  if (!changed.length) back(page, "ok", "Aucun changement.");
  const { error } = await ctx.db.from("artisans").update(next).eq("id", id);
  if (error) back(page, "erreur", error.message.includes("telephone_deja_utilise") ? "Ce numéro de téléphone ou WhatsApp est déjà utilisé par un autre profil." : "Enregistrement impossible. Réessayez.");
  await audit(ctx, "artisan.modifier_fiche", { type: "artisan", id, label: a.name }, { champs: changed });
  revalidatePath(`/artisan/${id}`);
  revalidatePath(`/admin/artisan/${id}`);
  back(page, "ok", `Fiche enregistrée (${changed.length} champ${changed.length > 1 ? "s" : ""} modifié${changed.length > 1 ? "s" : ""}).`);
}

/** Pose la cover Bricolo générée sur la fiche d'un artisan (à faire avec son accord). L'ancienne cover n'est supprimée du stockage que si elle y est hébergée. */
export async function appliquerCover(f: FormData) {
  const ctx = await requireAdmin();
  const id = s(f, "id", 40);
  if (!UUID.test(id)) redirect("/admin/covers");
  const c = await coverInputOf(ctx.db, id);
  if (!c) redirect("/admin/covers");
  const bg = unsplashBg(s(f, "bg", 600));
  if (bg) { c.shotUrl = bg; c.photoUrl = null; }
  let png: ArrayBuffer;
  try { png = await (await coverImage(c)).arrayBuffer(); }
  catch { png = await (await coverImage({ ...c, photoUrl: null, shotUrl: null })).arrayBuffer(); }
  const path = `${c.userId}/cover-bricolo-${Date.now()}.png`;
  const up = await ctx.db.storage.from("realisations").upload(path, png, { contentType: "image/png", upsert: false });
  if (up.error) back("/admin/covers", "erreur", "Envoi de la cover impossible. Réessayez.");
  const { data: pub } = ctx.db.storage.from("realisations").getPublicUrl(path);
  const old = c.coverUrl?.split("/object/public/realisations/")[1];
  const { error } = await ctx.db.from("artisans").update({ cover_url: pub.publicUrl }).eq("id", id);
  if (error) back("/admin/covers", "erreur", "Enregistrement impossible. Réessayez.");
  if (old) await ctx.db.storage.from("realisations").remove([old]);
  await audit(ctx, "artisan.cover_bricolo", { type: "artisan", id, label: c.name });
  revalidatePath(`/artisan/${id}`);
  revalidatePath("/admin/covers");
  back("/admin/covers", "ok", `Cover appliquée sur la fiche de ${c.name}.`);
}

/** Pose la cover Bricolo sur toutes les fiches validées qui n'en ont pas encore (celles qui ont déjà une cover ne sont pas touchées). */
export async function appliquerCoversEnMasse() {
  const ctx = await requireAdmin();
  const { data } = await ctx.db.from("artisans").select("id").eq("status", "approved").is("cover_url", null).order("created_at");
  let ok = 0, ko = 0;
  for (const { id } of data ?? []) {
    try {
      const c = await coverInputOf(ctx.db, id);
      if (!c) { ko++; continue; }
      let png: ArrayBuffer;
      try { png = await (await coverImage(c)).arrayBuffer(); }
      catch { png = await (await coverImage({ ...c, photoUrl: null, shotUrl: null })).arrayBuffer(); }
      const path = `${c.userId}/cover-bricolo-${Date.now()}.png`;
      const up = await ctx.db.storage.from("realisations").upload(path, png, { contentType: "image/png", upsert: false });
      if (up.error) { ko++; continue; }
      const { data: pub } = ctx.db.storage.from("realisations").getPublicUrl(path);
      const { error } = await ctx.db.from("artisans").update({ cover_url: pub.publicUrl }).eq("id", id);
      if (error) { ko++; continue; }
      await audit(ctx, "artisan.cover_bricolo", { type: "artisan", id, label: c.name });
      revalidatePath(`/artisan/${id}`);
      ok++;
    } catch { ko++; }
  }
  revalidatePath("/admin/covers");
  back("/admin/covers", ko ? "erreur" : "ok", `${ok} cover${ok > 1 ? "s" : ""} appliquée${ok > 1 ? "s" : ""}${ko ? `, ${ko} en échec (réessayez)` : ""}.`);
}

const PUB = "/object/public/realisations/";

/** Contrôle commun : seules les images en paysage (au moins 1,25 fois plus larges que hautes, 800 px de large) sont acceptées. Renvoie un message d'erreur, ou null si l'image convient. */
async function paysageOuErreur(buf: Buffer): Promise<string | null> {
  try {
    const m = await sharp(buf).rotate().metadata();
    const swap = (m.orientation ?? 1) >= 5;
    const w = swap ? m.height ?? 0 : m.width ?? 0, h = swap ? m.width ?? 0 : m.height ?? 0;
    if (!w || !h) return "Image illisible. Essayez un fichier JPG, PNG ou WebP.";
    if (w < h * 1.25) return `Image en portrait ou presque carrée (${w} × ${h} px). Seules les images en paysage sont acceptées (par exemple 1600 × 600 px).`;
    if (w < 800) return `Image trop petite (${w} px de large). Il faut au moins 800 px de large.`;
    return null;
  } catch { return "Image illisible. Essayez un fichier JPG, PNG ou WebP."; }
}
const IMG_OK = ["image/jpeg", "image/png", "image/webp"];

/** Page de retour après une action sur une cover : la liste des covers par défaut, ou la fiche de l'artisan si le formulaire vient de là. */
const retour = (f: FormData) => { const r = s(f, "retour", 80); return /^\/admin\/(covers|artisan\/[0-9a-f-]{36})$/i.test(r) ? r : "/admin/covers"; };

/** Reprend une photo de réalisation de l'artisan comme cover de sa fiche (recadrée en paysage ; la photo d'origine reste en place). Refusée si la photo est en portrait. */
export async function utiliserPhotoCommeCover(f: FormData) {
  const ctx = await requireAdmin();
  const R = retour(f);
  const id = s(f, "id", 40), photo = s(f, "photo", 40);
  if (!UUID.test(id) || !UUID.test(photo)) redirect(R);
  const { data: a } = await ctx.db.from("artisans").select("id, name, user_id, cover_url").eq("id", id).maybeSingle();
  const { data: p } = await ctx.db.from("portfolio_photos").select("path").eq("id", photo).eq("artisan_id", id).maybeSingle();
  if (!a || !p?.path) back(R, "erreur", "Photo introuvable.");
  const dl = await ctx.db.storage.from("realisations").download(p!.path);
  if (dl.error || !dl.data) back(R, "erreur", "Lecture de la photo impossible. Réessayez.");
  const src = Buffer.from(await dl.data!.arrayBuffer());
  const bad = await paysageOuErreur(src);
  if (bad) back(R, "erreur", bad);
  await poserCover(R, ctx, a as any, src, "cover-photo", "artisan.cover_photo", `Cover de ${a!.name} remplacée par sa photo.`);
}

/** Téléverse directement une cover pour un artisan (paysage uniquement). */
export async function televerserCoverArtisan(f: FormData) {
  const ctx = await requireAdmin();
  const R = retour(f);
  const id = s(f, "id", 40);
  if (!UUID.test(id)) redirect(R);
  const { data: a } = await ctx.db.from("artisans").select("id, name, user_id, cover_url").eq("id", id).maybeSingle();
  if (!a) back(R, "erreur", "Artisan introuvable.");
  const file = f.get("file");
  if (!(file instanceof File) || !file.size) back(R, "erreur", "Choisissez une image.");
  if (!IMG_OK.includes((file as File).type)) back(R, "erreur", "Format non accepté : JPG, PNG ou WebP.");
  if ((file as File).size > 5 * 1024 * 1024) back(R, "erreur", "Image trop lourde (5 Mo maximum).");
  const src = Buffer.from(await (file as File).arrayBuffer());
  const bad = await paysageOuErreur(src);
  if (bad) back(R, "erreur", bad);
  await poserCover(R, ctx, a as any, src, "cover-admin", "artisan.cover_televerser", `Cover de ${a!.name} enregistrée.`);
}

async function poserCover(R: string, ctx: Awaited<ReturnType<typeof requireAdmin>>, a: { id: string; name: string; user_id: string; cover_url: string | null }, src: Buffer, prefix: string, action: string, msg: string) {
  let webp: Buffer;
  try { webp = await sharp(src).rotate().resize(1600, 600, { fit: "cover", position: "attention" }).webp({ quality: 78 }).toBuffer(); }
  catch { back(R, "erreur", "Image illisible. Essayez un fichier JPG, PNG ou WebP."); return; }
  const to = `${a.user_id}/${prefix}-${Date.now()}.webp`;
  const up = await ctx.db.storage.from("realisations").upload(to, webp, { contentType: "image/webp", cacheControl: "3600" });
  if (up.error) back(R, "erreur", "Envoi impossible. Réessayez.");
  const { data: pub } = ctx.db.storage.from("realisations").getPublicUrl(to);
  const old = a.cover_url?.split(PUB)[1];
  const { error } = await ctx.db.from("artisans").update({ cover_url: pub.publicUrl }).eq("id", a.id);
  if (error) back(R, "erreur", "Enregistrement impossible. Réessayez.");
  if (old) await ctx.db.storage.from("realisations").remove([old]);
  await audit(ctx, action, { type: "artisan", id: a.id, label: a.name });
  revalidatePath(`/artisan/${a.id}`); revalidatePath("/"); revalidatePath("/admin/covers"); revalidatePath(`/admin/artisan/${a.id}`);
  back(R, "ok", msg);
}

/** Retire la cover de la fiche : la carte reprend la photo par défaut du métier. */
export async function retirerCover(f: FormData) {
  const ctx = await requireAdmin();
  const R = retour(f);
  const id = s(f, "id", 40);
  if (!UUID.test(id)) redirect(R);
  const { data: a } = await ctx.db.from("artisans").select("id, name, cover_url").eq("id", id).maybeSingle();
  if (!a) redirect(R);
  await ctx.db.from("artisans").update({ cover_url: null }).eq("id", id);
  const old = a!.cover_url?.split(PUB)[1];
  if (old) await ctx.db.storage.from("realisations").remove([old]);
  await audit(ctx, "artisan.cover_retirer", { type: "artisan", id, label: a!.name });
  revalidatePath(`/artisan/${id}`); revalidatePath("/"); revalidatePath("/admin/covers");
  back(R, "ok", `Cover de ${a!.name} retirée.`);
}

/** Photo par défaut d'un métier : recadrée en paysage, allégée (WebP) et publiée pour toutes les fiches de ce métier qui n'ont pas de photo paysage. */
export async function televerserDefaut(f: FormData) {
  const ctx = await requireAdmin();
  const slug = s(f, "slug", 40);
  const { data: t } = await ctx.db.from("trades").select("slug").eq("slug", slug).maybeSingle();
  if (!t) back("/admin/covers/defauts", "erreur", "Métier inconnu.");
  const file = f.get("file");
  if (!(file instanceof File) || !file.size) back("/admin/covers/defauts", "erreur", "Choisissez une image.");
  if ((file as File).size > 5 * 1024 * 1024) back("/admin/covers/defauts", "erreur", "Image trop lourde (5 Mo maximum).");
  if (!IMG_OK.includes((file as File).type)) back("/admin/covers/defauts", "erreur", "Format non accepté : JPG, PNG ou WebP.");
  const src = Buffer.from(await (file as File).arrayBuffer());
  const bad = await paysageOuErreur(src);
  if (bad) back("/admin/covers/defauts", "erreur", bad);
  let webp: Buffer;
  try { webp = await sharp(src).rotate().resize(900, 390, { fit: "cover", position: "attention" }).webp({ quality: 75 }).toBuffer(); }
  catch { back("/admin/covers/defauts", "erreur", "Image illisible. Essayez un fichier JPG, PNG ou WebP."); return; }
  const up = await ctx.db.storage.from("realisations").upload(`defaults/${slug}.webp`, webp, { contentType: "image/webp", upsert: true, cacheControl: "3600" });
  if (up.error) back("/admin/covers/defauts", "erreur", "Envoi impossible. Réessayez.");
  resetUploadedDefaults();
  await audit(ctx, "cover.defaut_televerser", { type: "metier", id: slug, label: slug });
  revalidatePath("/"); revalidatePath("/admin/covers/defauts");
  back("/admin/covers/defauts", "ok", "Photo par défaut enregistrée.");
}

export async function retirerDefaut(f: FormData) {
  const ctx = await requireAdmin();
  const slug = s(f, "slug", 40);
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) redirect("/admin/covers/defauts");
  await ctx.db.storage.from("realisations").remove([`defaults/${slug}.webp`]);
  resetUploadedDefaults();
  await audit(ctx, "cover.defaut_retirer", { type: "metier", id: slug, label: slug });
  revalidatePath("/"); revalidatePath("/admin/covers/defauts");
  back("/admin/covers/defauts", "ok", "Photo par défaut retirée : la photo du site est de nouveau utilisée.");
}


/** Choisit, pour un métier, l'affichage par défaut : dessin SVG aux couleurs de Bricolo, ou photo (téléversée ou du site). */
export async function definirModeDefaut(f: FormData) {
  const ctx = await requireAdmin();
  const slug = s(f, "slug", 40), mode = s(f, "mode", 5) === "svg" ? "svg" : "photo";
  const { data: t } = await ctx.db.from("trades").select("slug").eq("slug", slug).maybeSingle();
  if (!t) back("/admin/covers/defauts", "erreur", "Métier inconnu.");
  const { error } = await ctx.db.from("trade_default_covers").upsert({ slug, mode, updated_at: new Date().toISOString() });
  if (error) back("/admin/covers/defauts", "erreur", "Enregistrement impossible. Réessayez.");
  resetUploadedDefaults();
  await audit(ctx, "cover.defaut_mode", { type: "metier", id: slug, label: `${slug} → ${mode}` });
  revalidatePath("/"); revalidatePath("/admin/covers/defauts");
  back("/admin/covers/defauts", "ok", mode === "svg" ? "Dessin SVG activé pour ce métier." : "Photo activée pour ce métier.");
}

/** Même choix pour tous les métiers d'un coup. */
export async function definirModeTous(f: FormData) {
  const ctx = await requireAdmin();
  const mode = s(f, "mode", 5) === "svg" ? "svg" : "photo";
  const { data: ts } = await ctx.db.from("trades").select("slug");
  const rows = (ts ?? []).map((t: any) => ({ slug: t.slug, mode, updated_at: new Date().toISOString() }));
  const { error } = rows.length ? await ctx.db.from("trade_default_covers").upsert(rows) : { error: null };
  if (error) back("/admin/covers/defauts", "erreur", "Enregistrement impossible. Réessayez.");
  resetUploadedDefaults();
  await audit(ctx, "cover.defaut_mode_tous", { type: "metier", id: "tous", label: mode });
  revalidatePath("/"); revalidatePath("/admin/covers/defauts");
  back("/admin/covers/defauts", "ok", mode === "svg" ? "Dessin SVG activé pour tous les métiers." : "Photos activées pour tous les métiers.");
}

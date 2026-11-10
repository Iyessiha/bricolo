"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { notifyBadge, notifySanction } from "@/lib/email-flows";
import { pushToArtisan } from "@/lib/push";
import { audit, requireAdmin } from "@/lib/admin";

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

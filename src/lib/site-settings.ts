import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "./supabase/admin";

/** Réglages modifiables depuis /admin/pixels. Chaque identifiant est validé avant d'être enregistré : rien d'autre qu'un identifiant n'est jamais écrit dans les pages. */
export const SETTINGS = {
  ga4_id: { label: "Google Analytics 4 : identifiant de mesure", ph: "G-XXXXXXXXXX", re: /^G-[A-Z0-9]{6,12}$/, hint: "Commence par G-. Analytics → Admin → Flux de données." },
  meta_pixel_id: { label: "Pixel Meta (Facebook et Instagram)", ph: "123456789012345", re: /^\d{8,20}$/, hint: "Nombre de 15 à 16 chiffres. Gestionnaire d’événements Meta → Sources de données." },
  tiktok_pixel_id: { label: "Pixel TikTok", ph: "CXXXXXXXXXXXXXXXXXXX", re: /^[A-Z0-9]{10,30}$/, hint: "Commence souvent par C. TikTok Ads → Outils → Événements." },
  google_verification: { label: "Google Search Console : code de vérification", ph: "abcDEF123…", re: /^[A-Za-z0-9_-]{20,100}$/, hint: "Dans Search Console, choisissez « Balise HTML » et copiez seulement la valeur de content=\"…\"." },
  bing_verification: { label: "Bing Webmaster : code de vérification", ph: "0123456789ABCDEF…", re: /^[A-Fa-f0-9]{32}$/, hint: "32 caractères. Bing Webmaster → Ajouter un site → Balise meta." },
  meta_domain_verification: { label: "Meta : vérification du domaine", ph: "abcd1234efgh5678…", re: /^[a-z0-9]{20,40}$/, hint: "Business Suite → Sécurité de la marque → Domaines. Copiez le code de la balise meta facebook-domain-verification." },
  home_title: { label: "Titre de l’accueil (balise title)", ph: "Bricolo : trouvez un artisan de confiance en Afrique de l’Ouest", re: /^.{10,70}$/, hint: "Entre 10 et 70 caractères. C’est le titre qui s’affiche dans Google." },
  home_description: { label: "Description de l’accueil (balise meta description)", ph: "Plombiers, électriciens, menuisiers, frigoristes…", re: /^.{50,170}$/, hint: "Entre 50 et 170 caractères. C’est le texte sous le titre dans Google." },
} as const;
export type SettingKey = keyof typeof SETTINGS;

export const getSettings = unstable_cache(async (): Promise<Partial<Record<SettingKey, string>>> => {
  try {
    const { data } = await supabaseAdmin().from("site_settings").select("key, value");
    const out: Record<string, string> = {};
    for (const r of data ?? []) {
      const s = SETTINGS[r.key as SettingKey];
      if (s && r.value && s.re.test(r.value)) out[r.key] = r.value; // on revalide à la lecture
    }
    return out;
  } catch { return {}; }
}, ["site-settings"], { tags: ["site-settings"], revalidate: 300 });

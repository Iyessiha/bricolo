import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { SETTINGS, type SettingKey } from "@/lib/site-settings";
import { siteUrl } from "@/lib/env";
import { saveSettings } from "./actions";

export const metadata: Metadata = { title: "Pixels et référencement", robots: { index: false } };
export const dynamic = "force-dynamic";

const GROUPS: { title: string; intro: string; keys: SettingKey[] }[] = [
  { title: "Mesure et publicité", intro: "Ces outils ne se chargent que si le visiteur clique sur « Accepter » dans le bandeau cookies. Laissez un champ vide pour désactiver l’outil.", keys: ["gtm_id", "google_ads_id", "ga4_id", "meta_pixel_id", "tiktok_pixel_id"] },
  { title: "Pixels personnalisés", intro: "Pour tout autre outil (Hotjar, Snap, Pinterest, LinkedIn, X…). Collez le code fourni, balises <script> comprises. Seules les balises <script> en https sont acceptées ; le domaine du script est autorisé automatiquement. Le code ne se charge qu’après l’accord du visiteur.", keys: ["custom_name_1", "custom_pixel_1", "custom_name_2", "custom_pixel_2", "custom_name_3", "custom_pixel_3"] },
  { title: "Vérification du site", intro: "Pour prouver à Google, Bing et Meta que le site est à vous. Collez uniquement le code demandé.", keys: ["google_verification", "bing_verification", "meta_domain_verification"] },
  { title: "Titre et description de l’accueil", intro: "Ce que Google affiche pour la page d’accueil. Laissez vide pour garder le texte par défaut.", keys: ["home_title", "home_description"] },
];

export default async function Pixels({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const { data } = await db.from("site_settings").select("key, value, updated_at");
  const val = (k: string) => data?.find((r) => r.key === k)?.value ?? "";
  const base = siteUrl();
  const on = (k: SettingKey) => Boolean(val(k));
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Configuration</p><h1>Pixels et référencement</h1></div></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}

      <div className="card pad stack">
        <h2 style={{ fontSize: 18 }}>État</h2>
        <div className="tags">
          {(["gtm_id", "google_ads_id", "ga4_id", "meta_pixel_id", "tiktok_pixel_id", "custom_pixel_1", "custom_pixel_2", "custom_pixel_3", "google_verification", "bing_verification"] as SettingKey[]).filter((k) => !k.startsWith("custom_pixel_") || on(k)).map((k) => (
            <span key={k} className={`tag ${on(k) ? "ok" : "mute"}`}>{on(k) ? "✓" : "○"} {k.startsWith("custom_pixel_") ? (val(k.replace("pixel", "name")) || "Pixel personnalisé") : SETTINGS[k].label.split(":")[0].split(" (")[0]}</span>
          ))}
        </div>
      </div>

      <form action={saveSettings} className="stack">
        {GROUPS.map((g) => (
          <div key={g.title} className="card pad stack">
            <h2 style={{ fontSize: 18 }}>{g.title}</h2>
            <p className="hint">{g.intro}</p>
            {g.keys.map((k) => {
              const s = SETTINGS[k];
              const long = k === "home_description" || Boolean(s.long);
              return (
                <div className="fld" key={k}>
                  <label htmlFor={k}>{s.label}</label>
                  {long ? <textarea id={k} name={k} rows={k.startsWith("custom_") ? 6 : 3} maxLength={k.startsWith("custom_") ? 3000 : 170} spellCheck={false} defaultValue={val(k)} placeholder={s.ph} />
                    : <input id={k} name={k} type="text" maxLength={k === "home_title" ? 70 : 100} defaultValue={val(k)} placeholder={s.ph} autoComplete="off" spellCheck={false} />}
                  <p className="hint">{s.hint}</p>
                </div>
              );
            })}
          </div>
        ))}
        <div><button className="btn primary" type="submit">Enregistrer</button></div>
      </form>

      <div className="card pad stack">
        <h2 style={{ fontSize: 18 }}>Référencement : ce qui est déjà en place</h2>
        <ul className="stack" style={{ gap: 6, paddingLeft: 18, margin: 0 }}>
          <li>Plan du site automatique : <a href={`${base}/sitemap.xml`} target="_blank" rel="noreferrer">{base}/sitemap.xml</a> (fiches, métiers, villes avec au moins un artisan).</li>
          <li>Fichier robots : <a href={`${base}/robots.txt`} target="_blank" rel="noreferrer">{base}/robots.txt</a> (l’admin, les espaces connectés et l’API sont exclus).</li>
          <li>Pages par pays, métier et ville : <code>/artisans/ci/plombier/cocody</code>. Une page sans artisan n’est pas indexée.</li>
          <li>Titres, descriptions, adresse canonique, image de partage et données structurées sur chaque page.</li>
        </ul>
        <h3 style={{ fontSize: 16 }}>À faire une seule fois</h3>
        <ol className="stack" style={{ gap: 6, paddingLeft: 18, margin: 0 }}>
          <li>Ouvrez <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Google Search Console</a>, ajoutez <b>{base}</b>, choisissez « Balise HTML », collez le code ci-dessus, enregistrez ici, puis cliquez sur « Valider » dans Search Console.</li>
          <li>Dans Search Console, section « Sitemaps », envoyez <code>sitemap.xml</code>.</li>
          <li>Faites de même sur <a href="https://www.bing.com/webmasters" target="_blank" rel="noreferrer">Bing Webmaster</a> (il peut importer le site depuis Search Console).</li>
          <li>Testez une fiche artisan avec le <a href="https://search.google.com/test/rich-results" target="_blank" rel="noreferrer">test des résultats enrichis</a>.</li>
        </ol>
        <p className="hint">Le référencement naturel demande des semaines pour produire des résultats. Plus il y a d’artisans inscrits avec une bonne description, plus les pages métier et ville sont utiles à Google.</p>
      </div>
    </>
  );
}

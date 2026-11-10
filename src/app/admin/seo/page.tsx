import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { siteUrl } from "@/lib/env";
import { COUNTRIES } from "@/lib/countries";
import { DEFAULT_TITLE, DEFAULT_DESC } from "@/lib/seo";
import { defaultHubTitle, defaultHubDesc, loadHub } from "@/lib/seo-data";
import SerpEditor from "@/components/SerpEditor";
import { saveSeoTexts } from "./actions";

export const metadata: Metadata = { title: "Titres Google", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SeoTexts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const { data } = await db.from("site_settings").select("key, value");
  const val = (k: string) => data?.find((r) => r.key === k)?.value ?? "";
  const hubs = await Promise.all(COUNTRIES.map((c) => loadHub(c.code)));
  const pages = [
    { id: "home", label: "Page d’accueil", path: "", suffix: false, titleKey: "home_title", descKey: "home_description", title: val("home_title"), desc: val("home_description"), defTitle: DEFAULT_TITLE, defDesc: DEFAULT_DESC },
    ...COUNTRIES.map((c, i) => ({
      id: c.code, label: `${c.emoji} Artisans ${c.code === "ci" ? "en" : "au"} ${c.name}`, path: `/artisans/${c.code}`, suffix: true,
      titleKey: `seo_title_${c.code}`, descKey: `seo_desc_${c.code}`, title: val(`seo_title_${c.code}`), desc: val(`seo_desc_${c.code}`),
      defTitle: defaultHubTitle(c.code, c.name), defDesc: defaultHubDesc(c.code, c.name, (hubs[i]?.trades ?? []).map((t) => t.plural)),
    })),
  ];
  return (
    <>
      <div className="atitle"><div><p className="eyebrow">Référencement</p><h1>Titres et descriptions Google</h1></div></div>
      {sp.ok && <p className="notice ok" role="status">{sp.ok}</p>}
      {sp.erreur && <p className="notice err" role="alert">{sp.erreur}</p>}
      <div className="card pad stack">
        <p>Le <b>titre</b> (balise title) est la ligne bleue dans Google. La <b>description</b> (balise meta description) est le texte gris dessous. L’aperçu de chaque page change pendant que vous écrivez, en version ordinateur ou mobile.</p>
        <p className="hint">Les pages métier, ville et les fiches d’artisans ont des titres générés automatiquement à partir de leurs données (nom, métier, ville, avis) : ils restent toujours à jour et uniques. Seuls l’accueil et les pages pays se règlent ici.</p>
      </div>
      <form action={saveSeoTexts} className="stack">
        <SerpEditor pages={pages} base={siteUrl()} />
        <div><button className="btn primary" type="submit">Enregistrer</button></div>
      </form>
    </>
  );
}

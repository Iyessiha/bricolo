/** Pixels personnalisés : on n'accepte que des balises <script>. Module pur (aucun accès serveur) : utilisé par l'admin, le layout et le middleware. */
export type CustomItem = { src?: string; code?: string };
export type Parsed = { ok: true; items: CustomItem[]; hosts: string[] } | { ok: false; error: string };

const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

export function parseSnippet(raw: string): Parsed {
  const clean = raw.replace(/<!--[\s\S]*?-->/g, "").replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "").trim();
  const items: CustomItem[] = [];
  const hosts = new Set<string>();
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    const attrs = m[1], code = m[2].trim();
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
    if (type && !["text/javascript", "application/javascript", "module"].includes(type)) return { ok: false, error: "Type de script non pris en charge." };
    const srcRaw = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    const src = srcRaw ? (srcRaw[1] ?? srcRaw[2]).trim() : undefined;
    if (src) {
      let u: URL;
      try { u = new URL(src.startsWith("//") ? `https:${src}` : src); } catch { return { ok: false, error: `Adresse de script invalide : ${src.slice(0, 80)}` }; }
      if (u.protocol !== "https:") return { ok: false, error: "Le script doit être chargé en https." };
      if (u.username || u.password || !HOST.test(u.hostname)) return { ok: false, error: `Adresse de script refusée : ${u.hostname}` };
      hosts.add(u.hostname.toLowerCase());
    }
    for (const h of code.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) if (HOST.test(h[1])) hosts.add(h[1].toLowerCase());
    if (!src && !code) continue;
    items.push({ ...(src ? { src: src.startsWith("//") ? `https:${src}` : src } : {}), ...(code ? { code } : {}) });
  }
  const rest = clean.replace(re, "").trim();
  if (!items.length) return { ok: false, error: "Collez le code complet fourni par l’outil, avec ses balises <script>." };
  if (rest) return { ok: false, error: "Seules les balises <script> sont acceptées (retirez le reste du code)." };
  if (items.length > 6) return { ok: false, error: "Six balises script au maximum par pixel." };
  return { ok: true, items, hosts: [...hosts].slice(0, 30) };
}
